const hre = require('hardhat');

async function main() {
  const WALLET_ADDRESS = '0x468f0A0CED7d688E60C3bD31Fd5EcBD86DE63415';
  const AMOUNT = '10000'; // 10,000 USDT

  console.log('💰 Minting Test USDT...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('To:', WALLET_ADDRESS);
  console.log('Amount:', AMOUNT, 'USDT\n');

  try {
    const mockUsdt = require('../mock-usdt.json');
    const usdt = await hre.ethers.getContractAt('MockERC20', mockUsdt.address);

    console.log('USDT Contract:', mockUsdt.address);

    // Helper function for formatting (works with both ethers v5 and v6)
    const formatUSDT = (amount) => {
      try {
        // Try ethers v6 first
        if (hre.ethers.formatUnits) {
          return hre.ethers.formatUnits(amount, 6);
        }
        // Fall back to ethers v5
        return hre.ethers.utils.formatUnits(amount, 6);
      } catch (err) {
        // Manual formatting as fallback
        return (Number(amount) / 1000000).toString();
      }
    };

    const parseUSDT = (amount) => {
      try {
        // Try ethers v6 first
        if (hre.ethers.parseUnits) {
          return hre.ethers.parseUnits(amount, 6);
        }
        // Fall back to ethers v5
        return hre.ethers.utils.parseUnits(amount, 6);
      } catch (err) {
        // Manual parsing as fallback
        return hre.ethers.BigNumber.from(Number(amount) * 1000000);
      }
    };

    // Check current balance
    console.log('\n⏳ Checking current balance...');
    const balanceBefore = await usdt.balanceOf(WALLET_ADDRESS);
    console.log('Balance before:', formatUSDT(balanceBefore), 'USDT');

    // Mint tokens
    console.log('\n⏳ Minting tokens...');
    const amountToMint = parseUSDT(AMOUNT);
    const tx = await usdt.mint(WALLET_ADDRESS, amountToMint);

    console.log('Transaction hash:', tx.hash);
    console.log('Waiting for confirmation...');

    await tx.wait();

    // Check new balance
    const balanceAfter = await usdt.balanceOf(WALLET_ADDRESS);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ MINTING SUCCESSFUL!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Balance before:', formatUSDT(balanceBefore), 'USDT');
    console.log('Balance after:', formatUSDT(balanceAfter), 'USDT');
    console.log('Minted:', AMOUNT, 'USDT');
    console.log('\n🎉 You now have', formatUSDT(balanceAfter), 'test USDT!');
    console.log('\n🔗 View transaction:');
    console.log('   https://amoy.polygonscan.com/tx/' + tx.hash);
    console.log('\n💡 Refresh your frontend to see the updated balance.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
