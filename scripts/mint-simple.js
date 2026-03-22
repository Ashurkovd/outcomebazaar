const hre = require('hardhat');

async function main() {
  const WALLET = '0xd9515b4e98291073c9d91b6ea4d372bb1f2d3d1a';
  
  console.log('💰 Minting 10,000 USDT to:', WALLET);
  
  const mockUsdt = require('../mock-usdt.json');
  const usdt = await hre.ethers.getContractAt('MockERC20', mockUsdt.address);
  
  console.log('USDT Contract:', mockUsdt.address);
  
  // Simple string-based amount (works with all versions)
  const amount = '10000000000'; // 10,000 USDT with 6 decimals
  
  console.log('Minting...');
  const tx = await usdt.mint(WALLET, amount);
  
  console.log('TX Hash:', tx.hash);
  await tx.wait();
  
  console.log('✅ Successfully minted 10,000 USDT!');
  console.log('View on PolygonScan:');
  console.log('https://amoy.polygonscan.com/tx/' + tx.hash);
  console.log('\nRefresh your frontend now!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
