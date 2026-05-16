import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { Kafka, Producer, Consumer } from 'kafkajs';
import axios from 'axios';
import { NotFoundError, BadRequestError, generateId, formatResponse, PaymentStatus, PaymentMethod, KafkaTopics, PaymentCompletedEvent, PaymentFailedEvent } from '@ecommerce/shared';
import { logger, requestLogger, errorLogger } from './middleware/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8005;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5435/payment_db',
});

const kafka = new Kafka({
  clientId: 'payment-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});
const producer: Producer = kafka.producer();
const consumer: Consumer = kafka.consumer({ groupId: 'payment-service-group' });

const initDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(255) PRIMARY KEY,
        order_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        method VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        transaction_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('Payment database initialized');
  } finally {
    client.release();
  }
};

const connectKafka = async () => {
  await producer.connect();
  await consumer.connect();
  
  await consumer.subscribe({ topic: KafkaTopics.ORDER_CREATED });
  
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      if (topic === KafkaTopics.ORDER_CREATED && message.value) {
        const orderEvent = JSON.parse(message.value.toString());
        logger.info(`Received order created event: ${orderEvent.orderId}`);
      }
    }
  });
  
  logger.info('Kafka producer and consumer connected');
};

const processStripePayment = async (paymentId: string, orderId: string, userId: string, amount: number, token: string) => {
  try {
    const charge = {
      amount: Math.round(amount * 100),
      currency: 'usd',
      source: token,
      description: `Payment for order ${orderId}`
    };

    const response = await axios.post('https://api.stripe.com/v1/charges', charge, {
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const transactionId = response.data.id;

    await pool.query(
      `UPDATE payments SET status = $1, transaction_id = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [PaymentStatus.COMPLETED, transactionId, paymentId]
    );

    await axios.patch(`${process.env.ORDER_SERVICE_URL}/${orderId}/status`, {
      status: 'PAID',
      paymentId
    });

    await producer.send({
      topic: KafkaTopics.PAYMENT_COMPLETED,
      messages: [{
        key: paymentId,
        value: JSON.stringify({
          paymentId,
          orderId,
          userId,
          amount,
          transactionId,
          timestamp: new Date().toISOString()
        } as PaymentCompletedEvent)
      }]
    });

    return { success: true, transactionId };
  } catch (error: any) {
    await pool.query(
      `UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [PaymentStatus.FAILED, paymentId]
    );

    await producer.send({
      topic: KafkaTopics.PAYMENT_FAILED,
      messages: [{
        key: paymentId,
        value: JSON.stringify({
          paymentId,
          orderId,
          userId,
          amount,
          reason: error.message || 'Payment processing failed',
          timestamp: new Date().toISOString()
        } as PaymentFailedEvent)
      }]
    });

    throw new BadRequestError('Payment processing failed');
  }
};

const processPayPalPayment = async (paymentId: string, orderId: string, userId: string, amount: number) => {
  await pool.query(
    `UPDATE payments SET status = $1, transaction_id = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [PaymentStatus.COMPLETED, `paypal_${generateId()}`, paymentId]
  );

  await axios.patch(`${process.env.ORDER_SERVICE_URL}/${orderId}/status`, {
    status: 'PAID',
    paymentId
  });

  await producer.send({
    topic: KafkaTopics.PAYMENT_COMPLETED,
    messages: [{
      key: paymentId,
      value: JSON.stringify({
        paymentId,
        orderId,
        userId,
        amount,
        transactionId: `paypal_${generateId()}`,
        timestamp: new Date().toISOString()
      } as PaymentCompletedEvent)
    }]
  });

  return { success: true, transactionId: `paypal_${generateId()}` };
};

app.post('/process', async (req, res, next) => {
  try {
    const { orderId, userId, amount, method, token } = req.body;

    if (!orderId || !userId || !amount || !method) {
      throw new BadRequestError('orderId, userId, amount, and method are required');
    }

    const paymentId = generateId();

    await pool.query(
      `INSERT INTO payments (id, order_id, user_id, amount, method, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [paymentId, orderId, userId, amount, method, PaymentStatus.PENDING]
    );

    let result;
    if (method === PaymentMethod.STRIPE || method === PaymentMethod.CREDIT_CARD) {
      if (!token) {
        throw new BadRequestError('Payment token is required for card payments');
      }
      result = await processStripePayment(paymentId, orderId, userId, amount, token);
    } else if (method === PaymentMethod.PAYPAL) {
      result = await processPayPalPayment(paymentId, orderId, userId, amount);
    } else {
      throw new BadRequestError('Unsupported payment method');
    }

    const paymentResult = await pool.query('SELECT * FROM payments WHERE id = $1', [paymentId]);
    res.json(formatResponse({ ...paymentResult.rows[0], ...result }, 'Payment processed successfully'));
  } catch (error) {
    next(error);
  }
});

app.get('/', async (req, res, next) => {
  try {
    const { userId, orderId, status, page = 1, limit = 10 } = req.query;
    
    const query: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (userId) {
      query.push(`user_id = $${paramCount}`);
      values.push(userId);
      paramCount++;
    }
    if (orderId) {
      query.push(`order_id = $${paramCount}`);
      values.push(orderId);
      paramCount++;
    }
    if (status) {
      query.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    const whereClause = query.length > 0 ? `WHERE ${query.join(' AND ')}` : '';
    const offset = (Number(page) - 1) * Number(limit);

    const result = await pool.query(
      `SELECT * FROM payments ${whereClause} ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...values, Number(limit), offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM payments ${whereClause}`,
      values
    );

    res.json(formatResponse({
      payments: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(parseInt(countResult.rows[0].count) / Number(limit))
      }
    }));
  } catch (error) {
    next(error);
  }
});

app.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM payments WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      throw new NotFoundError('Payment');
    }
    res.json(formatResponse(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.post('/:id/refund', async (req, res, next) => {
  try {
    const payment = await pool.query('SELECT * FROM payments WHERE id = $1', [req.params.id]);
    if (payment.rows.length === 0) {
      throw new NotFoundError('Payment');
    }

    if (payment.rows[0].status !== PaymentStatus.COMPLETED) {
      throw new BadRequestError('Only completed payments can be refunded');
    }

    await pool.query(
      `UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [PaymentStatus.REFUNDED, req.params.id]
    );

    const updatedPayment = await pool.query('SELECT * FROM payments WHERE id = $1', [req.params.id]);
    res.json(formatResponse(updatedPayment.rows[0], 'Payment refunded successfully'));
  } catch (error) {
    next(error);
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'payment-service', timestamp: new Date().toISOString() });
});

app.use(errorLogger);

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(err.message);

  if (err instanceof NotFoundError || err instanceof BadRequestError) {
    return res.status(err.statusCode).json({ success: false, error: err.message });
  }

  res.status(500).json({ success: false, error: 'Internal server error' });
});

const start = async () => {
  await initDatabase();
  await connectKafka();
  app.listen(PORT, () => {
    logger.info(`Payment Service running on port ${PORT}`);
  });
};

start().catch(console.error);

export default app;
