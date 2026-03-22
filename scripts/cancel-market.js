const hre = require('hardhat');
const readline = require('readline');
const fs = require('fs');

// Market to cancel - EDIT THIS VALUE
const MARKET_ADDRESS = '0x3D6898779844642d791E8Ee3FFc1017478230361'; // TODO: Update with actual market address
const REASON = 'Market conditions compromised'; // Brief explanation for cancellation

async function main() {
  console.log('🚨 MARKET CANCELLATION TOOL');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('⚠️  WARNING: This will CANCEL the market and enable refunds');
  console.log('⚠️  Use this only in emergency situations!\n');

  // Load deployment
  const deployment = require('../deployment.json');

  // Connect to contracts
  const [owner] = await hre.ethers.getSigners();
  const factory = await hre.ethers.getContractAt('MarketFactory', deployment.contracts.MarketFactory.address);
  const market = await hre.ethers.getContractAt('PredictionMarket', MARKET_ADDRESS);

  console.log('👤 Canceller:', owner.address);
  console.log('🏭 Factory:', deployment.contracts.MarketFactory.address);
  console.log('📊 Market:', MARKET_ADDRESS);
  console.log();

  // Get market info
  console.log('📋 MARKET DETAILS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let info;
  try {
    info = await market.getMarketInfo();

    console.log('Question:', info._question);
    console.log('End Time:', new Date(Number(info._endTime) * 1000).toLocaleString());

    const state = Number(info._state);
    const stateNames = ['Active', 'Resolved', 'Cancelled'];
    console.log('State:', stateNames[state]);

    if (state === 1) { // Resolved
      console.log('\n❌ ERROR: This market is already resolved!');
      console.log('Cannot cancel a resolved market.');
      return;
    }

    if (state === 2) { // Cancelled
      console.log('\n⚠️  This market is already cancelled!');
      console.log('Users can claim refunds.');
      return;
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

  console.log('\n⚠️  CANCELLATION REASON:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(REASON);

  console.log('\n💰 IMPACT:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ All YES holders will receive refunds proportional to their shares');
  console.log('✅ All NO holders will receive refunds proportional to their shares');
  console.log('✅ Users can call claimRefund() to get their money back');
  console.log('\n⚠️  THIS ACTION CANNOT BE UNDONE!');
  console.log('⚠️  Make sure cancellation is justified!');
  console.log('\n📋 Valid reasons for cancellation:');
  console.log('   - Event was cancelled or invalidated');
  console.log('   - Market question became ambiguous or unclear');
  console.log('   - Oracle/resolution source unavailable');
  console.log('   - Technical issue with the market');
  console.log('   - Market was created with incorrect parameters\n');

  // Confirmation prompt
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const confirm = await new Promise((resolve) => {
    rl.question('Type "CANCEL" to confirm market cancellation: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });

  if (confirm !== 'CANCEL') {
    console.log('\n✅ Cancellation aborted. No changes made.');
    return;
  }

  console.log('\n⏳ Submitting cancellation transaction...\n');

  try {
    const tx = await factory.cancelMarket(MARKET_ADDRESS, {
      gasLimit: 500000
    });

    console.log('Transaction submitted:', tx.hash);
    console.log('⏳ Waiting for confirmation...\n');

    await tx.wait();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ MARKET CANCELLED SUCCESSFULLY!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📝 Cancellation Details:');
    console.log('  Market:', MARKET_ADDRESS);
    console.log('  Reason:', REASON);
    console.log('  Transaction:', tx.hash);
    console.log('  Cancelled By:', owner.address);
    console.log('  Time:', new Date().toLocaleString());

    console.log('\n🔗 View on PolygonScan:');
    console.log('  Transaction:', 'https://amoy.polygonscan.com/tx/' + tx.hash);
    console.log('  Market:', 'https://amoy.polygonscan.com/address/' + MARKET_ADDRESS);

    console.log('\n💰 Users can now claim refunds by calling claimRefund() on the market contract');

    // Save cancellation record
    const cancellationRecord = {
      market: MARKET_ADDRESS,
      reason: REASON,
      transactionHash: tx.hash,
      cancelledBy: owner.address,
      timestamp: new Date().toISOString(),
      network: 'amoy',
      question: info._question
    };

    let cancellations = [];
    try {
      cancellations = JSON.parse(fs.readFileSync('./cancellations.json', 'utf8'));
    } catch {}

    cancellations.push(cancellationRecord);
    fs.writeFileSync('./cancellations.json', JSON.stringify(cancellations, null, 2));

    console.log('\n💾 Cancellation record saved to cancellations.json');

    // Show refund info
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 USER INSTRUCTIONS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Users should call claimRefund() on the market contract to get their refunds');
    console.log('\nUsing ethers.js:');
    console.log('  const market = await ethers.getContractAt("PredictionMarket", "' + MARKET_ADDRESS + '");');
    console.log('  await market.claimRefund();');
    console.log('\nRefunds are proportional to the shares held.');
    console.log();

  } catch (err) {
    console.error('\n❌ Error cancelling market:', err);
    if (err.message.includes('only owner') || err.message.includes('Only owner')) {
      console.error('\n⚠️  You are not the owner of the factory contract!');
      console.error('Only the factory owner/oracle can cancel markets.');
    } else if (err.message.includes('Market already resolved')) {
      console.error('\n⚠️  Cannot cancel a market that has already been resolved!');
    } else if (err.message.includes('Market already cancelled')) {
      console.error('\n⚠️  This market is already cancelled!');
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
