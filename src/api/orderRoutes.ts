import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  DatabaseService,
  InsufficientBalanceError,
  InsufficientSharesError,
} from '../database/DatabaseService';
import { OrderBookManager } from '../matching/OrderBookManager';
import { Order, PlaceOrderRequest } from '../types';
import { createRequireAuth } from '../middleware/auth';

const qs = (val: unknown): string | undefined =>
  typeof val === 'string' ? val : undefined;

export function createOrderRoutes(
  db: DatabaseService,
  orderBooks: OrderBookManager,
  jwtSecret: string
): Router {
  const router = Router();
  const requireAuth = createRequireAuth(jwtSecret);

  // GET /api/orders/book/:marketId - Order book snapshot (public)
  router.get('/book/:marketId', (req: Request, res: Response): void => {
    const snapshot = orderBooks.getSnapshot(String(req.params.marketId));
    res.json(snapshot ?? { bids: [], asks: [], lastTradePrice: null });
  });

  // POST /api/orders - Place a new order (auth required)
  router.post('/', requireAuth, async (req: Request, res: Response) => {
    try {
      const body = req.body as PlaceOrderRequest;
      const { marketId, side, outcomeIndex, price, size } = body;

      // ── Validation ────────────────────────────────────────────────
      if (!marketId || !side || outcomeIndex === undefined || !price || !size) {
        return res.status(400).json({
          error: 'Missing required fields: marketId, side, outcomeIndex, price, size',
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
      if (isNaN(sizeNum) || sizeNum < 1) {
        return res.status(400).json({ error: 'Minimum order size is 1 USDT' });
      }

      // ── Verify market is tradable ─────────────────────────────────
      const market = await db.getMarket(marketId);
      if (!market) return res.status(404).json({ error: 'Market not found' });
      if (market.status !== 'ACTIVE') {
        return res.status(400).json({ error: `Market is ${market.status}, not ACTIVE` });
      }
      if (market.endTime < new Date()) {
        return res.status(400).json({ error: 'Market has ended' });
      }

      // ── Build order ───────────────────────────────────────────────
      const sideUp = side.toUpperCase() as 'BUY' | 'SELL';
      const order: Order = {
        id: uuidv4(),
        userId: req.user!.id,
        maker: null,
        market: marketId,
        conditionId: marketId,
        side: sideUp,
        outcomeIndex: outcomeIndex as 0 | 1,
        price: priceNum,
        size: sizeNum,
        filled: 0,
        status: 'OPEN',
        timestamp: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      };

      // ── Persist + lock (BUY: USDT, SELL: shares) ──────────────────
      try {
        if (sideUp === 'BUY') {
          const cost = priceNum * sizeNum / 100;
          await db.placeBuyOrderWithLock(order, cost);
        } else {
          await db.placeSellOrderWithLock(order, sizeNum);
        }
      } catch (err) {
        if (err instanceof InsufficientBalanceError) {
          return res.status(402).json({ error: 'Insufficient USDT balance' });
        }
        if (err instanceof InsufficientSharesError) {
          return res.status(402).json({ error: 'Insufficient shares to sell' });
        }
        throw err;
      }

      // ── Run matching engine ───────────────────────────────────────
      const trades = orderBooks.placeOrder(order);

      // ── Settle each fill atomically (USDT + shares in one tx) ─────
      for (const trade of trades) {
        const buyOrder = orderBooks.getOrder(marketId, trade.buyOrderId)
          ?? await db.getOrder(trade.buyOrderId);
        const sellOrder = orderBooks.getOrder(marketId, trade.sellOrderId)
          ?? await db.getOrder(trade.sellOrderId);

        if (!buyOrder || !sellOrder || !buyOrder.userId || !sellOrder.userId) {
          // Shouldn't happen for v1 orders (all have userId). Skip defensively.
          console.warn('Skipping settlement: missing user id on buy/sell order', {
            tradeId: trade.id,
          });
          continue;
        }

        await db.settleTrade({
          trade,
          buyerId: buyOrder.userId,
          sellerId: sellOrder.userId,
          marketId,
          outcomeIndex: buyOrder.outcomeIndex,
          fillSize: trade.size,
          fillPrice: trade.price,
          buyOrderAfter: { filled: buyOrder.filled, status: buyOrder.status },
          sellOrderAfter: { filled: sellOrder.filled, status: sellOrder.status },
        });

        await db.recordPricePoint(marketId, order.outcomeIndex, trade.price, trade.size);
      }

      // Ensure the incoming order's final state is persisted even if it
      // didn't appear in any trade (e.g. unchanged from OPEN).
      if (trades.length === 0) {
        await db.updateOrder(order.id, {
          filled: order.filled,
          status: order.status,
        });
      }

      const outcomeLabel = outcomeIndex === 0 ? 'YES' : 'NO';
      let message = `${sideUp} ${outcomeLabel} order placed`;
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

  // DELETE /api/orders/:id - Cancel an order (auth + ownership)
  router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const orderId = String(req.params.id);
      const existing = await db.getOrder(orderId);
      if (!existing) return res.status(404).json({ error: 'Order not found' });
      if (existing.userId !== req.user!.id) {
        return res.status(403).json({ error: 'Not your order' });
      }

      // Flip in-memory state first so no further fills happen.
      orderBooks.cancelOrder(existing.market, orderId);

      const result = await db.cancelOrderAndRelease(orderId, req.user!.id);
      if (result === 'not_found') return res.status(404).json({ error: 'Order not found' });
      if (result === 'already_terminal') {
        return res.status(400).json({ error: 'Order already filled or cancelled' });
      }

      res.json({ success: true, message: 'Order cancelled' });
    } catch (error) {
      console.error('DELETE /orders/:id error:', error);
      res.status(500).json({ error: 'Failed to cancel order' });
    }
  });

  // GET /api/orders/me - Current user's orders (auth required)
  router.get('/me', requireAuth, async (req: Request, res: Response) => {
    try {
      const marketId = qs(req.query.marketId);
      const status = qs(req.query.status);

      const orders = await db.getOrdersByUser(req.user!.id, marketId);
      const filtered = status
        ? orders.filter(o => o.status === status.toUpperCase())
        : orders;

      res.json({ orders: filtered, count: filtered.length });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

  // GET /api/orders/:id - Single order (public)
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const order = await db.getOrder(String(req.params.id));
      if (!order) return res.status(404).json({ error: 'Order not found' });
      res.json({ order });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch order' });
    }
  });

  return router;
}
