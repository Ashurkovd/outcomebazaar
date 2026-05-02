// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL ERROR HANDLERS - MUST BE FIRST!
// ═══════════════════════════════════════════════════════════════════════════

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ ❌ ❌ UNHANDLED REJECTION ❌ ❌ ❌');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  console.error('Stack:', reason instanceof Error ? reason.stack : 'N/A');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ ❌ ❌ UNCAUGHT EXCEPTION ❌ ❌ ❌');
  console.error('Message:', error.message);
  console.error('Name:', error.name);
  console.error('Stack:', error.stack);
  process.exit(1);
});

console.log('🔧 Global error handlers installed');

// ═══════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════

console.log('📦 Loading imports...');

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

console.log('   ✓ express, cors, dotenv, express-rate-limit loaded');

dotenv.config();
console.log('   ✓ dotenv.config() called');

import { OrderBookManager } from './matching/OrderBookManager';
import { DatabaseService } from './database/DatabaseService';
import { CTFService } from './services/CTFService';
import { EmailService } from './services/EmailService';
import { TronAddressService } from './services/TronAddressService';
import { TronWatcher } from './services/TronWatcher';
import { createMarketRoutes } from './api/marketRoutes';
import { createOrderRoutes } from './api/orderRoutes';
import { createAuthRoutes } from './api/authRoutes';
import { createWithdrawalRoutes } from './api/withdrawalRoutes';
import { geoBlock } from './middleware/geoBlock';

console.log('✅ All imports loaded successfully');

// ═══════════════════════════════════════════════════════════════════════════
// ENVIRONMENT VARIABLES
// ═══════════════════════════════════════════════════════════════════════════

console.log('🔍 Checking environment variables...');

const PORT = parseInt(process.env.PORT || '3001', 10);
const DATABASE_URL = process.env.DATABASE_URL || '';
const RPC_URL = process.env.RPC_URL || 'https://polygon-rpc.com';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const NETWORK = (process.env.NETWORK || 'polygon') as 'polygon' | 'amoy';
const JWT_SECRET = process.env.JWT_SECRET || '';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const OTP_FROM_EMAIL = process.env.OTP_FROM_EMAIL || 'OutcomeBazaar <onboarding@resend.dev>';
const TRON_HD_MNEMONIC = process.env.TRON_HD_MNEMONIC || '';
const TRON_NETWORK = (process.env.TRON_NETWORK || 'mainnet') as 'mainnet' | 'shasta';
const TRONGRID_API_KEY = process.env.TRONGRID_API_KEY;
const TRON_WATCHER_ENABLED = (process.env.TRON_WATCHER_ENABLED ?? 'true').toLowerCase() !== 'false';

console.log('✅ Environment variables loaded:');
console.log('   DATABASE_URL exists:', !!DATABASE_URL);
console.log('   DATABASE_URL starts with:', DATABASE_URL.substring(0, 20) + '...');
console.log('   RPC_URL:', RPC_URL);
console.log('   PORT:', PORT);
console.log('   NETWORK:', NETWORK);
console.log('   PRIVATE_KEY exists:', !!PRIVATE_KEY);
console.log('   JWT_SECRET exists:', !!JWT_SECRET);
console.log('   RESEND_API_KEY exists:', !!RESEND_API_KEY);
console.log('   TRON_HD_MNEMONIC exists:', !!TRON_HD_MNEMONIC);

// ── Validate required env vars ─────────────────────────────────────────────

const missing = ['DATABASE_URL', 'PRIVATE_KEY', 'JWT_SECRET'].filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  console.error('Copy .env.example to .env and fill in your values.');
  process.exit(1);
}

console.log('✅ All required environment variables present');

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SERVER STARTUP
// ═══════════════════════════════════════════════════════════════════════════

async function startServer(): Promise<void> {
  try {
    console.log('');
    console.log('🚀 Starting OutcomeBazaar backend...');
    console.log('');

    // ── Step 1: Initialize services ───────────────────────────────────────

    console.log('📍 CHECKPOINT 1 - Initializing services...');

    console.log('   Creating DatabaseService...');
    const db = new DatabaseService(DATABASE_URL);
    console.log('   ✓ DatabaseService created');

    console.log('   Creating OrderBookManager...');
    const orderBooks = new OrderBookManager();
    console.log('   ✓ OrderBookManager created');

    console.log('   Creating CTFService...');
    const ctf = new CTFService(RPC_URL, PRIVATE_KEY, NETWORK);
    console.log('   ✓ CTFService created');

    console.log('   Creating EmailService...');
    const emailService = new EmailService(RESEND_API_KEY, OTP_FROM_EMAIL);
    console.log('   ✓ EmailService created');

    console.log('   Creating TronAddressService...');
    const tronAddresses = TRON_HD_MNEMONIC
      ? new TronAddressService(TRON_HD_MNEMONIC)
      : null;
    if (!tronAddresses) {
      console.warn('   ⚠️  TRON_HD_MNEMONIC not set — deposit addresses disabled');
    } else {
      console.log('   ✓ TronAddressService created');
    }

    console.log('   Creating TronWatcher...');
    const tronWatcher = tronAddresses && TRON_WATCHER_ENABLED
      ? new TronWatcher(db, { network: TRON_NETWORK, apiKey: TRONGRID_API_KEY })
      : null;
    if (tronWatcher) {
      console.log('   ✓ TronWatcher created');
    } else {
      console.log('   · TronWatcher disabled (no mnemonic or TRON_WATCHER_ENABLED=false)');
    }

    console.log('✅ All services initialized');

    // ── Step 2: Create Express app ────────────────────────────────────────

    console.log('📍 CHECKPOINT 2 - Creating Express app...');
    const app = express();

    // Trust Cloudflare / Railway proxy so req.ip is the real client (used by
    // rate limiter + geo-block) instead of the proxy IP.
    app.set('trust proxy', 1);
    console.log('✅ Express app created (trust proxy = 1)');

    // ── Step 3: Configure middleware ──────────────────────────────────────

    console.log('📍 CHECKPOINT 3 - Configuring middleware...');

    // CORS
    const allowedOrigins = [
      'http://localhost:3000',
      'https://outcomebazaar.vercel.app',
      'https://outcomebazaar.com',
      ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
    ];

    console.log('   Setting up CORS with origins:', allowedOrigins);

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

    console.log('   ✓ CORS configured');

    app.use(express.json({ limit: '1mb' }));
    console.log('   ✓ JSON body parser configured');

    // Request logging
    app.use((req, _res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });
    console.log('   ✓ Request logger configured');

    // Geo-block — sits before all routes; exempts /api/health and /api/admin.
    app.use(geoBlock);
    console.log('   ✓ Geo-block middleware configured');

    console.log('✅ Middleware configured');

    // ── Step 4: Test database connection ──────────────────────────────────

    console.log('📍 CHECKPOINT 4 - Testing database connection...');

    let dbOk = false;
    try {
      dbOk = await db.healthCheck();
      console.log('   Database health check result:', dbOk);
    } catch (dbError) {
      console.error('   ❌ Database health check threw error:', dbError);
      throw dbError;
    }

    if (!dbOk) {
      console.error('❌ Cannot connect to database. Check DATABASE_URL.');
      console.error('   DATABASE_URL:', DATABASE_URL.substring(0, 30) + '...');
      process.exit(1);
    }

    console.log('✅ Database connected successfully');

    // ── Step 5: Restore orders from database ──────────────────────────────

    console.log('📍 CHECKPOINT 5 - Restoring open orders...');

    try {
      const openOrders = await db.getOpenOrders();
      console.log('   Found', openOrders.length, 'open orders');

      if (openOrders.length > 0) {
        console.log('   Restoring orders to in-memory order books...');
        orderBooks.restoreFromDatabase(openOrders);
        console.log('   ✓ Orders restored');
      }
    } catch (err) {
      console.warn('⚠️  Could not restore open orders (table may not exist yet)');
      console.warn('   Error:', (err as Error).message);
      console.warn('   This is OK if you haven\'t run migrations yet');
      console.warn('   Run: npm run migrate');
    }

    console.log('✅ Order restoration complete');

    // ── Step 6: Set up routes ─────────────────────────────────────────────

    console.log('📍 CHECKPOINT 6 - Setting up routes...');

    // Health check
    console.log('   Adding health check route...');
    app.get('/api/health', async (_req, res) => {
      try {
        const dbOk = await db.healthCheck();
        res.json({
          status: dbOk ? 'ok' : 'degraded',
          db: dbOk ? 'connected' : 'disconnected',
          timestamp: new Date().toISOString(),
          network: NETWORK,
          markets: orderBooks.getMarketCount(),
        });
      } catch (err) {
        console.error('Health check error:', err);
        res.status(500).json({ status: 'error', error: (err as Error).message });
      }
    });
    console.log('   ✓ Health route added');

    // Rate limiter for /api/auth/* — 5 OTP requests per 15min per IP.
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 5,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: 'Too many requests — try again in 15 minutes' },
    });

    // Auth routes: POST /api/auth/request-otp, POST /api/auth/verify-otp + GET /api/me/*
    console.log('   Adding auth + me routes...');
    try {
      const { auth: authRouter, me: meRouter } = createAuthRoutes(db, emailService, JWT_SECRET, tronAddresses);
      app.use('/api/auth', authLimiter, authRouter);
      app.use('/api/me', meRouter);
      console.log('   ✓ Auth + me routes added');
    } catch (routeError) {
      console.error('   ❌ Error creating auth routes:', routeError);
      throw routeError;
    }

    // Market routes
    console.log('   Adding market routes...');
    try {
      app.use('/api/markets', createMarketRoutes(db, ctf, orderBooks));
      console.log('   ✓ Market routes added');
    } catch (routeError) {
      console.error('   ❌ Error creating market routes:', routeError);
      throw routeError;
    }

    // Order routes
    console.log('   Adding order routes...');
    try {
      app.use('/api/orders', createOrderRoutes(db, orderBooks, JWT_SECRET));
      console.log('   ✓ Order routes added');
    } catch (routeError) {
      console.error('   ❌ Error creating order routes:', routeError);
      throw routeError;
    }

    // Withdrawal routes
    console.log('   Adding withdrawal routes...');
    try {
      const { user: withdrawalUserRouter, admin: withdrawalAdminRouter } =
        createWithdrawalRoutes(db, JWT_SECRET);
      app.use('/api/withdrawals', withdrawalUserRouter);
      app.use('/api/admin/withdrawals', withdrawalAdminRouter);
      console.log('   ✓ Withdrawal routes added');
    } catch (routeError) {
      console.error('   ❌ Error creating withdrawal routes:', routeError);
      throw routeError;
    }

    // 404 fallback
    app.use((_req, res) => {
      res.status(404).json({ error: 'Not found' });
    });
    console.log('   ✓ 404 handler added');

    // Error handler
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('❌ Unhandled error in request:', err);
      res.status(500).json({ error: 'Internal server error', message: err.message });
    });
    console.log('   ✓ Error handler added');

    console.log('✅ All routes configured');

    // ── Step 7: Start HTTP server ─────────────────────────────────────────

    console.log('📍 CHECKPOINT 7 - Starting HTTP server...');
    console.log('   PORT:', PORT);
    console.log('   Binding to: 0.0.0.0 (required for Railway)');
    console.log('');

    console.log('📍 FINAL CHECKPOINT - Calling app.listen()...');

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('══════════════════════════════════════════════');
      console.log('✅ ✅ ✅ SERVER IS RUNNING! ✅ ✅ ✅');
      console.log('══════════════════════════════════════════════');
      console.log(`  Network:  ${NETWORK}`);
      console.log(`  Port:     ${PORT}`);
      console.log(`  Host:     0.0.0.0`);
      console.log(`  Health:   http://localhost:${PORT}/api/health`);
      console.log(`  Time:     ${new Date().toISOString()}`);
      console.log('══════════════════════════════════════════════');
      console.log('');

      // ── Step 8: Start background workers ─────────────────────────────
      if (tronWatcher) {
        tronWatcher.start();
        console.log('🛰️  TronWatcher started');
      }
    });

    // Server error handler
    server.on('error', (error: NodeJS.ErrnoException) => {
      console.error('');
      console.error('❌ ❌ ❌ SERVER ERROR ❌ ❌ ❌');
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error name:', error.name);
      console.error('Full error:', error);
      console.error('Stack:', error.stack);
      console.error('');

      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use!`);
        console.error('Try a different port or stop the other process.');
      } else if (error.code === 'EACCES') {
        console.error(`Permission denied to bind to port ${PORT}`);
        console.error('Try using a port >= 1024 or run with elevated privileges.');
      }

      process.exit(1);
    });

    console.log('📍 app.listen() called successfully');
    console.log('   Waiting for server to start listening...');

  } catch (error) {
    console.error('');
    console.error('❌ ❌ ❌ FATAL ERROR DURING STARTUP ❌ ❌ ❌');
    console.error('');
    console.error('Error message:', (error as Error).message);
    console.error('Error name:', (error as Error).name);
    console.error('Error type:', typeof error);
    console.error('Full error object:', error);
    console.error('');
    console.error('Stack trace:');
    console.error((error as Error).stack);
    console.error('');
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// START THE SERVER
// ═══════════════════════════════════════════════════════════════════════════

console.log('📍 INITIAL - Calling startServer()...');

startServer().catch((err) => {
  console.error('');
  console.error('❌ ❌ ❌ startServer() FAILED ❌ ❌ ❌');
  console.error('Error:', err);
  console.error('Stack:', err.stack);
  console.error('');
  process.exit(1);
});

console.log('📍 startServer() promise created, execution continues...');
