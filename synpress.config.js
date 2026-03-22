const { defineConfig } = require('@synthetixio/synpress');
const { defaultConfig } = require('@synthetixio/synpress/playwright.config');

module.exports = defineConfig({
  ...defaultConfig,
  testDir: './tests',
  workers: 1,
  use: {
    ...defaultConfig.use,
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
