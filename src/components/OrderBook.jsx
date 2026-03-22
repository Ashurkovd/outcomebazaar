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
    const interval = setInterval(loadOrderBook, 3000);
    return () => clearInterval(interval);
  }, [loadOrderBook]);

  if (loading) {
    return (
      <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-purple-500/20">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-400"></div>
          Loading order book...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-red-500/20">
        <div className="text-red-400 mb-3">{error}</div>
        <button
          onClick={loadOrderBook}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg text-sm font-medium transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  const spread = bids.length > 0 && asks.length > 0
    ? asks[0].price - bids[0].price
    : null;

  const isEmpty = bids.length === 0 && asks.length === 0;

  return (
    <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-purple-500/20">
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-xl font-bold text-white">Order Book</h3>
        <div className="flex items-center gap-3 text-sm">
          {spread !== null && (
            <span className="text-gray-400">
              Spread: <span className="text-white font-semibold">{spread}¢</span>
            </span>
          )}
          {lastUpdate && (
            <span className="text-gray-600 text-xs">
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {isEmpty ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-400">No orders yet</p>
          <p className="text-gray-500 text-sm mt-1">Be the first to place an order</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {/* BIDS */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-green-400 font-bold text-sm uppercase tracking-wide">Bids (YES)</span>
            </div>
            <div className="grid grid-cols-3 text-xs text-gray-500 mb-2 px-1">
              <div>Price</div>
              <div className="text-right">Size</div>
              <div className="text-right">Total</div>
            </div>
            <div className="space-y-1">
              {bids.length === 0 ? (
                <div className="text-gray-500 text-sm py-6 text-center">No bids</div>
              ) : (
                bids.slice(0, 10).map((order) => (
                  <button
                    key={order.id}
                    onClick={() => onSelectPrice?.(order.price, 'BUY')}
                    className="grid grid-cols-3 text-sm w-full px-1 py-1.5 rounded-lg hover:bg-green-900/20 transition-colors group"
                  >
                    <div className="text-green-400 font-semibold group-hover:text-green-300">{order.price}¢</div>
                    <div className="text-right text-white">
                      {(order.size - order.filled).toFixed(2)}
                    </div>
                    <div className="text-right text-gray-400">
                      {((order.size - order.filled) * order.price / 100).toFixed(2)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* ASKS */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <span className="text-red-400 font-bold text-sm uppercase tracking-wide">Asks (NO)</span>
            </div>
            <div className="grid grid-cols-3 text-xs text-gray-500 mb-2 px-1">
              <div>Price</div>
              <div className="text-right">Size</div>
              <div className="text-right">Total</div>
            </div>
            <div className="space-y-1">
              {asks.length === 0 ? (
                <div className="text-gray-500 text-sm py-6 text-center">No asks</div>
              ) : (
                asks.slice(0, 10).map((order) => (
                  <button
                    key={order.id}
                    onClick={() => onSelectPrice?.(order.price, 'SELL')}
                    className="grid grid-cols-3 text-sm w-full px-1 py-1.5 rounded-lg hover:bg-red-900/20 transition-colors group"
                  >
                    <div className="text-red-400 font-semibold group-hover:text-red-300">{order.price}¢</div>
                    <div className="text-right text-white">
                      {(order.size - order.filled).toFixed(2)}
                    </div>
                    <div className="text-right text-gray-400">
                      {((order.size - order.filled) * order.price / 100).toFixed(2)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
