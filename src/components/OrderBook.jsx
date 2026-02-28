import { useState, useEffect, useCallback } from 'react';
import { orderBookAPI } from '../services/api';

export default function OrderBook({ marketId, onSelectPrice }) {
  const [bids, setBids] = useState([]);
  const [asks, setAsks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const loadOrderBook = useCallback(async () => {
    try {
      const orderBook = await orderBookAPI.getOrderBook(marketId);

      // Convert array format [[price, size], ...] to object format
      const bidsArray = Array.isArray(orderBook.bids)
        ? orderBook.bids.map(([price, size], idx) => ({
            id: `bid-${price}-${idx}`,
            price,
            size,
            filled: 0
          }))
        : [];

      const asksArray = Array.isArray(orderBook.asks)
        ? orderBook.asks.map(([price, size], idx) => ({
            id: `ask-${price}-${idx}`,
            price,
            size,
            filled: 0
          }))
        : [];

      setBids(bidsArray);
      setAsks(asksArray);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to load order book');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [marketId]);

  useEffect(() => {
    loadOrderBook();
    const interval = setInterval(loadOrderBook, 3000); // Refresh every 3s
    return () => clearInterval(interval);
  }, [loadOrderBook]);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-gray-400">Loading order book...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-red-400">{error}</div>
        <button
          onClick={loadOrderBook}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const spread = bids.length > 0 && asks.length > 0
    ? asks[0].price - bids[0].price
    : null;

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white">Order Book</h3>
        {spread !== null && (
          <div className="text-sm text-gray-400">
            Spread: <span className="text-white font-semibold">{spread}¢</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* BIDS (Buy Orders - YES) */}
        <div>
          <div className="text-green-400 font-semibold mb-2 text-sm">
            BIDS (YES)
          </div>
          <div className="space-y-1">
            <div className="grid grid-cols-3 text-xs text-gray-400 mb-1">
              <div>Price</div>
              <div className="text-right">Size</div>
              <div className="text-right">Total</div>
            </div>
            {bids.length === 0 ? (
              <div className="text-gray-500 text-sm py-4 text-center">No bids</div>
            ) : (
              bids.slice(0, 10).map((order) => (
                <button
                  key={order.id}
                  onClick={() => onSelectPrice?.(order.price, 'BUY')}
                  className="grid grid-cols-3 text-sm hover:bg-gray-700 w-full p-1 rounded transition"
                >
                  <div className="text-green-400">{order.price}¢</div>
                  <div className="text-right text-white">
                    {(order.size - order.filled).toFixed(2)}
                  </div>
                  <div className="text-right text-gray-300">
                    {((order.size - order.filled) * order.price / 100).toFixed(2)}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ASKS (Sell Orders - NO) */}
        <div>
          <div className="text-red-400 font-semibold mb-2 text-sm">
            ASKS (NO)
          </div>
          <div className="space-y-1">
            <div className="grid grid-cols-3 text-xs text-gray-400 mb-1">
              <div>Price</div>
              <div className="text-right">Size</div>
              <div className="text-right">Total</div>
            </div>
            {asks.length === 0 ? (
              <div className="text-gray-500 text-sm py-4 text-center">No asks</div>
            ) : (
              asks.slice(0, 10).map((order) => (
                <button
                  key={order.id}
                  onClick={() => onSelectPrice?.(order.price, 'SELL')}
                  className="grid grid-cols-3 text-sm hover:bg-gray-700 w-full p-1 rounded transition"
                >
                  <div className="text-red-400">{order.price}¢</div>
                  <div className="text-right text-white">
                    {(order.size - order.filled).toFixed(2)}
                  </div>
                  <div className="text-right text-gray-300">
                    {((order.size - order.filled) * order.price / 100).toFixed(2)}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {lastUpdate && (
        <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-400 text-center">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
