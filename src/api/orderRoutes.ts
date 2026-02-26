import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../database/DatabaseService';
import { OrderBookManager } from '../matching/OrderBookManager';
import { Order, PlaceOrderRequest } from '../types';

const qs = (val: unknown): string | undefined =>
  typeof val === 'string' ? val : undefined;

export function createOrderRoutes(
  db: DatabaseService,
  orderBooks: OrderBookManager
): Router {
  const router = Router();

  // GET /api/orderbook/:marketId - Get order book snapshot
  router.get('/book/:marketId', (req: Request, res: Response): void => {
    const snapshot = orderBooks.getSnapshot(String(req.params.marketId));
    res.json(snapshot ?? { bids: [], asks: [], lastTradePrice: null });
  });

  // POST /api/orders - Place a new order
  router.post('/', async (req: Request, res: Response) => {
    try {
      const body = req.body as PlaceOrderRequest;
      const { marketId, maker, side, outcomeIndex, price, size, signature } = body;

      // ── Validation ────────────────────────────────────────────────
      if (!marketId || !maker || !side || outcomeIndex === undefined || !price || !size) {
        return res.status(400).json({
          error: 'Missing required fields: marketId, maker, side, outcomeIndex, price, size',
        });
      }

      if (!['BUY', 'SELL'].includes(side.toUpperCase())) {
        return res.status(400).json({ error: 'side must be BUY or SELL' });
      }

      if (![0, 1].includes(outcomeIndex)) {
        return res.status(400).json({ error: 'outcomeIndex must be 0 (YES) or 1 (NO)' });
      }

      const priceNum = Number(price);
      const sizeNum = Number(size);

      if (isNaN(priceNum) || priceNum <= 0 || priceNum >= 100) {
        return res.status(400).json({ error: 'price must be between 1 and 99 (cents)' });
      }

      if (isNaN(sizeNum) || sizeNum <= 0) {
        return res.status(400).json({ error: 'size must be positive' });
      }

      if (sizeNum < 1) {
        return res.status(400).json({ error: 'Minimum order size is 1 USDT' });
      }

      // Validate maker is a valid Ethereum address
      if (!/^0x[0-9a-fA-F]{40}$/.test(maker)) {
        return res.status(400).json({ error: 'Invalid maker address' });
      }

      // ── Verify market exists and is active ────────────────────────
      const market = await db.getMarket(marketId);
      if (!market) {
        return res.status(404).json({ error: 'Market not found' });
      }
      if (market.status !== 'ACTIVE') {
        return res.status(400).json({ error: `Market is ${market.status}, not ACTIVE` });
      }
      if (market.endTime < new Date()) {
        return res.status(400).json({ error: 'Market has ended' });
      }

      // ── Build order ───────────────────────────────────────────────
      const order: Order = {
        id: randomUUID(),
        maker: maker.toLowerCase(),
        market: marketId,
        conditionId: marketId,
        side: side.toUpperCase() as Order['side'],
        outcomeIndex: outcomeIndex as Order['outcomeIndex'],
        price: priceNum,
        size: sizeNum,
        filled: 0,
        status: 'OPEN',
        timestamp: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        signature,
      };

      // ── Persist order first ───────────────────────────────────────
      await db.createOrder(order);

      // ── Run matching engine ───────────────────────────────────────
      const trades = orderBooks.placeOrder(order);

      // ── Persist trades and update filled amounts ──────────────────
      for (const trade of trades) {
        await db.createTrade(trade);

        // Update order fill amounts in DB
        const buyOrder = orderBooks.getOrder(marketId, trade.buyOrderId)
          ?? await db.getOrder(trade.buyOrderId);
        const sellOrder = orderBooks.getOrder(marketId, trade.sellOrderId)
          ?? await db.getOrder(trade.sellOrderId);

        if (buyOrder) {
          await db.updateOrder(trade.buyOrderId, {
            filled: buyOrder.filled,
            status: buyOrder.status,
          });
        }
        if (sellOrder) {
          await db.updateOrder(trade.sellOrderId, {
            filled: sellOrder.filled,
            status: sellOrder.status,
          });
        }

        // Record price history
        await db.recordPricePoint(marketId, order.outcomeIndex, trade.price, trade.size);
      }

      // Update incoming order's final status in DB
      await db.updateOrder(order.id, {
        filled: order.filled,
        status: order.status,
      });

      const outcomeLabel = outcomeIndex === 0 ? 'YES' : 'NO';
      let message = `${side.toUpperCase()} ${outcomeLabel} order placed`;
      if (trades.length > 0) {
        const filledSize = trades.reduce((sum, t) => sum + t.size, 0);
        message = `Matched ${trades.length} trade(s), filled ${filledSize.toFixed(2)} USDT`;
      }

      res.status(201).json({ order, trades, message });
    } catch (error) {
      console.error('POST /orders error:', error);
      res.status(500).json({ error: 'Failed to place order', details: (error as Error).message });
    }
  });

  // DELETE /api/orders/:id - Cancel an order
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const order = await db.getOrder(String(req.params.id));
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (order.status === 'FILLED') {
        return res.status(400).json({ error: 'Order already filled, cannot cancel' });
      }
      if (order.status === 'CANCELLED') {
        return res.status(400).json({ error: 'Order already cancelled' });
      }

      // Cancel in order book
      orderBooks.cancelOrder(order.market, String(req.params.id));

      // Update DB
      await db.updateOrder(String(req.params.id), { status: 'CANCELLED' });

      res.json({ success: true, message: 'Order cancelled' });
    } catch (error) {
      console.error('DELETE /orders/:id error:', error);
      res.status(500).json({ error: 'Failed to cancel order' });
    }
  });

  // GET /api/orders/user/:address - Get user's orders
  router.get('/user/:address', async (req: Request, res: Response) => {
    try {
      const address = String(req.params.address).toLowerCase();
      const marketId = qs(req.query.marketId);
      const status = qs(req.query.status);

      const orders = await db.getOrdersByMaker(address, marketId);

      const filtered = status
        ? orders.filter(o => o.status === status.toUpperCase())
        : orders;

      res.json({ orders: filtered, count: filtered.length });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

  // GET /api/orders/:id - Get single order
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const order = await db.getOrder(String(req.params.id));
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      res.json({ order });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch order' });
    }
  });

  return router;
}
