const hre = require('hardhat');

async function main() {
  const WALLET = '0xd9515b4e98291073c9d91b6ea4d372bb1f2d3d1a';
  const AMOUNT = '10000';
  
  console.log('💰 Minting', AMOUNT, 'USDT to current wallet');
  console.log('Wallet:', WALLET);
  
  const mockUsdt = require('../mock-usdt.json');
  const usdt = await hre.ethers.getContractAt('MockERC20', mockUsdt.address);
  
  // Use BigNumber for compatibility
  const amount = hre.ethers.BigNumber.from('10000000000'); // 10,000 with 6 decimals
  
  console.log('Minting...');
  const tx = await usdt.mint(WALLET, amount);
  
  console.log('Transaction:', tx.hash);
  console.log('Waiting...');
  
  await tx.wait();
  
  console.log('✅ Successfully minted 10,000 USDT!');
  console.log('Refresh your frontend to see the balance.');
}

main().then(() => process.exit(0)).catch(console.error);
