const API_BASE = process.env.REACT_APP_ORDERBOOK_API || 'http://localhost:3001';
const TOKEN_STORAGE_KEY = 'ob_auth_token';

// ── Token storage helpers ──────────────────────────────────────────────────
export const tokenStorage = {
  get() {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {}
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {}
  },
};

// ── Authenticated fetch ────────────────────────────────────────────────────
// Wraps fetch to inject Authorization: Bearer header when a token is present,
// and to surface a typed { error, status } object on non-2xx responses.
async function apiFetch(path, options = {}) {
  const token = tokenStorage.get();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await res.text();
  const data = text ? safeParseJson(text) : null;

  if (!res.ok) {
    const err = new Error((data && data.error) || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

class OrderBookAPI {
  // ── Auth ───────────────────────────────────────────────────────────────
  async requestOtp(email) {
    return apiFetch('/api/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyOtp(email, code) {
    const data = await apiFetch('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
    if (data && data.token) {
      tokenStorage.set(data.token);
    }
    return data;
  }

  async getMe() {
    return apiFetch('/api/me');
  }

  async getMyPositions(marketId) {
    const path = marketId
      ? `/api/me/positions?marketId=${encodeURIComponent(marketId)}`
      : '/api/me/positions';
    return apiFetch(path);
  }

  async getDepositAddress() {
    return apiFetch('/api/me/deposit-address');
  }

  logout() {
    tokenStorage.clear();
  }

  // ── Markets (public) ───────────────────────────────────────────────────
  async getMarkets() {
    const data = await apiFetch('/api/markets');
    return data.markets || data;
  }

  async getMarket(marketId) {
    const data = await apiFetch(`/api/markets/${marketId}`);
    return data.market || data;
  }

  async getOrderBook(marketId) {
    return apiFetch(`/api/orders/book/${marketId}`);
  }

  // ── Orders (auth) ──────────────────────────────────────────────────────
  async placeOrder(order) {
    return apiFetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  }

  async getMyOrders(marketId) {
    const path = marketId
      ? `/api/orders/me?marketId=${encodeURIComponent(marketId)}`
      : '/api/orders/me';
    const data = await apiFetch(path);
    return data.orders || [];
  }

  async cancelOrder(orderId) {
    return apiFetch(`/api/orders/${orderId}`, { method: 'DELETE' });
  }

  // ── Health ─────────────────────────────────────────────────────────────
  async healthCheck() {
    return apiFetch('/api/health');
  }
}

export const orderBookAPI = new OrderBookAPI();
