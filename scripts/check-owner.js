const hre = require('hardhat');

async function main() {
  const factoryAddress = '0xe16fea504931A9088208fa86bB84C25708E10A45';
  const factory = await hre.ethers.getContractAt('MarketFactory', factoryAddress);

  const [deployer] = await hre.ethers.getSigners();

  console.log('Deployer address:', deployer.address);
  console.log('Factory owner:', await factory.owner());
  console.log('Is deployer the owner?', (await factory.owner()) === deployer.address);
}

main().then(() => process.exit(0)).catch(console.error);
