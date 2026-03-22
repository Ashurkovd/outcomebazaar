const hre = require('hardhat');
const fs = require('fs');

async function main() {
  console.log('🚀 Creating multiple markets with $1,000 liquidity each...\n');

  const deployment = require('../deployment.json');
  const mockUsdt = require('../mock-usdt.json');

  const factoryAddress = deployment.contracts.MarketFactory.address;
  const usdtAddress = mockUsdt.address;

  console.log('Factory:', factoryAddress);
  console.log('USDT:', usdtAddress);

  const [deployer] = await hre.ethers.getSigners();
  console.log('Deployer:', deployer.address);

  const factory = await hre.ethers.getContractAt('MarketFactory', factoryAddress);
  const usdt = await hre.ethers.getContractAt('MockERC20', usdtAddress);

  // Check balance
  const balance = await usdt.balanceOf(deployer.address);
  console.log('\nYour USDT balance:', hre.ethers.formatUnits(balance, 6), 'USDT\n');

  // Market configurations
  const markets = [
    {
      question: 'Will India win vs Australia (Border-Gavaskar Trophy Test 1)?',
      duration: 7 * 24 * 60 * 60, // 7 days
      category: 'Cricket'
    },
    {
      question: 'Will Bitcoin reach $100,000 by end of 2025?',
      duration: 60 * 24 * 60 * 60, // 60 days
      category: 'Crypto'
    },
    {
      question: 'Will Congress win Karnataka elections 2025?',
      duration: 90 * 24 * 60 * 60, // 90 days
      category: 'Politics'
    },
    {
      question: 'Will India qualify for FIFA World Cup 2026?',
      duration: 180 * 24 * 60 * 60, // 180 days
      category: 'Football'
    },
    {
      question: 'Will Ethereum price exceed $5,000 in 2025?',
      duration: 60 * 24 * 60 * 60, // 60 days
      category: 'Crypto'
    }
  ];

  const initialLiquidityPerSide = hre.ethers.parseUnits('500', 6); // $500 per side
  const totalLiquidityPerMarket = initialLiquidityPerSide * 2n; // $1,000 total
  const totalNeeded = totalLiquidityPerMarket * BigInt(markets.length);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('DEPLOYMENT PLAN');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Markets to create:', markets.length);
  console.log('Liquidity per market: $1,000 USDT ($500 YES + $500 NO)');
  console.log('Total USDT needed:', hre.ethers.formatUnits(totalNeeded, 6), 'USDT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check if we need to mint more USDT
  if (balance < totalNeeded) {
    const amountToMint = totalNeeded - balance;
    console.log('⚠️  Insufficient USDT. Minting', hre.ethers.formatUnits(amountToMint, 6), 'more USDT...');
    const mintTx = await usdt.mint(deployer.address, amountToMint, { gasLimit: 100000 });
    await mintTx.wait();
    console.log('✅ Minted successfully\n');
  }

  // Approve total amount once
  console.log('1️⃣ Approving', hre.ethers.formatUnits(totalNeeded, 6), 'USDT for all markets...');
  const approveTx = await usdt.approve(factoryAddress, totalNeeded);
  await approveTx.wait();
  console.log('   ✅ Approved\n');

  // Create markets
  const createdMarkets = [];

  for (let i = 0; i < markets.length; i++) {
    const market = markets[i];
    const endTime = Math.floor(Date.now() / 1000) + market.duration;

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`MARKET ${i + 1}/${markets.length}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log('Question:', market.question);
    console.log('Category:', market.category);
    console.log('Duration:', market.duration / 86400, 'days');
    console.log('End Time:', new Date(endTime * 1000).toLocaleString());
    console.log('Liquidity: $1,000 USDT\n');

    console.log('Creating market...');

    try {
      const tx = await factory.createMarket(
        market.question,
        endTime,
        initialLiquidityPerSide,
        { gasLimit: 5000000 }
      );

      console.log('Transaction:', tx.hash);
      console.log('⏳ Waiting for confirmation...');

      const receipt = await tx.wait();

      // Find MarketCreated event
      const event = receipt.logs.find(log => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed && parsed.name === 'MarketCreated';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = factory.interface.parseLog(event);
        const marketAddress = parsed.args.marketAddress;

        console.log('✅ Market created:', marketAddress);
        console.log('🔗 View:', `https://amoy.polygonscan.com/address/${marketAddress}\n`);

        createdMarkets.push({
          address: marketAddress,
          question: market.question,
          category: market.category,
          endTime: endTime,
          liquidity: '1000',
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.log('❌ Failed to create market:', error.message, '\n');
    }
  }

  // Save results
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('DEPLOYMENT COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Successfully created:', createdMarkets.length, '/', markets.length, 'markets');
  console.log('Total liquidity deployed: $' + (createdMarkets.length * 1000).toLocaleString(), 'USDT');

  const finalBalance = await usdt.balanceOf(deployer.address);
  console.log('Remaining USDT balance:', hre.ethers.formatUnits(finalBalance, 6), 'USDT\n');

  // Save market info
  const marketData = {
    network: 'amoy',
    factory: factoryAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    markets: createdMarkets
  };

  fs.writeFileSync('./deployed-markets.json', JSON.stringify(marketData, null, 2));
  console.log('💾 Market info saved to deployed-markets.json\n');

  // Display summary
  console.log('📊 CREATED MARKETS:\n');
  createdMarkets.forEach((market, i) => {
    console.log(`${i + 1}. ${market.question}`);
    console.log(`   Category: ${market.category}`);
    console.log(`   Address: ${market.address}`);
    console.log(`   Liquidity: $${market.liquidity} USDT`);
    console.log(`   Link: https://amoy.polygonscan.com/address/${market.address}\n`);
  });

  console.log('✅ All markets are LIVE and ready for trading! 🎉');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
