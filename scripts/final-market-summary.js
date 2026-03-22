const hre = require('hardhat');

async function main() {
  console.log('📊 FINAL MARKET SUMMARY\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const MARKET = '0x067446b3503B2af17F93E60467555e71BB33296C';
  const USDT = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';

  const market = await hre.ethers.getContractAt('PredictionMarket', MARKET);
  const usdt = await hre.ethers.getContractAt('IERC20', USDT);

  // Market info
  const question = await market.question();
  const state = await market.state();
  const outcome = await market.outcome();
  const endTime = await market.endTime();

  console.log('📋 MARKET INFO:');
  console.log('Question:', question);
  console.log('Address:', MARKET);
  console.log('State:', state === 1n ? 'Resolved' : 'Active');
  console.log('Outcome:', outcome ? 'YES' : 'NO');
  console.log('End Time:', new Date(Number(endTime) * 1000).toISOString());
  console.log('');

  // Balance check
  const balance = await usdt.balanceOf(MARKET);
  const yesPool = await market.yesPool();
  const noPool = await market.noPool();
  const totalPool = yesPool + noPool;

  console.log('💰 FINANCIAL STATE:');
  console.log('USDT Balance:', hre.ethers.formatUnits(balance, 6), 'USDT');
  console.log('YES Pool:', hre.ethers.formatUnits(yesPool, 6), 'USDT');
  console.log('NO Pool:', hre.ethers.formatUnits(noPool, 6), 'USDT');
  console.log('Total Pool:', hre.ethers.formatUnits(totalPool, 6), 'USDT');
  console.log('');

  // Analysis
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 ANALYSIS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (balance === totalPool && yesPool === 100000000n && noPool === 100000000n) {
    console.log('⚠️  NO TRADING ACTIVITY DETECTED');
    console.log('');
    console.log('The market was created with initial liquidity:');
    console.log('  - 100 USDT for YES shares');
    console.log('  - 100 USDT for NO shares');
    console.log('');
    console.log('Pool balances are UNCHANGED from creation,');
    console.log('meaning NO ONE placed any bets!');
    console.log('');
    console.log('📌 CONCLUSION:');
    console.log('  ✓ Zero trades');
    console.log('  ✓ Zero users');
    console.log('  ✓ Zero winners');
    console.log('  ✓ Zero claims possible');
    console.log('');
    console.log('The 200 USDT is just the initial liquidity');
    console.log('provided by the market creator.');
  } else {
    console.log('✅ TRADING ACTIVITY DETECTED');
    console.log('');
    const withdrawn = totalPool - balance;
    if (withdrawn > 0n) {
      console.log('💰 Winnings Claimed:', hre.ethers.formatUnits(withdrawn, 6), 'USDT');
    } else {
      console.log('⚠️  No winnings claimed yet');
    }
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
