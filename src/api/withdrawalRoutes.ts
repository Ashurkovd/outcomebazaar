import { Router, Request, Response } from 'express';
import {
  DatabaseService,
  InsufficientBalanceError,
  WithdrawalNotActionableError,
} from '../database/DatabaseService';
import { createRequireAuth, requireAdmin } from '../middleware/auth';
import { WithdrawalStatus } from '../types';

/** Flat fee charged per withdrawal request (USDT). v1 is a hardcoded 1 USDT. */
const WITHDRAWAL_FEE = 1;

/** Minimum withdrawal amount (before fee) to keep dust off the admin queue. */
const MIN_WITHDRAWAL_AMOUNT = 10;

/** Tron mainnet base58 address: starts with T, 34 chars total, base58 alphabet. */
const TRON_ADDRESS_RE = /^T[A-HJ-NP-Za-km-z1-9]{33}$/;

/** TRC-20 tx hashes are 64 lowercase hex chars (no 0x prefix). */
const TRON_TX_HASH_RE = /^[0-9a-fA-F]{64}$/;

const VALID_STATUSES: WithdrawalStatus[] = ['REQUESTED', 'SENT', 'REJECTED'];

export function createWithdrawalRoutes(
  db: DatabaseService,
  jwtSecret: string
): { user: Router; admin: Router } {
  const user = Router();
  const admin = Router();
  const requireAuth = createRequireAuth(jwtSecret);

  // ── User endpoints (mounted at /api/withdrawals) ──────────────────────────

  // POST /api/withdrawals - request a withdrawal (auth required)
  user.post('/', requireAuth, async (req: Request, res: Response) => {
    try {
      const toAddress = typeof req.body?.to_address === 'string'
        ? req.body.to_address.trim()
        : '';
      const amountRaw = req.body?.amount;
      const amount = Number(amountRaw);

      if (!TRON_ADDRESS_RE.test(toAddress)) {
        return res.status(400).json({ error: 'Valid Tron address required' });
      }
      if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL_AMOUNT) {
        return res.status(400).json({
          error: `Minimum withdrawal is ${MIN_WITHDRAWAL_AMOUNT} USDT`,
        });
      }

      try {
        const w = await db.createWithdrawal({
          userId: req.user!.id,
          toAddress,
          amount,
          fee: WITHDRAWAL_FEE,
        });
        return res.status(201).json({ withdrawal: w });
      } catch (err) {
        if (err instanceof InsufficientBalanceError) {
          return res.status(402).json({ error: 'Insufficient USDT balance' });
        }
        throw err;
      }
    } catch (err) {
      console.error('POST /withdrawals error:', err);
      res.status(500).json({ error: 'Failed to create withdrawal' });
    }
  });

  // GET /api/withdrawals/me - current user's withdrawal history
  user.get('/me', requireAuth, async (req: Request, res: Response) => {
    try {
      const withdrawals = await db.getWithdrawalsByUser(req.user!.id);
      res.json({ withdrawals, count: withdrawals.length });
    } catch (err) {
      console.error('GET /withdrawals/me error:', err);
      res.status(500).json({ error: 'Failed to fetch withdrawals' });
    }
  });

  // ── Admin endpoints (mounted at /api/admin/withdrawals) ───────────────────

  // GET /api/admin/withdrawals?status=REQUESTED - list all (filter optional)
  admin.get('/', requireAdmin, async (req: Request, res: Response) => {
    try {
      const statusRaw = typeof req.query.status === 'string'
        ? req.query.status.toUpperCase()
        : undefined;
      if (statusRaw && !VALID_STATUSES.includes(statusRaw as WithdrawalStatus)) {
        return res.status(400).json({
          error: `status must be one of ${VALID_STATUSES.join(', ')}`,
        });
      }

      const withdrawals = await db.listWithdrawals(statusRaw as WithdrawalStatus | undefined);
      res.json({ withdrawals, count: withdrawals.length });
    } catch (err) {
      console.error('GET /admin/withdrawals error:', err);
      res.status(500).json({ error: 'Failed to fetch withdrawals' });
    }
  });

  // POST /api/admin/withdrawals/:id/approve - body: { tron_tx_hash }
  admin.post('/:id/approve', requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const tronTxHash = typeof req.body?.tron_tx_hash === 'string'
        ? req.body.tron_tx_hash.trim()
        : '';

      if (!TRON_TX_HASH_RE.test(tronTxHash)) {
        return res.status(400).json({ error: 'Valid 64-char hex tron_tx_hash required' });
      }

      try {
        const w = await db.approveWithdrawal(id, tronTxHash);
        res.json({ withdrawal: w });
      } catch (err) {
        if (err instanceof WithdrawalNotActionableError) {
          return res.status(409).json({ error: err.message });
        }
        throw err;
      }
    } catch (err) {
      console.error('POST /admin/withdrawals/:id/approve error:', err);
      res.status(500).json({ error: 'Failed to approve withdrawal' });
    }
  });

  // POST /api/admin/withdrawals/:id/reject - body: { reason? }
  admin.post('/:id/reject', requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const reason = typeof req.body?.reason === 'string'
        ? req.body.reason.trim().slice(0, 500)
        : null;

      try {
        const w = await db.rejectWithdrawal(id, reason);
        res.json({ withdrawal: w });
      } catch (err) {
        if (err instanceof WithdrawalNotActionableError) {
          return res.status(409).json({ error: err.message });
        }
        throw err;
      }
    } catch (err) {
      console.error('POST /admin/withdrawals/:id/reject error:', err);
      res.status(500).json({ error: 'Failed to reject withdrawal' });
    }
  });

  return { user, admin };
}
