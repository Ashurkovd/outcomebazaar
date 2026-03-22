import { useState, useEffect } from 'react';
import { orderBookAPI } from '../services/api';
import MarketTradingView from './MarketTradingView';

export default function OrderBookMarkets({ userAddress }) {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMarket, setSelectedMarket] = useState(null);

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

  return (
    <div>
      {/* Hero Section */}
      <div className="text-center py-16 px-4">
        <h1 className="text-5xl sm:text-6xl font-bold mb-6">
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            OutcomeBazaar
          </span>
        </h1>
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          Trade on the outcomes of cricket matches and major events.
          Predict, trade, and earn on India's premier prediction market.
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="#markets"
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/30"
          >
            View Markets
          </a>
          <a
            href="#how-it-works"
            className="px-8 py-4 bg-black/40 border border-purple-500/20 text-white font-semibold rounded-xl hover:border-purple-500/50 transition-all"
          >
            How It Works
          </a>
        </div>
      </div>

      {/* Active Markets Section */}
      <div id="markets" className="py-8">
        <div className="mb-10">
          <h2 className="text-4xl sm:text-5xl font-bold mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Active Markets
          </h2>
          <p className="text-gray-400 text-lg">
            Trade on live events with limit orders and instant matching
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-5 mb-6">
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
        {!loading && !error && markets.length === 0 && (
          <div className="bg-black/40 backdrop-blur-md rounded-2xl p-16 text-center border border-purple-500/20">
            <div className="text-6xl mb-4">🏏</div>
            <p className="text-gray-300 text-xl font-semibold mb-2">No active markets yet</p>
            <p className="text-gray-500">Check back soon for upcoming events</p>
          </div>
        )}

        {/* Markets List */}
        {!loading && markets.length > 0 && (
          <div className="grid gap-5">
            {markets.map((market) => (
              <OrderBookMarketCard
                key={market.id}
                market={market}
                onClick={() => setSelectedMarket(market)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Features Section */}
      <div id="how-it-works" className="mt-20 pt-16 pb-12 border-t border-purple-500/10">
        <h2 className="text-3xl font-bold text-white text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center bg-black/40 rounded-2xl p-8 border border-purple-500/10">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold text-white mb-2">Instant Trading</h3>
            <p className="text-gray-400">Place limit orders and trade in real-time on live events</p>
          </div>
          <div className="text-center bg-black/40 rounded-2xl p-8 border border-purple-500/10">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-bold text-white mb-2">Secure & Transparent</h3>
            <p className="text-gray-400">Blockchain-based settlements and verifiable outcomes</p>
          </div>
          <div className="text-center bg-black/40 rounded-2xl p-8 border border-purple-500/10">
            <div className="text-4xl mb-4">🏏</div>
            <h3 className="text-xl font-bold text-white mb-2">Cricket & More</h3>
            <p className="text-gray-400">Trade on IPL, international matches, and major events</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderBookMarketCard({ market, onClick }) {
  const endDate = new Date(market.endTime);
  const isExpired = endDate < new Date();
  const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <button
      onClick={onClick}
      className="group bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-purple-500/20 hover:border-purple-500/50 hover:bg-purple-900/10 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 w-full text-left"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold uppercase rounded-full">
              {market.category}
            </span>
            {market.status === 'ACTIVE' && (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse inline-block"></span>
                Live
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-300 group-hover:to-pink-300 group-hover:bg-clip-text transition-all line-clamp-2">
            {market.question}
          </h2>

          <p className="text-gray-400 text-sm line-clamp-2 mb-4">
            {market.description}
          </p>

          <div className="flex items-center gap-1.5 text-purple-400 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
            <span>View Market & Trade</span>
            <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        </div>

        <div className="flex-shrink-0 bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 min-w-[110px] text-right">
          <div className="text-xs text-gray-400 mb-1">{isExpired ? 'Ended' : 'Ends'}</div>
          <div className={`font-bold text-sm ${isExpired ? 'text-red-400' : 'text-white'}`}>
            {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          {!isExpired && (
            <div className="text-xs text-purple-400 mt-1">
              {daysLeft === 0 ? 'Today' : `${daysLeft}d left`}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
