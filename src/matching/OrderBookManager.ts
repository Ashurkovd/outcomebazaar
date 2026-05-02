import { Order, Trade, OrderBookSnapshot } from '../types';
import { OrderBook } from './OrderBook';

/**
 * Manages all order books in memory.
 * One OrderBook instance per market ID.
 *
 * In production, order books are rebuilt from DB on restart.
 */
export class OrderBookManager {
  private orderBooks: Map<string, OrderBook> = new Map();

  /**
   * Get or create an order book for a market.
   */
  getOrCreate(marketId: string): OrderBook {
    if (!this.orderBooks.has(marketId)) {
      this.orderBooks.set(marketId, new OrderBook(marketId));
    }
    return this.orderBooks.get(marketId)!;
  }

  /**
   * Place an order in the appropriate order book.
   * Returns list of trades executed (may be empty).
   */
  placeOrder(order: Order): Trade[] {
    const book = this.getOrCreate(order.market);
    return book.addOrder(order);
  }

  /**
   * Cancel an order.
   * Returns true if cancelled, false if not found or already terminal.
   */
  cancelOrder(marketId: string, orderId: string): boolean {
    const book = this.orderBooks.get(marketId);
    if (!book) return false;
    return book.cancelOrder(orderId);
  }

  /**
   * Get order book snapshot for display.
   */
  getSnapshot(marketId: string): OrderBookSnapshot | null {
    const book = this.orderBooks.get(marketId);
    if (!book) return null;
    return book.getSnapshot();
  }

  /**
   * Get a specific order by market and order ID.
   */
  getOrder(marketId: string, orderId: string): Order | undefined {
    return this.orderBooks.get(marketId)?.getOrder(orderId);
  }

  /**
   * Get all open orders for a user across all markets.
   */
  getUserOpenOrders(userId: string): Order[] {
    const orders: Order[] = [];
    for (const book of this.orderBooks.values()) {
      orders.push(...book.getOpenOrdersForUser(userId));
    }
    return orders;
  }

  /**
   * Get all open orders for a user in a specific market.
   */
  getUserOrdersInMarket(marketId: string, userId: string): Order[] {
    return this.orderBooks.get(marketId)?.getOpenOrdersForUser(userId) ?? [];
  }

  /**
   * Restore orders from database on server startup.
   * Call this during initialization to rebuild in-memory state.
   */
  restoreFromDatabase(orders: Order[]): void {
    // Sort by timestamp so orders are restored in original time priority
    const sorted = [...orders].sort((a, b) => a.timestamp - b.timestamp);

    for (const order of sorted) {
      if (order.status === 'OPEN' || order.status === 'PARTIALLY_FILLED') {
        const book = this.getOrCreate(order.market);
        // Add directly to book (skip re-matching to avoid duplicate trades)
        book['addToBook'](order);
        book['orders'].set(order.id, order);
      }
    }

    console.log(`Restored ${sorted.filter(o => o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED').length} open orders from DB`);
  }

  getMarketCount(): number {
    return this.orderBooks.size;
  }

  /**
   * Drop a market's entire in-memory book. Used when a market resolves or
   * gets cancelled — DB is the source of truth from that point on.
   */
  destroy(marketId: string): boolean {
    return this.orderBooks.delete(marketId);
  }
}
