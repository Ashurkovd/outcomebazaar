# Railway Deployment Checklist

## Problem Identified
❌ Railway is deploying from **main** branch (frontend) instead of **orderbook-backend** branch (backend API)

## Solution: Deploy Correct Branch

### Step 1: Remove Incorrect Service
- [ ] Go to https://railway.app/dashboard
- [ ] Open your project
- [ ] Click on the service currently deployed
- [ ] Go to Settings → Danger Zone
- [ ] Click "Remove Service"
- [ ] Confirm deletion

### Step 2: Add New Service from GitHub
- [ ] Click "+ New" in your Railway project
- [ ] Select "GitHub Repo"
- [ ] Choose repository: `Ashurkovd/outcomebazaar`
- [ ] **CRITICAL:** Select branch: `orderbook-backend` (NOT main)

### Step 3: Configure Build Settings
Go to Settings → Deploy:

- [ ] **Root Directory:** [LEAVE BLANK]
- [ ] **Build Command:** `npm install && npm run build`
- [ ] **Start Command:** `npm start`

### Step 4: Add Environment Variables
Go to Settings → Variables and add these:

```
DATABASE_URL       = [Copy from Railway PostgreSQL service]
RPC_URL            = https://polygon-bor-rpc.publicnode.com
PRIVATE_KEY        = df82a572440b8d23e76bb06f9f31e59a3a25e5c8d3f1ef9e5ae0be6f5543c7db
NETWORK            = polygon
ADMIN_API_KEY      = 1f1e8afab32cdfed6e3eebc1aa369511
FRONTEND_URL       = https://outcomebazaar.vercel.app
CTF_ADDRESS        = 0x4D97DCd97eC945f40cF65F87097ACe5EA0476045
USDT_ADDRESS       = 0xc2132D05D31c914a87C6611C10748AEb04B58e8F
PORT               = 3001
NODE_ENV           = production
```

**Finding DATABASE_URL:**
- In Railway dashboard → PostgreSQL service
- Click "Connect" tab
- Copy the connection string

### Step 5: Deploy
- [ ] Railway will auto-deploy after variables are set
- [ ] Watch the build logs for errors
- [ ] Wait 2-3 minutes for deployment

### Step 6: Verify Deployment
Test these endpoints:

- [ ] Health: `https://your-app.up.railway.app/api/health`
  - Should return: `{"status":"ok","db":"connected"}`

- [ ] Markets: `https://your-app.up.railway.app/api/markets`
  - Should return: `{"markets":[],"count":0}`

- [ ] Order book: `https://your-app.up.railway.app/api/orders/book/test-id`
  - Should return: `{"bids":[],"asks":[]}`

## Repository Structure

```
GitHub: Ashurkovd/outcomebazaar
├── main branch              → Frontend (Next.js)
└── orderbook-backend branch → Backend API (Express)
    ├── src/
    │   ├── index.ts         → Main server
    │   ├── api/             → Routes
    │   ├── matching/        → Order book engine
    │   ├── database/        → PostgreSQL
    │   └── services/        → Gnosis CTF
    ├── package.json         → npm scripts
    └── tsconfig.json        → TypeScript config
```

## Common Issues

### Issue: Build fails with TypeScript errors
**Solution:** Ensure `tsconfig.json` and all `src/` files are in the orderbook-backend branch

### Issue: 502 Bad Gateway
**Solutions:**
1. Check if deploying from correct branch (orderbook-backend)
2. Verify all environment variables are set
3. Check Railway logs for startup errors

### Issue: Database connection fails
**Solution:** Verify DATABASE_URL from Railway PostgreSQL service includes SSL parameters

### Issue: RPC connection fails
**Solution:** Use public RPC: `https://polygon-bor-rpc.publicnode.com`

## After Successful Deployment

1. **Get your production URL** from Railway dashboard
2. **Update frontend** `.env.local`:
   ```
   NEXT_PUBLIC_ORDERBOOK_API=https://your-app.up.railway.app
   ```
3. **Test creating a market** using admin API
4. **Test placing orders** from frontend

## Admin API Usage

Create first market:
```bash
curl -X POST https://your-app.up.railway.app/api/markets/admin/create \
  -H "Content-Type: application/json" \
  -H "x-admin-key: 1f1e8afab32cdfed6e3eebc1aa369511" \
  -d '{
    "question": "Will India win BGT 2026?",
    "description": "Resolves YES if India wins the Border-Gavaskar Trophy",
    "category": "cricket",
    "endTime": "2026-03-15T23:59:59Z"
  }'
```

## Support

If deployment fails:
- Check Railway build logs
- Verify branch is `orderbook-backend`
- Ensure all environment variables are set
- Test locally first with `npm run build && npm start`
