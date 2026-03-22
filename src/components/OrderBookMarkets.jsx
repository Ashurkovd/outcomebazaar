import { useState, useEffect } from 'react';
import { orderBookAPI } from '../services/api';
import MarketTradingView from './MarketTradingView';

export default function OrderBookMarkets({ userAddress }) {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadMarkets();
  }, []);

  async function loadMarkets() {
    setLoading(true);
    setError(null);
    try {
      const data = await orderBookAPI.getMarkets();
      setMarkets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load markets:', err);
      setError('Failed to load markets from backend');
    } finally {
      setLoading(false);
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

  const categories = ['all', 'cricket', 'politics', 'economy', 'space', 'entertainment'];
  const filteredMarkets = filter === 'all'
    ? markets
    : markets.filter(m => m.category.toLowerCase() === filter);

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Markets
          </h1>
          <p className="text-gray-400 text-lg">
            Trade on outcomes of cricket matches and major events
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 sm:gap-3 mb-8 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-semibold transition-all whitespace-nowrap text-sm sm:text-base ${
                filter === cat
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-black bg-opacity-40 text-gray-400 hover:text-white border border-purple-500 border-opacity-20 hover:border-opacity-40'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900 bg-opacity-20 border border-red-500 border-opacity-30 rounded-xl p-5 mb-6">
            <div className="text-red-400 font-semibold mb-1">Failed to load markets</div>
            <div className="text-red-300 text-sm">{error}</div>
            <button
              onClick={loadMarkets}
              className="mt-3 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg text-sm font-medium transition-all"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <div className="text-purple-300 text-lg">Loading markets...</div>
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filteredMarkets.length === 0 && (
          <div className="bg-black bg-opacity-40 backdrop-blur-md rounded-2xl p-16 text-center border border-purple-500 border-opacity-20">
            <div className="text-6xl mb-4">🏏</div>
            <p className="text-gray-300 text-xl font-semibold mb-2">
              {filter === 'all' ? 'No active markets yet' : `No ${filter} markets yet`}
            </p>
            <p className="text-gray-500">Check back soon for upcoming events</p>
          </div>
        )}

        {/* Markets List */}
        {!loading && filteredMarkets.length > 0 && (
          <div className="space-y-6">
            {filteredMarkets.map((market) => {
              const endDate = new Date(market.endTime);
              const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
              return (
                <button
                  key={market.id}
                  onClick={() => setSelectedMarket(market)}
                  className="block w-full group bg-black bg-opacity-40 backdrop-blur-md rounded-2xl border border-purple-500 border-opacity-20 hover:border-opacity-60 hover:bg-purple-900 hover:bg-opacity-10 transition-all duration-300 text-left p-8"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 min-w-0">
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

                      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-300 group-hover:to-pink-300 group-hover:bg-clip-text transition-all">
                        {market.question}
                      </h2>

                      <p className="text-gray-400 text-base mb-6 line-clamp-2">
                        {market.description}
                      </p>

                      <div className="flex items-center gap-2 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="font-semibold">Trade now</span>
                        <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                    </div>

                    <div className="flex-shrink-0 bg-purple-500 bg-opacity-10 border border-purple-500 border-opacity-20 rounded-xl p-5 min-w-[140px] sm:min-w-[160px] text-right">
                      <div className="text-xs text-gray-400 mb-1">Time Remaining</div>
                      <div className="text-2xl font-bold text-white">{daysLeft > 0 ? `${daysLeft}d` : 'Today'}</div>
                      <div className="text-xs text-purple-400 mt-3 pt-3 border-t border-purple-500 border-opacity-20">
                        {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
