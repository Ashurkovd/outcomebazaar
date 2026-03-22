const hre = require('hardhat');

async function main() {
  console.log('🚨 EMERGENCY MARKET RESOLUTION 🚨');
  console.log('Match ended 54 days ago!');
  console.log('');

  const FACTORY = '0xe16fea504931A9088208fa86bB84C25708E10A45';
  const MARKET = '0x067446b3503B2af17F93E60467555e71BB33296C';
  const USDT = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';

  console.log('Factory:', FACTORY);
  console.log('Market:', MARKET);
  console.log('');

  // Get contracts
  const factory = await hre.ethers.getContractAt('MarketFactory', FACTORY);
  const market = await hre.ethers.getContractAt('PredictionMarket', MARKET);
  const usdt = await hre.ethers.getContractAt('IERC20', USDT);

  console.log('📊 CHECKING CURRENT MARKET STATE...');
  console.log('');

  // Check if already resolved
  const state = await market.state();
  const resolved = state === 1; // MarketState.Resolved = 1
  console.log('Already Resolved?', resolved);

  if (resolved) {
    console.log('✅ Market already resolved!');
    const outcome = await market.outcome();
    console.log('Outcome:', outcome ? 'YES' : 'NO');
    return;
  }

  // Check pools
  const yesPool = await market.yesPool();
  const noPool = await market.noPool();
  const totalPool = yesPool + noPool;

  console.log('Current Pool State:');
  console.log('  YES Pool:', hre.ethers.formatUnits(yesPool, 6), 'USDT');
  console.log('  NO Pool:', hre.ethers.formatUnits(noPool, 6), 'USDT');
  console.log('  Total:', hre.ethers.formatUnits(totalPool, 6), 'USDT');
  console.log('');

  // Calculate what happened
  const yesPercent = (yesPool * 100n) / totalPool;
  const noPercent = (noPool * 100n) / totalPool;
  console.log('Pool Distribution:');
  console.log('  YES:', yesPercent.toString() + '%');
  console.log('  NO:', noPercent.toString() + '%');
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('OFFICIAL RESULT:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('Match: India vs South Africa, 2nd Test');
  console.log('Venue: Guwahati, India');
  console.log('Dates: November 22-26, 2025');
  console.log('');
  console.log('RESULT: South Africa won by 408 runs');
  console.log('Source: https://www.espncricinfo.com/series/1479572/full-scorecard');
  console.log('');
  console.log('Market Question: "Will India win?"');
  console.log('Answer: NO ❌');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // AUTO-CONFIRM MODE
  console.log('⚠️  AUTO-CONFIRM MODE - Proceeding with resolution to NO');
  console.log('');

  console.log('⏳ Resolving market to NO...');
  console.log('');

  const tx = await factory.resolveMarket(MARKET, false, {
    gasLimit: 500000
  });

  console.log('Transaction submitted:', tx.hash);
  console.log('⏳ Waiting for confirmation...');

  await tx.wait();

  console.log('');
  console.log('✅ MARKET RESOLVED SUCCESSFULLY!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Outcome: NO (India did not win)');
  console.log('Transaction:', `https://polygonscan.com/tx/${tx.hash}`);
  console.log('Market:', `https://polygonscan.com/address/${MARKET}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📢 IMPORTANT: Post resolution announcement:');
  console.log('- Update website with resolution');
  console.log('- Notify users on social media');
  console.log('- Provide evidence link');
  console.log('- Explain 54-day delay');
  console.log('- Apologize for inconvenience');
  console.log('');
  console.log('Winners can now claim their winnings!');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('ERROR:', error);
    process.exit(1);
  });
