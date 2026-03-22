const hre = require('hardhat');
const fs = require('fs');

async function main() {
  console.log('📋 LISTING ALL MARKETS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Load deployment
  const deployment = require('../deployment.json');
  const factoryAddress = deployment.contracts.MarketFactory.address;

  console.log('🏭 Factory:', factoryAddress);
  console.log('🔗 Explorer:', `https://amoy.polygonscan.com/address/${factoryAddress}\n`);

  const [viewer] = await hre.ethers.getSigners();
  const factory = await hre.ethers.getContractAt('MarketFactory', factoryAddress);

  console.log('🔍 Searching for markets...\n');

  // Try to get markets from local record first
  let localMarkets = [];
  try {
    if (fs.existsSync('./deployed-markets.json')) {
      const data = JSON.parse(fs.readFileSync('./deployed-markets.json', 'utf8'));
      localMarkets = data.markets || [];
      console.log(`📁 Found ${localMarkets.length} markets in local records`);
    }
  } catch (err) {
    console.log('ℹ️  No local market records found');
  }

  // Query blockchain events for all markets
  console.log('⛓️  Querying blockchain for MarketCreated events...');

  let blockchainMarkets = [];
  try {
    // Get deployment block from deployment.json or use 0
    const fromBlock = deployment.contracts.MarketFactory.blockNumber || 0;

    // Query MarketCreated events
    const filter = factory.filters.MarketCreated();
    const events = await factory.queryFilter(filter, fromBlock);

    console.log(`✅ Found ${events.length} MarketCreated events\n`);

    // Parse events
    for (const event of events) {
      const parsed = factory.interface.parseLog({
        topics: [...event.topics],
        data: event.data
      });

      blockchainMarkets.push({
        address: parsed.args.marketAddress,
        question: parsed.args.question,
        endTime: Number(parsed.args.endTime),
        initialLiquidity: parsed.args.initialLiquidity,
        creator: parsed.args.creator,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash
      });
    }
  } catch (err) {
    console.log('⚠️  Could not query events:', err.message);
    console.log('   Using local records only\n');
  }

  // Merge and deduplicate markets
  const allMarketAddresses = new Set();
  const markets = [];

  // Add blockchain markets first (source of truth)
  for (const market of blockchainMarkets) {
    allMarketAddresses.add(market.address.toLowerCase());
    markets.push(market);
  }

  // Add local markets not in blockchain records
  for (const market of localMarkets) {
    if (!allMarketAddresses.has(market.address.toLowerCase())) {
      markets.push({
        address: market.address,
        question: market.question,
        category: market.category
      });
    }
  }

  if (markets.length === 0) {
    console.log('📭 No markets found');
    console.log('   Create your first market with:');
    console.log('   npx hardhat run scripts/create-market-simple.js --network amoy\n');
    return;
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`FOUND ${markets.length} MARKET${markets.length > 1 ? 'S' : ''}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Fetch details for each market
  const marketDetails = [];

  for (let i = 0; i < markets.length; i++) {
    const marketData = markets[i];

    console.log(`[${i + 1}/${markets.length}] Loading ${marketData.address}...`);

    try {
      const market = await hre.ethers.getContractAt('PredictionMarket', marketData.address);
      const info = await market.getMarketInfo();

      const now = Math.floor(Date.now() / 1000);
      const endTime = Number(info._endTime);
      const state = Number(info._state);
      const yesPool = parseFloat(hre.ethers.formatUnits(info._yesPool, 6));
      const noPool = parseFloat(hre.ethers.formatUnits(info._noPool, 6));
      const totalVolume = yesPool + noPool;
      const yesPrice = parseFloat(hre.ethers.formatUnits(info._yesPrice, 6)) * 100;

      marketDetails.push({
        address: marketData.address,
        question: info._question,
        endTime: endTime,
        ended: now >= endTime,
        state: state,
        stateText: ['Active', 'Resolved', 'Cancelled'][state],
        outcome: info._outcome,
        yesPool: yesPool,
        noPool: noPool,
        totalVolume: totalVolume,
        yesPrice: yesPrice,
        category: marketData.category || 'General'
      });
    } catch (err) {
      console.log(`   ⚠️  Could not load market info: ${err.message}`);
      marketDetails.push({
        address: marketData.address,
        question: marketData.question || 'Unknown',
        error: true
      });
    }
  }

  console.log();

  // Display markets grouped by state
  const activeMarkets = marketDetails.filter(m => !m.error && m.state === 0);
  const resolvedMarkets = marketDetails.filter(m => !m.error && m.state === 1);
  const cancelledMarkets = marketDetails.filter(m => !m.error && m.state === 2);
  const errorMarkets = marketDetails.filter(m => m.error);

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🟢 Active: ${activeMarkets.length}`);
  console.log(`✅ Resolved: ${resolvedMarkets.length}`);
  console.log(`❌ Cancelled: ${cancelledMarkets.length}`);
  if (errorMarkets.length > 0) {
    console.log(`⚠️  Errors: ${errorMarkets.length}`);
  }

  const totalLiquidity = marketDetails
    .filter(m => !m.error)
    .reduce((sum, m) => sum + m.totalVolume, 0);
  console.log(`💰 Total Liquidity: ${totalLiquidity.toFixed(2)} USDT`);
  console.log();

  // Display active markets
  if (activeMarkets.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🟢 ACTIVE MARKETS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    activeMarkets.forEach((m, idx) => {
      console.log(`${idx + 1}. ${m.question}`);
      console.log(`   Address: ${m.address}`);
      console.log(`   End Time: ${new Date(m.endTime * 1000).toLocaleString()}`);

      const now = Math.floor(Date.now() / 1000);
      if (m.ended) {
        const hoursPassed = Math.floor((now - m.endTime) / 3600);
        console.log(`   Status: ⏰ ENDED ${hoursPassed}h ago - Ready for resolution`);
      } else {
        const hoursRemaining = Math.floor((m.endTime - now) / 3600);
        console.log(`   Status: ✅ LIVE - ${hoursRemaining}h remaining`);
      }

      console.log(`   Liquidity: $${m.totalVolume.toFixed(2)} USDT`);
      console.log(`   YES Price: ${m.yesPrice.toFixed(1)}% | NO Price: ${(100 - m.yesPrice).toFixed(1)}%`);
      console.log(`   Link: https://amoy.polygonscan.com/address/${m.address}`);
      console.log();
    });
  }

  // Display resolved markets
  if (resolvedMarkets.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ RESOLVED MARKETS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    resolvedMarkets.forEach((m, idx) => {
      const result = m.outcome ? 'YES' : 'NO';
      const resultEmoji = m.outcome ? '✅' : '❌';

      console.log(`${idx + 1}. ${m.question}`);
      console.log(`   Address: ${m.address}`);
      console.log(`   Resolved: ${resultEmoji} ${result} WINS`);
      console.log(`   Final Volume: $${m.totalVolume.toFixed(2)} USDT`);
      console.log(`   Link: https://amoy.polygonscan.com/address/${m.address}`);
      console.log();
    });
  }

  // Display cancelled markets
  if (cancelledMarkets.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ CANCELLED MARKETS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    cancelledMarkets.forEach((m, idx) => {
      console.log(`${idx + 1}. ${m.question}`);
      console.log(`   Address: ${m.address}`);
      console.log(`   Status: Refunds available`);
      console.log(`   Link: https://amoy.polygonscan.com/address/${m.address}`);
      console.log();
    });
  }

  // Display error markets
  if (errorMarkets.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  MARKETS WITH ERRORS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    errorMarkets.forEach((m, idx) => {
      console.log(`${idx + 1}. ${m.question}`);
      console.log(`   Address: ${m.address}`);
      console.log(`   Note: Could not load market details`);
      console.log();
    });
  }

  // Action items
  const marketsNeedingResolution = activeMarkets.filter(m => m.ended);

  if (marketsNeedingResolution.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  ACTION REQUIRED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`${marketsNeedingResolution.length} market(s) have ended and need resolution:`);
    console.log();

    marketsNeedingResolution.forEach((m, idx) => {
      console.log(`${idx + 1}. ${m.question}`);
      console.log(`   Address: ${m.address}`);
      const hoursPassed = Math.floor((Math.floor(Date.now() / 1000) - m.endTime) / 3600);
      console.log(`   Ended: ${hoursPassed}h ago`);
      console.log();
    });

    console.log('📋 To resolve a market:');
    console.log('   npx hardhat run scripts/resolve-market.js --network amoy');
    console.log('   (Update MARKET_ADDRESS in the script first)');
    console.log();
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 USEFUL COMMANDS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Check market status:');
  console.log('  npx hardhat run scripts/check-market-status.js --network amoy <address>');
  console.log();
  console.log('Resolve market:');
  console.log('  npx hardhat run scripts/resolve-market.js --network amoy');
  console.log();
  console.log('Create new market:');
  console.log('  npx hardhat run scripts/create-market-simple.js --network amoy');
  console.log();
  console.log('Create multiple markets:');
  console.log('  npx hardhat run scripts/create-multiple-markets.js --network amoy');
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
