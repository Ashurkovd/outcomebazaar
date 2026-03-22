const { defineWalletSetup } = require('@synthetixio/synpress');

const SEED_PHRASE = 'test test test test test test test test test test test junk';
const PASSWORD = 'TestPassword123!';

module.exports = defineWalletSetup(PASSWORD, async (context, walletPage) => {
  // This function sets up the wallet
  // The Synpress CLI will execute this and create a cache

  // Import wallet with seed phrase
  await walletPage.locator('#onboarding__terms-checkbox').click();
  await walletPage.getByRole('button', { name: 'Import an existing wallet' }).click();
  await walletPage.getByRole('button', { name: 'I agree' }).click();

  // Enter seed phrase
  const seedInputs = await walletPage.locator('[data-testid="import-srp__srp-word"]').all();
  const seedWords = SEED_PHRASE.split(' ');

  for (let i = 0; i < seedWords.length; i++) {
    await seedInputs[i].fill(seedWords[i]);
  }

  await walletPage.getByRole('button', { name: 'Confirm Secret Recovery Phrase' }).click();

  // Set password
  await walletPage.locator('[data-testid="create-password-new"]').fill(PASSWORD);
  await walletPage.locator('[data-testid="create-password-confirm"]').fill(PASSWORD);
  await walletPage.locator('[data-testid="create-password-terms"]').click();
  await walletPage.getByRole('button', { name: 'Create' }).click();

  // Complete setup
  await walletPage.getByRole('button', { name: 'Got it' }).click();
  await walletPage.getByRole('button', { name: 'Next' }).click();
  await walletPage.getByRole('button', { name: 'Done' }).click();

  // Switch to Polygon network (if needed)
  // This would require additional steps to add Polygon network
});
