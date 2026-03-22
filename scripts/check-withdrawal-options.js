const hre = require('hardhat');

async function main() {
  console.log('🔍 CHECKING WITHDRAWAL OPTIONS\n');

  const MARKET = '0x067446b3503B2af17F93E60467555e71BB33296C';
  const FACTORY = '0xe16fea504931A9088208fa86bB84C25708E10A45';
  const USDT = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';

  const market = await hre.ethers.getContractAt('PredictionMarket', MARKET);
  const factory = await hre.ethers.getContractAt('MarketFactory', FACTORY);
  const usdt = await hre.ethers.getContractAt('IERC20', USDT);
  const [signer] = await hre.ethers.getSigners();

  console.log('Your Address:', signer.address);
  console.log('Factory Owner:', await factory.owner());
  console.log('Factory Oracle:', await factory.oracle());
  console.log('');

  // Check market state
  const state = await market.state();
  const outcome = await market.outcome();
  console.log('Market State:', state === 0n ? 'Active' : state === 1n ? 'Resolved' : 'Cancelled');
  console.log('Market Outcome:', outcome ? 'YES' : 'NO');
  console.log('');

  // Check balances
  const balance = await usdt.balanceOf(MARKET);
  console.log('Market USDT Balance:', hre.ethers.formatUnits(balance, 6), 'USDT');
  console.log('');

  // Check if user has any shares
  const [yesShares, noShares] = await market.getUserShares(signer.address);
  console.log('Your Shares:');
  console.log('  YES:', hre.ethers.formatUnits(yesShares, 6));
  console.log('  NO:', hre.ethers.formatUnits(noShares, 6));
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('WITHDRAWAL OPTIONS ANALYSIS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (yesShares === 0n && noShares === 0n) {
    console.log('❌ PROBLEM: You hold ZERO shares');
    console.log('');
    console.log('The contract has these withdrawal functions:');
    console.log('  1. claimWinnings() - requires winning shares');
    console.log('  2. claimRefund() - requires shares + cancelled market');
    console.log('');
    console.log('⚠️  Since you have no shares, you CANNOT withdraw!');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('WHY THIS HAPPENED:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('When you created the market with initial liquidity,');
    console.log('the 200 USDT was split into YES/NO pools for the AMM.');
    console.log('');
    console.log('However, the contract did NOT give you any shares');
    console.log('in exchange for this liquidity!');
    console.log('');
    console.log('This is a design flaw in the AMM model.');
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('POSSIBLE SOLUTIONS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (state === 1n) {
      console.log('❌ Option 1: Cancel market');
      console.log('   Market is already RESOLVED, cannot be cancelled.');
      console.log('');
      console.log('❌ Option 2: Claim winnings');
      console.log('   You have no shares to claim.');
      console.log('');
      console.log('⚠️  Option 3: Smart contract upgrade');
      console.log('   The contract would need a new function to withdraw');
      console.log('   unused liquidity. But the contract is immutable!');
      console.log('');
      console.log('💡 Option 4: Buy shares then sell them (WORKAROUND)');
      console.log('   Since no one traded, the AMM is perfectly balanced.');
      console.log('   You could:');
      console.log('   1. Buy 100 USDT worth of NO shares (~100 shares)');
      console.log('   2. Market is resolved to NO (correct outcome)');
      console.log('   3. Claim 100 USDT winnings');
      console.log('   4. Repeat for remaining liquidity');
      console.log('');
      console.log('   This would recover most of the funds (minus fees).');
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  BOTTOM LINE:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('The 200 USDT is LOCKED in the contract.');
      console.log('');
      console.log('There is NO direct way to withdraw it because:');
      console.log('  - No withdrawal function exists');
      console.log('  - You were not given shares for providing liquidity');
      console.log('  - Market is resolved, cannot be cancelled');
      console.log('');
      console.log('The funds are essentially stuck unless you use');
      console.log('the workaround (buy shares, claim winnings).');
    }
  } else {
    console.log('✅ You have shares! You can claim funds.');
    if (state === 1n && ((outcome && yesShares > 0n) || (!outcome && noShares > 0n))) {
      console.log('');
      console.log('💰 You can call: market.claimWinnings()');
      const claimable = outcome ? yesShares : noShares;
      console.log('Claimable amount:', hre.ethers.formatUnits(claimable, 6), 'USDT');
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
