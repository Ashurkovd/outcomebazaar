const hre = require('hardhat');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Configuration - Can be overridden via command line args
let MARKET_ADDRESS = process.env.MARKET_ADDRESS || null;
let OUTCOME = process.env.OUTCOME ? (process.env.OUTCOME.toLowerCase() === 'yes') : null;
let EVIDENCE_URL = process.env.EVIDENCE_URL || '';
let REASON = process.env.REASON || '';

// Evidence tracking file
const EVIDENCE_FILE = path.join(__dirname, '../market-resolutions.json');

// Load or initialize evidence database
function loadEvidence() {
  if (fs.existsSync(EVIDENCE_FILE)) {
    return JSON.parse(fs.readFileSync(EVIDENCE_FILE, 'utf8'));
  }
  return { resolutions: [] };
}

// Save evidence to database
function saveEvidence(data) {
  fs.writeFileSync(EVIDENCE_FILE, JSON.stringify(data, null, 2));
}

// Interactive prompt helper
async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// List all markets and allow selection
async function selectMarket(factory) {
  const marketCount = await factory.marketCount();

  if (marketCount === 0) {
    console.log('❌ No markets found.');
    return null;
  }

  console.log('\n📊 AVAILABLE MARKETS:\n');

  const markets = [];
  for (let i = 0; i < marketCount; i++) {
    const marketAddress = await factory.markets(i);
    const market = await hre.ethers.getContractAt('PredictionMarket', marketAddress);

    const info = await market.getMarketInfo();
    const state = Number(info._state);
    const stateNames = ['Active', 'Resolved', 'Cancelled'];
    const now = Math.floor(Date.now() / 1000);
    const ended = now >= Number(info._endTime);

    markets.push({
      index: i,
      address: marketAddress,
      question: info._question,
      state,
      stateName: stateNames[state],
      ended
    });

    const statusIcon = state === 0 ? (ended ? '🔴' : '🟢') : (state === 1 ? '✅' : '❌');
    console.log(`[${i}] ${statusIcon} ${info._question}`);
    console.log(`    Address: ${marketAddress}`);
    console.log(`    Status: ${stateNames[state]} ${ended ? '(Ended)' : '(Active)'}`);
    console.log('');
  }

  const resolvableMarkets = markets.filter(m => m.state === 0 && m.ended);
  if (resolvableMarkets.length === 0) {
    console.log('❌ No markets are ready for resolution.');
    return null;
  }

  const answer = await prompt('Enter market index to resolve: ');
  const index = parseInt(answer);

  if (isNaN(index) || index < 0 || index >= markets.length) {
    console.log('❌ Invalid market index.');
    return null;
  }

  return markets[index].address;
}

async function main() {
  console.log('🎯 MARKET RESOLUTION TOOL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Load deployment
  const deployment = require('../deployment.json');

  // Connect to contracts
  const [owner] = await hre.ethers.getSigners();
  const factory = await hre.ethers.getContractAt('MarketFactory', deployment.contracts.MarketFactory.address);

  console.log('👤 Resolver:', owner.address);
  console.log('🏭 Factory:', deployment.contracts.MarketFactory.address);

  // Interactive mode if no market address provided
  if (!MARKET_ADDRESS) {
    console.log('\n💡 No market address provided. Entering interactive mode...');
    MARKET_ADDRESS = await selectMarket(factory);

    if (!MARKET_ADDRESS) {
      return;
    }
  }

  const market = await hre.ethers.getContractAt('PredictionMarket', MARKET_ADDRESS);

  console.log('\n📊 Market:', MARKET_ADDRESS);
  console.log();

  // Get market info
  console.log('📋 MARKET DETAILS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const info = await market.getMarketInfo();

    console.log('Question:', info._question);
    console.log('End Time:', new Date(Number(info._endTime) * 1000).toLocaleString());

    const state = Number(info._state);
    const stateNames = ['Active', 'Resolved', 'Cancelled'];
    console.log('State:', stateNames[state]);

    if (state === 1) { // Resolved
      console.log('\n⚠️  This market is already resolved!');
      const resultText = info._outcome ? 'YES' : 'NO';
      console.log('Result:', resultText);
      return;
    }

    if (state === 2) { // Cancelled
      console.log('\n⚠️  This market was cancelled!');
      return;
    }

    // Check if market has ended
    const now = Math.floor(Date.now() / 1000);
    if (now < Number(info._endTime)) {
      const hoursRemaining = Math.floor((Number(info._endTime) - now) / 3600);
      console.log('\n⚠️  Market has not ended yet!');
      console.log('Hours remaining:', hoursRemaining);
      console.log('\nYou can still resolve early if needed (only owner).');
    }

    // Show pools and volume
    const yesPool = parseFloat(hre.ethers.formatUnits(info._yesPool, 6));
    const noPool = parseFloat(hre.ethers.formatUnits(info._noPool, 6));
    const totalVolume = yesPool + noPool;

    console.log('\n💰 POOL STATE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('YES Pool:', yesPool.toFixed(2), 'USDT');
    console.log('NO Pool:', noPool.toFixed(2), 'USDT');
    console.log('Total Volume:', totalVolume.toFixed(2), 'USDT');
    console.log('YES Price:', (parseFloat(hre.ethers.formatUnits(info._yesPrice, 6)) * 100).toFixed(1) + '%');
    console.log('NO Price:', (parseFloat(hre.ethers.formatUnits(info._noPrice, 6)) * 100).toFixed(1) + '%');

  } catch (err) {
    console.error('❌ Error loading market:', err.message);
    return;
  }

  // Interactive evidence collection if not provided
  if (OUTCOME === null || !REASON) {
    console.log('\n📝 EVIDENCE COLLECTION:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (OUTCOME === null) {
      const outcomeAnswer = await prompt('Outcome (YES/NO): ');
      OUTCOME = outcomeAnswer.trim().toUpperCase() === 'YES';
    }

    if (!REASON) {
      REASON = await prompt('Reason for outcome: ');
    }

    if (!EVIDENCE_URL) {
      EVIDENCE_URL = await prompt('Evidence URL (or press Enter to skip): ');
    }

    const additionalNotes = await prompt('Additional notes (optional): ');
    if (additionalNotes.trim()) {
      REASON += '\n\nNotes: ' + additionalNotes.trim();
    }
  }

  console.log('\n🎯 PROPOSED RESOLUTION:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Outcome:', OUTCOME ? '✅ YES WINS' : '❌ NO WINS');
  console.log('Reason:', REASON);
  if (EVIDENCE_URL) {
    console.log('Evidence:', EVIDENCE_URL);
  }

  console.log('\n⚠️  IMPACT:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (OUTCOME) {
    console.log('✅ YES holders will be able to claim winnings');
    console.log('❌ NO holders will lose their stake');
  } else {
    console.log('❌ YES holders will lose their stake');
    console.log('✅ NO holders will be able to claim winnings');
  }
  console.log('\n⚠️  THIS ACTION CANNOT BE UNDONE!');
  console.log('⚠️  Make sure you have verified the outcome!\n');

  // Confirmation prompt
  const confirm = await prompt('Type "RESOLVE" to confirm resolution: ');

  if (confirm !== 'RESOLVE') {
    console.log('\n❌ Resolution cancelled. No changes made.');
    return;
  }

  console.log('\n⏳ Submitting resolution transaction...\n');

  try {
    const tx = await factory.resolveMarket(MARKET_ADDRESS, OUTCOME, {
      gasLimit: 500000
    });

    console.log('Transaction submitted:', tx.hash);
    console.log('⏳ Waiting for confirmation...\n');

    await tx.wait();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ MARKET RESOLVED SUCCESSFULLY!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📝 Resolution Details:');
    console.log('  Market:', MARKET_ADDRESS);
    console.log('  Outcome:', OUTCOME ? 'YES' : 'NO');
    console.log('  Reason:', REASON);
    console.log('  Evidence:', EVIDENCE_URL);
    console.log('  Transaction:', tx.hash);
    console.log('  Resolver:', owner.address);
    console.log('  Time:', new Date().toLocaleString());

    console.log('\n🔗 View on PolygonScan:');
    console.log('  Transaction:', 'https://amoy.polygonscan.com/tx/' + tx.hash);
    console.log('  Market:', 'https://amoy.polygonscan.com/address/' + MARKET_ADDRESS);

    console.log('\n✅ Winners can now claim their winnings!');

    // Save resolution evidence
    const info = await market.getMarketInfo();
    const db = loadEvidence();

    const resolutionRecord = {
      marketAddress: MARKET_ADDRESS,
      question: info._question,
      outcome: OUTCOME ? 'YES' : 'NO',
      resolvedAt: new Date().toISOString(),
      evidence: {
        reason: REASON,
        evidenceUrl: EVIDENCE_URL || null,
        transactionHash: tx.hash,
        resolvedBy: owner.address,
        network: 'amoy',
        blockExplorerUrl: `https://amoy.polygonscan.com/tx/${tx.hash}`
      }
    };

    db.resolutions.push(resolutionRecord);
    saveEvidence(db);

    console.log('\n💾 Resolution evidence saved to market-resolutions.json');

  } catch (err) {
    console.error('\n❌ Error resolving market:', err);
    if (err.message.includes('only owner') || err.message.includes('Only owner')) {
      console.error('\n⚠️  You are not the owner of the factory contract!');
    }
    throw err;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
