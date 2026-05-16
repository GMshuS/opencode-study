import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { UserRole, UnauthorizedError, ForbiddenError } from '@ecommerce/shared';
import { logger, requestLogger, errorLogger } from './middleware/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: { success: false, error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

const verifyToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('No token provided');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string; role: UserRole };
    (req as any).user = decoded;
    next();
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
};

const requireRole = (...roles: UserRole[]) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }
    next();
  };
};

const authRoutes = {
  target: process.env.AUTH_SERVICE_URL || 'http://localhost:8001',
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '' }
};

const userRoutes = {
  target: process.env.USER_SERVICE_URL || 'http://localhost:8002',
  changeOrigin: true,
  pathRewrite: { '^/api/users': '' }
};

const productRoutes = {
  target: process.env.PRODUCT_SERVICE_URL || 'http://localhost:8003',
  changeOrigin: true,
  pathRewrite: { '^/api/products': '' }
};

const orderRoutes = {
  target: process.env.ORDER_SERVICE_URL || 'http://localhost:8004',
  changeOrigin: true,
  pathRewrite: { '^/api/orders': '' }
};

const paymentRoutes = {
  target: process.env.PAYMENT_SERVICE_URL || 'http://localhost:8005',
  changeOrigin: true,
  pathRewrite: { '^/api/payments': '' }
};

app.use('/api/auth', createProxyMiddleware(authRoutes));

app.use('/api/users', verifyToken, createProxyMiddleware(userRoutes));

app.use('/api/products', createProxyMiddleware(productRoutes));

app.use('/api/orders', verifyToken, createProxyMiddleware(orderRoutes));

app.use('/api/payments', verifyToken, createProxyMiddleware(paymentRoutes));

app.use('/api/admin', verifyToken, requireRole(UserRole.ADMIN), createProxyMiddleware({
  target: process.env.USER_SERVICE_URL || 'http://localhost:8002',
  changeOrigin: true,
  pathRewrite: { '^/api/admin': '/admin' }
}));

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'api-gateway', timestamp: new Date().toISOString() });
});

app.use(errorLogger);

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(err.message);
  
  if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message
    });
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info(`Auth Service: ${process.env.AUTH_SERVICE_URL}`);
  logger.info(`User Service: ${process.env.USER_SERVICE_URL}`);
  logger.info(`Product Service: ${process.env.PRODUCT_SERVICE_URL}`);
  logger.info(`Order Service: ${process.env.ORDER_SERVICE_URL}`);
  logger.info(`Payment Service: ${process.env.PAYMENT_SERVICE_URL}`);
});

export default app;
