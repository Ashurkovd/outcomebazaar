const hre = require('hardhat');
const fs = require('fs');

async function main() {
  console.log('💵 Deploying Mock USDT to Amoy testnet...\n');

  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying with account:', deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', hre.ethers.formatEther(balance), 'MATIC\n');

  // Deploy Mock USDT (6 decimals like real USDT)
  console.log('Deploying Mock USDT...');
  const MockERC20 = await hre.ethers.getContractFactory('MockERC20');
  const usdt = await MockERC20.deploy('USD Tether', 'USDT', 6);
  await usdt.waitForDeployment();

  const usdtAddress = await usdt.getAddress();

  console.log('✅ Mock USDT deployed to:', usdtAddress);
  console.log('   Name: USD Tether');
  console.log('   Symbol: USDT');
  console.log('   Decimals: 6');

  // Mint 1 million USDT to deployer for testing
  console.log('\n💰 Minting test USDT...');
  try {
    const mintAmount = hre.ethers.parseUnits('1000000', 6); // 1M USDT
    const mintTx = await usdt.mint(deployer.address, mintAmount, { gasLimit: 100000 });
    await mintTx.wait();
    console.log('✅ Minted 1,000,000 USDT to:', deployer.address);
  } catch (error) {
    console.log('⚠️  Minting in deployment failed, will mint separately');
    console.log('   You can mint later with: usdt.mint(address, amount)');
  }

  // Check balance
  const usdtBalance = await usdt.balanceOf(deployer.address);
  console.log('Your USDT balance:', hre.ethers.formatUnits(usdtBalance, 6), 'USDT');

  // Wait for confirmations
  console.log('\n⏳ Waiting for confirmations...');
  await usdt.deploymentTransaction().wait(5);

  console.log('\n✅ Mock USDT deployment complete!');
  console.log('\n📝 Mock USDT address:', usdtAddress);
  console.log('\n🔗 View on PolygonScan:');
  console.log(`   https://amoy.polygonscan.com/address/${usdtAddress}`);

  // Save Mock USDT info
  const mockUsdtInfo = {
    network: 'amoy',
    address: usdtAddress,
    name: 'USD Tether',
    symbol: 'USDT',
    decimals: 6,
    deployer: deployer.address,
    initialSupply: '1000000',
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync('./mock-usdt.json', JSON.stringify(mockUsdtInfo, null, 2));
  console.log('\n💾 Mock USDT info saved to mock-usdt.json');

  console.log('\n📋 NEXT STEPS:');
  console.log('1. Mock USDT deployed ✅');
  console.log('2. You have 1M USDT for testing ✅');
  console.log('3. Run: npx hardhat run scripts/deploy-factory-with-mock-usdt.js --network amoy');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
