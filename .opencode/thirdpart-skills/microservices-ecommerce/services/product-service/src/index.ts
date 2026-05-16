import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose, { Schema, Document } from 'mongoose';
import { Kafka, Producer } from 'kafkajs';
import { NotFoundError, BadRequestError, generateId, formatResponse, KafkaTopics } from '@ecommerce/shared';
import { logger, requestLogger, errorLogger } from './middleware/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8003;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

const productSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true, default: 0 },
  category: { type: String, required: true },
  images: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

const kafka = new Kafka({
  clientId: 'product-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});
const producer: Producer = kafka.producer();

const connectMongoDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/product_db');
  logger.info('MongoDB connected');
};

const connectKafka = async () => {
  await producer.connect();
  logger.info('Kafka producer connected');
};

app.get('/', async (req, res, next) => {
  try {
    const { category, minPrice, maxPrice, page = 1, limit = 10 } = req.query;
    
    const query: any = {};
    if (category) query.category = category;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const products = await Product.find(query)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(query);

    res.json(formatResponse({
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }));
  } catch (error) {
    next(error);
  }
});

app.get('/:id', async (req, res, next) => {
  try {
    const product = await Product.findOne({ id: req.params.id });
    if (!product) {
      throw new NotFoundError('Product');
    }
    res.json(formatResponse(product));
  } catch (error) {
    next(error);
  }
});

app.post('/', async (req, res, next) => {
  try {
    const { name, description, price, stock, category, images } = req.body;

    if (!name || !description || !price || !category) {
      throw new BadRequestError('Name, description, price, and category are required');
    }

    const product = new Product({
      id: generateId(),
      name,
      description,
      price,
      stock: stock || 0,
      category,
      images: images || []
    });

    await product.save();

    res.status(201).json(formatResponse(product, 'Product created successfully'));
  } catch (error) {
    next(error);
  }
});

app.put('/:id', async (req, res, next) => {
  try {
    const { name, description, price, stock, category, images } = req.body;

    const product = await Product.findOneAndUpdate(
      { id: req.params.id },
      {
        name,
        description,
        price,
        stock,
        category,
        images,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!product) {
      throw new NotFoundError('Product');
    }

    res.json(formatResponse(product, 'Product updated successfully'));
  } catch (error) {
    next(error);
  }
});

app.delete('/:id', async (req, res, next) => {
  try {
    const product = await Product.findOneAndDelete({ id: req.params.id });
    if (!product) {
      throw new NotFoundError('Product');
    }
    res.json(formatResponse(null, 'Product deleted successfully'));
  } catch (error) {
    next(error);
  }
});

app.patch('/:id/stock', async (req, res, next) => {
  try {
    const { quantity, operation } = req.body;

    if (!quantity || !operation) {
      throw new BadRequestError('Quantity and operation are required');
    }

    let updateQuery;
    if (operation === 'increment') {
      updateQuery = { $inc: { stock: quantity } };
    } else if (operation === 'decrement') {
      updateQuery = { $inc: { stock: -quantity } };
    } else if (operation === 'set') {
      updateQuery = { $set: { stock: quantity } };
    } else {
      throw new BadRequestError('Invalid operation. Use increment, decrement, or set');
    }

    const product = await Product.findOneAndUpdate(
      { id: req.params.id },
      updateQuery,
      { new: true, runValidators: true }
    );

    if (!product) {
      throw new NotFoundError('Product');
    }

    await producer.send({
      topic: KafkaTopics.PRODUCT_STOCK_UPDATED,
      messages: [{
        key: product.id,
        value: JSON.stringify({
          productId: product.id,
          stock: product.stock,
          timestamp: new Date().toISOString()
        })
      }]
    });

    res.json(formatResponse(product, 'Stock updated successfully'));
  } catch (error) {
    next(error);
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'product-service', timestamp: new Date().toISOString() });
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
  await connectMongoDB();
  await connectKafka();
  app.listen(PORT, () => {
    logger.info(`Product Service running on port ${PORT}`);
  });
};

start().catch(console.error);

export default app;
