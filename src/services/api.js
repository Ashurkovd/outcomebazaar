const API_BASE = process.env.REACT_APP_ORDERBOOK_API || process.env.NEXT_PUBLIC_ORDERBOOK_API || 'http://localhost:3001';

class OrderBookAPI {
  async getMarkets() {
    const res = await fetch(`${API_BASE}/api/markets`);
    if (!res.ok) throw new Error('Failed to fetch markets');
    const data = await res.json();
    return data.markets || data;
  }

  async getMarket(marketId) {
    const res = await fetch(`${API_BASE}/api/markets/${marketId}`);
    if (!res.ok) throw new Error('Failed to fetch market');
    const data = await res.json();
    return data.market || data;
  }

  async getOrderBook(marketId) {
    const res = await fetch(`${API_BASE}/api/orders/book/${marketId}`);
    if (!res.ok) throw new Error('Failed to fetch order book');
    return res.json();
  }

  async placeOrder(order) {
    const res = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to place order');
    }
    return res.json();
  }

  async getUserOrders(address, marketId) {
    const url = marketId
      ? `${API_BASE}/api/orders/user/${address}?marketId=${marketId}`
      : `${API_BASE}/api/orders/user/${address}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch user orders');
    const data = await res.json();
    return data.orders || [];
  }

  async healthCheck() {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) throw new Error('Backend unhealthy');
    return res.json();
  }
}

export const orderBookAPI = new OrderBookAPI();
