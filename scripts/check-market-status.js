const hre = require('hardhat');

// Market address to check - EDIT THIS VALUE or pass as command-line argument
const MARKET_ADDRESS = process.argv[2] || '0x3D6898779844642d791E8Ee3FFc1017478230361';

async function main() {
  console.log('📊 MARKET STATUS CHECKER');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!MARKET_ADDRESS || MARKET_ADDRESS === 'YOUR_MARKET_ADDRESS') {
    console.error('❌ Please provide a market address:');
    console.error('   Usage: npx hardhat run scripts/check-market-status.js --network amoy 0xYourMarketAddress');
    console.error('   Or edit the MARKET_ADDRESS in the script\n');
    process.exit(1);
  }

  console.log('🔍 Checking market:', MARKET_ADDRESS);
  console.log('🔗 Explorer:', `https://amoy.polygonscan.com/address/${MARKET_ADDRESS}\n`);

  // Load deployment
  const deployment = require('../deployment.json');
  const [viewer] = await hre.ethers.getSigners();

  // Connect to market
  let market;
  try {
    market = await hre.ethers.getContractAt('PredictionMarket', MARKET_ADDRESS);
  } catch (err) {
    console.error('❌ Error connecting to market:', err.message);
    console.error('   Make sure the address is correct and the contract is deployed\n');
    process.exit(1);
  }

  // Get market info
  let info;
  try {
    info = await market.getMarketInfo();
  } catch (err) {
    console.error('❌ Error loading market info:', err.message);
    console.error('   This may not be a valid PredictionMarket contract\n');
    process.exit(1);
  }

  // Display basic info
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('MARKET INFORMATION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Question:', info._question);
  console.log('Address:', MARKET_ADDRESS);
  console.log();

  // Time information
  const now = Math.floor(Date.now() / 1000);
  const endTime = Number(info._endTime);
  const endDate = new Date(endTime * 1000);

  console.log('⏰ TIMING:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('End Time:', endDate.toLocaleString());

  if (now < endTime) {
    const secondsRemaining = endTime - now;
    const daysRemaining = Math.floor(secondsRemaining / 86400);
    const hoursRemaining = Math.floor((secondsRemaining % 86400) / 3600);
    const minutesRemaining = Math.floor((secondsRemaining % 3600) / 60);

    console.log('Status: 🟢 ACTIVE');
    console.log('Time Remaining:', `${daysRemaining}d ${hoursRemaining}h ${minutesRemaining}m`);
  } else {
    const secondsPassed = now - endTime;
    const daysPassed = Math.floor(secondsPassed / 86400);
    const hoursPassed = Math.floor((secondsPassed % 86400) / 3600);

    console.log('Status: 🔴 ENDED');
    console.log('Time Since End:', `${daysPassed}d ${hoursPassed}h ago`);
  }
  console.log();

  // Market state
  const state = Number(info._state);
  const stateNames = ['Active', 'Resolved', 'Cancelled'];
  const stateEmojis = ['🟢', '✅', '❌'];

  console.log('📍 STATE:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Current State:', stateEmojis[state], stateNames[state]);

  if (state === 1) { // Resolved
    const resultText = info._outcome ? 'YES' : 'NO';
    const resultEmoji = info._outcome ? '✅' : '❌';
    console.log('Resolution:', resultEmoji, resultText, 'WINS');
  } else if (state === 2) { // Cancelled
    console.log('Note: This market was cancelled. Users can claim refunds.');
  }
  console.log();

  // Pool information
  const yesPool = parseFloat(hre.ethers.formatUnits(info._yesPool, 6));
  const noPool = parseFloat(hre.ethers.formatUnits(info._noPool, 6));
  const totalVolume = yesPool + noPool;
  const yesPrice = parseFloat(hre.ethers.formatUnits(info._yesPrice, 6)) * 100;
  const noPrice = parseFloat(hre.ethers.formatUnits(info._noPrice, 6)) * 100;

  console.log('💰 LIQUIDITY & PRICING:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('YES Pool:', yesPool.toFixed(2), 'USDT');
  console.log('NO Pool:', noPool.toFixed(2), 'USDT');
  console.log('Total Volume:', totalVolume.toFixed(2), 'USDT');
  console.log();
  console.log('YES Price:', yesPrice.toFixed(1) + '%');
  console.log('NO Price:', noPrice.toFixed(1) + '%');
  console.log();

  // Price indicators
  if (yesPrice > 60) {
    console.log('📈 Market sentiment: Strong YES');
  } else if (yesPrice > 55) {
    console.log('📈 Market sentiment: Leaning YES');
  } else if (yesPrice < 40) {
    console.log('📉 Market sentiment: Strong NO');
  } else if (yesPrice < 45) {
    console.log('📉 Market sentiment: Leaning NO');
  } else {
    console.log('⚖️  Market sentiment: Balanced');
  }
  console.log();

  // Check user's position
  console.log('👤 YOUR POSITION:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const userYesShares = await market.yesShares(viewer.address);
  const userNoShares = await market.noShares(viewer.address);

  if (userYesShares > 0n || userNoShares > 0n) {
    console.log('YES Shares:', userYesShares.toString());
    console.log('NO Shares:', userNoShares.toString());

    // Calculate potential payout
    if (state === 1) { // Resolved
      if (info._outcome && userYesShares > 0n) {
        const payout = hre.ethers.formatUnits(userYesShares, 6);
        console.log('✅ You won!');
        console.log('Claimable:', payout, 'USDT');
      } else if (!info._outcome && userNoShares > 0n) {
        const payout = hre.ethers.formatUnits(userNoShares, 6);
        console.log('✅ You won!');
        console.log('Claimable:', payout, 'USDT');
      } else {
        console.log('❌ Your shares lost value in this resolution');
      }
    }
  } else {
    console.log('No position in this market');
  }
  console.log();

  // Factory info
  const factory = await hre.ethers.getContractAt('MarketFactory', deployment.contracts.MarketFactory.address);
  const oracle = await factory.oracle();

  console.log('🔧 CONTRACT DETAILS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Factory:', deployment.contracts.MarketFactory.address);
  console.log('Oracle:', oracle);
  console.log('Token:', deployment.contracts.MarketFactory.token);
  console.log();

  // Guidance
  console.log('📝 NEXT STEPS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (state === 0) { // Active
    if (now >= endTime) {
      console.log('✅ Market has ended and is ready for resolution');
      console.log('📋 To resolve: npx hardhat run scripts/resolve-market.js --network amoy');
      console.log('   (Update MARKET_ADDRESS in the script first)');
    } else {
      console.log('⏰ Market is still active');
      console.log('🛒 Users can trade shares until:', endDate.toLocaleString());
      console.log('📋 To trade: Use the market contract at', MARKET_ADDRESS);
    }
  } else if (state === 1) { // Resolved
    console.log('✅ Market is resolved');
    if (info._outcome) {
      console.log('🎉 YES holders can claim their winnings');
    } else {
      console.log('🎉 NO holders can claim their winnings');
    }
    console.log('📋 Winners can call claimWinnings() on the market contract');
  } else if (state === 2) { // Cancelled
    console.log('❌ Market is cancelled');
    console.log('💰 All users can claim refunds');
    console.log('📋 Users can call claimRefund() on the market contract');
  }

  console.log();
  console.log('🔗 EXPLORER LINKS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Market:', `https://amoy.polygonscan.com/address/${MARKET_ADDRESS}`);
  console.log('Factory:', `https://amoy.polygonscan.com/address/${deployment.contracts.MarketFactory.address}`);
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
