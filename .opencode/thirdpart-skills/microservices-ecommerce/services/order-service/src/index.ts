import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { Kafka, Producer } from 'kafkajs';
import axios from 'axios';
import { NotFoundError, BadRequestError, generateId, formatResponse, OrderStatus, KafkaTopics, OrderCreatedEvent } from '@ecommerce/shared';
import { logger, requestLogger, errorLogger } from './middleware/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8004;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5434/order_db',
});

const kafka = new Kafka({
  clientId: 'order-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});
const producer: Producer = kafka.producer();

const initDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        items JSONB NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        payment_id VARCHAR(255),
        shipping_address JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('Order database initialized');
  } finally {
    client.release();
  }
};

const connectKafka = async () => {
  await producer.connect();
  logger.info('Kafka producer connected');
};

app.post('/', async (req, res, next) => {
  try {
    const { userId, items, shippingAddress } = req.body;

    if (!userId || !items || items.length === 0 || !shippingAddress) {
      throw new BadRequestError('userId, items, and shippingAddress are required');
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const productResponse = await axios.get(`${process.env.PRODUCT_SERVICE_URL}/${item.productId}`);
      const product = productResponse.data.data;

      if (product.stock < item.quantity) {
        throw new BadRequestError(`Insufficient stock for product: ${product.name}`);
      }

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price
      });

      totalAmount += product.price * item.quantity;
    }

    const orderId = generateId();

    await pool.query(
      `INSERT INTO orders (id, user_id, items, total_amount, status, shipping_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [orderId, userId, JSON.stringify(orderItems), totalAmount, OrderStatus.PENDING, JSON.stringify(shippingAddress)]
    );

    for (const item of items) {
      await axios.patch(`${process.env.PRODUCT_SERVICE_URL}/${item.productId}/stock`, {
        quantity: item.quantity,
        operation: 'decrement'
      });
    }

    await producer.send({
      topic: KafkaTopics.ORDER_CREATED,
      messages: [{
        key: orderId,
        value: JSON.stringify({
          orderId,
          userId,
          items: orderItems,
          totalAmount,
          timestamp: new Date().toISOString()
        } as OrderCreatedEvent)
      }]
    });

    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    res.status(201).json(formatResponse(result.rows[0], 'Order created successfully'));
  } catch (error) {
    next(error);
  }
});

app.get('/', async (req, res, next) => {
  try {
    const { userId, status, page = 1, limit = 10 } = req.query;
    
    const query: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (userId) {
      query.push(`user_id = $${paramCount}`);
      values.push(userId);
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
      `SELECT * FROM orders ${whereClause} ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...values, Number(limit), offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM orders ${whereClause}`,
      values
    );

    res.json(formatResponse({
      orders: result.rows,
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
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      throw new NotFoundError('Order');
    }
    res.json(formatResponse(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.patch('/:id/status', async (req, res, next) => {
  try {
    const { status, paymentId } = req.body;

    if (!status) {
      throw new BadRequestError('Status is required');
    }

    const result = await pool.query(
      `UPDATE orders SET status = $1, payment_id = COALESCE($2, payment_id), updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
      [status, paymentId, req.params.id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Order');
    }

    await producer.send({
      topic: KafkaTopics.ORDER_UPDATED,
      messages: [{
        key: req.params.id,
        value: JSON.stringify({
          orderId: req.params.id,
          status,
          paymentId,
          timestamp: new Date().toISOString()
        })
      }]
    });

    res.json(formatResponse(result.rows[0], 'Order status updated successfully'));
  } catch (error) {
    next(error);
  }
});

app.post('/:id/cancel', async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND status IN ($3, $4) RETURNING *`,
      [OrderStatus.CANCELLED, req.params.id, OrderStatus.PENDING, OrderStatus.CONFIRMED]
    );

    if (result.rows.length === 0) {
      throw new BadRequestError('Order cannot be cancelled');
    }

    const order = result.rows[0];
    for (const item of order.items) {
      await axios.patch(`${process.env.PRODUCT_SERVICE_URL}/${item.productId}/stock`, {
        quantity: item.quantity,
        operation: 'increment'
      });
    }

    res.json(formatResponse(result.rows[0], 'Order cancelled successfully'));
  } catch (error) {
    next(error);
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'order-service', timestamp: new Date().toISOString() });
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
    logger.info(`Order Service running on port ${PORT}`);
  });
};

start().catch(console.error);

export default app;
