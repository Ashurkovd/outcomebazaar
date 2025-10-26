const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false, // MetaMask tests should run sequentially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Run tests sequentially for MetaMask stability
  reporter: 'html',
  timeout: 60000, // Increased timeout for MetaMask interactions
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: false, // MetaMask requires headed mode
  },

  projects: [
    {
      name: 'ui-tests',
      testMatch: 'e2e.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        headless: true, // UI tests can run headless
      },
    },
    {
      name: 'wallet-integration',
      testMatch: 'wallet-integration.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        headless: true, // Wallet UI tests can run headless
      },
    },
    {
      name: 'metamask-tests',
      testMatch: 'metamask.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        headless: false, // MetaMask tests must run headed (requires Synpress setup)
      },
    },
  ],

  webServer: {
    command: 'PORT=3001 npm start',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
