import { useState } from 'react';
import { orderBookAPI } from '../services/api';

export default function TradingForm({ marketId, marketQuestion, userAddress, onOrderPlaced }) {
  const [side, setSide] = useState('BUY');
  const [outcome, setOutcome] = useState(0); // 0 = YES, 1 = NO
  const [price, setPrice] = useState(50);
  const [size, setSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const cost = (size * price / 100).toFixed(2);
  const potentialProfit = (size * (100 - price) / 100).toFixed(2);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!userAddress) {
      setError('Please connect your wallet');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await orderBookAPI.placeOrder({
        marketId,
        maker: userAddress,
        side,
        outcomeIndex: outcome,
        price,
        size,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onOrderPlaced?.();
    } catch (err) {
      setError(err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  }

  const outcomeLabel = outcome === 0 ? 'YES' : 'NO';
  const isBuy = side === 'BUY';

  return (
    <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-purple-500/20">
      <h3 className="text-xl font-bold text-white mb-5">Place Order</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Outcome */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Outcome</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOutcome(0)}
              className={`py-3 rounded-xl font-bold text-sm transition-all ${
                outcome === 0
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/20'
                  : 'bg-purple-900/30 border border-purple-500/20 text-gray-300 hover:border-purple-500/40'
              }`}
            >
              YES
            </button>
            <button
              type="button"
              onClick={() => setOutcome(1)}
              className={`py-3 rounded-xl font-bold text-sm transition-all ${
                outcome === 1
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/20'
                  : 'bg-purple-900/30 border border-purple-500/20 text-gray-300 hover:border-purple-500/40'
              }`}
            >
              NO
            </button>
          </div>
        </div>

        {/* Action */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Action</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSide('BUY')}
              className={`py-3 rounded-xl font-bold text-sm transition-all ${
                isBuy
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20'
                  : 'bg-purple-900/30 border border-purple-500/20 text-gray-300 hover:border-purple-500/40'
              }`}
            >
              Buy {outcomeLabel}
            </button>
            <button
              type="button"
              onClick={() => setSide('SELL')}
              className={`py-3 rounded-xl font-bold text-sm transition-all ${
                !isBuy
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/20'
                  : 'bg-purple-900/30 border border-purple-500/20 text-gray-300 hover:border-purple-500/40'
              }`}
            >
              Sell {outcomeLabel}
            </button>
          </div>
        </div>

        {/* Price */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 block">
            Price (¢) — {price}% probability
          </label>
          <input
            type="number"
            min="1"
            max="99"
            value={price}
            onChange={(e) => setPrice(parseInt(e.target.value) || 1)}
            className="w-full bg-purple-900/20 border border-purple-500/30 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all placeholder-gray-500"
          />
          <div className="mt-2 flex items-center gap-2">
            {[25, 50, 75].map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPrice(p)}
                className="flex-1 text-xs py-1.5 bg-purple-900/30 border border-purple-500/20 hover:border-purple-500/50 text-purple-300 rounded-lg transition-all"
              >
                {p}¢
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Amount (USDT)</label>
          <input
            type="number"
            min="1"
            step="0.01"
            value={size}
            onChange={(e) => setSize(parseFloat(e.target.value) || 1)}
            className="w-full bg-purple-900/20 border border-purple-500/30 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Summary */}
        <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Order</span>
            <span className="text-white font-semibold">{side} {outcomeLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Cost</span>
            <span className="text-white font-semibold">${cost} USDT</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-purple-500/20">
            <span className="text-gray-400">Potential Profit</span>
            <span className="text-green-400 font-bold">${potentialProfit}</span>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !userAddress}
          className={`w-full py-4 rounded-xl font-bold text-white transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
            isBuy
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:shadow-purple-500/30'
              : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 hover:shadow-red-500/30'
          }`}
        >
          {loading
            ? 'Placing Order...'
            : !userAddress
              ? 'Connect Wallet to Trade'
              : `Place ${side} ${outcomeLabel} Order`
          }
        </button>

        {error && (
          <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/20 p-3 rounded-xl">
            {error}
          </div>
        )}

        {success && (
          <div className="text-green-400 text-sm bg-green-900/20 border border-green-500/20 p-3 rounded-xl font-semibold">
            Order placed successfully!
          </div>
        )}
      </form>
    </div>
  );
}
