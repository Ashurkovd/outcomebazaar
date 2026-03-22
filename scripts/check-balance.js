const hre = require('hardhat');

async function main() {
  const WALLET = '0x468f0A0CED7d688E60C3bD31Fd5EcBD86DE63415';

  console.log('🔍 Checking USDT Balance\n');
  console.log('Wallet:', WALLET);

  const mockUsdt = require('../mock-usdt.json');
  console.log('USDT Contract:', mockUsdt.address);

  const usdt = await hre.ethers.getContractAt('MockERC20', mockUsdt.address);

  const balance = await usdt.balanceOf(WALLET);
  const formatted = hre.ethers.utils ?
    hre.ethers.utils.formatUnits(balance, 6) :
    hre.ethers.formatUnits(balance, 6);

  console.log('\nBalance:', formatted, 'USDT');
  console.log('\n✅ This is your ON-CHAIN balance');
  console.log('If frontend shows different, there\'s a connection issue.');
}

main().then(() => process.exit(0)).catch(console.error);
