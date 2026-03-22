import { useState, useEffect, useCallback } from 'react';
import OrderBook from './OrderBook';
import TradingForm from './TradingForm';
import PriceChart from './PriceChart';
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
  const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4">
        {/* Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center text-purple-400 hover:text-purple-300 mb-6 transition-colors group"
          >
            <svg className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Markets
          </button>
        )}

        {/* Market Header */}
        <div className="bg-black bg-opacity-40 backdrop-blur-md rounded-2xl p-6 sm:p-8 mb-8 border border-purple-500 border-opacity-20">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
            <div className="flex-1">
              {/* Category + Status */}
              <div className="inline-flex items-center gap-3 mb-4">
                <span className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold uppercase rounded-full">
                  {market.category}
                </span>
                {market.status === 'ACTIVE' && (
                  <span className="flex items-center gap-1.5 text-sm text-green-400">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse inline-block"></span>
                    Live
                  </span>
                )}
              </div>

              {/* Question */}
              <h1 className="text-2xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {market.question}
              </h1>

              {/* Description */}
              {market.description && (
                <p className="text-gray-400 text-base sm:text-lg">
                  {market.description}
                </p>
              )}
            </div>

            {/* End Date Card */}
            <div className="flex-shrink-0 bg-purple-500 bg-opacity-10 border border-purple-500 border-opacity-20 rounded-xl p-5 min-w-[160px] text-right">
              <div className="text-xs text-gray-400 mb-1">
                {isExpired ? 'Ended' : 'Time Remaining'}
              </div>
              <div className={`text-2xl font-bold ${isExpired ? 'text-red-400' : 'text-white'}`}>
                {isExpired ? 'Ended' : daysLeft > 0 ? `${daysLeft}d` : 'Today'}
              </div>
              <div className="text-xs text-purple-400 mt-3 pt-3 border-t border-purple-500 border-opacity-20">
                {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>

        {/* User's Open Orders */}
        {userAddress && userOrders.length > 0 && (
          <div className="bg-black bg-opacity-40 backdrop-blur-md rounded-2xl p-6 mb-8 border border-purple-500 border-opacity-20">
            <h3 className="text-lg font-bold text-white mb-4">Your Open Orders</h3>
            <div className="space-y-2">
              {userOrders.map(order => (
                <div key={order.id} className="bg-purple-500 bg-opacity-10 rounded-xl p-4 flex justify-between items-center border border-purple-500 border-opacity-10">
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

        {/* Price Chart - Full Width */}
        <div className="mb-8">
          <PriceChart marketId={market.id} />
        </div>

        {/* Order Book + Trading Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2">
            <OrderBook
              key={refreshKey}
              marketId={market.id}
              onSelectPrice={handlePriceClick}
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
    </div>
  );
}
