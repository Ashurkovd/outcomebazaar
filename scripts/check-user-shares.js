const hre = require('hardhat');

async function main() {
  console.log('🔍 Checking User Shares\n');

  const marketAddress = '0x067446b3503B2af17F93E60467555e71BB33296C';

  // Get user address from command line or use deployer
  const userAddress = process.argv[2];

  if (!userAddress) {
    console.log('Usage: npx hardhat run scripts/check-user-shares.js --network polygon <user-address>');
    console.log('\nOr check deployer address:');
  }

  const [deployer] = await hre.ethers.getSigners();
  const addressToCheck = userAddress || deployer.address;

  const market = await hre.ethers.getContractAt('PredictionMarket', marketAddress);

  console.log('Market Address:', marketAddress);
  console.log('User Address:', addressToCheck);
  console.log('━'.repeat(60));

  // Get market info
  const marketInfo = await market.getMarketInfo();
  console.log('\n📊 Market Info:');
  console.log('Question:', marketInfo._question);
  console.log('End Time:', new Date(Number(marketInfo._endTime) * 1000).toLocaleString());
  console.log('State:', ['Active', 'Resolved', 'Cancelled'][marketInfo._state]);

  // Get user shares
  const yesShares = await market.yesShares(addressToCheck);
  const noShares = await market.noShares(addressToCheck);

  console.log('\n💰 Your Shares:');
  console.log('YES Shares:', hre.ethers.formatUnits(yesShares, 6));
  console.log('NO Shares:', hre.ethers.formatUnits(noShares, 6));

  // Get pool sizes
  console.log('\n🏊 Pool Sizes:');
  console.log('YES Pool:', hre.ethers.formatUnits(marketInfo._yesPool, 6), 'USDT');
  console.log('NO Pool:', hre.ethers.formatUnits(marketInfo._noPool, 6), 'USDT');

  // Calculate current prices
  const yesPrice = Number(marketInfo._yesPrice) / 1e18;
  const noPrice = Number(marketInfo._noPrice) / 1e18;

  console.log('\n💵 Current Prices:');
  console.log('YES Price:', (yesPrice * 100).toFixed(2) + '%');
  console.log('NO Price:', (noPrice * 100).toFixed(2) + '%');

  // Calculate position value
  const yesValue = Number(yesShares) * yesPrice / 1e6;
  const noValue = Number(noShares) * noPrice / 1e6;
  const totalValue = yesValue + noValue;

  console.log('\n📈 Position Value:');
  console.log('YES Position:', yesValue.toFixed(2), 'USDT');
  console.log('NO Position:', noValue.toFixed(2), 'USDT');
  console.log('Total Value:', totalValue.toFixed(2), 'USDT');

  console.log('\n━'.repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
