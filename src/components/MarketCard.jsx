import React from 'react';
import { TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export const MarketCard = ({ market, walletConnected, setShowWalletPrompt, setSelectedMarket, setBetType, formatUSDT }) => {
  const isResolved = market.state === 1;
  const isCancelled = market.state === 2;
  const isActive = market.state === 0;

  const handleOutcomeClick = (outcome) => {
    // Disable trading if market is resolved or cancelled
    if (isResolved || isCancelled) {
      return;
    }

    if (!walletConnected) {
      setShowWalletPrompt(true);
      return;
    }
    setBetType(outcome);
    setSelectedMarket(market);
  };

  return (
    <div key={`${market.id}-${market.yesPrice}-${market.noPrice}`} className="bg-black bg-opacity-40 backdrop-blur-md rounded-xl border border-purple-500 border-opacity-30 overflow-hidden hover:border-opacity-60 transition-all">
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-purple-500 bg-opacity-30 text-purple-300 text-xs font-semibold rounded-full">{market.category}</span>
              {isResolved && (
                <span className="px-3 py-1 bg-blue-500 bg-opacity-30 text-blue-300 text-xs font-semibold rounded-full">
                  RESOLVED: {market.outcome ? 'YES' : 'NO'} Won
                </span>
              )}
              {isCancelled && (
                <span className="px-3 py-1 bg-gray-500 bg-opacity-30 text-gray-300 text-xs font-semibold rounded-full">
                  CANCELLED
                </span>
              )}
              {market.trending && isActive && (
                <span className="px-3 py-1 bg-green-500 bg-opacity-30 text-green-300 text-xs font-semibold rounded-full flex items-center gap-1">
                  <TrendingUp size={12} />
                  Trending
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{market.title}</h3>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-purple-400 font-mono">{market.contractAddress.slice(0, 10)}...</span>
              <a href={`https://polygonscan.com/address/${market.contractAddress}`} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
        <div className="mb-4 h-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={market.priceHistory} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id={`gradient-${market.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                stroke="#a78bfa"
                style={{ fontSize: '10px' }}
                tick={{ fill: '#a78bfa' }}
              />
              <YAxis
                hide={true}
                domain={[0, 1]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                labelStyle={{ color: '#a78bfa' }}
                formatter={(value) => `$${Number(value).toFixed(2)}`}
              />
              <Area type="monotone" dataKey="price" stroke="#10b981" fill={`url(#gradient-${market.id})`} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <button
            onClick={() => handleOutcomeClick('yes')}
            disabled={isResolved || isCancelled}
            className={`rounded-lg p-3 border transition-all text-left ${
              isResolved || isCancelled
                ? 'bg-green-500 bg-opacity-5 border-green-500 border-opacity-10 cursor-not-allowed opacity-50'
                : 'bg-green-500 bg-opacity-10 hover:bg-opacity-20 border-green-500 border-opacity-30 hover:border-opacity-50 cursor-pointer'
            } ${isResolved && market.outcome ? 'ring-2 ring-green-400 ring-opacity-50' : ''}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-green-300">Yes</span>
              {isResolved && market.outcome && <span className="text-xs text-green-300 font-bold">WINNER</span>}
              {!isResolved && <TrendingUp className="text-green-400" size={16} />}
            </div>
            <div className="text-2xl font-bold text-green-400">${market.yesPrice.toFixed(2)}</div>
            <div className="text-xs text-green-300 mt-1">{(market.yesPrice * 100).toFixed(0)}% chance</div>
          </button>
          <button
            onClick={() => handleOutcomeClick('no')}
            disabled={isResolved || isCancelled}
            className={`rounded-lg p-3 border transition-all text-left ${
              isResolved || isCancelled
                ? 'bg-red-500 bg-opacity-5 border-red-500 border-opacity-10 cursor-not-allowed opacity-50'
                : 'bg-red-500 bg-opacity-10 hover:bg-opacity-20 border-red-500 border-opacity-30 hover:border-opacity-50 cursor-pointer'
            } ${isResolved && !market.outcome ? 'ring-2 ring-red-400 ring-opacity-50' : ''}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-red-300">No</span>
              {isResolved && !market.outcome && <span className="text-xs text-red-300 font-bold">WINNER</span>}
              {!isResolved && <TrendingDown className="text-red-400" size={16} />}
            </div>
            <div className="text-2xl font-bold text-red-400">${market.noPrice.toFixed(2)}</div>
            <div className="text-xs text-red-300 mt-1">{(market.noPrice * 100).toFixed(0)}% chance</div>
          </button>
        </div>
        <div className="flex items-center justify-between text-xs text-purple-300 mb-4">
          {market.totalLiquidity > 10000 && market.participants > 100 ? (
            <>
              <span>{market.participants.toLocaleString('en-US')} traders</span>
              <span>•</span>
              <span>{formatUSDT(market.totalLiquidity)} liquidity</span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-1">
                <span className="text-green-400">🌱</span>
                <span className="text-purple-400">New market - Be an early trader!</span>
              </div>
              <span className="px-2 py-1 bg-green-500 bg-opacity-20 text-green-300 text-xs font-semibold rounded-full">
                Early Access
              </span>
            </>
          )}
        </div>

        <div className="pt-4 border-t border-purple-500 border-opacity-30 mt-4">
          {isResolved ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-400 font-semibold">Market Resolved</span>
              <span className="text-sm text-purple-400">Ended: {new Date(market.endDate).toLocaleDateString('en-US')}</span>
            </div>
          ) : isCancelled ? (
            <span className="text-sm text-gray-400 font-semibold">Market Cancelled</span>
          ) : (
            <span className="text-sm text-purple-400">Ends: {new Date(market.endDate).toLocaleDateString('en-US')}</span>
          )}
        </div>
      </div>
    </div>
  );
};
