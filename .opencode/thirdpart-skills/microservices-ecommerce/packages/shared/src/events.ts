export enum KafkaTopics {
  ORDER_CREATED = 'order.created',
  ORDER_UPDATED = 'order.updated',
  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
  USER_REGISTERED = 'user.registered',
  PRODUCT_STOCK_UPDATED = 'product.stock.updated',
  NOTIFICATION_EMAIL = 'notification.email',
  NOTIFICATION_SMS = 'notification.sms',
  NOTIFICATION_PUSH = 'notification.push'
}

export interface KafkaMessage {
  topic: KafkaTopics;
  key: string;
  value: Record<string, unknown>;
  timestamp?: Date;
}

export interface OrderCreatedEvent {
  orderId: string;
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  timestamp: Date;
}

export interface PaymentCompletedEvent {
  paymentId: string;
  orderId: string;
  userId: string;
  amount: number;
  transactionId: string;
  timestamp: Date;
}

export interface PaymentFailedEvent {
  paymentId: string;
  orderId: string;
  userId: string;
  amount: number;
  reason: string;
  timestamp: Date;
}

export interface UserRegisteredEvent {
  userId: string;
  email: string;
  username: string;
  timestamp: Date;
}

export interface NotificationEvent {
  userId: string;
  email?: string;
  type: 'EMAIL' | 'SMS' | 'PUSH';
  subject: string;
  body: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}
