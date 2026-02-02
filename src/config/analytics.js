/**
 * Analytics Configuration
 *
 * Supports both Google Analytics and Plausible Analytics
 * Set your preferred provider and tracking ID in environment variables
 */

export const ANALYTICS_CONFIG = {
  // Analytics provider: 'google' | 'plausible' | 'both' | 'none'
  provider: process.env.REACT_APP_ANALYTICS_PROVIDER || 'none',

  // Google Analytics
  googleAnalytics: {
    measurementId: process.env.REACT_APP_GA_MEASUREMENT_ID || '', // e.g., 'G-XXXXXXXXXX'
    enabled: process.env.REACT_APP_GA_MEASUREMENT_ID ? true : false,
  },

  // Plausible Analytics (privacy-focused, no cookies, GDPR compliant)
  plausible: {
    domain: process.env.REACT_APP_PLAUSIBLE_DOMAIN || 'outcomebazaar.app',
    apiHost: process.env.REACT_APP_PLAUSIBLE_API_HOST || 'https://plausible.io',
    enabled: process.env.REACT_APP_PLAUSIBLE_ENABLED === 'true',
  },

  // Privacy settings
  privacy: {
    anonymizeIp: true, // Anonymize IP addresses
    respectDoNotTrack: true, // Respect browser's Do Not Track setting
    cookieConsent: false, // Whether to wait for cookie consent (set to true if in EU)
  },

  // Debug mode
  debug: process.env.NODE_ENV === 'development',
};

// Check if analytics is enabled
export const isAnalyticsEnabled = () => {
  const { provider, googleAnalytics, plausible, privacy } = ANALYTICS_CONFIG;

  // Respect Do Not Track
  if (privacy.respectDoNotTrack && navigator.doNotTrack === '1') {
    return false;
  }

  // Check if any provider is configured
  if (provider === 'none') {
    return false;
  }

  if (provider === 'google' && !googleAnalytics.enabled) {
    return false;
  }

  if (provider === 'plausible' && !plausible.enabled) {
    return false;
  }

  return true;
};
