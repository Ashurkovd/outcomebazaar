const hre = require('hardhat');

async function main() {
  console.log('📊 CHECKING MARKET TRADING ACTIVITY & CLAIMS\n');

  const MARKET = '0x067446b3503B2af17F93E60467555e71BB33296C';
  const market = await hre.ethers.getContractAt('PredictionMarket', MARKET);

  console.log('Market:', MARKET);
  console.log('Question:', await market.question());
  console.log('');

  // Get market state
  const state = await market.state();
  const outcome = await market.outcome();
  console.log('State: Resolved');
  console.log('Winning Outcome:', outcome ? 'YES' : 'NO');
  console.log('');

  // Get pool info
  const yesPool = await market.yesPool();
  const noPool = await market.noPool();
  console.log('Final Pool State:');
  console.log('  YES Pool:', hre.ethers.formatUnits(yesPool, 6), 'USDT');
  console.log('  NO Pool:', hre.ethers.formatUnits(noPool, 6), 'USDT');
  console.log('  Total Pool:', hre.ethers.formatUnits(yesPool + noPool, 6), 'USDT');
  console.log('');

  // Get all events from market creation
  const currentBlock = await hre.ethers.provider.getBlockNumber();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TRADING ACTIVITY:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Get SharesPurchased events
    const purchaseFilter = market.filters.SharesPurchased();
    const purchases = await market.queryFilter(purchaseFilter, 0, currentBlock);

    console.log(`\n📈 BUY ORDERS: ${purchases.length} total`);
    if (purchases.length > 0) {
      console.log('');
      for (let i = 0; i < purchases.length; i++) {
        const event = purchases[i];
        const buyer = event.args.buyer;
        const isYes = event.args.isYes;
        const amount = event.args.amount;
        const shares = event.args.shares;
        const fee = event.args.fee;

        console.log(`  ${i + 1}. ${buyer}`);
        console.log(`     Bought: ${hre.ethers.formatUnits(shares, 6)} ${isYes ? 'YES' : 'NO'} shares`);
        console.log(`     Paid: ${hre.ethers.formatUnits(amount, 6)} USDT (fee: ${hre.ethers.formatUnits(fee, 6)} USDT)`);
      }
    }

    // Get SharesSold events
    const sellFilter = market.filters.SharesSold();
    const sales = await market.queryFilter(sellFilter, 0, currentBlock);

    console.log(`\n📉 SELL ORDERS: ${sales.length} total`);
    if (sales.length > 0) {
      console.log('');
      for (let i = 0; i < sales.length; i++) {
        const event = sales[i];
        const seller = event.args.seller;
        const isYes = event.args.isYes;
        const shares = event.args.shares;
        const amount = event.args.amount;
        const fee = event.args.fee;

        console.log(`  ${i + 1}. ${seller}`);
        console.log(`     Sold: ${hre.ethers.formatUnits(shares, 6)} ${isYes ? 'YES' : 'NO'} shares`);
        console.log(`     Received: ${hre.ethers.formatUnits(amount, 6)} USDT (fee: ${hre.ethers.formatUnits(fee, 6)} USDT)`);
      }
    }

    const totalTrades = purchases.length + sales.length;
    console.log(`\n📊 TOTAL TRADES: ${totalTrades}`);
    console.log('');

  } catch (error) {
    console.log('Error fetching trading events:', error.message);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('WINNINGS CLAIMED:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Get WinningsClaimed events
    const claimFilter = market.filters.WinningsClaimed();
    const claims = await market.queryFilter(claimFilter, 0, currentBlock);

    console.log(`\n💰 CLAIMS: ${claims.length} total`);

    if (claims.length > 0) {
      let totalClaimed = 0n;
      console.log('');
      for (let i = 0; i < claims.length; i++) {
        const event = claims[i];
        const user = event.args.user;
        const amount = event.args.amount;
        totalClaimed += amount;

        console.log(`  ${i + 1}. ${user}`);
        console.log(`     Claimed: ${hre.ethers.formatUnits(amount, 6)} USDT`);
      }
      console.log('');
      console.log(`💵 Total Claimed: ${hre.ethers.formatUnits(totalClaimed, 6)} USDT`);
    } else {
      console.log('\n⚠️  NO CLAIMS YET - Winners have not claimed their winnings!');
    }

  } catch (error) {
    console.log('Error fetching claim events:', error.message);
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('CURRENT SHARE HOLDERS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Get unique addresses from all events
  try {
    const purchaseFilter = market.filters.SharesPurchased();
    const purchases = await market.queryFilter(purchaseFilter, 0, currentBlock);

    const uniqueAddresses = new Set();
    for (const event of purchases) {
      uniqueAddresses.add(event.args.buyer);
    }

    console.log(`\n👥 Checking ${uniqueAddresses.size} unique addresses...\n`);

    let yesWinners = [];
    let noWinners = [];

    for (const address of uniqueAddresses) {
      const [yesShares, noShares] = await market.getUserShares(address);

      if (yesShares > 0n || noShares > 0n) {
        if (yesShares > 0n) {
          yesWinners.push({
            address,
            shares: yesShares,
            isWinner: outcome === true
          });
        }
        if (noShares > 0n) {
          noWinners.push({
            address,
            shares: noShares,
            isWinner: outcome === false
          });
        }
      }
    }

    if (outcome === false) {
      console.log(`🏆 NO WINNERS (${noWinners.length} addresses):`);
      console.log('');
      let totalWinningShares = 0n;
      for (const winner of noWinners) {
        console.log(`  ${winner.address}`);
        console.log(`    NO Shares: ${hre.ethers.formatUnits(winner.shares, 6)}`);
        console.log(`    Can Claim: ${hre.ethers.formatUnits(winner.shares, 6)} USDT`);
        totalWinningShares += winner.shares;
      }
      console.log('');
      console.log(`💰 Total Claimable: ${hre.ethers.formatUnits(totalWinningShares, 6)} USDT`);
    }

    if (yesWinners.length > 0) {
      console.log(`\n❌ YES HOLDERS (Lost - ${yesWinners.length} addresses):`);
      for (const holder of yesWinners) {
        console.log(`  ${holder.address}`);
        console.log(`    YES Shares: ${hre.ethers.formatUnits(holder.shares, 6)} (worthless)`);
      }
    }

  } catch (error) {
    console.log('Error checking share holders:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
