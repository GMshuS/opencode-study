import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { NotFoundError, BadRequestError, generateId, formatResponse } from '@ecommerce/shared';
import { logger, requestLogger, errorLogger } from './middleware/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8002;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/user_db',
});

const initDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        avatar_url TEXT,
        address_street VARCHAR(255),
        address_city VARCHAR(100),
        address_state VARCHAR(100),
        address_zip_code VARCHAR(20),
        address_country VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('User database initialized');
  } finally {
    client.release();
  }
};

app.get('/profile/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]);
    
    if (result.rows.length === 0) {
      throw new NotFoundError('User profile');
    }

    res.json(formatResponse(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.put('/profile/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, phone, avatarUrl, address } = req.body;

    const existingProfile = await pool.query('SELECT id FROM user_profiles WHERE user_id = $1', [userId]);
    
    if (existingProfile.rows.length === 0) {
      const profileId = generateId();
      await pool.query(
        `INSERT INTO user_profiles (id, user_id, first_name, last_name, phone, avatar_url, 
          address_street, address_city, address_state, address_zip_code, address_country)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [profileId, userId, firstName, lastName, phone, avatarUrl,
          address?.street, address?.city, address?.state, address?.zipCode, address?.country]
      );
    } else {
      await pool.query(
        `UPDATE user_profiles SET first_name = $1, last_name = $2, phone = $3, avatar_url = $4,
          address_street = $5, address_city = $6, address_state = $7, address_zip_code = $8, 
          address_country = $9, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $10`,
        [firstName, lastName, phone, avatarUrl,
          address?.street, address?.city, address?.state, address?.zipCode, address?.country, userId]
      );
    }

    const result = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]);
    res.json(formatResponse(result.rows[0], 'Profile updated successfully'));
  } catch (error) {
    next(error);
  }
});

app.get('/addresses/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      'SELECT address_street as street, address_city as city, address_state as state, address_zip_code as "zipCode", address_country as country FROM user_profiles WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      throw new NotFoundError('Address');
    }

    res.json(formatResponse(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'user-service', timestamp: new Date().toISOString() });
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
  app.listen(PORT, () => {
    logger.info(`User Service running on port ${PORT}`);
  });
};

start().catch(console.error);

export default app;
