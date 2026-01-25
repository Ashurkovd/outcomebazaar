/**
 * useAnalytics Hook
 *
 * React hook for easy analytics tracking in components
 */

import { useEffect, useCallback } from 'react';
import {
  trackPageView,
  trackEvent,
  trackWalletConnect,
  trackWalletDisconnect,
  trackMarketView,
  trackTrade,
  trackPositionClose,
  trackMarketCreate,
  trackViewChange,
  trackError,
  trackNetworkSwitch,
} from '../utils/analytics';

export const useAnalytics = () => {
  // Track page view on mount
  const trackCurrentPage = useCallback(() => {
    trackPageView(window.location.pathname);
  }, []);

  return {
    // Page tracking
    trackPage: trackCurrentPage,

    // Custom event tracking
    trackEvent: useCallback((eventName, eventData) => {
      trackEvent(eventName, eventData);
    }, []),

    // Wallet tracking
    trackWalletConnect: useCallback((walletAddress) => {
      trackWalletConnect(walletAddress);
    }, []),

    trackWalletDisconnect: useCallback(() => {
      trackWalletDisconnect();
    }, []),

    // Market tracking
    trackMarketView: useCallback((marketId, marketTitle) => {
      trackMarketView(marketId, marketTitle);
    }, []),

    trackMarketCreate: useCallback((marketData) => {
      trackMarketCreate(marketData);
    }, []),

    // Trading tracking
    trackTrade: useCallback((tradeData) => {
      trackTrade(tradeData);
    }, []),

    trackPositionClose: useCallback((positionData) => {
      trackPositionClose(positionData);
    }, []),

    // Navigation tracking
    trackViewChange: useCallback((viewName) => {
      trackViewChange(viewName);
    }, []),

    // Error tracking
    trackError: useCallback((errorType, errorMessage) => {
      trackError(errorType, errorMessage);
    }, []),

    // Network tracking
    trackNetworkSwitch: useCallback((fromNetwork, toNetwork) => {
      trackNetworkSwitch(fromNetwork, toNetwork);
    }, []),
  };
};

/**
 * Hook to track page views automatically
 */
export const usePageTracking = () => {
  useEffect(() => {
    trackPageView(window.location.pathname);
  }, []);
};

/**
 * Hook to track view changes
 */
export const useViewTracking = (viewName) => {
  useEffect(() => {
    if (viewName) {
      trackViewChange(viewName);
    }
  }, [viewName]);
};

export default useAnalytics;
