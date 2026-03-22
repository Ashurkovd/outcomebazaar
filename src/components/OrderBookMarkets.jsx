import { useState, useEffect } from 'react';
import { orderBookAPI } from '../services/api';
import MarketTradingView from './MarketTradingView';

export default function OrderBookMarkets({ userAddress }) {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [backendStatus, setBackendStatus] = useState(null);

  useEffect(() => {
    loadMarkets();
    checkBackendHealth();
  }, []);

  async function loadMarkets() {
    setLoading(true);
    setError(null);
    try {
      const data = await orderBookAPI.getMarkets();
      setMarkets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load order book markets:', err);
      setError('Failed to load markets from backend');
    } finally {
      setLoading(false);
    }
  }

  async function checkBackendHealth() {
    try {
      const health = await orderBookAPI.healthCheck();
      setBackendStatus(health);
    } catch (err) {
      console.error('Backend health check failed:', err);
    }
  }

  if (selectedMarket) {
    return (
      <MarketTradingView
        market={selectedMarket}
        userAddress={userAddress}
        onBack={() => setSelectedMarket(null)}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading order book markets...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Order Book Markets
          </h1>
          <p className="text-gray-400">
            Trade on our centralized order book with limit orders and instant matching
          </p>
          {backendStatus && (
            <div className="mt-4 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-gray-400">
                  Backend: <span className="text-green-400">Online</span>
                </span>
              </div>
              <div className="text-gray-400">
                Network: <span className="text-white">{backendStatus.network}</span>
              </div>
              <div className="text-gray-400">
                Markets: <span className="text-white">{backendStatus.markets}</span>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-6">
            <div className="text-red-400 font-semibold">Error</div>
            <div className="text-red-300 text-sm mt-1">{error}</div>
            <button
              onClick={loadMarkets}
              className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
            >
              Retry
            </button>
          </div>
        )}

        {/* Markets List */}
        {markets.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <p className="text-gray-400 text-lg">No order book markets yet</p>
            <p className="text-gray-500 text-sm mt-2">
              Check back soon for new trading opportunities
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {markets.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                onClick={() => setSelectedMarket(market)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MarketCard({ market, onClick }) {
  const endDate = new Date(market.endTime);
  const isExpired = endDate < new Date();
  const daysUntilEnd = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <button
      onClick={onClick}
      className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition w-full text-left"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-blue-400 font-semibold uppercase">
              {market.category}
            </span>
            {market.status && (
              <span className={`text-xs px-2 py-1 rounded ${
                market.status === 'ACTIVE' ? 'bg-green-900/20 text-green-400' :
                market.status === 'RESOLVED' ? 'bg-blue-900/20 text-blue-400' :
                'bg-gray-700 text-gray-400'
              }`}>
                {market.status}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {market.question}
          </h2>
          <p className="text-gray-400 text-sm line-clamp-2">
            {market.description}
          </p>
        </div>
        <div className="ml-6 text-right flex-shrink-0">
          <div className="text-sm text-gray-400 mb-1">
            {isExpired ? 'Ended' : daysUntilEnd === 0 ? 'Ends today' : `${daysUntilEnd} days left`}
          </div>
          <div className={`font-semibold ${isExpired ? 'text-red-400' : 'text-white'}`}>
            {endDate.toLocaleDateString()}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Click to trade →
          </div>
        </div>
      </div>
    </button>
  );
}
