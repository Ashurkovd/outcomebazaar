const hre = require("hardhat");

async function main() {
  console.log("\n🔍 Checking Polygon Mainnet Balance\n");
  console.log("━".repeat(60));

  const [deployer] = await hre.ethers.getSigners();

  console.log("Deployer Address:", deployer.address);

  // Get MATIC balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const balanceInMatic = parseFloat(hre.ethers.formatEther(balance));

  console.log("MATIC Balance:", balanceInMatic.toFixed(4), "MATIC");

  // Check if sufficient for deployment (need ~0.5 MATIC minimum)
  const minRequired = 0.5;
  if (balanceInMatic < minRequired) {
    console.log("\n⚠️  WARNING: Insufficient MATIC balance!");
    console.log(`   Required: ~${minRequired} MATIC`);
    console.log(`   Current: ${balanceInMatic.toFixed(4)} MATIC`);
    console.log(`   Deficit: ${(minRequired - balanceInMatic).toFixed(4)} MATIC`);
  } else {
    console.log("\n✅ Sufficient MATIC for deployment");
  }

  console.log("\n━".repeat(60));

  // Real USDT address on Polygon Mainnet
  const REAL_USDT = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
  console.log("\n📌 Polygon Mainnet USDT Address:");
  console.log("   ", REAL_USDT);
  console.log("\nThis address will be used for deployment.");
  console.log("━".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
