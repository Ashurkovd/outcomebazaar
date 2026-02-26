# Railway Environment Variables - Complete Setup

## ❌ Issue: Admin API Returning "Unauthorized"

The market creation endpoint is returning `{"error": "Unauthorized"}` because Railway doesn't have the `ADMIN_API_KEY` environment variable set.

## ✅ Solution: Add All Environment Variables to Railway

### Required Variables

Go to Railway Dashboard → Your Project → Backend Service → Settings → Variables

Add these **10 environment variables**:

```bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Blockchain Configuration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RPC_URL
https://polygon-bor-rpc.publicnode.com

PRIVATE_KEY
df82a572440b8d23e76bb06f9f31e59a3a25e5c8d3f1ef9e5ae0be6f5543c7db

NETWORK
polygon

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Database (Copy from Railway PostgreSQL service)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DATABASE_URL
postgresql://postgres:qttlWsQxtMOqbjWayIjFnJWbWUdLDBLG@tramway.proxy.rlwy.net:52701/railway

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Server Configuration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PORT
3001

NODE_ENV
production

FRONTEND_URL
https://outcomebazaar.vercel.app

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Admin Authentication (THIS ONE IS MISSING!)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ADMIN_API_KEY
1f1e8afab32cdfed6e3eebc1aa369511

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Smart Contract Addresses (Gnosis CTF on Polygon)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CTF_ADDRESS
0x4D97DCd97eC945f40cF65F87097ACe5EA0476045

USDT_ADDRESS
0xc2132D05D31c914a87C6611C10748AEb04B58e8F
```

## 📝 Step-by-Step Instructions

### 1. Access Railway Dashboard
```
https://railway.app/dashboard
```

### 2. Navigate to Variables
- Click on your project
- Click on the **backend service** (orderbook-backend)
- Click **"Settings"** tab
- Click **"Variables"** section

### 3. Check Existing Variables
You should see some variables already set. Check if these are present:
- DATABASE_URL ✓
- RPC_URL ?
- PRIVATE_KEY ?
- ADMIN_API_KEY ❌ (probably missing)

### 4. Add Missing Variables

**CRITICAL - Add this one for sure:**
```
Variable: ADMIN_API_KEY
Value:    1f1e8afab32cdfed6e3eebc1aa369511
```

**Also verify these are set:**
```
RPC_URL       = https://polygon-bor-rpc.publicnode.com
PRIVATE_KEY   = df82a572440b8d23e76bb06f9f31e59a3a25e5c8d3f1ef9e5ae0be6f5543c7db
NETWORK       = polygon
FRONTEND_URL  = https://outcomebazaar.vercel.app
CTF_ADDRESS   = 0x4D97DCd97eC945f40cF65F87097ACe5EA0476045
USDT_ADDRESS  = 0xc2132D05D31c914a87C6611C10748AEb04B58e8F
PORT          = 3001
NODE_ENV      = production
```

### 5. Deploy Changes
- After adding variables, Railway will ask if you want to redeploy
- Click **"Deploy"** or **"Redeploy"**
- Wait 1-2 minutes for deployment to complete

### 6. Verify Deployment
Watch the logs to ensure server starts successfully:
- Click **"View Logs"**
- Look for: `✅ ✅ ✅ SERVER IS RUNNING! ✅ ✅ ✅`
- Should take ~2 minutes

### 7. Test Admin API
Once deployed, test the admin endpoint:

```bash
curl -X POST https://outcomebazaar-production.up.railway.app/api/markets/admin/create \
  -H "Content-Type: application/json" \
  -H "x-admin-key: 1f1e8afab32cdfed6e3eebc1aa369511" \
  -d '{
    "question": "Test Market",
    "description": "Testing admin API",
    "category": "test",
    "endTime": "2026-12-31T23:59:59Z"
  }'
```

Should return market details instead of `{"error": "Unauthorized"}`

## 🔐 Security Notes

### Private Key Security
⚠️ The PRIVATE_KEY in this guide was shared in the conversation. If you're concerned:
1. Generate a new wallet
2. Fund it with ~0.5 MATIC for gas
3. Replace PRIVATE_KEY in Railway with new value

### Admin API Key
This key allows creating and resolving markets. Keep it secret:
- Don't commit to git (already in .gitignore)
- Don't share publicly
- Only use in server-to-server calls
- Frontend should never have this key

## 📊 How to Find DATABASE_URL

If you need to find your DATABASE_URL from Railway:

1. Railway Dashboard → Your Project
2. Click on **PostgreSQL service** (not backend service)
3. Click **"Connect"** tab
4. Copy the **"Postgres Connection URL"**
5. Use the **Public URL** (not internal URL)
6. Should look like: `postgresql://postgres:password@tramway.proxy.rlwy.net:port/railway`

## ✅ Verification Checklist

After setting all variables:

- [ ] All 10 variables added to Railway
- [ ] Railway redeployed (automatic after adding vars)
- [ ] Build succeeded (check logs)
- [ ] Server started (check for "SERVER IS RUNNING" in logs)
- [ ] Health endpoint returns 200 OK
- [ ] Admin API no longer returns "Unauthorized"
- [ ] Ready to create first market!

## 🆘 Troubleshooting

### Still getting "Unauthorized"
- Double-check ADMIN_API_KEY value (no extra spaces)
- Verify Railway redeployed after adding variable
- Check logs for "✅ Environment variables loaded"
- Try redeploying manually: Settings → Deployments → Redeploy

### Server not starting
- Check Railway logs for error messages
- Look for which CHECKPOINT is the last one
- Verify DATABASE_URL is correct
- Ensure PRIVATE_KEY is 64 hex characters

### Database errors
- Ensure migrations were run: `npm run migrate`
- Check DATABASE_URL points to Railway PostgreSQL
- Verify database service is running

## 🎯 After Variables Are Set

Run the market creation script again:
```bash
./create-first-market.sh
```

Or use the curl command directly with correct ADMIN_API_KEY.
