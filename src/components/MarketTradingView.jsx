import { useState, useEffect, useCallback } from 'react';
import OrderBook from './OrderBook';
import TradingForm from './TradingForm';
import { orderBookAPI } from '../services/api';

export default function MarketTradingView({ market, userAddress, onBack }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [userOrders, setUserOrders] = useState([]);

  const loadUserOrders = useCallback(async () => {
    if (!userAddress || !market?.id) return;

    try {
      const orders = await orderBookAPI.getUserOrders(userAddress, market.id);
      setUserOrders(orders.filter(o => o.status === 'OPEN' || o.status === 'PARTIALLY_FILLED'));
    } catch (err) {
      console.error('Failed to load user orders:', err);
    }
  }, [userAddress, market?.id]);

  useEffect(() => {
    if (userAddress && market?.id) {
      loadUserOrders();
    }
  }, [userAddress, market?.id, refreshKey, loadUserOrders]);

  function handleOrderPlaced() {
    setRefreshKey(prev => prev + 1); // Force order book and user orders refresh
  }

  function handlePriceClick(price) {
    // Could auto-fill trading form with clicked price
    console.log('Price clicked:', price);
  }

  if (!market) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Market not found</div>
      </div>
    );
  }

  const endDate = new Date(market.endTime);
  const isExpired = endDate < new Date();

  return (
    <div className="min-h-screen py-8">
      {/* Back Button */}
      {onBack && (
        <div className="max-w-7xl mx-auto px-4 mb-4">
          <button
            onClick={onBack}
            className="text-blue-400 hover:text-blue-300 flex items-center gap-2"
          >
            ← Back to Markets
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4">
        {/* Market Header */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <span className="text-sm text-blue-400 font-semibold uppercase">
                {market.category}
              </span>
              <h1 className="text-3xl font-bold text-white mt-2">
                {market.question}
              </h1>
              <p className="text-gray-400 mt-2">{market.description}</p>
            </div>
            <div className="text-right ml-6">
              <div className="text-sm text-gray-400">
                {isExpired ? 'Ended' : 'Ends'}
              </div>
              <div className={`font-semibold ${isExpired ? 'text-red-400' : 'text-white'}`}>
                {endDate.toLocaleDateString()}
              </div>
              {market.status && (
                <div className={`text-xs mt-1 px-2 py-1 rounded inline-block ${
                  market.status === 'ACTIVE' ? 'bg-green-900/20 text-green-400' :
                  market.status === 'RESOLVED' ? 'bg-blue-900/20 text-blue-400' :
                  'bg-gray-700 text-gray-400'
                }`}>
                  {market.status}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* User's Open Orders */}
        {userAddress && userOrders.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">Your Open Orders</h3>
            <div className="space-y-2">
              {userOrders.map(order => (
                <div key={order.id} className="bg-gray-700 rounded p-3 flex justify-between items-center">
                  <div>
                    <span className={`font-semibold ${order.side === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                      {order.side}
                    </span>
                    <span className="text-white ml-2">
                      {order.outcomeIndex === 0 ? 'YES' : 'NO'} @ {order.price}¢
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-white text-sm">
                      {(order.size - order.filled).toFixed(2)} / {order.size} USDT
                    </div>
                    <div className="text-xs text-gray-400">
                      {((order.filled / order.size) * 100).toFixed(0)}% filled
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trading Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Book - 2 columns */}
          <div className="lg:col-span-2">
            <OrderBook
              key={refreshKey}
              marketId={market.id}
              onSelectPrice={handlePriceClick}
            />
          </div>

          {/* Trading Form - 1 column */}
          <div>
            <TradingForm
              marketId={market.id}
              marketQuestion={market.question}
              userAddress={userAddress}
              onOrderPlaced={handleOrderPlaced}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
