const hre = require('hardhat');

async function main() {
  const mockUsdt = require('../mock-usdt.json');

  console.log('💰 Minting test USDT...\n');
  console.log('Mock USDT:', mockUsdt.address);

  const [deployer] = await hre.ethers.getSigners();
  console.log('Minting to:', deployer.address);

  const usdt = await hre.ethers.getContractAt('MockERC20', mockUsdt.address);

  // Mint 1 million USDT
  const mintAmount = hre.ethers.parseUnits('1000000', 6);
  console.log('Amount:', hre.ethers.formatUnits(mintAmount, 6), 'USDT');

  console.log('\nMinting...');
  const tx = await usdt.mint(deployer.address, mintAmount, { gasLimit: 100000 });
  await tx.wait();

  console.log('✅ Minted successfully!');

  const balance = await usdt.balanceOf(deployer.address);
  console.log('\nYour USDT balance:', hre.ethers.formatUnits(balance, 6), 'USDT');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
