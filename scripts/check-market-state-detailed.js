const hre = require('hardhat');

async function main() {
  console.log('🔍 DETAILED MARKET STATE CHECK\n');

  const FACTORY = '0xe16fea504931A9088208fa86bB84C25708E10A45';
  const MARKET = '0x067446b3503B2af17F93E60467555e71BB33296C';

  const factory = await hre.ethers.getContractAt('MarketFactory', FACTORY);
  const market = await hre.ethers.getContractAt('PredictionMarket', MARKET);

  const [signer] = await hre.ethers.getSigners();

  console.log('Your Address:', signer.address);
  console.log('Factory Owner:', await factory.owner());
  console.log('Factory Oracle:', await factory.oracle());
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('MARKET STATE:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Market Address:', MARKET);

  const state = await market.state();
  const stateText = state === 0n ? 'Active (0)' : state === 1n ? 'Resolved (1)' : state === 2n ? 'Cancelled (2)' : 'Unknown';
  console.log('Market State:', stateText);

  const endTime = await market.endTime();
  console.log('Market End Time:', new Date(Number(endTime) * 1000).toISOString());
  console.log('Current Time:', new Date().toISOString());
  console.log('Has Ended?', Date.now() > Number(endTime) * 1000);
  console.log('');

  const question = await market.question();
  console.log('Question:', question);
  console.log('');

  console.log('Is Valid Market?', await factory.isMarket(MARKET));
  console.log('');

  if (state === 1n) {
    const outcome = await market.outcome();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ MARKET IS ALREADY RESOLVED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Outcome:', outcome ? 'YES (India won)' : 'NO (India did not win)');
    console.log('');
    console.log('🎉 The market has been resolved! Winners can claim their winnings.');
  } else if (state === 2n) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  MARKET WAS CANCELLED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Users can claim refunds for their shares.');
  } else if (state === 0n) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  MARKET IS STILL ACTIVE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Market needs to be resolved.');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
