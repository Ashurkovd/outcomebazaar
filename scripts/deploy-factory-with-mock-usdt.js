const hre = require('hardhat');
const fs = require('fs');

async function main() {
  console.log('🚀 Deploying MarketFactory with Mock USDT...\n');

  // Load Mock USDT address
  const mockUsdt = require('../mock-usdt.json');
  const USDT_ADDRESS = mockUsdt.address;

  console.log('Using Mock USDT:', USDT_ADDRESS);

  const [deployer] = await hre.ethers.getSigners();
  console.log('\nDeploying with account:', deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', hre.ethers.formatEther(balance), 'MATIC');

  // Check USDT balance
  const usdt = await hre.ethers.getContractAt('MockERC20', USDT_ADDRESS);
  const usdtBalance = await usdt.balanceOf(deployer.address);
  console.log('USDT balance:', hre.ethers.formatUnits(usdtBalance, 6), 'USDT\n');

  console.log('Deploying MarketFactory...');
  const MarketFactory = await hre.ethers.getContractFactory('MarketFactory');
  const factory = await MarketFactory.deploy(USDT_ADDRESS);
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();

  console.log('✅ MarketFactory deployed to:', factoryAddress);
  console.log('   USDT:', USDT_ADDRESS);
  console.log('   Owner:', deployer.address);
  console.log('   Oracle:', deployer.address);

  console.log('\n⏳ Waiting for confirmations...');
  await factory.deploymentTransaction().wait(5);

  console.log('\n✅ Deployment complete!');
  console.log('\n📝 Contract addresses:');
  console.log('   MarketFactory:', factoryAddress);
  console.log('   Mock USDT:', USDT_ADDRESS);
  console.log('\n🔗 Verify on PolygonScan:');
  console.log(`   Factory: https://amoy.polygonscan.com/address/${factoryAddress}`);
  console.log(`   USDT: https://amoy.polygonscan.com/address/${USDT_ADDRESS}`);

  // Update deployment.json
  const deploymentInfo = {
    network: 'amoy',
    contracts: {
      MarketFactory: {
        address: factoryAddress,
        token: USDT_ADDRESS
      }
    },
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    note: 'Using Mock USDT for testing'
  };

  fs.writeFileSync('./deployment.json', JSON.stringify(deploymentInfo, null, 2));
  console.log('\n💾 Updated deployment.json');

  console.log('\n🎉 System ready!');
  console.log('\n📋 You can now:');
  console.log('1. Create markets with $100 liquidity ✅');
  console.log('2. Users have 1M USDT for testing ✅');
  console.log('3. Run: npx hardhat run scripts/create-market-simple.js --network amoy');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
