const { testWithSynpress } = require('@synthetixio/synpress');
const { MetaMask, metaMaskFixtures } = require('@synthetixio/synpress/playwright');
const basicSetup = require('./wallet-setup');

// Create test instance with Synpress and MetaMask fixtures
const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

test.describe('OutcomeBazaar MetaMask Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001');
  });

  test('should connect MetaMask wallet to dApp', async ({
    context,
    page,
    metamaskPage,
    extensionId
  }) => {
    // Create MetaMask instance
    const metamask = new MetaMask(
      context,
      metamaskPage,
      basicSetup.password,
      extensionId
    );

    // Click Connect Wallet button
    const connectButton = page.getByRole('button', { name: /connect wallet/i });
    await expect(connectButton).toBeVisible();
    await connectButton.click();

    // Connect to dApp
    await metamask.connectToDapp();

    // Verify wallet is connected
    await expect(page.getByRole('button', { name: /disconnect/i })).toBeVisible({ timeout: 15000 });

    // Verify wallet address is displayed
    await expect(page.locator('text=/0x[a-fA-F0-9]{4}.*[a-fA-F0-9]{4}/').first()).toBeVisible();

    console.log('✅ MetaMask wallet connected successfully');
  });

  test('should display USDT balance after connection', async ({
    context,
    page,
    metamaskPage,
    extensionId
  }) => {
    const metamask = new MetaMask(context, metamaskPage, basicSetup.password, extensionId);

    // Connect wallet
    await page.getByRole('button', { name: /connect wallet/i }).click();
    await metamask.connectToDapp();

    // Wait for balance to load
    await page.waitForTimeout(3000);

    // Verify balance is displayed
    const balanceElement = page.locator('text=/\\$[\\d,]+/').first();
    await expect(balanceElement).toBeVisible({ timeout: 10000 });

    console.log('✅ USDT balance displayed after connection');
  });

  test('should verify Polygon network is active', async ({
    context,
    page,
    metamaskPage,
    extensionId
  }) => {
    const metamask = new MetaMask(context, metamaskPage, basicSetup.password, extensionId);

    // Connect wallet
    await page.getByRole('button', { name: /connect wallet/i }).click();
    await metamask.connectToDapp();

    await page.waitForTimeout(2000);

    // Verify Polygon badge
    await expect(page.getByText('Polygon')).toBeVisible({ timeout: 10000 });

    // Should not show network error
    await expect(page.locator('text=/switch to polygon/i')).not.toBeVisible();

    console.log('✅ Polygon network verified');
  });

  test('should open trade modal and show trade details', async ({
    context,
    page,
    metamaskPage,
    extensionId
  }) => {
    const metamask = new MetaMask(context, metamaskPage, basicSetup.password, extensionId);

    // Connect wallet
    await page.getByRole('button', { name: /connect wallet/i }).click();
    await metamask.connectToDapp();

    await page.waitForTimeout(2000);

    // Click first Trade button
    await page.locator('button:has-text("Trade")').first().click();
    await page.waitForTimeout(500);

    // Verify trade modal opened
    await expect(page.getByText('Place Your Trade')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Yes")').first()).toBeVisible();
    await expect(page.locator('button:has-text("No")').first()).toBeVisible();
    await expect(page.getByPlaceholder(/enter amount/i)).toBeVisible();

    console.log('✅ Trade modal opened with all details');
  });

  test('should calculate and display trade preview', async ({
    context,
    page,
    metamaskPage,
    extensionId
  }) => {
    const metamask = new MetaMask(context, metamaskPage, basicSetup.password, extensionId);

    // Connect wallet
    await page.getByRole('button', { name: /connect wallet/i }).click();
    await metamask.connectToDapp();

    await page.waitForTimeout(2000);

    // Open trade modal
    await page.locator('button:has-text("Trade")').first().click();
    await page.waitForTimeout(500);

    // Enter amount
    await page.getByPlaceholder(/enter amount/i).fill('100');
    await page.waitForTimeout(1000);

    // Verify trade preview details
    await expect(page.locator('text=/You pay:/i')).toBeVisible();
    await expect(page.locator('text=/Platform fee/i')).toBeVisible();
    await expect(page.locator('text=/Invested:/i')).toBeVisible();
    await expect(page.locator('text=/Shares to receive:/i')).toBeVisible();
    await expect(page.locator('text=/Avg price per share:/i')).toBeVisible();
    await expect(page.locator('text=/Max payout if wins:/i')).toBeVisible();
    await expect(page.locator('text=/Max profit:/i')).toBeVisible();

    // Verify Confirm Trade button is enabled
    await expect(page.getByRole('button', { name: /confirm trade/i })).toBeEnabled();

    console.log('✅ Trade preview calculated correctly');
  });

  test('should navigate to Portfolio tab with connected wallet', async ({
    context,
    page,
    metamaskPage,
    extensionId
  }) => {
    const metamask = new MetaMask(context, metamaskPage, basicSetup.password, extensionId);

    // Connect wallet
    await page.getByRole('button', { name: /connect wallet/i }).click();
    await metamask.connectToDapp();

    await page.waitForTimeout(2000);

    // Navigate to Portfolio
    await page.getByRole('button', { name: /portfolio/i }).click();
    await page.waitForTimeout(500);

    // Verify Portfolio stats
    await expect(page.getByText(/Portfolio Value/i)).toBeVisible();
    await expect(page.getByText(/Total Invested/i)).toBeVisible();
    await expect(page.getByText(/Total PNL/i)).toBeVisible();

    console.log('✅ Portfolio tab accessible');
  });

  test('should navigate to Activity tab with connected wallet', async ({
    context,
    page,
    metamaskPage,
    extensionId
  }) => {
    const metamask = new MetaMask(context, metamaskPage, basicSetup.password, extensionId);

    // Connect wallet
    await page.getByRole('button', { name: /connect wallet/i }).click();
    await metamask.connectToDapp();

    await page.waitForTimeout(2000);

    // Navigate to Activity
    await page.getByRole('button', { name: /activity/i }).click();
    await page.waitForTimeout(500);

    // Verify Activity content
    await expect(
      page.getByText(/No Activity Yet/i).or(page.getByText(/Activity History/i)).first()
    ).toBeVisible();

    console.log('✅ Activity tab accessible');
  });

  test('should view all trending markets with connected wallet', async ({
    context,
    page,
    metamaskPage,
    extensionId
  }) => {
    const metamask = new MetaMask(context, metamaskPage, basicSetup.password, extensionId);

    // Connect wallet
    await page.getByRole('button', { name: /connect wallet/i }).click();
    await metamask.connectToDapp();

    await page.waitForTimeout(2000);

    // Navigate to Trending
    await page.getByRole('button', { name: /trending/i }).click();
    await page.waitForTimeout(500);

    // Verify trending markets display
    await expect(page.getByText('🔥 Trending Markets')).toBeVisible();

    // Count trending markets
    const trendingCount = await page.locator('text=Trending').count();
    expect(trendingCount).toBeGreaterThan(0);

    console.log(`✅ Trending tab shows ${trendingCount} markets`);
  });

  test('should disconnect wallet successfully', async ({
    context,
    page,
    metamaskPage,
    extensionId
  }) => {
    const metamask = new MetaMask(context, metamaskPage, basicSetup.password, extensionId);

    // Connect wallet
    await page.getByRole('button', { name: /connect wallet/i }).click();
    await metamask.connectToDapp();

    await page.waitForTimeout(2000);

    // Verify connected
    await expect(page.getByRole('button', { name: /disconnect/i })).toBeVisible();

    // Disconnect
    await page.getByRole('button', { name: /disconnect/i }).click();
    await page.waitForTimeout(1000);

    // Verify disconnected
    await expect(page.getByRole('button', { name: /connect wallet/i })).toBeVisible();
    await expect(page.locator('text=/0x[a-fA-F0-9]{4}.*[a-fA-F0-9]{4}/')).not.toBeVisible();

    console.log('✅ Wallet disconnected successfully');
  });
});
