import { Order, Trade, OrderSide } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Single-market order book with price-time priority matching.
 *
 * Each market has TWO order books: one for YES outcome, one for NO outcome.
 * The outcomeIndex (0=YES, 1=NO) is embedded in orders.
 *
 * Price is in cents (1-99). A buy at 65¢ means:
 * - "I'll pay 65 USDT per 100 shares worth" = "I think this has 65% probability"
 *
 * Matching rule: BUY price >= SELL price → match at SELL price (maker's price).
 */
export class OrderBook {
  // All orders by ID
  private orders: Map<string, Order> = new Map();

  // Bids (BUY orders): price → orders sorted by time (oldest first)
  private bids: Map<number, Order[]> = new Map();

  // Asks (SELL orders): price → orders sorted by time (oldest first)
  private asks: Map<number, Order[]> = new Map();

  private lastTradePrice?: number;

  constructor(public readonly marketId: string) {}

  /**
   * Add an order to the book. Immediately tries to match.
   * Returns all trades executed (may be empty if no match).
   */
  addOrder(order: Order): Trade[] {
    // Store the order
    this.orders.set(order.id, order);

    // Try to match immediately
    const trades = this.matchOrder(order);

    // If order still has unfilled quantity, add to resting book
    if (order.filled < order.size && order.status !== 'CANCELLED' && order.status !== 'FILLED') {
      this.addToBook(order);
    }

    return trades;
  }

  /**
   * Core matching logic: price-time priority
   */
  private matchOrder(incoming: Order): Trade[] {
    const trades: Trade[] = [];

    if (incoming.side === 'BUY') {
      // Match against asks (SELL orders), lowest price first
      const sortedAskPrices = this.getSortedAskPrices();

      for (const askPrice of sortedAskPrices) {
        // Stop if incoming buy price is below the best ask
        if (incoming.price < askPrice) break;
        // Stop if fully filled
        if (incoming.filled >= incoming.size) break;

        const askOrders = this.asks.get(askPrice) || [];

        for (let i = 0; i < askOrders.length; i++) {
          const restingOrder = askOrders[i];
          if (incoming.filled >= incoming.size) break;

          const matchSize = Math.min(
            this.roundUsdt(incoming.size - incoming.filled),
            this.roundUsdt(restingOrder.size - restingOrder.filled)
          );

          if (matchSize <= 0) continue;

          const trade = this.createTrade(incoming, restingOrder, askPrice, matchSize);
          trades.push(trade);

          incoming.filled = this.roundUsdt(incoming.filled + matchSize);
          restingOrder.filled = this.roundUsdt(restingOrder.filled + matchSize);

          if (restingOrder.filled >= restingOrder.size) {
            restingOrder.status = 'FILLED';
            askOrders.splice(i, 1);
            i--;
          } else {
            restingOrder.status = 'PARTIALLY_FILLED';
          }
        }

        // Clean up empty price levels
        if (askOrders.length === 0) {
          this.asks.delete(askPrice);
        }
      }
    } else {
      // SELL order: match against bids (BUY orders), highest price first
      const sortedBidPrices = this.getSortedBidPrices();

      for (const bidPrice of sortedBidPrices) {
        // Stop if incoming sell price is above the best bid
        if (incoming.price > bidPrice) break;
        // Stop if fully filled
        if (incoming.filled >= incoming.size) break;

        const bidOrders = this.bids.get(bidPrice) || [];

        for (let i = 0; i < bidOrders.length; i++) {
          const restingOrder = bidOrders[i];
          if (incoming.filled >= incoming.size) break;

          const matchSize = Math.min(
            this.roundUsdt(incoming.size - incoming.filled),
            this.roundUsdt(restingOrder.size - restingOrder.filled)
          );

          if (matchSize <= 0) continue;

          // Maker's price (the resting bid)
          const trade = this.createTrade(restingOrder, incoming, bidPrice, matchSize);
          trades.push(trade);

          incoming.filled = this.roundUsdt(incoming.filled + matchSize);
          restingOrder.filled = this.roundUsdt(restingOrder.filled + matchSize);

          if (restingOrder.filled >= restingOrder.size) {
            restingOrder.status = 'FILLED';
            bidOrders.splice(i, 1);
            i--;
          } else {
            restingOrder.status = 'PARTIALLY_FILLED';
          }
        }

        // Clean up empty price levels
        if (bidOrders.length === 0) {
          this.bids.delete(bidPrice);
        }
      }
    }

    // Update incoming order status
    if (incoming.filled >= incoming.size) {
      incoming.status = 'FILLED';
    } else if (incoming.filled > 0) {
      incoming.status = 'PARTIALLY_FILLED';
    }

    if (trades.length > 0) {
      this.lastTradePrice = trades[trades.length - 1].price;
    }

    return trades;
  }

  private createTrade(buyOrder: Order, sellOrder: Order, price: number, size: number): Trade {
    return {
      id: uuidv4(),
      marketId: this.marketId,
      buyOrderId: buyOrder.id,
      sellOrderId: sellOrder.id,
      price,
      size,
      timestamp: Date.now(),
      status: 'PENDING',
    };
  }

  private addToBook(order: Order): void {
    const book = order.side === 'BUY' ? this.bids : this.asks;

    if (!book.has(order.price)) {
      book.set(order.price, []);
    }
    book.get(order.price)!.push(order);
  }

  /**
   * Cancel an open order. Returns true if cancelled, false if not found/already done.
   */
  cancelOrder(orderId: string): boolean {
    const order = this.orders.get(orderId);
    if (!order || order.status === 'FILLED' || order.status === 'CANCELLED') {
      return false;
    }

    // Remove from price level
    const book = order.side === 'BUY' ? this.bids : this.asks;
    const priceLevel = book.get(order.price);

    if (priceLevel) {
      const idx = priceLevel.findIndex(o => o.id === orderId);
      if (idx !== -1) {
        priceLevel.splice(idx, 1);
      }
      if (priceLevel.length === 0) {
        book.delete(order.price);
      }
    }

    order.status = 'CANCELLED';
    return true;
  }

  /**
   * Returns aggregated order book snapshot.
   * Bids: sorted high-to-low. Asks: sorted low-to-high.
   * Each entry: [price, totalSize]
   */
  getSnapshot(): { bids: [number, number][]; asks: [number, number][]; lastTradePrice?: number; spread?: number } {
    const bids: [number, number][] = [];
    const asks: [number, number][] = [];

    for (const [price, orders] of this.bids) {
      const totalSize = orders.reduce((sum, o) => sum + (o.size - o.filled), 0);
      if (totalSize > 0) bids.push([price, this.roundUsdt(totalSize)]);
    }

    for (const [price, orders] of this.asks) {
      const totalSize = orders.reduce((sum, o) => sum + (o.size - o.filled), 0);
      if (totalSize > 0) asks.push([price, this.roundUsdt(totalSize)]);
    }

    bids.sort((a, b) => b[0] - a[0]);  // High to low
    asks.sort((a, b) => a[0] - b[0]);  // Low to high

    const bestBid = bids[0]?.[0];
    const bestAsk = asks[0]?.[0];
    const spread = bestBid && bestAsk ? bestAsk - bestBid : undefined;

    return { bids, asks, lastTradePrice: this.lastTradePrice, spread };
  }

  getOrder(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  getOpenOrdersForUser(makerAddress: string): Order[] {
    return Array.from(this.orders.values()).filter(
      o => o.maker.toLowerCase() === makerAddress.toLowerCase() &&
           (o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED')
    );
  }

  getTotalOrders(): number {
    return this.orders.size;
  }

  /** Bid prices sorted highest first */
  private getSortedBidPrices(): number[] {
    return Array.from(this.bids.keys()).sort((a, b) => b - a);
  }

  /** Ask prices sorted lowest first */
  private getSortedAskPrices(): number[] {
    return Array.from(this.asks.keys()).sort((a, b) => a - b);
  }

  /** Round to 6 decimal places (USDT precision) */
  private roundUsdt(value: number): number {
    return Math.round(value * 1_000_000) / 1_000_000;
  }
}
