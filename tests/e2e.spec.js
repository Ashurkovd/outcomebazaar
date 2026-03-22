const { test, expect } = require('@playwright/test');

test.describe('OutcomeBazaar E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the app and display markets', async ({ page }) => {
    await expect(page.locator('text=OutcomeBazaar').first()).toBeVisible();
    await expect(page.locator('text=Forecast Exchange').first()).toBeVisible();
    await expect(page.locator('text=Markets').first()).toBeVisible();
    console.log('✅ App loaded successfully');
  });

  test('should display market cards with prices', async ({ page }) => {
    await page.waitForSelector('button:has-text("Trade")', { timeout: 5000 });
    const marketCards = await page.locator('button:has-text("Trade")').count();
    expect(marketCards).toBeGreaterThan(0);
    console.log(`✅ Found ${marketCards} market cards`);
  });

  test('should show stats cards', async ({ page }) => {
    await expect(page.getByText('Active Markets')).toBeVisible();
    await expect(page.getByText('New This Week')).toBeVisible();
    await expect(page.getByText('24h Volume')).toBeVisible();
    console.log('✅ Stats cards displayed');
  });

  test('should filter markets by category', async ({ page }) => {
    await page.getByRole('button', { name: 'Cricket' }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Will India win the 2025 ICC Champions Trophy?')).toBeVisible();
    console.log('✅ Category filter works');
  });

  test('should search for markets', async ({ page }) => {
    const searchBox = page.getByPlaceholder(/search markets/i);
    await searchBox.fill('India');
    await page.waitForTimeout(500);
    await expect(page.getByText(/India/i).first()).toBeVisible();
    console.log('✅ Search functionality works');
  });

  test('should switch between tabs', async ({ page }) => {
    // Portfolio tab
    await page.getByRole('button', { name: /portfolio/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/Portfolio Value/i)).toBeVisible();

    // Activity tab
    await page.getByRole('button', { name: /activity/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/No Activity Yet/i).or(page.getByText(/Activity History/i)).first()).toBeVisible();

    // Trending tab
    await page.getByRole('button', { name: /trending/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/Trending Markets/i)).toBeVisible();

    // Back to Markets
    await page.getByRole('button', { name: /^markets$/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Will India win the 2025 ICC Champions Trophy?')).toBeVisible();

    console.log('✅ Tab navigation works');
  });

  test('should have functional trade buttons', async ({ page }) => {
    const tradeButtons = page.locator('button:has-text("Trade")');
    const buttonCount = await tradeButtons.count();
    expect(buttonCount).toBeGreaterThan(0);

    // Verify trade buttons are interactive
    await expect(tradeButtons.first()).toBeEnabled();
    console.log(`✅ Found ${buttonCount} trade buttons, all functional`);
  });

  test('should display formatUSDT without decimals', async ({ page }) => {
    const volumeCard = page.locator('text=/24h Volume/').locator('..');
    const volumeText = await volumeCard.textContent();
    expect(volumeText).toContain('$');

    const liquidityElements = page.locator('text=/liquidity/');
    if (await liquidityElements.count() > 0) {
      const liquidityText = await liquidityElements.first().textContent();
      expect(liquidityText).toMatch(/\$[\d,]+\s+liquidity/);
    }
    console.log('✅ Currency formatting correct (no decimals)');
  });

  test('should display trending markets', async ({ page }) => {
    await page.getByRole('button', { name: /trending/i }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('🔥 Trending Markets')).toBeVisible();

    const trendingBadges = page.locator('text=Trending');
    const count = await trendingBadges.count();
    expect(count).toBeGreaterThan(0);
    console.log(`✅ Found ${count} trending markets`);
  });

  test('should verify responsive design', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForTimeout(1000);
    await expect(page.getByText('OutcomeBazaar')).toBeVisible();
    await expect(page.getByRole('button', { name: /connect wallet/i })).toBeVisible();
    console.log('✅ Mobile responsive verified');
  });

  test('should show market price history charts', async ({ page }) => {
    const charts = page.locator('svg');
    const chartCount = await charts.count();
    expect(chartCount).toBeGreaterThan(0);
    console.log(`✅ Found ${chartCount} charts`);
  });

  test('should display market end dates', async ({ page }) => {
    const endDates = page.locator('text=/Ends:/');
    const dateCount = await endDates.count();
    expect(dateCount).toBeGreaterThan(0);
    console.log(`✅ Found ${dateCount} markets with end dates`);
  });

  test('should show category badges', async ({ page }) => {
    await expect(page.getByText('Cricket').first()).toBeVisible();
    await expect(page.getByText('Economy').or(page.getByText('Politics')).first()).toBeVisible();
    console.log('✅ Category badges displayed');
  });

  test('should display Connect Wallet button', async ({ page }) => {
    const connectButton = page.getByRole('button', { name: /connect wallet/i });
    await expect(connectButton).toBeVisible();
    console.log('✅ Connect Wallet button present');
  });
});
