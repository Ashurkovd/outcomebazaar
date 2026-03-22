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
    setRefreshKey(prev => prev + 1);
  }

  if (!market) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-white text-xl">Market not found</div>
      </div>
    );
  }

  const endDate = new Date(market.endTime);
  const isExpired = endDate < new Date();

  return (
    <div className="py-6">
      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-6 transition-colors group"
        >
          <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Markets
        </button>
      )}

      {/* Market Header */}
      <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 sm:p-8 mb-6 border border-purple-500/20">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold uppercase rounded-full inline-block mb-4">
              {market.category}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
              {market.question}
            </h1>
            <p className="text-gray-400">{market.description}</p>
          </div>
          <div className="flex-shrink-0 bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-right min-w-[110px]">
            <div className="text-xs text-gray-400 mb-1">{isExpired ? 'Ended' : 'Ends'}</div>
            <div className={`font-bold text-sm ${isExpired ? 'text-red-400' : 'text-white'}`}>
              {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            {market.status && (
              <div className={`text-xs mt-2 px-2 py-0.5 rounded-full inline-block font-semibold ${
                market.status === 'ACTIVE' ? 'bg-green-900/30 text-green-400' :
                market.status === 'RESOLVED' ? 'bg-blue-900/30 text-blue-400' :
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
        <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 mb-6 border border-purple-500/20">
          <h3 className="text-lg font-bold text-white mb-4">Your Open Orders</h3>
          <div className="space-y-2">
            {userOrders.map(order => (
              <div key={order.id} className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <span className={`font-bold text-sm ${order.side === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                    {order.side}
                  </span>
                  <span className="text-white ml-2 text-sm">
                    {order.outcomeIndex === 0 ? 'YES' : 'NO'} @ {order.price}¢
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-white text-sm font-semibold">
                    {(order.size - order.filled).toFixed(2)} / {order.size} USDT
                  </div>
                  <div className="text-xs text-purple-400">
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
        <div className="lg:col-span-2">
          <OrderBook
            key={refreshKey}
            marketId={market.id}
          />
        </div>
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
  );
}
