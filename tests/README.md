# OutcomeBazaar E2E Tests

End-to-end tests for OutcomeBazaar prediction market application using Playwright and Synpress for MetaMask integration.

## Setup

The dependencies are already installed. If you need to reinstall:

```bash
npm install -D @playwright/test @synthetixio/synpress
npx playwright install chromium
```

## Running Tests

### Run tests in headed mode (recommended for MetaMask tests):
```bash
npm run test:e2e:headed
```

### Run tests with Playwright UI:
```bash
npm run test:e2e:ui
```

### Run tests in headless mode:
```bash
npm run test:e2e
```

## Test Coverage

The E2E test suite covers:

1. **App Loading** - Verifies the app loads with all UI elements
2. **Market Display** - Checks market cards, prices, and categories
3. **MetaMask Connection** - Tests wallet connection flow using Synpress
4. **Trade Modal** - Verifies trade modal opens and displays correctly
5. **Place Trade** - Complete flow of placing a trade with MetaMask confirmation
6. **Portfolio** - Navigation and display of user positions
7. **Activity History** - Display of transaction history
8. **Trending Tab** - Navigation and display of trending markets
9. **Market Filtering** - Category-based filtering functionality
10. **Slippage Warnings** - Verification of price impact warnings
11. **Responsive Design** - Tests on desktop, tablet, and mobile viewports
12. **Conditional Stats** - Early Access badges vs full market stats
13. **Close Position** - Position closing flow with confirmation modal
14. **Navigation** - Complete navigation between all tabs

## MetaMask Test Configuration

The tests use Synpress to automate MetaMask interactions:

- **Test Seed Phrase**: `test test test test test test test test test test test junk`
- **Network**: Polygon
- **Password**: `TestPassword123!`

⚠️ **Note**: These are test credentials only. Never use them for real funds.

## Best Practices

1. **Sequential Execution**: MetaMask tests run sequentially (not in parallel) to avoid extension conflicts
2. **Headed Mode**: MetaMask extension requires headed browser mode
3. **Dev Server**: The test suite automatically starts the dev server on localhost:3000
4. **Timeouts**: Extended timeouts are used for MetaMask transaction confirmations

## Troubleshooting

### Tests fail with MetaMask connection errors:
- Ensure you're running in headed mode (`npm run test:e2e:headed`)
- Check that localhost:3000 is accessible
- Clear browser data and restart tests

### Dev server timeout:
- Increase the timeout in `playwright.config.js` `webServer.timeout`
- Ensure no other process is using port 3000

### Flaky tests:
- Run tests with `--retries=2` flag
- Check network stability
- Verify all dependencies are properly installed

## CI/CD Integration

For CI environments, you may need to:
1. Use a different MetaMask configuration
2. Mock blockchain interactions
3. Run tests against a local blockchain (Hardhat/Ganache)

## Writing New Tests

Add new test cases to `tests/e2e.spec.js`:

```javascript
test('should do something', async ({ page }) => {
  await page.goto('http://localhost:3000');
  // Your test code here
});
```

For MetaMask interactions, use Synpress commands:
- `acceptMetamaskAccess()` - Accept wallet connection
- `confirmMetamaskTransaction()` - Confirm transaction
- `rejectMetamaskTransaction()` - Reject transaction

## Documentation

- [Playwright Docs](https://playwright.dev/)
- [Synpress Docs](https://github.com/Synthetixio/synpress)
