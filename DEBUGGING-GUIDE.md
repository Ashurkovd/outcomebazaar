# Railway Deployment Debugging Guide

## ✅ Changes Pushed to GitHub

**Branch:** `orderbook-backend`
**Commit:** Add comprehensive debugging for Railway deployment

### What Was Changed

#### 1. Global Error Handlers (CRITICAL)
Added at the very top of `src/index.ts`:
- `unhandledRejection` handler - catches async errors
- `uncaughtException` handler - catches synchronous errors
- These will now output detailed error info instead of silent crashes

#### 2. Server Binding Fix
**BEFORE:** `app.listen(PORT)`
**AFTER:** `app.listen(PORT, '0.0.0.0')`

Railway requires binding to `0.0.0.0` to accept external traffic.
This was likely causing the silent crash!

#### 3. Checkpoint Logging
Added 7+ checkpoints throughout startup:
```
📍 INITIAL - Calling startServer()
📍 CHECKPOINT 1 - Initializing services
📍 CHECKPOINT 2 - Creating Express app
📍 CHECKPOINT 3 - Configuring middleware
📍 CHECKPOINT 4 - Testing database connection
📍 CHECKPOINT 5 - Restoring open orders
📍 CHECKPOINT 6 - Setting up routes
📍 CHECKPOINT 7 - Starting HTTP server
📍 FINAL CHECKPOINT - Calling app.listen()
✅ ✅ ✅ SERVER IS RUNNING! ✅ ✅ ✅
```

#### 4. Detailed Error Messages
Every potential failure point now has:
- Try-catch blocks with full error details
- Error name, message, stack trace
- Context about what was being attempted

## 🔍 How to Read Railway Logs

### What You Should See (Success)

```
🔧 Global error handlers installed
📦 Loading imports...
   ✓ express, cors, dotenv loaded
   ✓ dotenv.config() called
✅ All imports loaded successfully
🔍 Checking environment variables...
✅ Environment variables loaded:
   DATABASE_URL exists: true
   DATABASE_URL starts with: postgresql://postgre...
   RPC_URL: https://polygon-bor-rpc.publicnode.com
   PORT: 3001
   NETWORK: polygon
   PRIVATE_KEY exists: true
✅ All required environment variables present
📍 INITIAL - Calling startServer()...

🚀 Starting OutcomeBazaar backend...

📍 CHECKPOINT 1 - Initializing services...
   Creating DatabaseService...
   ✓ DatabaseService created
   Creating OrderBookManager...
   ✓ OrderBookManager created
   Creating CTFService...
   ✓ CTFService created
✅ All services initialized
📍 CHECKPOINT 2 - Creating Express app...
✅ Express app created
📍 CHECKPOINT 3 - Configuring middleware...
   Setting up CORS with origins: [...]
   ✓ CORS configured
   ✓ JSON body parser configured
   ✓ Request logger configured
✅ Middleware configured
📍 CHECKPOINT 4 - Testing database connection...
   Database health check result: true
✅ Database connected successfully
📍 CHECKPOINT 5 - Restoring open orders...
   Found 0 open orders
✅ Order restoration complete
📍 CHECKPOINT 6 - Setting up routes...
   Adding health check route...
   ✓ Health route added
   Adding market routes...
   ✓ Market routes added
   Adding order routes...
   ✓ Order routes added
   ✓ 404 handler added
   ✓ Error handler added
✅ All routes configured
📍 CHECKPOINT 7 - Starting HTTP server...
   PORT: 3001
   Binding to: 0.0.0.0 (required for Railway)

📍 FINAL CHECKPOINT - Calling app.listen()...
📍 app.listen() called successfully
   Waiting for server to start listening...

══════════════════════════════════════════════
✅ ✅ ✅ SERVER IS RUNNING! ✅ ✅ ✅
══════════════════════════════════════════════
  Network:  polygon
  Port:     3001
  Host:     0.0.0.0
  Health:   http://localhost:3001/api/health
  Time:     2026-02-23T00:13:13.116Z
══════════════════════════════════════════════
```

### What to Look For if It Fails

#### Scenario 1: Stops After CHECKPOINT 4 (Database)
```
📍 CHECKPOINT 4 - Testing database connection...
❌ Database health check threw error: ...
```
**Problem:** Database connection issue
**Fix:** Check DATABASE_URL in Railway variables

#### Scenario 2: Stops After CHECKPOINT 5 (Orders)
```
📍 CHECKPOINT 5 - Restoring open orders...
❌ FATAL ERROR DURING STARTUP
Error: relation "orders" does not exist
```
**Problem:** Database tables not created
**Fix:** Run migrations on Railway database

#### Scenario 3: Stops After CHECKPOINT 6 (Routes)
```
📍 CHECKPOINT 6 - Setting up routes...
❌ Error creating market routes: ...
```
**Problem:** Route handler error
**Fix:** Check if all route files are deployed

#### Scenario 4: Stops at FINAL CHECKPOINT
```
📍 FINAL CHECKPOINT - Calling app.listen()...
❌ ❌ ❌ SERVER ERROR ❌ ❌ ❌
Error code: EADDRINUSE
```
**Problem:** Port already in use
**Fix:** Railway should auto-assign ports, check PORT env var

#### Scenario 5: Unhandled Rejection
```
❌ ❌ ❌ UNHANDLED REJECTION ❌ ❌ ❌
Reason: Error: getaddrinfo ENOTFOUND ...
```
**Problem:** Network/DNS error (RPC_URL, DATABASE_URL)
**Fix:** Verify URLs are correct and accessible

#### Scenario 6: Uncaught Exception
```
❌ ❌ ❌ UNCAUGHT EXCEPTION ❌ ❌ ❌
Message: Cannot read property 'x' of undefined
```
**Problem:** Code error in synchronous code
**Fix:** Check the stack trace to find the exact line

## 🚀 Railway Deployment Steps

### 1. Access Railway Dashboard
Go to: https://railway.app/dashboard

### 2. Redeploy
Railway should auto-deploy when it detects the new push to `orderbook-backend` branch.

If not:
- Go to your project
- Click on the service
- Click "Deploy" button
- Or trigger manual deployment

### 3. Watch Build Logs
Click "View Logs" and watch for:
- ✅ "npm install" completes
- ✅ "npm run build" compiles TypeScript
- ✅ "npm start" begins
- ✅ All checkpoints appear
- ✅ "SERVER IS RUNNING" message

### 4. Test Deployment
Once you see "SERVER IS RUNNING", test:

```bash
# Replace with your actual Railway URL
API_URL="https://outcomebazaar-production.up.railway.app"

# Health check
curl $API_URL/api/health

# Should return:
# {"status":"ok","db":"connected","timestamp":"...","network":"polygon","markets":0}
```

## 🔧 Local Testing

You can test locally to verify all checkpoints work:

```bash
cd ~/outcomebazaar-orderbook

# Build
npm run build

# Run
npm start

# You should see all checkpoints and "SERVER IS RUNNING"
```

## 📋 Checklist

- [ ] Code pushed to `orderbook-backend` branch ✅ (DONE)
- [ ] Railway configured to deploy from `orderbook-backend` branch
- [ ] All environment variables set in Railway
- [ ] Railway auto-deploys on push
- [ ] Watch build logs for errors
- [ ] Find which checkpoint is LAST before crash (if any)
- [ ] Test health endpoint returns 200 OK
- [ ] Backend is accessible from frontend

## 🆘 Common Issues

### Issue: Still crashes silently
**Look for:** The LAST checkpoint that appears in logs
**That's where it's failing!**

### Issue: No logs at all
**Problem:** Railway might not be running `npm start`
**Fix:** Check Railway → Settings → Deploy → Start Command: `npm start`

### Issue: Build succeeds but doesn't start
**Problem:** Might be using wrong Node version
**Fix:** Add to package.json:
```json
"engines": {
  "node": ">=18.0.0"
}
```

### Issue: Environment variables missing
**Check:** Railway → Settings → Variables
**Must have:** DATABASE_URL, RPC_URL, PRIVATE_KEY, etc.

## 📞 Next Steps

1. **Check Railway logs** - Find the last checkpoint
2. **Report back** which checkpoint appears last
3. **Check error messages** - Look for red ❌ messages
4. **Test health endpoint** - curl the URL once deployed

## 🎯 Expected Outcome

After these changes, one of two things will happen:

### SUCCESS ✅
- Logs show all checkpoints
- "SERVER IS RUNNING" appears
- Health endpoint returns 200 OK
- Backend is live!

### FAILURE with ERROR ❌
- Logs show which checkpoint failed
- Error message explains what went wrong
- We can fix the specific issue
- Much better than silent crash!

The key improvement: **We'll know EXACTLY where and why it fails!**
