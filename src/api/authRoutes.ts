import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { DatabaseService } from '../database/DatabaseService';
import { EmailService } from '../services/EmailService';
import { TronAddressService } from '../services/TronAddressService';
import { signUserJwt, createRequireAuth } from '../middleware/auth';

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const BCRYPT_ROUNDS = 10;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateOtp(): string {
  // 6 digits, zero-padded. crypto.randomInt via Node is safe, but Math.random
  // paired with bcrypt hashing at rest is acceptable for a 10-min login code.
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function createAuthRoutes(
  db: DatabaseService,
  email: EmailService,
  jwtSecret: string,
  tronAddresses: TronAddressService | null
): { auth: Router; me: Router } {
  const auth = Router();
  const me = Router();
  const requireAuth = createRequireAuth(jwtSecret);

  // POST /api/auth/request-otp
  auth.post('/request-otp', async (req: Request, res: Response) => {
    try {
      const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      if (!EMAIL_RE.test(rawEmail)) {
        return res.status(400).json({ error: 'Valid email required' });
      }

      // Rate-limit: 1 OTP per minute per email.
      const latest = await db.getLatestOtp(rawEmail);
      if (latest) {
        const createdAtMs = latest.expiresAt.getTime() - OTP_TTL_MS;
        if (Date.now() - createdAtMs < OTP_COOLDOWN_MS) {
          return res.status(429).json({ error: 'Please wait before requesting another code' });
        }
      }

      const code = generateOtp();
      const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);
      const expiresAt = new Date(Date.now() + OTP_TTL_MS);

      // Clear any stale OTPs for this email so verify only considers the newest.
      await db.deleteOtpsForEmail(rawEmail);
      await db.insertOtp(rawEmail, codeHash, expiresAt);

      await email.sendOtp(rawEmail, code);

      res.json({ ok: true });
    } catch (err) {
      console.error('POST /auth/request-otp error:', err);
      res.status(500).json({ error: 'Failed to send code' });
    }
  });

  // POST /api/auth/verify-otp
  auth.post('/verify-otp', async (req: Request, res: Response) => {
    try {
      const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';

      if (!EMAIL_RE.test(rawEmail) || !/^\d{6}$/.test(code)) {
        return res.status(400).json({ error: 'Valid email and 6-digit code required' });
      }

      const record = await db.getLatestOtp(rawEmail);
      if (!record) {
        return res.status(400).json({ error: 'No active code — request a new one' });
      }

      if (record.expiresAt.getTime() < Date.now()) {
        return res.status(400).json({ error: 'Code expired — request a new one' });
      }

      if (record.attempts >= MAX_OTP_ATTEMPTS) {
        return res.status(429).json({ error: 'Too many attempts — request a new code' });
      }

      const ok = await bcrypt.compare(code, record.codeHash);
      if (!ok) {
        await db.incrementOtpAttempts(rawEmail, record.expiresAt);
        return res.status(400).json({ error: 'Invalid code' });
      }

      await db.deleteOtpsForEmail(rawEmail);

      const countryCode = (req.header('cf-ipcountry') || '').slice(0, 2) || null;
      const user = await db.upsertUserByEmail(rawEmail, countryCode);

      const token = signUserJwt({ id: user.id, email: user.email }, jwtSecret);
      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          usdt_balance: user.usdtBalance,
          usdt_locked: user.usdtLocked,
        },
      });
    } catch (err) {
      console.error('POST /auth/verify-otp error:', err);
      res.status(500).json({ error: 'Verification failed' });
    }
  });

  // GET /api/me - protected
  me.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await db.getUserById(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({
        id: user.id,
        email: user.email,
        usdt_balance: user.usdtBalance,
        usdt_locked: user.usdtLocked,
        country_code: user.countryCode,
        created_at: user.createdAt,
      });
    } catch (err) {
      console.error('GET /me error:', err);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  // GET /api/me/positions - current user's positions (optionally filtered by market)
  me.get('/positions', requireAuth, async (req: Request, res: Response) => {
    try {
      const marketId = typeof req.query.marketId === 'string' ? req.query.marketId : undefined;
      const positions = await db.getPositionsByUser(req.user!.id, marketId);
      res.json({ positions, count: positions.length });
    } catch (err) {
      console.error('GET /me/positions error:', err);
      res.status(500).json({ error: 'Failed to fetch positions' });
    }
  });

  // GET /api/me/deposit-address - protected, lazy-assigns on first call
  me.get('/deposit-address', requireAuth, async (req: Request, res: Response) => {
    try {
      if (!tronAddresses) {
        return res.status(503).json({ error: 'Deposits unavailable (TRON_HD_MNEMONIC not configured)' });
      }
      const { address } = await db.assignTronAddressIfMissing(
        req.user!.id,
        (index) => tronAddresses.deriveAddress(index)
      );
      res.json({ address, network: 'tron', asset: 'USDT-TRC20' });
    } catch (err) {
      console.error('GET /me/deposit-address error:', err);
      res.status(500).json({ error: 'Failed to get deposit address' });
    }
  });

  return { auth, me };
}
