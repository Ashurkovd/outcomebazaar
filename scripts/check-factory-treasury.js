const hre = require('hardhat');

async function main() {
  console.log('💰 CHECKING FACTORY TREASURY\n');

  const FACTORY = '0xe16fea504931A9088208fa86bB84C25708E10A45';
  const USDT = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';

  const factory = await hre.ethers.getContractAt('MarketFactory', FACTORY);
  const usdt = await hre.ethers.getContractAt('IERC20', USDT);
  const [signer] = await hre.ethers.getSigners();

  console.log('Factory Address:', FACTORY);
  console.log('Your Address:', signer.address);
  console.log('Factory Owner:', await factory.owner());
  console.log('');

  const treasuryBalance = await factory.treasuryBalance();
  const actualBalance = await usdt.balanceOf(FACTORY);

  console.log('Treasury Balance (stored):', hre.ethers.formatUnits(treasuryBalance, 6), 'USDT');
  console.log('Actual USDT Balance:', hre.ethers.formatUnits(actualBalance, 6), 'USDT');
  console.log('');

  if (actualBalance > 0n) {
    console.log('✅ You can withdraw from factory treasury!');
    console.log('');
    console.log('Run this command:');
    console.log('  factory.withdrawTreasury(yourAddress, amount)');
  } else {
    console.log('❌ Factory treasury is empty (no trading fees collected)');
  }
}

main();
