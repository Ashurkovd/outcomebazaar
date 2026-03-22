const hre = require('hardhat');

async function main() {
  console.log('📊 CHECKING MARKET ACTIVITY (Chunked Scanning)\n');

  const MARKET = '0x067446b3503B2af17F93E60467555e71BB33296C';
  const market = await hre.ethers.getContractAt('PredictionMarket', MARKET);

  // Market was created at block 79415610
  const creationBlock = 79415610;
  const currentBlock = await hre.ethers.provider.getBlockNumber();

  console.log('Market:', MARKET);
  console.log('Scanning from block:', creationBlock, 'to', currentBlock);
  console.log('Range:', currentBlock - creationBlock, 'blocks');
  console.log('');

  // Get events in chunks to avoid RPC limits
  const CHUNK_SIZE = 50000;
  let allPurchases = [];
  let allSales = [];
  let allClaims = [];

  for (let fromBlock = creationBlock; fromBlock <= currentBlock; fromBlock += CHUNK_SIZE) {
    const toBlock = Math.min(fromBlock + CHUNK_SIZE - 1, currentBlock);
    console.log(`Scanning blocks ${fromBlock} to ${toBlock}...`);

    try {
      const purchaseFilter = market.filters.SharesPurchased();
      const purchases = await market.queryFilter(purchaseFilter, fromBlock, toBlock);
      allPurchases = allPurchases.concat(purchases);

      const sellFilter = market.filters.SharesSold();
      const sales = await market.queryFilter(sellFilter, fromBlock, toBlock);
      allSales = allSales.concat(sales);

      const claimFilter = market.filters.WinningsClaimed();
      const claims = await market.queryFilter(claimFilter, fromBlock, toBlock);
      allClaims = allClaims.concat(claims);
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('RESULTS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📈 BUY ORDERS:', allPurchases.length);
  console.log('📉 SELL ORDERS:', allSales.length);
  console.log('📊 TOTAL TRADES:', allPurchases.length + allSales.length);
  console.log('💰 WINNINGS CLAIMED:', allClaims.length);
  console.log('');

  if (allPurchases.length > 0) {
    console.log('BUY ORDERS DETAIL:');
    const buyers = new Set();
    for (const purchase of allPurchases) {
      const buyer = purchase.args.buyer;
      const isYes = purchase.args.isYes;
      const shares = purchase.args.shares;
      buyers.add(buyer);
      console.log(`  ${buyer.substring(0, 10)}... bought ${hre.ethers.formatUnits(shares, 6)} ${isYes ? 'YES' : 'NO'} shares`);
    }
    console.log(`\nUnique Buyers: ${buyers.size}`);
  }

  if (allSales.length > 0) {
    console.log('\nSELL ORDERS DETAIL:');
    for (const sale of allSales) {
      const seller = sale.args.seller;
      const isYes = sale.args.isYes;
      const shares = sale.args.shares;
      console.log(`  ${seller.substring(0, 10)}... sold ${hre.ethers.formatUnits(shares, 6)} ${isYes ? 'YES' : 'NO'} shares`);
    }
  }

  if (allClaims.length > 0) {
    console.log('\n✅ WINNINGS CLAIMED:');
    let totalClaimed = 0n;
    for (const claim of allClaims) {
      const amount = claim.args.amount;
      totalClaimed += amount;
      console.log(`  ${claim.args.user}: ${hre.ethers.formatUnits(amount, 6)} USDT`);
    }
    console.log(`\nTotal Claimed: ${hre.ethers.formatUnits(totalClaimed, 6)} USDT`);
  } else {
    console.log('\n⚠️  NO WINNINGS CLAIMED YET!');
    console.log('Winners need to call claimWinnings() to get their USDT.');
  }

  // Check current holders
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CHECKING CURRENT HOLDERS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const uniqueAddresses = new Set();
  for (const purchase of allPurchases) {
    uniqueAddresses.add(purchase.args.buyer);
  }

  let winners = [];
  for (const address of uniqueAddresses) {
    const [yesShares, noShares] = await market.getUserShares(address);
    if (noShares > 0n) {
      winners.push({ address, shares: noShares });
    }
  }

  if (winners.length > 0) {
    console.log(`\n🏆 NO WINNERS: ${winners.length} addresses`);
    console.log('');
    let totalWinnable = 0n;
    for (const winner of winners) {
      console.log(`  ${winner.address}`);
      console.log(`    Can claim: ${hre.ethers.formatUnits(winner.shares, 6)} USDT`);
      totalWinnable += winner.shares;
    }
    console.log(`\n💰 Total Available to Claim: ${hre.ethers.formatUnits(totalWinnable, 6)} USDT`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
