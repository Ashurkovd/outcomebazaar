const hre = require('hardhat');

async function main() {
  console.log('🔍 Checking Market Status...\n');

  const MARKET = '0x067446b3503B2af17F93E60467555e71BB33296C';

  const market = await hre.ethers.getContractAt('PredictionMarket', MARKET);

  const state = await market.state();
  const stateText = state === 0n ? 'Active' : state === 1n ? 'Resolved' : 'Cancelled';

  console.log('Market:', MARKET);
  console.log('State:', stateText);

  if (state === 1n) {
    const outcome = await market.outcome();
    console.log('✅ Outcome:', outcome ? 'YES' : 'NO');
    console.log('\n🎉 MARKET IS RESOLVED!');
  } else {
    console.log('❌ Market is NOT resolved yet');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
