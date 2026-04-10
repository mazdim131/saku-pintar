import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import savingGoalRoutes from './routes/savingGoalRoutes.js';
import budgetRoutes from './routes/budgetRoutes.js';

dotenv.config();

const app = express();
app.set('trust proxy', 1);

const isProd = process.env.NODE_ENV === 'production';

// Setup logging
const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: !isProd }),
    winston.format.json()
  ),
  defaultMeta: { service: 'sakupintar-backend' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    ...(isProd ? [
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/combined.log' })
    ] : [])
  ]
});

// Create logs directory if in production
if (isProd) {
  try {
    await fs.mkdir('logs', { recursive: true });
  } catch (err) {
    console.error('Could not create logs directory:', err);
  }
}

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Terlalu banyak permintaan, Silahkan coba lagi nanti.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit auth attempts
  message: {
    error: 'Terlalu banyak percobaan, Silahkan coba lagi nanti.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

function errorResponse(res, status, message, error) {
  logger.error('API Error:', { status, message, error: error?.message, stack: error?.stack });

  if (isProd) {
    return res.status(status).json({ error: message });
  }
  return res.status(status).json({ error: message, details: error?.message });
}

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/saving-goals', savingGoalRoutes);
app.use('/api/budgets', budgetRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to SakuPintar API' });
});

async function initSchema() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const schemaPath = path.resolve(__dirname, './db/schema.sql');
  const sql = await fs.readFile(schemaPath, 'utf8');
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    // schema.sql uses CREATE TABLE IF NOT EXISTS so it's safe to run on startup
    await db.query(stmt);
  }
}

// Test DB Connection
app.get('/api/test-db', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS solution');
    res.json({ message: 'Database connected successfully', data: rows });
  } catch (error) {
    const message =
      error?.code === 'ECONNREFUSED'
        ? 'Tidak bisa konek ke MySQL. Pastikan MySQL service berjalan (localhost:3306).'
        : (error?.message || String(error) || 'Database connection failed');
    return errorResponse(res, 500, message, error);
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  try {
    if (!process.env.JWT_SECRET) {
      logger.warn('JWT_SECRET is not set. Authentication will fail until it is provided.');
    }
    await initSchema();
    logger.info(`Database schema initialized successfully`);
  } catch (e) {
    const msg = e?.code === 'ECONNREFUSED'
      ? 'Failed to initialize schema: cannot connect to database'
      : `Failed to initialize schema: ${e?.message || e}`;
    logger.error(msg, { error: e });
  }

  logger.info(`Server is running on port ${PORT} in ${isProd ? 'production' : 'development'} mode`);
  if (!isProd) {
    logger.info(`API available at: http://localhost:${PORT}`);
  }
});
