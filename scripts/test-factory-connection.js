const hre = require('hardhat');

async function main() {
  console.log('🔍 TESTING FACTORY CONNECTION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const deployment = require('../deployment.json');
  const factoryAddress = deployment.contracts.MarketFactory.address;
  const usdtAddress = deployment.contracts.MarketFactory.token;

  console.log('📋 Configuration:');
  console.log('Factory address:', factoryAddress);
  console.log('USDT address:', usdtAddress);
  console.log();

  try {
    console.log('1️⃣ Connecting to factory contract...');
    const factory = await hre.ethers.getContractAt('MarketFactory', factoryAddress);
    console.log('   ✅ Factory contract found!\n');

    // Test getMarketCount - this should work even if events don't
    console.log('2️⃣ Getting market count...');
    const count = await factory.getMarketCount();
    const countNum = Number(count);
    console.log('   📊 Market count:', countNum);
    console.log();

    if (countNum === 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  NO MARKETS EXIST!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log();
      console.log('You need to create markets first.');
      console.log();
      console.log('To create a single market:');
      console.log('  npx hardhat run scripts/create-market-simple.js --network amoy');
      console.log();
      console.log('To create multiple markets:');
      console.log('  npx hardhat run scripts/create-multiple-markets.js --network amoy');
      console.log();
      return;
    }

    // List all markets using direct contract calls (not events)
    console.log('3️⃣ Loading market details...\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('FOUND MARKETS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    for (let i = 0; i < countNum; i++) {
      try {
        const marketAddr = await factory.markets(i);
        console.log(`Market ${i + 1}:`);
        console.log(`  Address: ${marketAddr}`);

        // Try to get market info
        const market = await hre.ethers.getContractAt('PredictionMarket', marketAddr);
        const info = await market.getMarketInfo();

        console.log(`  Question: ${info._question}`);
        console.log(`  End Time: ${new Date(Number(info._endTime) * 1000).toLocaleString()}`);
        console.log(`  State: ${['Active', 'Resolved', 'Cancelled'][info._state]}`);
        console.log(`  YES Pool: ${hre.ethers.formatUnits(info._yesPool, 6)} USDT`);
        console.log(`  NO Pool: ${hre.ethers.formatUnits(info._noPool, 6)} USDT`);
        console.log();
      } catch (error) {
        console.log(`  ❌ Error loading market ${i + 1}:`, error.message);
        console.log();
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ FACTORY CONNECTION TEST COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('💡 FRONTEND FIX NEEDED:');
    console.log('The frontend should use getMarketCount() and markets(i)');
    console.log('instead of querying events, which timeout on Amoy testnet.');
    console.log();

  } catch (err) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ ERROR:', err.message);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (err.message.includes('invalid address')) {
      console.error('⚠️  Factory address is invalid!');
      console.error('Check deployment.json');
    } else if (err.message.includes('call revert') || err.message.includes('CALL_EXCEPTION')) {
      console.error('⚠️  Factory contract not found at this address!');
      console.error('You may need to redeploy.');
    } else if (err.message.includes('network')) {
      console.error('⚠️  Network error!');
      console.error('Make sure you are connected to Polygon Amoy testnet.');
    }

    console.error('\nFull error:', err);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
