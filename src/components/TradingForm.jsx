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

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-4">Place Order</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Outcome Selection */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Outcome</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOutcome(0)}
              className={`py-3 rounded font-semibold transition ${
                outcome === 0
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              YES
            </button>
            <button
              type="button"
              onClick={() => setOutcome(1)}
              className={`py-3 rounded font-semibold transition ${
                outcome === 1
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              NO
            </button>
          </div>
        </div>

        {/* Side Selection */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Action</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSide('BUY')}
              className={`py-3 rounded font-semibold transition ${
                side === 'BUY'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Buy {outcomeLabel}
            </button>
            <button
              type="button"
              onClick={() => setSide('SELL')}
              className={`py-3 rounded font-semibold transition ${
                side === 'SELL'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Sell {outcomeLabel}
            </button>
          </div>
        </div>

        {/* Price */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">
            Price (¢)
          </label>
          <input
            type="number"
            min="1"
            max="99"
            value={price}
            onChange={(e) => setPrice(parseInt(e.target.value) || 1)}
            className="w-full bg-gray-700 text-white rounded px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <div className="text-xs text-gray-400 mt-1">
            {price}% probability
          </div>
        </div>

        {/* Size */}
        <div>
          <label className="text-sm text-gray-400 mb-2 block">
            Amount (USDT)
          </label>
          <input
            type="number"
            min="1"
            step="0.01"
            value={size}
            onChange={(e) => setSize(parseFloat(e.target.value) || 1)}
            className="w-full bg-gray-700 text-white rounded px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <div className="text-xs text-gray-400 mt-1">
            Minimum: 1 USDT
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gray-700 rounded p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Order Type</span>
            <span className="text-white font-semibold">
              {side} {outcomeLabel}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Cost</span>
            <span className="text-white font-semibold">${cost} USDT</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Potential Profit</span>
            <span className="text-green-400 font-semibold">${potentialProfit}</span>
          </div>
          <div className="flex justify-between text-xs pt-2 border-t border-gray-600">
            <span className="text-gray-400">Shares</span>
            <span className="text-white">{size}</span>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !userAddress}
          className={`w-full py-3 rounded font-semibold transition ${
            side === 'BUY'
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-red-600 hover:bg-red-700'
          } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading
            ? 'Placing Order...'
            : !userAddress
              ? 'Connect Wallet'
              : `Place ${side} ${outcomeLabel} Order`
          }
        </button>

        {error && (
          <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="text-green-400 text-sm bg-green-900/20 p-3 rounded">
            ✅ Order placed successfully!
          </div>
        )}
      </form>
    </div>
  );
}
