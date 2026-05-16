import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { Kafka, Producer } from 'kafkajs';
import { UserRole, AuthToken, UserRegisteredEvent, KafkaTopics, generateId, BadRequestError, UnauthorizedError, ConflictError } from '@ecommerce/shared';
import { logger, requestLogger, errorLogger } from './middleware/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8001;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/auth_db',
});

const kafka = new Kafka({
  clientId: 'auth-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});
const producer: Producer = kafka.producer();

const initDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'CUSTOMER',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(500) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('Database initialized');
  } finally {
    client.release();
  }
};

const initKafka = async () => {
  await producer.connect();
  logger.info('Kafka producer connected');
};

const generateTokens = (user: { id: string; email: string; role: UserRole }): AuthToken => {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: 3600
  };
};

app.post('/register', async (req, res, next) => {
  try {
    const { email, username, password, role } = req.body;

    if (!email || !username || !password) {
      throw new BadRequestError('Email, username, and password are required');
    }

    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (existingUser.rows.length > 0) {
      throw new ConflictError('User with this email or username already exists');
    }

    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '10'));
    const userId = generateId();
    const userRole = role || UserRole.CUSTOMER;

    await pool.query(
      'INSERT INTO users (id, email, username, password_hash, role) VALUES ($1, $2, $3, $4, $5)',
      [userId, email, username, passwordHash, userRole]
    );

    const tokens = generateTokens({ id: userId, email, role: userRole });

    await producer.send({
      topic: KafkaTopics.USER_REGISTERED,
      messages: [{
        key: userId,
        value: JSON.stringify({
          userId,
          email,
          username,
          timestamp: new Date().toISOString()
        } as UserRegisteredEvent)
      }]
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        userId,
        email,
        username,
        role: userRole,
        tokens
      }
    });
  } catch (error) {
    next(error);
  }
});

app.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new BadRequestError('Email and password are required');
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        userId: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        tokens
      }
    });
  } catch (error) {
    next(error);
  }
});

app.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new BadRequestError('Refresh token is required');
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || 'secret') as { userId: string };

    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    if (result.rows.length === 0) {
      throw new UnauthorizedError('User not found');
    }

    const user = result.rows[0];
    const tokens = generateTokens({ id: user.id, email: user.email, role: user.role });

    res.json({
      success: true,
      data: { tokens }
    });
  } catch (error) {
    next(error);
  }
});

app.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

app.get('/verify', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string; email: string; role: UserRole };

    const result = await pool.query('SELECT id, email, username, role FROM users WHERE id = $1', [decoded.userId]);
    if (result.rows.length === 0) {
      throw new UnauthorizedError('User not found');
    }

    res.json({
      success: true,
      data: {
        valid: true,
        user: result.rows[0]
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'auth-service', timestamp: new Date().toISOString() });
});

app.use(errorLogger);

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(err.message);

  if (err instanceof BadRequestError || err instanceof UnauthorizedError || err instanceof ConflictError) {
    return res.status(err.statusCode).json({ success: false, error: err.message });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, error: 'Token expired' });
  }

  res.status(500).json({ success: false, error: 'Internal server error' });
});

const start = async () => {
  await initDatabase();
  await initKafka();
  app.listen(PORT, () => {
    logger.info(`Auth Service running on port ${PORT}`);
  });
};

start().catch(console.error);

export default app;
