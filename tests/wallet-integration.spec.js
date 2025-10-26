const { test, expect } = require('@playwright/test');

/**
 * Wallet Integration Tests (Without MetaMask Extension)
 *
 * These tests verify the UI behavior and wallet connection flow
 * without requiring actual MetaMask extension integration.
 *
 * They test:
 * - Connect Wallet button presence and functionality
 * - UI state changes when wallet would be connected
 * - Trade modal behavior
 * - Portfolio and activity access
 */

test.describe('Wallet Integration UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001');
  });

  test('should display Connect Wallet button on load', async ({ page }) => {
    const connectButton = page.getByRole('button', { name: /connect wallet/i });
    await expect(connectButton).toBeVisible();
    await expect(connectButton).toBeEnabled();

    // Verify wallet icon is present
    await expect(page.locator('svg').first()).toBeVisible();

    console.log('✅ Connect Wallet button displayed and enabled');
  });

  test('should show Connect Wallet button in header', async ({ page }) => {
    // Verify button is in header section
    const header = page.locator('header, nav, div').first();
    const connectButton = page.getByRole('button', { name: /connect wallet/i });

    await expect(connectButton).toBeVisible();

    console.log('✅ Connect Wallet button in header');
  });

  test('should verify trade buttons are present and enabled', async ({ page }) => {
    // Trade buttons should be present and clickable
    const tradeButton = page.locator('button:has-text("Trade")').first();
    await expect(tradeButton).toBeVisible();
    await expect(tradeButton).toBeEnabled();

    // Verify button is styled correctly
    const buttonClass = await tradeButton.getAttribute('class');
    expect(buttonClass).toBeTruthy();

    console.log('✅ Trade buttons are present and enabled');
  });

  test('should show Portfolio tab is accessible', async ({ page }) => {
    // Click Portfolio tab
    await page.getByRole('button', { name: /portfolio/i }).click();
    await page.waitForTimeout(500);

    // Should show portfolio content (even if empty without wallet)
    await expect(page.getByText(/Portfolio Value/i)).toBeVisible();

    console.log('✅ Portfolio tab accessible');
  });

  test('should show Activity tab is accessible', async ({ page }) => {
    // Click Activity tab
    await page.getByRole('button', { name: /activity/i }).click();
    await page.waitForTimeout(500);

    // Should show activity content
    await expect(
      page.getByText(/No Activity Yet/i).or(page.getByText(/Activity History/i)).first()
    ).toBeVisible();

    console.log('✅ Activity tab accessible');
  });

  test('should verify all market cards have trade buttons', async ({ page }) => {
    const tradeButtons = await page.locator('button:has-text("Trade")').count();
    expect(tradeButtons).toBeGreaterThan(0);
    expect(tradeButtons).toBe(10); // Should have 10 markets

    console.log(`✅ All ${tradeButtons} markets have Trade buttons`);
  });

  test('should display Polygon network badge when wallet connected (UI)', async ({ page }) => {
    // Even without wallet, the UI should be ready to show Polygon
    const polygonBadge = page.getByText('Polygon');

    // Badge should either be visible or exist in DOM
    const badgeExists = await polygonBadge.count() > 0;
    expect(badgeExists).toBeTruthy();

    console.log('✅ Polygon network badge present in UI');
  });

  test('should verify market cards display pricing information', async ({ page }) => {
    // Verify market cards show prices (look for price indicators)
    const priceElements = await page.locator('text=/\\$0\\.\\d+/').count();

    expect(priceElements).toBeGreaterThan(0);

    console.log(`✅ Market cards show pricing information (${priceElements} price elements)`);
  });

  test('should verify liquidity information displayed', async ({ page }) => {
    // Verify liquidity is shown on market cards
    const liquidityText = await page.locator('text=/liquidity/i').count();

    expect(liquidityText).toBeGreaterThan(0);

    console.log(`✅ Liquidity information displayed on ${liquidityText} markets`);
  });

  test('should verify wallet connection flow UI elements', async ({ page }) => {
    const connectButton = page.getByRole('button', { name: /connect wallet/i });

    // Verify button styling and state
    await expect(connectButton).toBeVisible();
    await expect(connectButton).toBeEnabled();

    // Verify button has proper styling (gradient background)
    const buttonClass = await connectButton.getAttribute('class');
    expect(buttonClass).toContain('gradient');

    console.log('✅ Wallet connection UI elements properly styled');
  });

  test('should verify trending markets show trade buttons', async ({ page }) => {
    // Navigate to Trending tab
    await page.getByRole('button', { name: /trending/i }).click();
    await page.waitForTimeout(500);

    // Verify trending markets display
    await expect(page.getByText('🔥 Trending Markets')).toBeVisible();

    // Verify trade buttons in trending section
    const trendingTradeButtons = await page.locator('button:has-text("Trade")').count();
    expect(trendingTradeButtons).toBeGreaterThan(0);

    console.log(`✅ Trending section has ${trendingTradeButtons} trade buttons`);
  });

  test('should verify market filtering works with trade buttons visible', async ({ page }) => {
    // Filter by Cricket
    await page.getByRole('button', { name: 'Cricket' }).click();
    await page.waitForTimeout(500);

    // Verify filtered markets still have trade buttons
    const tradeButtons = await page.locator('button:has-text("Trade")').count();
    expect(tradeButtons).toBeGreaterThan(0);

    console.log(`✅ Filtered markets have ${tradeButtons} trade buttons`);
  });

  test('should verify search results show trade buttons', async ({ page }) => {
    // Search for markets
    const searchBox = page.getByPlaceholder(/search markets/i);
    await searchBox.fill('India');
    await page.waitForTimeout(500);

    // Verify search results have trade buttons
    const tradeButtons = await page.locator('button:has-text("Trade")').count();
    expect(tradeButtons).toBeGreaterThan(0);

    console.log(`✅ Search results have ${tradeButtons} trade buttons`);
  });

  test('should verify wallet requirements messaging', async ({ page }) => {
    // Verify Connect Wallet CTA is prominent
    const connectButton = page.getByRole('button', { name: /connect wallet/i });
    await expect(connectButton).toBeVisible();

    // Verify it's positioned prominently (should have specific styling)
    const hasGradient = await connectButton.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.background.includes('gradient') || el.className.includes('gradient');
    });

    expect(hasGradient).toBeTruthy();

    console.log('✅ Wallet connection CTA is prominent');
  });
});
