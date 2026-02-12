# OutcomeBazaar Order Book Backend

P2P prediction market trading engine for OutcomeBazaar.
Users trade with each other — platform has **zero liquidity risk**.

## Architecture

```
Frontend (React/Vercel)
        ↕  REST API
Backend (Node.js/Railway)
  ├── Order Matching Engine  (in-memory, TypeScript)
  ├── PostgreSQL (Railway free tier)
  └── Gnosis CTF (Polygon mainnet, already deployed)
```

## How It Works

1. **Admin creates a market** → calls Gnosis CTF `prepareCondition()` on Polygon
2. **Users split USDT** → CTF converts 1 USDT → 1 YES token + 1 NO token
3. **Users place orders** → buy/sell YES or NO tokens at a price (1-99 cents)
4. **Matching engine matches orders** → price-time priority, in-memory
5. **Admin resolves market** → CTF `reportPayouts()` sets YES=1 or NO=1
6. **Winners redeem** → CTF `redeemPositions()` converts winning tokens → USDT

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd outcomebazaar-orderbook
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
- `PRIVATE_KEY` — your oracle wallet private key (64 hex chars)
- `RPC_URL` — Polygon RPC (free at alchemy.com)
- `DATABASE_URL` — PostgreSQL connection string (Railway gives you this)
- `ADMIN_API_KEY` — random secret for admin endpoints

### 3. Set up database

**Local PostgreSQL:**
```bash
createdb outcomebazaar
npm run migrate
```

**Railway (recommended for production):**
1. Create account at [railway.app](https://railway.app)
2. New Project → Add PostgreSQL
3. Copy the `DATABASE_URL` from Railway → paste in `.env`
4. `npm run migrate`

### 4. Run locally

```bash
npm run dev
```

Server starts at `http://localhost:3001`

### 5. Verify

```bash
curl http://localhost:3001/api/health
# → {"status":"ok","db":"connected",...}
```

### 6. Run tests

```bash
npm test
# → 10 tests, 0 failed
```

## API Reference

### Markets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/markets` | List active markets |
| GET | `/api/markets?category=cricket` | Filter by category |
| GET | `/api/markets/:id` | Get single market |
| GET | `/api/markets/:id/trades` | Recent trades |
| GET | `/api/markets/:id/price-history` | Price chart data |
| POST | `/api/markets/admin/create` | Create market (admin) |
| POST | `/api/markets/admin/:id/resolve` | Resolve market (admin) |

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders/book/:marketId` | Order book snapshot |
| POST | `/api/orders` | Place order |
| DELETE | `/api/orders/:id` | Cancel order |
| GET | `/api/orders/user/:address` | User's orders |
| GET | `/api/orders/:id` | Single order |

### Health

```
GET /api/health
```

---

### Create a Market (Admin)

```bash
curl -X POST http://localhost:3001/api/markets/admin/create \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_API_KEY" \
  -d '{
    "question": "Will India win the 2025 Cricket World Cup?",
    "description": "Resolves YES if India wins.",
    "category": "cricket",
    "endTime": "2025-11-30T00:00:00Z"
  }'
```

### Place a Buy Order

```bash
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "marketId": "0x<conditionId>",
    "maker": "0xYourWalletAddress",
    "side": "BUY",
    "outcomeIndex": 0,
    "price": 65,
    "size": 100
  }'
```

**Fields:**
- `side`: `BUY` or `SELL`
- `outcomeIndex`: `0` = YES, `1` = NO
- `price`: cents (1–99). `65` means "65% probability / 65¢ per share"
- `size`: USDT amount (minimum 1)

### Get Order Book

```bash
curl http://localhost:3001/api/orders/book/<marketId>
# → { bids: [[65, 500], [60, 200]], asks: [[70, 100]], lastTradePrice: 65 }
```

---

## Deploy to Railway

1. Push code to GitHub
2. Create new Railway project → Deploy from GitHub
3. Add PostgreSQL to the project
4. Set environment variables in Railway dashboard
5. Run: `npm run migrate` (one-time)
6. Railway auto-deploys on every push

Railway free tier: 500 hours/month, 1GB PostgreSQL — enough for MVP.

---

## Smart Contracts (Already Deployed — No Action Needed)

| Contract | Address | Network |
|----------|---------|---------|
| Gnosis CTF | `0x4D97DCd97eC945f40cF65F87097ACe5EA0476045` | Polygon |
| USDT | `0xc2132D05D31c914a87C6611C10748AEb04B58e8F` | Polygon |

The Gnosis CTF is the same contract used by Polymarket, Augur, and other major platforms.
**No contract deployment needed** — you just call existing functions.

---

## Next Steps (After This is Working)

1. **Frontend integration** — Add order book UI to React app
2. **On-chain settlement** — Call CTF to actually transfer tokens
3. **WebSocket** — Real-time order book updates
4. **User authentication** — Verify wallet signatures before placing orders

---

## Project Structure

```
src/
├── contracts/
│   ├── GnosisCTF.abi.json   # Gnosis CTF ABI
│   └── addresses.ts          # Contract addresses
├── matching/
│   ├── OrderBook.ts          # Single-market matching engine
│   └── OrderBookManager.ts   # Multi-market manager
├── api/
│   ├── marketRoutes.ts       # Market endpoints
│   └── orderRoutes.ts        # Order endpoints
├── services/
│   └── CTFService.ts         # Blockchain interaction
├── database/
│   ├── schema.sql            # PostgreSQL schema
│   ├── DatabaseService.ts    # DB queries
│   └── migrate.ts            # Run migrations
├── types/
│   └── Order.ts              # TypeScript types
└── index.ts                  # Main server
```
