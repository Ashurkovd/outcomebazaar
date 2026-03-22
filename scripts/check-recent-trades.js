const hre = require('hardhat');

async function main() {
  console.log('🔍 Checking Recent Trades on India vs SA Market\n');

  const marketAddress = '0x067446b3503B2af17F93E60467555e71BB33296C';
  const market = await hre.ethers.getContractAt('PredictionMarket', marketAddress);

  // Get market info
  const marketInfo = await market.getMarketInfo();
  console.log('Market:', marketInfo._question);
  console.log('━'.repeat(80));

  // Query SharesPurchased events
  const currentBlock = await hre.ethers.provider.getBlockNumber();
  const fromBlock = currentBlock - 1000; // Last ~1k blocks (about 30 minutes on Polygon)

  console.log('\n📊 Fetching recent trades...');
  console.log('From block:', fromBlock, 'to', currentBlock);

  const filter = market.filters.SharesPurchased();
  const events = await market.queryFilter(filter, fromBlock, currentBlock);

  if (events.length === 0) {
    console.log('\n⚠️ No recent trades found in the last ~5 hours');
    console.log('\nTry checking your wallet (MetaMask) for the full transaction hash:');
    console.log('1. Open MetaMask');
    console.log('2. Click "Activity" tab');
    console.log('3. Find your "Contract Interaction" transaction');
    console.log('4. Click on it to see the full transaction hash');
    return;
  }

  console.log(`\n✅ Found ${events.length} trade(s):\n`);

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const block = await event.getBlock();
    const timestamp = new Date(block.timestamp * 1000);

    console.log(`Trade ${i + 1}:`);
    console.log('  Buyer:', event.args.buyer);
    console.log('  Side:', event.args.isYes ? 'YES ✅' : 'NO ❌');
    console.log('  Amount:', hre.ethers.formatUnits(event.args.tokenAmount, 6), 'USDT');
    console.log('  Shares:', hre.ethers.formatUnits(event.args.shareAmount, 6));
    console.log('  Time:', timestamp.toLocaleString());
    console.log('  Transaction:', `https://polygonscan.com/tx/${event.transactionHash}`);
    console.log('  Block:', event.blockNumber);
    console.log('━'.repeat(80));
  }

  // Get current pool state
  console.log('\n🏊 Current Pool State:');
  console.log('YES Pool:', hre.ethers.formatUnits(marketInfo._yesPool, 6), 'USDT');
  console.log('NO Pool:', hre.ethers.formatUnits(marketInfo._noPool, 6), 'USDT');
  console.log('YES Price:', (Number(marketInfo._yesPrice) / 1e18 * 100).toFixed(2) + '%');
  console.log('NO Price:', (Number(marketInfo._noPrice) / 1e18 * 100).toFixed(2) + '%');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
