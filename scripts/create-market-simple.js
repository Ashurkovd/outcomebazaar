const hre = require('hardhat');

async function main() {
  console.log('📊 Creating cricket prediction market...\n');

  // Load deployment info
  const deployment = require('../deployment.json');
  const factoryAddress = deployment.contracts.MarketFactory.address;
  const usdtAddress = deployment.contracts.MarketFactory.token;

  console.log('Factory:', factoryAddress);
  console.log('USDT:', usdtAddress);

  const [deployer] = await hre.ethers.getSigners();
  console.log('Deployer:', deployer.address);

  // Get contracts
  const factory = await hre.ethers.getContractAt('MarketFactory', factoryAddress);
  const usdt = await hre.ethers.getContractAt('MockERC20', usdtAddress);

  // Check balances
  const maticBalance = await hre.ethers.provider.getBalance(deployer.address);
  const usdtBalance = await usdt.balanceOf(deployer.address);

  console.log('\nBalances:');
  console.log('  MATIC:', hre.ethers.formatEther(maticBalance), 'MATIC');
  console.log('  USDT:', hre.ethers.formatUnits(usdtBalance, 6), 'USDT');

  // Market parameters
  const question = 'Will India win vs Australia (Border-Gavaskar Trophy Test 1)?';
  const endTime = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days
  const initialLiquidityPerSide = hre.ethers.parseUnits('500', 6); // $500 USDT per side
  const totalLiquidity = initialLiquidityPerSide * 2n; // $1,000 USDT total

  console.log('\nMarket Details:');
  console.log('  Question:', question);
  console.log('  End Time:', new Date(endTime * 1000).toLocaleString());
  console.log('  Initial Liquidity: $1,000 USDT');
  console.log('    - YES pool: $500 USDT');
  console.log('    - NO pool: $500 USDT');

  if (usdtBalance < totalLiquidity) {
    console.log('\n⚠️  Insufficient USDT. Minting more...');
    const mintTx = await usdt.mint(deployer.address, totalLiquidity, { gasLimit: 100000 });
    await mintTx.wait();
    console.log('✅ Minted', hre.ethers.formatUnits(totalLiquidity, 6), 'USDT');
  }

  // Approve factory to spend USDT (double the per-side amount)
  console.log('\n1️⃣ Approving USDT...');
  const approveTx = await usdt.approve(factoryAddress, totalLiquidity);
  await approveTx.wait();
  console.log('   ✅ Approved', hre.ethers.formatUnits(totalLiquidity, 6), 'USDT');

  // Create market
  console.log('\n2️⃣ Creating market...');
  const tx = await factory.createMarket(question, endTime, initialLiquidityPerSide, {
    gasLimit: 5000000
  });

  console.log('   Transaction:', tx.hash);
  console.log('   ⏳ Waiting for confirmation...');

  const receipt = await tx.wait();

  // Parse event
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

    console.log('\n✅ MARKET CREATED SUCCESSFULLY!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Market Address:', marketAddress);
    console.log('Question:', parsed.args.question);
    console.log('End Time:', new Date(Number(parsed.args.endTime) * 1000).toLocaleString());
    console.log('Initial Liquidity:', hre.ethers.formatUnits(parsed.args.initialLiquidity, 6), 'USDT per side');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n🔗 View on PolygonScan:');
    console.log(`   Market: https://amoy.polygonscan.com/address/${marketAddress}`);
    console.log(`   Transaction: https://amoy.polygonscan.com/tx/${tx.hash}`);

    console.log('\n🎉 Your cricket prediction market is LIVE! 🏏');
  } else {
    console.log('\n⚠️  Market created but event not found in logs');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
