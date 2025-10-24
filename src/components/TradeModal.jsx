import React from 'react';
import { ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';

export const TradeModal = ({
  selectedMarket,
  betType,
  betAmount,
  usdtBalance,
  txStatus,
  txHash,
  FEE_PERCENTAGE,
  setBetType,
  setBetAmount,
  setSelectedMarket,
  setTxStatus,
  setTxHash,
  placeBet,
  calculateSlippageDetails,
  formatUSDT,
}) => {
  if (!selectedMarket) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-xl max-w-md w-full shadow-2xl border border-purple-500 border-opacity-30 flex flex-col max-h-[85vh]">
        {/* Modal Header - Fixed */}
        <div className="p-6 pb-4 flex-shrink-0">
          <h2 className="text-xl font-bold text-white mb-2">Place Your Trade</h2>
          <p className="text-purple-200 text-sm">{selectedMarket.title}</p>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="px-6 overflow-y-auto flex-1" style={{WebkitOverflowScrolling: 'touch'}}>
          <div className="bg-black bg-opacity-30 rounded-lg p-3 mb-4 border border-purple-500 border-opacity-20">
            <div className="flex items-center gap-2 text-xs text-purple-300 mb-1">
              <span>Contract:</span>
              <span className="font-mono">{selectedMarket.contractAddress}</span>
              <a href={`https://polygonscan.com/address/${selectedMarket.contractAddress}`} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            <button onClick={() => setBetType('yes')} className={`flex-1 py-3 rounded-lg font-semibold transition-all ${betType === 'yes' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg' : 'bg-green-500 bg-opacity-20 text-green-300 hover:bg-opacity-30'}`}>
              Yes ${selectedMarket.yesPrice.toFixed(2)}
            </button>
            <button onClick={() => setBetType('no')} className={`flex-1 py-3 rounded-lg font-semibold transition-all ${betType === 'no' ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg' : 'bg-red-500 bg-opacity-20 text-red-300 hover:bg-opacity-30'}`}>
              No ${selectedMarket.noPrice.toFixed(2)}
            </button>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-purple-300 mb-2">Amount (USDT)</label>
            <div className="relative">
              <input type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} placeholder="Enter amount" className="w-full px-4 py-3 pr-20 bg-black bg-opacity-30 border border-purple-500 border-opacity-30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-purple-500" min="1" max={usdtBalance} step="0.01" />
              <button
                onClick={() => {
                  const maxAmount = Math.floor(usdtBalance * 100) / 100;
                  setBetAmount(maxAmount.toString());
                }}
                className="absolute right-12 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs font-semibold rounded transition-all"
              >
                Max
              </button>
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xl">💵</span>
            </div>
            <p className="text-sm text-purple-400 mt-2">Available: {formatUSDT(usdtBalance)}</p>
          </div>
          {betAmount && (() => {
            const slippage = calculateSlippageDetails();
            const amount = parseFloat(betAmount);
            const shares = slippage ? slippage.shares : 0;
            const avgPrice = slippage ? slippage.avgPrice : 0;
            const slippagePercent = slippage ? slippage.slippagePercent : 0;

            return (
              <div className="bg-black bg-opacity-30 rounded-lg p-4 mb-4 border border-purple-500 border-opacity-20">
                {slippagePercent > 1 && (
                  <div className="bg-yellow-500 bg-opacity-20 border border-yellow-500 border-opacity-30 rounded-lg px-4 py-2 mb-4 flex items-center gap-2">
                    <AlertCircle className="text-yellow-400" size={18} />
                    <div className="flex-1">
                      <p className="text-sm text-yellow-300 font-semibold">Large Order Detected</p>
                      <p className="text-xs text-yellow-400">
                        Avg price: ${avgPrice.toFixed(4)} ({slippagePercent.toFixed(2)}% slippage)
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-between text-sm mb-2">
                  <span className="text-purple-300">You pay:</span>
                  <span className="font-semibold text-white">{formatUSDT(amount)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-purple-300">Platform fee ({FEE_PERCENTAGE}%):</span>
                  <span className="font-semibold text-yellow-400">-{formatUSDT(amount * (FEE_PERCENTAGE / 100))}</span>
                </div>
                <div className="flex justify-between text-sm mb-2 pb-2 border-b border-purple-500 border-opacity-20">
                  <span className="text-purple-300">Invested:</span>
                  <span className="font-semibold text-white">{formatUSDT(amount * (1 - FEE_PERCENTAGE / 100))}</span>
                </div>

                <div className="flex justify-between text-sm mb-2">
                  <span className="text-purple-300">Shares to receive:</span>
                  <span className="font-semibold text-white">{shares.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-purple-300">Avg price per share:</span>
                  <span className="font-semibold text-white">${avgPrice.toFixed(4)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-purple-300">Max payout if wins:</span>
                  <span className="font-semibold text-green-400">{formatUSDT(shares)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-purple-300">Max profit:</span>
                  <span className="font-semibold text-green-400">
                    {formatUSDT(Math.max(0, shares - amount))}
                  </span>
                </div>
              </div>
            );
          })()}
          {txStatus === 'pending' && (
            <div className="bg-yellow-500 bg-opacity-20 border border-yellow-500 border-opacity-30 rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-400 border-t-transparent"></div>
              <span className="text-yellow-300 text-sm">Transaction pending...</span>
            </div>
          )}
          {txStatus === 'success' && (
            <div className="bg-green-500 bg-opacity-20 border border-green-500 border-opacity-30 rounded-lg px-4 py-3 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="text-green-400" size={20} />
                <span className="text-green-300 text-sm font-semibold">Transaction successful!</span>
              </div>
              <a href={`https://polygonscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                View on PolygonScan <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>

        {/* Modal Footer - Sticky */}
        <div className="p-6 pt-4 flex-shrink-0 border-t border-purple-500 border-opacity-20">
          <div className="flex gap-3">
            <button onClick={() => { setSelectedMarket(null); setBetAmount(''); setTxStatus(''); setTxHash(''); }} className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors">
              Cancel
            </button>
            <button onClick={placeBet} disabled={!betAmount || parseFloat(betAmount) <= 0 || parseFloat(betAmount) > usdtBalance || txStatus === 'pending'} className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg">
              {txStatus === 'pending' ? 'Processing...' : 'Confirm Trade'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
