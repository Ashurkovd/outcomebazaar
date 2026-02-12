import { Router, Request, Response } from 'express';
import { DatabaseService } from '../database/DatabaseService';
import { CTFService } from '../services/CTFService';
import { OrderBookManager } from '../matching/OrderBookManager';

// Express req.query values can be string | string[] | ParsedQs - always cast to string
const qs = (val: unknown): string | undefined =>
  typeof val === 'string' ? val : undefined;

export function createMarketRoutes(
  db: DatabaseService,
  ctf: CTFService,
  orderBooks: OrderBookManager
): Router {
  const router = Router();

  // GET /api/markets - List all active markets
  router.get('/', async (req: Request, res: Response) => {
    try {
      const category = qs(req.query.category);
      const status = qs(req.query.status);

      let markets;
      if (status === 'all') {
        markets = await db.getAllMarkets();
      } else {
        markets = await db.getActiveMarkets(category);
      }

      res.json({ markets, count: markets.length });
    } catch (error) {
      console.error('GET /markets error:', error);
      res.status(500).json({ error: 'Failed to fetch markets' });
    }
  });

  // GET /api/markets/:id - Get single market
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const market = await db.getMarket(String(req.params.id));
      if (!market) {
        return res.status(404).json({ error: 'Market not found' });
      }
      res.json({ market });
    } catch (error) {
      console.error('GET /markets/:id error:', error);
      res.status(500).json({ error: 'Failed to fetch market' });
    }
  });

  // GET /api/markets/:id/trades - Recent trades for a market
  router.get('/:id/trades', async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(qs(req.query.limit) ?? '50') || 50, 200);
      const trades = await db.getTradesByMarket(String(req.params.id), limit);
      res.json({ trades });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch trades' });
    }
  });

  // GET /api/markets/:id/price-history - Price chart data
  router.get('/:id/price-history', async (req: Request, res: Response) => {
    try {
      const outcomeIndex = parseInt(qs(req.query.outcome) ?? '0') || 0;
      const days = Math.min(parseInt(qs(req.query.days) ?? '7') || 7, 30);

      const history = await db.getPriceHistory(String(req.params.id), outcomeIndex, days);
      res.json({ history });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch price history' });
    }
  });

  // POST /api/admin/markets - Create market (ADMIN ONLY)
  router.post('/admin/create', async (req: Request, res: Response) => {
    try {
      // Simple API key auth - replace with proper auth in production
      const apiKey = Array.isArray(req.headers['x-admin-key'])
        ? req.headers['x-admin-key'][0]
        : req.headers['x-admin-key'];
      if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { question, description, category, endTime } = req.body;

      if (!question || !category || !endTime) {
        return res.status(400).json({ error: 'question, category, and endTime are required' });
      }

      const end = new Date(endTime);
      if (isNaN(end.getTime()) || end <= new Date()) {
        return res.status(400).json({ error: 'endTime must be a valid future date' });
      }

      // Generate unique questionId from question + timestamp
      const questionId = CTFService.generateQuestionId(question);

      // Create condition on-chain
      console.log(`Creating on-chain condition for: "${question}"`);
      const conditionId = await ctf.createMarketCondition(questionId, 2);

      // Get position IDs
      const { yesPositionId, noPositionId } = await ctf.getPositionIds(conditionId);

      const adminAddress = await ctf.getSignerAddress();

      // Save to database
      const market = await db.createMarket({
        id: conditionId,
        question,
        description,
        category: category.toLowerCase(),
        creator: adminAddress,
        resolver: adminAddress,
        endTime: end,
        status: 'ACTIVE',
        yesToken: yesPositionId.toString(),
        noToken: noPositionId.toString(),
        // Extra fields stored in DB
        ...(({ questionId }) => ({ questionId }))(req.body),
      } as any);

      console.log(`✅ Market created: ${conditionId}`);
      res.status(201).json({ market, conditionId });
    } catch (error) {
      console.error('POST /admin/markets error:', error);
      res.status(500).json({ error: 'Failed to create market', details: (error as Error).message });
    }
  });

  // POST /api/admin/markets/:id/resolve - Resolve market (ADMIN ONLY)
  router.post('/admin/:id/resolve', async (req: Request, res: Response) => {
    try {
      const apiKey = Array.isArray(req.headers['x-admin-key'])
        ? req.headers['x-admin-key'][0]
        : req.headers['x-admin-key'];
      if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { outcome } = req.body; // 0 = YES wins, 1 = NO wins

      if (outcome !== 0 && outcome !== 1) {
        return res.status(400).json({ error: 'outcome must be 0 (YES) or 1 (NO)' });
      }

      const market = await db.getMarket(String(req.params.id));
      if (!market) {
        return res.status(404).json({ error: 'Market not found' });
      }
      if (market.status !== 'ACTIVE') {
        return res.status(400).json({ error: 'Market is not active' });
      }

      // Get the questionId from DB (needed for reportPayouts)
      // We stored it as part of market creation
      const questionId = (market as any).questionId;

      const yesWins = outcome === 0;
      const txHash = await ctf.resolveMarket(questionId, yesWins);

      await db.resolveMarket(String(req.params.id), outcome, txHash);

      console.log(`✅ Market ${String(req.params.id)} resolved: ${yesWins ? 'YES' : 'NO'} wins`);
      res.json({ success: true, outcome, txHash });
    } catch (error) {
      console.error('POST /admin/resolve error:', error);
      res.status(500).json({ error: 'Failed to resolve market', details: (error as Error).message });
    }
  });

  return router;
}
