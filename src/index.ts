import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import { OrderBookManager } from './matching/OrderBookManager';
import { DatabaseService } from './database/DatabaseService';
import { CTFService } from './services/CTFService';
import { createMarketRoutes } from './api/marketRoutes';
import { createOrderRoutes } from './api/orderRoutes';

const PORT = parseInt(process.env.PORT || '3001', 10);
const DATABASE_URL = process.env.DATABASE_URL || '';
const RPC_URL = process.env.RPC_URL || 'https://polygon-rpc.com';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const NETWORK = (process.env.NETWORK || 'polygon') as 'polygon' | 'amoy';

// ── Validate required env vars ─────────────────────────────────────────────

const missing = ['DATABASE_URL', 'PRIVATE_KEY'].filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  console.error('Copy .env.example to .env and fill in your values.');
  process.exit(1);
}

// ── Initialize services ────────────────────────────────────────────────────

const db = new DatabaseService(DATABASE_URL);
const orderBooks = new OrderBookManager();
const ctf = new CTFService(RPC_URL, PRIVATE_KEY, NETWORK);

// ── Express app ────────────────────────────────────────────────────────────

const app = express();

// CORS - allow your frontend domain
const allowedOrigins = [
  'http://localhost:3000',
  'https://outcomebazaar.vercel.app',
  'https://outcomebazaar.com',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

// Request logging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ── Routes ─────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', async (_req, res) => {
  const dbOk = await db.healthCheck();
  res.json({
    status: dbOk ? 'ok' : 'degraded',
    db: dbOk ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    network: NETWORK,
    markets: orderBooks.getMarketCount(),
  });
});

// Market routes: GET /api/markets, POST /api/markets/admin/create, etc.
app.use('/api/markets', createMarketRoutes(db, ctf, orderBooks));

// Order routes: POST /api/orders, GET /api/orderbook/:marketId, etc.
app.use('/api/orders', createOrderRoutes(db, orderBooks));

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Startup ────────────────────────────────────────────────────────────────

async function start(): Promise<void> {
  // Verify DB connection
  const dbOk = await db.healthCheck();
  if (!dbOk) {
    console.error('❌ Cannot connect to database. Check DATABASE_URL.');
    process.exit(1);
  }
  console.log('✅ Database connected');

  // Restore open orders from DB to in-memory order books
  try {
    const openOrders = await db.getOpenOrders();
    if (openOrders.length > 0) {
      orderBooks.restoreFromDatabase(openOrders);
    }
  } catch (err) {
    console.warn('Could not restore open orders (table may not exist yet):', (err as Error).message);
    console.warn('Run: npm run migrate');
  }

  // Start HTTP server
  app.listen(PORT, () => {
    console.log('');
    console.log('══════════════════════════════════════════════');
    console.log('  OutcomeBazaar Order Book API');
    console.log('══════════════════════════════════════════════');
    console.log(`  Network:  ${NETWORK}`);
    console.log(`  Port:     ${PORT}`);
    console.log(`  Health:   http://localhost:${PORT}/api/health`);
    console.log('══════════════════════════════════════════════');
    console.log('');
  });
}

start().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});

export default app;
