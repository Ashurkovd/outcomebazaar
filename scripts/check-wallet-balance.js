const hre = require('hardhat');

async function main() {
  console.log('💰 Checking Wallet Balance...\n');

  const [signer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(signer.address);

  console.log('Wallet:', signer.address);
  console.log('POL Balance:', hre.ethers.formatEther(balance), 'POL');
  console.log('USD Value (approx):', (parseFloat(hre.ethers.formatEther(balance)) * 0.14).toFixed(2), 'USD');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
