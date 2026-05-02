/**
 * Admin CLI — read-only inspection helpers for v1 ops.
 *
 * Usage:
 *   npm run admin users                  # list users + balances
 *   npm run admin withdrawals            # list pending withdrawals
 *   npm run admin withdrawals all        # list all withdrawals
 *   npm run admin markets                # list markets + status
 *   npm run admin balance <userId>       # detail for one user
 *
 * Mutating ops (resolve markets, approve/reject withdrawals) intentionally
 * stay on the HTTP admin endpoints with X-Admin-Key — fewer code paths to
 * the same state.
 */

import dotenv from 'dotenv';
dotenv.config();

import { DatabaseService } from '../database/DatabaseService';

const DATABASE_URL = process.env.DATABASE_URL || '';
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const db = new DatabaseService(DATABASE_URL);

async function listUsers(): Promise<void> {
  const rows = await (db as unknown as { pool: { query: Function } }).pool.query(
    `SELECT id, email, country_code, usdt_balance, usdt_locked, created_at
       FROM users
       ORDER BY created_at DESC
       LIMIT 100`
  );
  console.table(rows.rows.map((r: Record<string, unknown>) => ({
    id: (r.id as string).slice(0, 8) + '…',
    email: r.email,
    country: r.country_code ?? '—',
    balance: parseFloat(r.usdt_balance as string).toFixed(2),
    locked: parseFloat(r.usdt_locked as string).toFixed(2),
    created: (r.created_at as Date).toISOString().slice(0, 10),
  })));
  console.log(`(${rows.rows.length} user(s))`);
}

async function listWithdrawals(filter: 'pending' | 'all'): Promise<void> {
  const status = filter === 'pending' ? 'REQUESTED' : undefined;
  const rows = await db.listWithdrawals(status as 'REQUESTED' | undefined);
  if (rows.length === 0) {
    console.log(`No ${filter} withdrawals.`);
    return;
  }
  console.table(rows.map((w) => ({
    id: w.id.slice(0, 8) + '…',
    user: w.userId.slice(0, 8) + '…',
    amount: w.amount.toFixed(2),
    fee: w.fee.toFixed(2),
    status: w.status,
    to: w.toAddress.slice(0, 10) + '…',
    txHash: w.tronTxHash ? w.tronTxHash.slice(0, 10) + '…' : '—',
    requested: w.requestedAt.toISOString().slice(0, 16).replace('T', ' '),
  })));
  console.log(`(${rows.length} withdrawal(s))`);
}

async function listMarkets(): Promise<void> {
  const markets = await db.getAllMarkets();
  console.table(markets.map((m) => ({
    id: m.id.slice(0, 12) + '…',
    question: (m.question || '').slice(0, 50),
    status: m.status,
    endTime: m.endTime instanceof Date ? m.endTime.toISOString().slice(0, 10) : m.endTime,
  })));
  console.log(`(${markets.length} market(s))`);
}

async function userDetail(userId: string): Promise<void> {
  const user = await db.getUserById(userId);
  if (!user) {
    console.error('User not found:', userId);
    process.exit(1);
  }
  console.log('User:', user);

  const positions = await db.getPositionsByUser(userId);
  console.log('\nPositions:');
  if (positions.length === 0) console.log('  (none)');
  else console.table(positions.map((p) => ({
    market: p.marketId.slice(0, 12) + '…',
    outcome: p.outcomeIndex === 0 ? 'YES' : 'NO',
    shares: p.shares.toFixed(2),
    locked: p.lockedShares.toFixed(2),
    avgPrice: p.avgPrice ?? '—',
  })));

  const wds = await db.getWithdrawalsByUser(userId);
  console.log('\nWithdrawals:');
  if (wds.length === 0) console.log('  (none)');
  else console.table(wds.map((w) => ({
    id: w.id.slice(0, 8) + '…',
    amount: w.amount,
    status: w.status,
    requested: w.requestedAt.toISOString().slice(0, 16).replace('T', ' '),
  })));
}

async function main(): Promise<void> {
  const [, , cmd, arg] = process.argv;
  switch (cmd) {
    case 'users':
      await listUsers();
      break;
    case 'withdrawals':
      await listWithdrawals(arg === 'all' ? 'all' : 'pending');
      break;
    case 'markets':
      await listMarkets();
      break;
    case 'balance':
      if (!arg) {
        console.error('Usage: npm run admin balance <userId>');
        process.exit(1);
      }
      await userDetail(arg);
      break;
    default:
      console.error('Usage: npm run admin <users|withdrawals [all]|markets|balance <userId>>');
      process.exit(1);
  }
}

main()
  .then(() => db.close())
  .catch((err) => {
    console.error('Error:', err);
    db.close().finally(() => process.exit(1));
  });
