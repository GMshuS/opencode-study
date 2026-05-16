import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { Kafka, Consumer, Producer } from 'kafkajs';
import { KafkaTopics, NotificationEvent, formatResponse } from '@ecommerce/shared';
import { logger, requestLogger, errorLogger } from './middleware/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8006;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});

const consumer: Consumer = kafka.consumer({ groupId: 'notification-service-group' });
const producer: Producer = kafka.producer();

const sendEmail = async (to: string, subject: string, body: string) => {
  try {
    await emailTransporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@ecommerce.com',
      to,
      subject,
      html: body
    });
    logger.info(`Email sent to ${to}`);
    return { success: true };
  } catch (error: any) {
    logger.error(`Failed to send email: ${error.message}`);
    throw error;
  }
};

const sendSMS = async (to: string, body: string) => {
  logger.info(`SMS sent to ${to}: ${body}`);
  return { success: true };
};

const sendPushNotification = async (userId: string, title: string, body: string) => {
  logger.info(`Push notification sent to user ${userId}: ${title}`);
  return { success: true };
};

const connectKafka = async () => {
  await producer.connect();
  await consumer.connect();

  await consumer.subscribe({ topic: KafkaTopics.ORDER_CREATED });
  await consumer.subscribe({ topic: KafkaTopics.PAYMENT_COMPLETED });
  await consumer.subscribe({ topic: KafkaTopics.PAYMENT_FAILED });
  await consumer.subscribe({ topic: KafkaTopics.USER_REGISTERED });
  await consumer.subscribe({ topic: KafkaTopics.NOTIFICATION_EMAIL });
  await consumer.subscribe({ topic: KafkaTopics.NOTIFICATION_SMS });
  await consumer.subscribe({ topic: KafkaTopics.NOTIFICATION_PUSH });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      if (!message.value) return;

      const value = JSON.parse(message.value.toString());
      logger.info(`Received message from topic: ${topic}`);

      try {
        switch (topic) {
          case KafkaTopics.ORDER_CREATED:
            await handleOrderCreated(value);
            break;
          case KafkaTopics.PAYMENT_COMPLETED:
            await handlePaymentCompleted(value);
            break;
          case KafkaTopics.PAYMENT_FAILED:
            await handlePaymentFailed(value);
            break;
          case KafkaTopics.USER_REGISTERED:
            await handleUserRegistered(value);
            break;
          case KafkaTopics.NOTIFICATION_EMAIL:
            await handleEmailNotification(value);
            break;
          case KafkaTopics.NOTIFICATION_SMS:
            await handleSMSNotification(value);
            break;
          case KafkaTopics.NOTIFICATION_PUSH:
            await handlePushNotification(value);
            break;
          default:
            logger.warn(`Unhandled topic: ${topic}`);
        }
      } catch (error: any) {
        logger.error(`Failed to process message from ${topic}: ${error.message}`);
      }
    }
  });

  logger.info('Kafka consumer connected and subscribed to topics');
};

const handleOrderCreated = async (event: any) => {
  const notification: NotificationEvent = {
    userId: event.userId,
    type: 'EMAIL',
    subject: 'Order Confirmation',
    body: `Your order ${event.orderId} has been created successfully. Total amount: $${event.totalAmount}`,
    timestamp: new Date()
  };

  await producer.send({
    topic: KafkaTopics.NOTIFICATION_EMAIL,
    messages: [{
      key: event.orderId,
      value: JSON.stringify(notification)
    }]
  });
};

const handlePaymentCompleted = async (event: any) => {
  const notification: NotificationEvent = {
    userId: event.userId,
    type: 'EMAIL',
    subject: 'Payment Successful',
    body: `Your payment for order ${event.orderId} has been processed successfully. Transaction ID: ${event.transactionId}`,
    timestamp: new Date()
  };

  await producer.send({
    topic: KafkaTopics.NOTIFICATION_EMAIL,
    messages: [{
      key: event.paymentId,
      value: JSON.stringify(notification)
    }]
  });
};

const handlePaymentFailed = async (event: any) => {
  const notification: NotificationEvent = {
    userId: event.userId,
    type: 'EMAIL',
    subject: 'Payment Failed',
    body: `Your payment for order ${event.orderId} has failed. Reason: ${event.reason}`,
    timestamp: new Date()
  };

  await producer.send({
    topic: KafkaTopics.NOTIFICATION_EMAIL,
    messages: [{
      key: event.paymentId,
      value: JSON.stringify(notification)
    }]
  });
};

const handleUserRegistered = async (event: any) => {
  const notification: NotificationEvent = {
    userId: event.userId,
    email: event.email,
    type: 'EMAIL',
    subject: 'Welcome to E-Commerce Platform',
    body: `Welcome ${event.username}! Your account has been created successfully.`,
    timestamp: new Date()
  };

  await producer.send({
    topic: KafkaTopics.NOTIFICATION_EMAIL,
    messages: [{
      key: event.userId,
      value: JSON.stringify(notification)
    }]
  });
};

const handleEmailNotification = async (event: NotificationEvent) => {
  if (event.email) {
    await sendEmail(event.email, event.subject, event.body);
  }
};

const handleSMSNotification = async (event: NotificationEvent) => {
  logger.info(`SMS notification for user ${event.userId}: ${event.subject}`);
};

const handlePushNotification = async (event: NotificationEvent) => {
  await sendPushNotification(event.userId, event.subject, event.body);
};

app.post('/send/email', async (req, res, next) => {
  try {
    const { to, subject, body } = req.body;
    if (!to || !subject || !body) {
      throw new Error('to, subject, and body are required');
    }
    await sendEmail(to, subject, body);
    res.json(formatResponse(null, 'Email sent successfully'));
  } catch (error) {
    next(error);
  }
});

app.post('/send/sms', async (req, res, next) => {
  try {
    const { to, body } = req.body;
    if (!to || !body) {
      throw new Error('to and body are required');
    }
    await sendSMS(to, body);
    res.json(formatResponse(null, 'SMS sent successfully'));
  } catch (error) {
    next(error);
  }
});

app.post('/send/push', async (req, res, next) => {
  try {
    const { userId, title, body } = req.body;
    if (!userId || !title || !body) {
      throw new Error('userId, title, and body are required');
    }
    await sendPushNotification(userId, title, body);
    res.json(formatResponse(null, 'Push notification sent successfully'));
  } catch (error) {
    next(error);
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'notification-service', timestamp: new Date().toISOString() });
});

app.use(errorLogger);

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

const start = async () => {
  await connectKafka();
  app.listen(PORT, () => {
    logger.info(`Notification Service running on port ${PORT}`);
  });
};

start().catch(console.error);

export default app;
