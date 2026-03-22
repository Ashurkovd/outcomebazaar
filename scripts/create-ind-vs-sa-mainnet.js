const hre = require('hardhat');

async function main() {
  console.log('🏏 Creating India vs SA Test Market on MAINNET...\n');

  const factoryAddress = '0xe16fea504931A9088208fa86bB84C25708E10A45';
  const usdtAddress = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';

  // ERC20 ABI for the functions we need
  const ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)'
  ];

  const factory = await hre.ethers.getContractAt('MarketFactory', factoryAddress);
  const usdt = new hre.ethers.Contract(usdtAddress, ERC20_ABI, (await hre.ethers.getSigners())[0]);

  const question = 'Will India win the 2nd Test vs South Africa at Guwahati?';
  const endTime = 1764201600; // November 27, 2025, 00:00 UTC (corrected year)
  const initialLiquidity = hre.ethers.parseUnits('100', 6); // 100 USDT per side (USDT has 6 decimals)

  const [deployer] = await hre.ethers.getSigners();

  console.log('Market Details:');
  console.log('  Question:', question);
  console.log('  End Time:', new Date(endTime * 1000).toLocaleString());
  console.log('  Initial Liquidity:', hre.ethers.formatUnits(initialLiquidity, 6), 'USDT per side');
  console.log('  Total Liquidity:', hre.ethers.formatUnits(initialLiquidity * 2n, 6), 'USDT\n');

  // Check USDT balance
  const balance = await usdt.balanceOf(deployer.address);
  console.log('Your USDT Balance:', hre.ethers.formatUnits(balance, 6), 'USDT');

  const totalNeeded = initialLiquidity * 2n;
  if (balance < totalNeeded) {
    console.log('❌ ERROR: Insufficient USDT balance!');
    console.log('   Needed:', hre.ethers.formatUnits(totalNeeded, 6), 'USDT');
    console.log('   Have:', hre.ethers.formatUnits(balance, 6), 'USDT');
    return;
  }

  // Approve USDT
  console.log('\n⏳ Approving USDT...');
  const approveTx = await usdt.approve(factoryAddress, totalNeeded);
  await approveTx.wait();
  console.log('✅ USDT approved\n');

  console.log('⏳ Creating market...');

  const tx = await factory.createMarket(
    question,
    endTime,
    initialLiquidity,
    { gasLimit: 5000000 }
  );

  console.log('Transaction hash:', tx.hash);
  console.log('⏳ Waiting for confirmation...\n');

  const receipt = await tx.wait();

  // Find MarketCreated event
  let marketAddress;
  for (const log of receipt.logs) {
    try {
      const parsed = factory.interface.parseLog(log);
      if (parsed && parsed.name === 'MarketCreated') {
        marketAddress = parsed.args.marketAddress;
        break;
      }
    } catch (e) {
      // Skip logs that don't match
    }
  }

  if (!marketAddress) {
    console.log('⚠️ Market created but event not found in logs');
    console.log('Check transaction on PolygonScan:', `https://polygonscan.com/tx/${tx.hash}`);
    return;
  }

  console.log('✅ MARKET CREATED SUCCESSFULLY!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Market Address:', marketAddress);
  console.log('Question:', question);
  console.log('End Time:', new Date(endTime * 1000).toLocaleString());
  console.log('Initial Liquidity:', hre.ethers.formatUnits(initialLiquidity, 6), 'USDT per side');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🔗 View on PolygonScan:');
  console.log('Market:', `https://polygonscan.com/address/${marketAddress}`);
  console.log('Transaction:', `https://polygonscan.com/tx/${tx.hash}`);
  console.log('\n📝 SAVE THIS MARKET ADDRESS:', marketAddress);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
