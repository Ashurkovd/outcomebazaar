import { Pool, PoolClient } from 'pg';
import {
  Order, Trade, Market, OrderStatus, User, Position, OutcomeIndex,
  Withdrawal, WithdrawalStatus,
} from '../types';

export interface OtpRecord {
  email: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
}

export class InsufficientBalanceError extends Error {
  constructor() {
    super('Insufficient USDT balance');
    this.name = 'InsufficientBalanceError';
  }
}

export class InsufficientSharesError extends Error {
  constructor() {
    super('Insufficient shares');
    this.name = 'InsufficientSharesError';
  }
}

export class WithdrawalNotActionableError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'WithdrawalNotActionableError';
  }
}

export class MarketNotResolvableError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'MarketNotResolvableError';
  }
}

/**
 * DatabaseService - PostgreSQL persistence layer
 *
 * Handles all reads and writes for markets, orders, and trades.
 */
export class DatabaseService {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: connectionString.includes('railway') || connectionString.includes('render')
        ? { rejectUnauthorized: false }
        : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected DB pool error:', err);
    });
  }

  // ─── MARKETS ──────────────────────────────────────────────────────────────

  async createMarket(market: Omit<Market, 'createdAt' | 'updatedAt'>): Promise<Market> {
    const query = `
      INSERT INTO markets
        (id, question_id, question, description, category, creator, resolver,
         end_time, yes_position_id, no_position_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      market.id,
      (market as any).questionId,
      market.question,
      market.description ?? null,
      market.category,
      market.creator,
      market.resolver,
      market.endTime,
      (market as any).yesPositionId ?? null,
      (market as any).noPositionId ?? null,
      market.status,
    ]);
    return this.rowToMarket(result.rows[0]);
  }

  async getMarket(marketId: string): Promise<Market | null> {
    const result = await this.pool.query(
      'SELECT * FROM markets WHERE id = $1',
      [marketId]
    );
    return result.rows[0] ? this.rowToMarket(result.rows[0]) : null;
  }

  async deleteMarket(marketId: string): Promise<void> {
    await this.pool.query('DELETE FROM price_history WHERE market_id = $1', [marketId]);
    await this.pool.query('DELETE FROM trades WHERE market_id = $1', [marketId]);
    await this.pool.query('DELETE FROM orders WHERE market_id = $1', [marketId]);
    await this.pool.query('DELETE FROM markets WHERE id = $1', [marketId]);
  }

  async getActiveMarkets(category?: string): Promise<Market[]> {
    const query = category
      ? `SELECT * FROM markets WHERE status = 'ACTIVE' AND category = $1 ORDER BY end_time ASC`
      : `SELECT * FROM markets WHERE status = 'ACTIVE' ORDER BY end_time ASC`;

    const result = await this.pool.query(query, category ? [category] : []);
    return result.rows.map(this.rowToMarket);
  }

  async getAllMarkets(): Promise<Market[]> {
    const result = await this.pool.query(
      'SELECT * FROM markets ORDER BY created_at DESC'
    );
    return result.rows.map(this.rowToMarket);
  }

  async resolveMarket(
    marketId: string,
    outcome: 0 | 1,
    txHash: string
  ): Promise<void> {
    await this.pool.query(
      `UPDATE markets
       SET status = 'RESOLVED', outcome = $1, resolve_tx_hash = $2, resolution_time = NOW()
       WHERE id = $3`,
      [outcome, txHash, marketId]
    );
  }

  async cancelMarket(marketId: string): Promise<void> {
    await this.pool.query(
      `UPDATE markets SET status = 'CANCELLED' WHERE id = $1`,
      [marketId]
    );
  }

  // ─── ORDERS ───────────────────────────────────────────────────────────────

  async createOrder(order: Order): Promise<Order> {
    const query = `
      INSERT INTO orders
        (id, market_id, user_id, maker, side, outcome_index, price, size, filled,
         status, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      order.id,
      order.market,
      order.userId,
      order.maker,
      order.side,
      order.outcomeIndex,
      order.price,
      order.size,
      order.filled,
      order.status,
      new Date(order.expiresAt),
    ]);
    return this.rowToOrder(result.rows[0]);
  }

  /**
   * Atomically lock USDT and create a BUY order in one transaction.
   * Throws `InsufficientBalanceError` if the user doesn't have enough free USDT.
   */
  async placeBuyOrderWithLock(order: Order, cost: number): Promise<Order> {
    if (!order.userId) throw new Error('placeBuyOrderWithLock requires order.userId');

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const locked = await client.query(
        `UPDATE users
           SET usdt_locked = usdt_locked + $2
           WHERE id = $1 AND usdt_balance - usdt_locked >= $2
           RETURNING id`,
        [order.userId, cost]
      );
      if (locked.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new InsufficientBalanceError();
      }

      const result = await client.query(
        `INSERT INTO orders
          (id, market_id, user_id, maker, side, outcome_index, price, size, filled,
           status, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          order.id,
          order.market,
          order.userId,
          order.maker,
          order.side,
          order.outcomeIndex,
          order.price,
          order.size,
          order.filled,
          order.status,
          new Date(order.expiresAt),
        ]
      );

      await client.query('COMMIT');
      return this.rowToOrder(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => { /* ignore */ });
      throw err;
    } finally {
      client.release();
    }
  }

  /** Release `amount` of previously-locked USDT back to the user's free balance. */
  async releaseLockedBalance(userId: string, amount: number): Promise<void> {
    if (amount <= 0) return;
    await this.pool.query(
      `UPDATE users
         SET usdt_locked = GREATEST(usdt_locked - $2, 0)
         WHERE id = $1`,
      [userId, amount]
    );
  }

  /** Apply a fill against a buyer's locked funds: drain both usdt_locked and
   *  usdt_balance by the same amount. Used during matching. */
  async debitBalanceAndLock(userId: string, amount: number): Promise<void> {
    if (amount <= 0) return;
    await this.pool.query(
      `UPDATE users
         SET usdt_balance = GREATEST(usdt_balance - $2, 0),
             usdt_locked  = GREATEST(usdt_locked  - $2, 0)
         WHERE id = $1`,
      [userId, amount]
    );
  }

  /**
   * Atomically lock `sharesToLock` shares on the user's position and insert a
   * SELL order. Throws `InsufficientSharesError` if the user doesn't hold
   * enough free (unlocked) shares on that outcome.
   */
  async placeSellOrderWithLock(order: Order, sharesToLock: number): Promise<Order> {
    if (!order.userId) throw new Error('placeSellOrderWithLock requires order.userId');

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const locked = await client.query(
        `UPDATE positions
           SET locked_shares = locked_shares + $4
           WHERE user_id = $1 AND market_id = $2 AND outcome_index = $3
             AND shares - locked_shares >= $4
           RETURNING user_id`,
        [order.userId, order.market, order.outcomeIndex, sharesToLock]
      );
      if (locked.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new InsufficientSharesError();
      }

      const result = await client.query(
        `INSERT INTO orders
          (id, market_id, user_id, maker, side, outcome_index, price, size, filled,
           status, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          order.id,
          order.market,
          order.userId,
          order.maker,
          order.side,
          order.outcomeIndex,
          order.price,
          order.size,
          order.filled,
          order.status,
          new Date(order.expiresAt),
        ]
      );

      await client.query('COMMIT');
      return this.rowToOrder(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => { /* ignore */ });
      throw err;
    } finally {
      client.release();
    }
  }

  /** Atomically cancel an open order and release the unfilled lock
   *  (BUY → release USDT lock; SELL → release share lock). */
  async cancelOrderAndRelease(orderId: string, userId: string): Promise<'cancelled' | 'not_found' | 'already_terminal'> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query(
        `SELECT status, side, market_id, outcome_index, price, size, filled
           FROM orders WHERE id = $1 AND user_id = $2 FOR UPDATE`,
        [orderId, userId]
      );
      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return 'not_found';
      }
      if (existing.rows[0].status === 'FILLED' || existing.rows[0].status === 'CANCELLED') {
        await client.query('ROLLBACK');
        return 'already_terminal';
      }

      await client.query(
        `UPDATE orders SET status = 'CANCELLED' WHERE id = $1 AND user_id = $2`,
        [orderId, userId]
      );

      const row = existing.rows[0];
      const remaining = parseFloat(row.size) - parseFloat(row.filled);
      if (remaining > 0) {
        if (row.side === 'BUY') {
          const remainingCost = remaining * parseFloat(row.price) / 100;
          await client.query(
            `UPDATE users SET usdt_locked = GREATEST(usdt_locked - $2, 0) WHERE id = $1`,
            [userId, remainingCost]
          );
        } else {
          await client.query(
            `UPDATE positions
               SET locked_shares = GREATEST(locked_shares - $4, 0)
               WHERE user_id = $1 AND market_id = $2 AND outcome_index = $3`,
            [userId, row.market_id, row.outcome_index, remaining]
          );
        }
      }

      await client.query('COMMIT');
      return 'cancelled';
    } catch (err) {
      await client.query('ROLLBACK').catch(() => { /* ignore */ });
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Atomically settle one fill: debits the buyer's locked USDT, credits the
   * seller's USDT, updates both positions (buyer gains shares with weighted
   * avg_price, seller's shares+locked_shares drain), persists the updated
   * order rows, and inserts the trade with status=SETTLED.
   *
   * All in one transaction so any step failing rolls the whole fill back.
   */
  async settleTrade(params: {
    trade: Trade;
    buyerId: string;
    sellerId: string;
    marketId: string;
    outcomeIndex: OutcomeIndex;
    fillSize: number;
    fillPrice: number;
    buyOrderAfter: { filled: number; status: OrderStatus };
    sellOrderAfter: { filled: number; status: OrderStatus };
  }): Promise<void> {
    const {
      trade, buyerId, sellerId, marketId, outcomeIndex,
      fillSize, fillPrice, buyOrderAfter, sellOrderAfter,
    } = params;

    if (fillSize <= 0) return;

    const fillCost = Math.round((fillPrice * fillSize / 100) * 1_000_000) / 1_000_000;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Debit buyer's locked USDT + balance by fillCost.
      await client.query(
        `UPDATE users
           SET usdt_balance = GREATEST(usdt_balance - $2, 0),
               usdt_locked  = GREATEST(usdt_locked  - $2, 0)
           WHERE id = $1`,
        [buyerId, fillCost]
      );

      // 2. Credit seller's free USDT balance by fillCost.
      await client.query(
        `UPDATE users SET usdt_balance = usdt_balance + $2 WHERE id = $1`,
        [sellerId, fillCost]
      );

      // 3. Upsert buyer's position — shares += fillSize, weighted avg_price.
      await client.query(
        `INSERT INTO positions (user_id, market_id, outcome_index, shares, avg_price)
           VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, market_id, outcome_index) DO UPDATE
           SET shares = positions.shares + EXCLUDED.shares,
               avg_price = CASE
                 WHEN positions.shares = 0 OR positions.avg_price IS NULL THEN EXCLUDED.avg_price
                 ELSE (positions.shares * positions.avg_price
                       + EXCLUDED.shares * EXCLUDED.avg_price)
                      / (positions.shares + EXCLUDED.shares)
               END`,
        [buyerId, marketId, outcomeIndex, fillSize, fillPrice]
      );

      // 4. Debit seller's position — drain both shares and locked_shares.
      await client.query(
        `UPDATE positions
           SET shares        = GREATEST(shares        - $4, 0),
               locked_shares = GREATEST(locked_shares - $4, 0)
           WHERE user_id = $1 AND market_id = $2 AND outcome_index = $3`,
        [sellerId, marketId, outcomeIndex, fillSize]
      );

      // 5. Persist updated order state (filled, status) for both sides.
      await client.query(
        `UPDATE orders SET filled = $2, status = $3 WHERE id = $1`,
        [trade.buyOrderId, buyOrderAfter.filled, buyOrderAfter.status]
      );
      await client.query(
        `UPDATE orders SET filled = $2, status = $3 WHERE id = $1`,
        [trade.sellOrderId, sellOrderAfter.filled, sellOrderAfter.status]
      );

      // 6. Insert trade row as SETTLED.
      await client.query(
        `INSERT INTO trades
           (id, market_id, buy_order_id, sell_order_id, outcome_index, price, size, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'SETTLED')`,
        [trade.id, marketId, trade.buyOrderId, trade.sellOrderId,
         outcomeIndex, fillPrice, fillSize]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => { /* ignore */ });
      throw err;
    } finally {
      client.release();
    }
  }

  // ─── POSITIONS ────────────────────────────────────────────────────────────

  async getPosition(
    userId: string,
    marketId: string,
    outcomeIndex: OutcomeIndex
  ): Promise<Position | null> {
    const result = await this.pool.query(
      `SELECT * FROM positions
         WHERE user_id = $1 AND market_id = $2 AND outcome_index = $3`,
      [userId, marketId, outcomeIndex]
    );
    return result.rows[0] ? this.rowToPosition(result.rows[0]) : null;
  }

  async getPositionsByUser(userId: string, marketId?: string): Promise<Position[]> {
    const query = marketId
      ? `SELECT * FROM positions WHERE user_id = $1 AND market_id = $2 ORDER BY market_id, outcome_index`
      : `SELECT * FROM positions WHERE user_id = $1 AND shares > 0 ORDER BY market_id, outcome_index`;
    const result = await this.pool.query(
      query,
      marketId ? [userId, marketId] : [userId]
    );
    return result.rows.map(this.rowToPosition);
  }

  /**
   * Resolve a market atomically: mark the market RESOLVED with the winning
   * outcome, cancel every open order and release its lock, then credit the
   * winning side's positions at $1/share. Finally zero out every position on
   * the market (winners got paid, losers had no payout).
   */
  async resolveMarketAndPayout(
    marketId: string,
    outcome: OutcomeIndex
  ): Promise<{ winnersPaid: number; totalPayout: number; ordersCancelled: number }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const marketRow = await client.query(
        `SELECT status FROM markets WHERE id = $1 FOR UPDATE`,
        [marketId]
      );
      if (marketRow.rows.length === 0) {
        throw new MarketNotResolvableError('Market not found');
      }
      if (marketRow.rows[0].status !== 'ACTIVE') {
        throw new MarketNotResolvableError(
          `Market is ${marketRow.rows[0].status}, cannot resolve`
        );
      }

      await client.query(
        `UPDATE markets SET status = 'RESOLVED', outcome = $2, resolution_time = NOW()
           WHERE id = $1`,
        [marketId, outcome]
      );

      // Cancel every open order on this market. Release each lock.
      const openOrders = await client.query(
        `SELECT id, user_id, side, outcome_index, price, size, filled FROM orders
           WHERE market_id = $1 AND status IN ('OPEN', 'PARTIALLY_FILLED')
           FOR UPDATE`,
        [marketId]
      );

      for (const o of openOrders.rows) {
        if (!o.user_id) continue; // legacy wallet-only order, no lock to release
        const remaining = parseFloat(o.size) - parseFloat(o.filled);
        if (remaining <= 0) continue;

        if (o.side === 'BUY') {
          const remainingCost = remaining * parseFloat(o.price) / 100;
          await client.query(
            `UPDATE users SET usdt_locked = GREATEST(usdt_locked - $2, 0) WHERE id = $1`,
            [o.user_id, remainingCost]
          );
        } else {
          await client.query(
            `UPDATE positions
               SET locked_shares = GREATEST(locked_shares - $4, 0)
               WHERE user_id = $1 AND market_id = $2 AND outcome_index = $3`,
            [o.user_id, marketId, o.outcome_index, remaining]
          );
        }
      }

      await client.query(
        `UPDATE orders SET status = 'CANCELLED'
           WHERE market_id = $1 AND status IN ('OPEN', 'PARTIALLY_FILLED')`,
        [marketId]
      );

      // Pay the winners: $1 per share.
      const winners = await client.query(
        `SELECT user_id, shares FROM positions
           WHERE market_id = $1 AND outcome_index = $2 AND shares > 0`,
        [marketId, outcome]
      );

      let totalPayout = 0;
      for (const w of winners.rows) {
        const payout = parseFloat(w.shares);
        totalPayout += payout;
        await client.query(
          `UPDATE users SET usdt_balance = usdt_balance + $2 WHERE id = $1`,
          [w.user_id, payout]
        );
      }

      // Zero out positions on this market — winners paid, losers worthless.
      await client.query(
        `UPDATE positions SET shares = 0, locked_shares = 0 WHERE market_id = $1`,
        [marketId]
      );

      await client.query('COMMIT');

      return {
        winnersPaid: winners.rows.length,
        totalPayout: Math.round(totalPayout * 1_000_000) / 1_000_000,
        ordersCancelled: openOrders.rows.length,
      };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => { /* ignore */ });
      throw err;
    } finally {
      client.release();
    }
  }

  async updateOrder(orderId: string, updates: Partial<Pick<Order, 'filled' | 'status'>>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (updates.filled !== undefined) {
      fields.push(`filled = $${idx++}`);
      values.push(updates.filled);
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(updates.status);
    }

    if (fields.length === 0) return;

    values.push(orderId);
    await this.pool.query(
      `UPDATE orders SET ${fields.join(', ')} WHERE id = $${idx}`,
      values
    );
  }

  async getOrder(orderId: string): Promise<Order | null> {
    const result = await this.pool.query(
      'SELECT * FROM orders WHERE id = $1',
      [orderId]
    );
    return result.rows[0] ? this.rowToOrder(result.rows[0]) : null;
  }

  async getOrdersByMarket(
    marketId: string,
    status?: OrderStatus
  ): Promise<Order[]> {
    const query = status
      ? 'SELECT * FROM orders WHERE market_id = $1 AND status = $2 ORDER BY created_at DESC'
      : 'SELECT * FROM orders WHERE market_id = $1 ORDER BY created_at DESC';
    const result = await this.pool.query(query, status ? [marketId, status] : [marketId]);
    return result.rows.map(this.rowToOrder);
  }

  async getOrdersByUser(userId: string, marketId?: string): Promise<Order[]> {
    const query = marketId
      ? 'SELECT * FROM orders WHERE user_id = $1 AND market_id = $2 ORDER BY created_at DESC'
      : 'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC';
    const result = await this.pool.query(
      query,
      marketId ? [userId, marketId] : [userId]
    );
    return result.rows.map(this.rowToOrder);
  }

  /** Load all open orders for restoring order books on startup */
  async getOpenOrders(): Promise<Order[]> {
    const result = await this.pool.query(
      `SELECT * FROM orders WHERE status IN ('OPEN', 'PARTIALLY_FILLED') ORDER BY created_at ASC`
    );
    return result.rows.map(this.rowToOrder);
  }

  // ─── TRADES ───────────────────────────────────────────────────────────────

  async createTrade(trade: Trade): Promise<Trade> {
    // Get outcome_index from the buy order
    const orderResult = await this.pool.query(
      'SELECT outcome_index FROM orders WHERE id = $1',
      [trade.buyOrderId]
    );
    const outcomeIndex = orderResult.rows[0]?.outcome_index ?? 0;

    const query = `
      INSERT INTO trades
        (id, market_id, buy_order_id, sell_order_id, outcome_index, price, size, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      trade.id,
      trade.marketId,
      trade.buyOrderId,
      trade.sellOrderId,
      outcomeIndex,
      trade.price,
      trade.size,
      trade.status,
    ]);
    return this.rowToTrade(result.rows[0]);
  }

  async updateTradeStatus(tradeId: string, status: 'SETTLED' | 'FAILED', txHash?: string): Promise<void> {
    await this.pool.query(
      'UPDATE trades SET status = $1, tx_hash = $2 WHERE id = $3',
      [status, txHash ?? null, tradeId]
    );
  }

  async getTradesByMarket(marketId: string, limit = 50): Promise<Trade[]> {
    const result = await this.pool.query(
      'SELECT * FROM trades WHERE market_id = $1 ORDER BY created_at DESC LIMIT $2',
      [marketId, limit]
    );
    return result.rows.map(this.rowToTrade);
  }

  async getPendingTrades(): Promise<Trade[]> {
    const result = await this.pool.query(
      `SELECT * FROM trades WHERE status = 'PENDING' ORDER BY created_at ASC`
    );
    return result.rows.map(this.rowToTrade);
  }

  // ─── PRICE HISTORY ────────────────────────────────────────────────────────

  async recordPricePoint(
    marketId: string,
    outcomeIndex: number,
    price: number,
    volume: number
  ): Promise<void> {
    // Bucket to nearest hour
    const bucketTime = new Date();
    bucketTime.setMinutes(0, 0, 0);

    await this.pool.query(
      `INSERT INTO price_history (market_id, outcome_index, price, volume, bucket_time)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (market_id, outcome_index, bucket_time)
       DO UPDATE SET
         price = $3,
         volume = price_history.volume + $4`,
      [marketId, outcomeIndex, price, volume, bucketTime]
    );
  }

  async getPriceHistory(
    marketId: string,
    outcomeIndex: number,
    days = 7
  ): Promise<{ time: Date; price: number; volume: number }[]> {
    const result = await this.pool.query(
      `SELECT bucket_time as time, price, volume
       FROM price_history
       WHERE market_id = $1
         AND outcome_index = $2
         AND bucket_time >= NOW() - INTERVAL '${days} days'
       ORDER BY bucket_time ASC`,
      [marketId, outcomeIndex]
    );
    return result.rows;
  }

  // ─── USERS ────────────────────────────────────────────────────────────────

  async getUserById(id: string): Promise<User | null> {
    const result = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] ? this.rowToUser(result.rows[0]) : null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    return result.rows[0] ? this.rowToUser(result.rows[0]) : null;
  }

  /** Upsert a user by email. Returns the existing or newly-created row. */
  async upsertUserByEmail(email: string, countryCode?: string | null): Promise<User> {
    const result = await this.pool.query(
      `INSERT INTO users (email, country_code)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET
         country_code = COALESCE(users.country_code, EXCLUDED.country_code)
       RETURNING *`,
      [email.toLowerCase(), countryCode ?? null]
    );
    return this.rowToUser(result.rows[0]);
  }

  // ─── OTP CODES ────────────────────────────────────────────────────────────

  /** Most recent OTP for an email (by expires_at), or null. */
  async getLatestOtp(email: string): Promise<OtpRecord | null> {
    const result = await this.pool.query(
      `SELECT email, code_hash, expires_at, attempts
         FROM otp_codes
         WHERE email = $1
         ORDER BY expires_at DESC
         LIMIT 1`,
      [email.toLowerCase()]
    );
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    return {
      email: row.email,
      codeHash: row.code_hash,
      expiresAt: row.expires_at,
      attempts: row.attempts,
    };
  }

  async insertOtp(email: string, codeHash: string, expiresAt: Date): Promise<void> {
    await this.pool.query(
      `INSERT INTO otp_codes (email, code_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [email.toLowerCase(), codeHash, expiresAt]
    );
  }

  async incrementOtpAttempts(email: string, expiresAt: Date): Promise<void> {
    await this.pool.query(
      `UPDATE otp_codes SET attempts = attempts + 1
         WHERE email = $1 AND expires_at = $2`,
      [email.toLowerCase(), expiresAt]
    );
  }

  async deleteOtpsForEmail(email: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM otp_codes WHERE email = $1',
      [email.toLowerCase()]
    );
  }

  // ─── TRON DEPOSIT ADDRESSES ───────────────────────────────────────────────

  /** Allocate the next HD derivation index and assign the derived address,
   *  but only if the user does not already have one. Returns the row in its
   *  final state (possibly with an existing address if one was there). */
  async assignTronAddressIfMissing(
    userId: string,
    derive: (index: number) => string
  ): Promise<{ address: string; index: number }> {
    // Fast path: user already has an address.
    const existing = await this.pool.query<{ tron_deposit_address: string | null; tron_derivation_index: number | null }>(
      'SELECT tron_deposit_address, tron_derivation_index FROM users WHERE id = $1',
      [userId]
    );
    if (!existing.rows[0]) {
      throw new Error(`User ${userId} not found`);
    }
    if (existing.rows[0].tron_deposit_address && existing.rows[0].tron_derivation_index !== null) {
      return {
        address: existing.rows[0].tron_deposit_address,
        index: existing.rows[0].tron_derivation_index,
      };
    }

    // Allocate a fresh index from the sequence. Races are safe: each caller
    // gets a unique value; at worst we leave gaps if a later step fails.
    const seq = await this.pool.query<{ nextval: string }>(
      "SELECT nextval('tron_derivation_seq') AS nextval"
    );
    const index = parseInt(seq.rows[0].nextval, 10);
    const address = derive(index);

    // Only set the columns if still null — guards against a concurrent request
    // that already assigned one.
    const updated = await this.pool.query(
      `UPDATE users
         SET tron_deposit_address = $2, tron_derivation_index = $3
         WHERE id = $1 AND tron_deposit_address IS NULL
         RETURNING tron_deposit_address, tron_derivation_index`,
      [userId, address, index]
    );

    if (updated.rows[0]) {
      return { address, index };
    }

    // Lost the race — someone else assigned one. Re-read.
    const refetch = await this.pool.query(
      'SELECT tron_deposit_address, tron_derivation_index FROM users WHERE id = $1',
      [userId]
    );
    return {
      address: refetch.rows[0].tron_deposit_address,
      index: refetch.rows[0].tron_derivation_index,
    };
  }

  /** Every user that has a tron_deposit_address assigned — used by TronWatcher. */
  async getAllTronDepositTargets(): Promise<{ userId: string; address: string }[]> {
    const result = await this.pool.query(
      'SELECT id, tron_deposit_address FROM users WHERE tron_deposit_address IS NOT NULL'
    );
    return result.rows.map(r => ({
      userId: r.id as string,
      address: r.tron_deposit_address as string,
    }));
  }

  // ─── DEPOSITS ─────────────────────────────────────────────────────────────

  /** Atomically record a deposit and credit the user's balance. Idempotent on
   *  tron_tx_hash — a duplicate call returns false without re-crediting. */
  async creditDeposit(userId: string, txHash: string, amount: number): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const inserted = await client.query(
        `INSERT INTO deposits (user_id, tron_tx_hash, amount, status, credited_at)
           VALUES ($1, $2, $3, 'CREDITED', NOW())
           ON CONFLICT (tron_tx_hash) DO NOTHING
           RETURNING id`,
        [userId, txHash, amount]
      );

      if (inserted.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }

      await client.query(
        'UPDATE users SET usdt_balance = usdt_balance + $1 WHERE id = $2',
        [amount, userId]
      );

      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ─── WITHDRAWALS ──────────────────────────────────────────────────────────

  /**
   * Atomically debit the user's USDT balance by `amount + fee` and insert a
   * REQUESTED withdrawal row. Throws `InsufficientBalanceError` if the user
   * doesn't have enough free (unlocked) balance to cover the amount+fee.
   */
  async createWithdrawal(params: {
    userId: string;
    toAddress: string;
    amount: number;
    fee: number;
  }): Promise<Withdrawal> {
    const { userId, toAddress, amount, fee } = params;
    const total = amount + fee;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const debited = await client.query(
        `UPDATE users
           SET usdt_balance = usdt_balance - $2
           WHERE id = $1 AND usdt_balance - usdt_locked >= $2
           RETURNING id`,
        [userId, total]
      );
      if (debited.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new InsufficientBalanceError();
      }

      const inserted = await client.query(
        `INSERT INTO withdrawals (user_id, to_address, amount, fee, status)
           VALUES ($1, $2, $3, $4, 'REQUESTED')
           RETURNING *`,
        [userId, toAddress, amount, fee]
      );

      await client.query('COMMIT');
      return this.rowToWithdrawal(inserted.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => { /* ignore */ });
      throw err;
    } finally {
      client.release();
    }
  }

  async getWithdrawal(id: string): Promise<Withdrawal | null> {
    const result = await this.pool.query(
      'SELECT * FROM withdrawals WHERE id = $1',
      [id]
    );
    return result.rows[0] ? this.rowToWithdrawal(result.rows[0]) : null;
  }

  async listWithdrawals(status?: WithdrawalStatus): Promise<Withdrawal[]> {
    const query = status
      ? 'SELECT * FROM withdrawals WHERE status = $1 ORDER BY requested_at ASC'
      : 'SELECT * FROM withdrawals ORDER BY requested_at DESC';
    const result = await this.pool.query(query, status ? [status] : []);
    return result.rows.map(this.rowToWithdrawal);
  }

  async getWithdrawalsByUser(userId: string): Promise<Withdrawal[]> {
    const result = await this.pool.query(
      'SELECT * FROM withdrawals WHERE user_id = $1 ORDER BY requested_at DESC',
      [userId]
    );
    return result.rows.map(this.rowToWithdrawal);
  }

  /**
   * Mark a REQUESTED withdrawal as SENT with the broadcast Tron tx hash.
   * Idempotent when called repeatedly with the same tx_hash: second call is
   * a no-op (returns existing row). Throws if the row is not REQUESTED or
   * was previously marked SENT with a different tx hash.
   */
  async approveWithdrawal(id: string, tronTxHash: string): Promise<Withdrawal> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const row = await client.query(
        `SELECT status, tron_tx_hash FROM withdrawals WHERE id = $1 FOR UPDATE`,
        [id]
      );
      if (row.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new WithdrawalNotActionableError('Withdrawal not found');
      }
      const existing = row.rows[0];
      if (existing.status === 'SENT') {
        if (existing.tron_tx_hash === tronTxHash) {
          // Idempotent — already approved with this tx hash.
          const current = await client.query('SELECT * FROM withdrawals WHERE id = $1', [id]);
          await client.query('COMMIT');
          return this.rowToWithdrawal(current.rows[0]);
        }
        await client.query('ROLLBACK');
        throw new WithdrawalNotActionableError('Withdrawal already SENT with a different tx hash');
      }
      if (existing.status !== 'REQUESTED') {
        await client.query('ROLLBACK');
        throw new WithdrawalNotActionableError(`Withdrawal is ${existing.status}, cannot approve`);
      }

      const updated = await client.query(
        `UPDATE withdrawals
           SET status = 'SENT', tron_tx_hash = $2, sent_at = NOW()
           WHERE id = $1
           RETURNING *`,
        [id, tronTxHash]
      );

      await client.query('COMMIT');
      return this.rowToWithdrawal(updated.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => { /* ignore */ });
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Reject a REQUESTED withdrawal: mark as REJECTED and refund the user's
   * balance (amount + fee) in one transaction.
   */
  async rejectWithdrawal(id: string, reason: string | null): Promise<Withdrawal> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const row = await client.query(
        `SELECT user_id, amount, fee, status FROM withdrawals WHERE id = $1 FOR UPDATE`,
        [id]
      );
      if (row.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new WithdrawalNotActionableError('Withdrawal not found');
      }
      if (row.rows[0].status !== 'REQUESTED') {
        await client.query('ROLLBACK');
        throw new WithdrawalNotActionableError(
          `Withdrawal is ${row.rows[0].status}, cannot reject`
        );
      }

      const refund = parseFloat(row.rows[0].amount) + parseFloat(row.rows[0].fee);
      await client.query(
        `UPDATE users SET usdt_balance = usdt_balance + $2 WHERE id = $1`,
        [row.rows[0].user_id, refund]
      );

      const updated = await client.query(
        `UPDATE withdrawals
           SET status = 'REJECTED', reject_reason = $2
           WHERE id = $1
           RETURNING *`,
        [id, reason]
      );

      await client.query('COMMIT');
      return this.rowToWithdrawal(updated.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => { /* ignore */ });
      throw err;
    } finally {
      client.release();
    }
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  private rowToMarket(row: Record<string, unknown>): Market {
    return {
      id: row.id as string,
      question: row.question as string,
      description: row.description as string | undefined,
      category: row.category as string,
      creator: row.creator as string,
      resolver: row.resolver as string,
      endTime: row.end_time as Date,
      resolutionTime: row.resolution_time as Date | undefined,
      outcome: row.outcome as 0 | 1 | undefined,
      yesToken: row.yes_position_id as string | undefined,
      noToken: row.no_position_id as string | undefined,
      status: row.status as Market['status'],
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    };
  }

  private rowToOrder(row: Record<string, unknown>): Order {
    return {
      id: row.id as string,
      userId: (row.user_id as string | null) ?? null,
      maker: (row.maker as string | null) ?? null,
      market: row.market_id as string,
      conditionId: row.market_id as string,
      side: row.side as Order['side'],
      outcomeIndex: row.outcome_index as Order['outcomeIndex'],
      price: parseFloat(row.price as string),
      size: parseFloat(row.size as string),
      filled: parseFloat(row.filled as string),
      status: row.status as Order['status'],
      timestamp: (row.created_at as Date).getTime(),
      expiresAt: row.expires_at ? (row.expires_at as Date).getTime() : Date.now() + 86400000,
    };
  }

  private rowToUser(row: Record<string, unknown>): User {
    return {
      id: row.id as string,
      email: row.email as string,
      usdtBalance: parseFloat(row.usdt_balance as string),
      usdtLocked: parseFloat(row.usdt_locked as string),
      countryCode: (row.country_code as string | null) ?? null,
      createdAt: row.created_at as Date,
    };
  }

  private rowToPosition(row: Record<string, unknown>): Position {
    return {
      userId: row.user_id as string,
      marketId: row.market_id as string,
      outcomeIndex: row.outcome_index as OutcomeIndex,
      shares: parseFloat(row.shares as string),
      lockedShares: parseFloat(row.locked_shares as string),
      avgPrice: row.avg_price != null ? parseFloat(row.avg_price as string) : null,
    };
  }

  private rowToTrade(row: Record<string, unknown>): Trade {
    return {
      id: row.id as string,
      marketId: row.market_id as string,
      buyOrderId: row.buy_order_id as string,
      sellOrderId: row.sell_order_id as string,
      price: parseFloat(row.price as string),
      size: parseFloat(row.size as string),
      timestamp: (row.created_at as Date).getTime(),
      txHash: row.tx_hash as string | undefined,
      status: row.status as Trade['status'],
    };
  }

  private rowToWithdrawal(row: Record<string, unknown>): Withdrawal {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      toAddress: row.to_address as string,
      amount: parseFloat(row.amount as string),
      fee: parseFloat(row.fee as string),
      tronTxHash: (row.tron_tx_hash as string | null) ?? null,
      status: row.status as WithdrawalStatus,
      rejectReason: (row.reject_reason as string | null) ?? null,
      requestedAt: row.requested_at as Date,
      sentAt: (row.sent_at as Date | null) ?? null,
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
