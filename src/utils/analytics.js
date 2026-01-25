/**
 * Analytics Utilities
 *
 * Provides a unified interface for tracking events across different analytics providers
 */

import { ANALYTICS_CONFIG, isAnalyticsEnabled } from '../config/analytics';

/**
 * Initialize Google Analytics
 */
const initGoogleAnalytics = () => {
  const { measurementId } = ANALYTICS_CONFIG.googleAnalytics;

  if (!measurementId) {
    console.warn('Google Analytics: Measurement ID not configured');
    return;
  }

  // Load gtag.js script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // Initialize gtag
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag('js', new Date());
  gtag('config', measurementId, {
    anonymize_ip: ANALYTICS_CONFIG.privacy.anonymizeIp,
    cookie_flags: 'SameSite=None;Secure',
  });

  if (ANALYTICS_CONFIG.debug) {
    console.log('✅ Google Analytics initialized:', measurementId);
  }
};

/**
 * Initialize Plausible Analytics
 */
const initPlausible = () => {
  const { domain, apiHost } = ANALYTICS_CONFIG.plausible;

  // Load Plausible script
  const script = document.createElement('script');
  script.defer = true;
  script.dataset.domain = domain;
  script.dataset.api = `${apiHost}/api/event`;
  script.src = `${apiHost}/js/script.js`;
  document.head.appendChild(script);

  if (ANALYTICS_CONFIG.debug) {
    console.log('✅ Plausible Analytics initialized:', domain);
  }
};

/**
 * Initialize analytics based on configuration
 */
export const initAnalytics = () => {
  if (!isAnalyticsEnabled()) {
    if (ANALYTICS_CONFIG.debug) {
      console.log('📊 Analytics disabled or Do Not Track enabled');
    }
    return;
  }

  const { provider } = ANALYTICS_CONFIG;

  try {
    if (provider === 'google' || provider === 'both') {
      if (ANALYTICS_CONFIG.googleAnalytics.enabled) {
        initGoogleAnalytics();
      }
    }

    if (provider === 'plausible' || provider === 'both') {
      if (ANALYTICS_CONFIG.plausible.enabled) {
        initPlausible();
      }
    }
  } catch (error) {
    console.error('Failed to initialize analytics:', error);
  }
};

/**
 * Track a page view
 * @param {string} path - The page path
 */
export const trackPageView = (path) => {
  if (!isAnalyticsEnabled()) return;

  const { provider } = ANALYTICS_CONFIG;

  try {
    // Google Analytics
    if ((provider === 'google' || provider === 'both') && window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: path,
      });

      if (ANALYTICS_CONFIG.debug) {
        console.log('📊 GA Page View:', path);
      }
    }

    // Plausible (automatic page view tracking, but can manually trigger)
    if ((provider === 'plausible' || provider === 'both') && window.plausible) {
      window.plausible('pageview');

      if (ANALYTICS_CONFIG.debug) {
        console.log('📊 Plausible Page View:', path);
      }
    }
  } catch (error) {
    console.error('Failed to track page view:', error);
  }
};

/**
 * Track a custom event
 * @param {string} eventName - Name of the event
 * @param {object} eventData - Additional event data
 */
export const trackEvent = (eventName, eventData = {}) => {
  if (!isAnalyticsEnabled()) return;

  const { provider } = ANALYTICS_CONFIG;

  try {
    // Google Analytics
    if ((provider === 'google' || provider === 'both') && window.gtag) {
      window.gtag('event', eventName, eventData);

      if (ANALYTICS_CONFIG.debug) {
        console.log('📊 GA Event:', eventName, eventData);
      }
    }

    // Plausible
    if ((provider === 'plausible' || provider === 'both') && window.plausible) {
      window.plausible(eventName, { props: eventData });

      if (ANALYTICS_CONFIG.debug) {
        console.log('📊 Plausible Event:', eventName, eventData);
      }
    }
  } catch (error) {
    console.error('Failed to track event:', error);
  }
};

/**
 * Track wallet connection
 */
export const trackWalletConnect = (walletAddress) => {
  trackEvent('wallet_connect', {
    wallet_type: 'metamask',
    // Don't send full address for privacy - just first 6 chars
    wallet_prefix: walletAddress ? walletAddress.substring(0, 6) : 'unknown',
  });
};

/**
 * Track wallet disconnection
 */
export const trackWalletDisconnect = () => {
  trackEvent('wallet_disconnect', {});
};

/**
 * Track market view
 */
export const trackMarketView = (marketId, marketTitle) => {
  trackEvent('market_view', {
    market_id: marketId,
    market_title: marketTitle,
  });
};

/**
 * Track trade placement
 */
export const trackTrade = (tradeData) => {
  trackEvent('trade_placed', {
    outcome: tradeData.outcome, // 'YES' or 'NO'
    amount_range: getAmountRange(tradeData.amount), // Privacy: use ranges instead of exact amounts
    market_category: tradeData.category,
  });
};

/**
 * Track position close
 */
export const trackPositionClose = (positionData) => {
  trackEvent('position_closed', {
    outcome: positionData.outcome,
    partial: positionData.partial || false,
    profit: positionData.pnl >= 0,
  });
};

/**
 * Track market creation
 */
export const trackMarketCreate = (marketData) => {
  trackEvent('market_create', {
    category: marketData.category,
  });
};

/**
 * Track view changes
 */
export const trackViewChange = (viewName) => {
  trackEvent('view_change', {
    view: viewName,
  });
};

/**
 * Track errors
 */
export const trackError = (errorType, errorMessage) => {
  trackEvent('error', {
    error_type: errorType,
    error_message: errorMessage.substring(0, 100), // Truncate long messages
  });
};

/**
 * Track network switch
 */
export const trackNetworkSwitch = (fromNetwork, toNetwork) => {
  trackEvent('network_switch', {
    from: fromNetwork,
    to: toNetwork,
  });
};

/**
 * Helper: Convert amount to privacy-friendly range
 */
const getAmountRange = (amount) => {
  if (amount < 10) return '0-10';
  if (amount < 50) return '10-50';
  if (amount < 100) return '50-100';
  if (amount < 500) return '100-500';
  if (amount < 1000) return '500-1000';
  return '1000+';
};

/**
 * Set user properties (use sparingly, respect privacy)
 */
export const setUserProperties = (properties) => {
  if (!isAnalyticsEnabled()) return;

  const { provider } = ANALYTICS_CONFIG;

  try {
    // Google Analytics
    if ((provider === 'google' || provider === 'both') && window.gtag) {
      window.gtag('set', 'user_properties', properties);
    }
  } catch (error) {
    console.error('Failed to set user properties:', error);
  }
};

export default {
  initAnalytics,
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
};
