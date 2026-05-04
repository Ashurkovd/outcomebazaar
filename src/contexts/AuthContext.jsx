import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { orderBookAPI, tokenStorage } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: if a token is in localStorage, try to restore session.
  useEffect(() => {
    const token = tokenStorage.get();
    if (!token) {
      setLoading(false);
      return;
    }
    orderBookAPI
      .getMe()
      .then(setUser)
      .catch((err) => {
        // 401 → token is bad/expired; wipe it.
        if (err.status === 401) tokenStorage.clear();
      })
      .finally(() => setLoading(false));
  }, []);

  const requestOtp = useCallback((email) => orderBookAPI.requestOtp(email), []);

  const verifyOtp = useCallback(async (email, code) => {
    const data = await orderBookAPI.verifyOtp(email, code);
    if (data && data.user) setUser(data.user);
    return data;
  }, []);

  const refreshMe = useCallback(async () => {
    const me = await orderBookAPI.getMe();
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(() => {
    orderBookAPI.logout();
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    requestOtp,
    verifyOtp,
    refreshMe,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
