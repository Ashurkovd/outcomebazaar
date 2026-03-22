import { Pool, PoolClient } from 'pg';
import { Order, Trade, Market, OrderStatus } from '../types';

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
        (id, market_id, maker, side, outcome_index, price, size, filled,
         status, expires_at, signature)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const result = await this.pool.query(query, [
      order.id,
      order.market,
      order.maker,
      order.side,
      order.outcomeIndex,
      order.price,
      order.size,
      order.filled,
      order.status,
      new Date(order.expiresAt),
      order.signature ?? null,
    ]);
    return this.rowToOrder(result.rows[0]);
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

  async getOrdersByMaker(maker: string, marketId?: string): Promise<Order[]> {
    const query = marketId
      ? 'SELECT * FROM orders WHERE maker = $1 AND market_id = $2 ORDER BY created_at DESC'
      : 'SELECT * FROM orders WHERE maker = $1 ORDER BY created_at DESC';
    const result = await this.pool.query(
      query,
      marketId ? [maker, marketId] : [maker]
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
      maker: row.maker as string,
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
      signature: row.signature as string | undefined,
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
