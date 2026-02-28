# Order Book Backend Integration Guide

## ✅ Step 1: Files Created

The following files have been created:

1. `.env.local` - Backend API URL configuration
2. `src/services/api.js` - API client for backend
3. `src/components/OrderBook.jsx` - Order book display component
4. `src/components/TradingForm.jsx` - Trading form component
5. `src/components/MarketTradingView.jsx` - Complete trading view
6. `src/components/OrderBookMarkets.jsx` - Markets list for order book

## 📝 Step 2: Manual Integration into App.js

Add these imports at the top of `src/App.js`:

```javascript
import OrderBookMarkets from './components/OrderBookMarkets';
```

Add this to the view rendering section (around line 1376, after the trending view):

```javascript
        {currentView === 'orderbook' && (
          <OrderBookMarkets userAddress={walletAddress} />
        )}
```

## 🔧 Step 3: Update Header Component

Add an "Order Book" menu item to `src/components/Header.jsx`. You'll need to:

1. Find the navigation menu items (search for "markets", "portfolio", etc.)
2. Add a new menu item:

```javascript
<button
  onClick={() => setCurrentView('orderbook')}
  className={currentView === 'orderbook' ? 'active-class' : 'inactive-class'}
>
  Order Book
</button>
```

## 🚀 Step 4: Test Locally

```bash
npm start
```

Open http://localhost:3000

Expected features:
- New "Order Book" tab in navigation
- Border-Gavaskar Trophy 2026 market visible
- Click market to see order book
- Trading form on the right
- Real-time order updates every 3 seconds

## 📦 Step 5: Deploy to Vercel

1. Add environment variable in Vercel dashboard:
   - Name: `REACT_APP_ORDERBOOK_API`
   - Value: `https://outcomebazaar-production.up.railway.app`

2. Deploy:
```bash
git add .
git commit -m "Add order book backend integration"
git push origin main
```

Vercel will auto-deploy in 1-2 minutes.

## ✅ Verification

After deployment, visit your app and check:
- ✅ New "Order Book" section in navigation
- ✅ Markets load from backend
- ✅ Click market shows trading interface
- ✅ Order book displays with bids/asks
- ✅ Can place orders (requires wallet connection)
- ✅ Orders appear in book immediately

## 🎯 Backend API Endpoints Used

- GET `/api/markets` - List all markets
- GET `/api/markets/:id` - Get single market
- GET `/api/orders/book/:marketId` - Get order book
- POST `/api/orders` - Place order
- GET `/api/orders/user/:address` - Get user's orders
- GET `/api/health` - Backend health check

## 🔄 Auto-Refresh

The order book auto-refreshes every 3 seconds to show live updates.

## 🛠️ Troubleshooting

### Backend not connecting
- Check `.env.local` has correct backend URL
- Verify Railway backend is running
- Check browser console for errors

### Orders not appearing
- Ensure wallet is connected
- Check Railway logs for errors
- Verify market ID is correct

### CORS errors
- Backend already has CORS configured for Vercel domain
- Should work out of the box

