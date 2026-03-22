/**
 * Deploy V2 Contracts: MarketFactory_V2 + PredictionMarket_V2
 *
 * WHAT CHANGED:
 * - Platform provides ZERO liquidity
 * - Users provide initial liquidity (min 20 USDT)
 * - LP can withdraw remaining liquidity after resolution
 *
 * DEPLOY TO POLYGON:
 *   npx hardhat run scripts/deploy-v2.js --network polygon
 *
 * DEPLOY TO AMOY TESTNET:
 *   npx hardhat run scripts/deploy-v2.js --network amoy
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting V2 deployment...\n");

  // Get network
  const network = hre.network.name;
  console.log(`Deploying to network: ${network}`);

  // USDT addresses for different networks
  const USDT_ADDRESSES = {
    polygon: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", // Polygon USDT
    amoy: "0x360Ad92aD7F0d03Ba5D4F17e81b48Bf1FC08bB1f",    // Amoy testnet USDT (update if needed)
    hardhat: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
  };

  const usdtAddress = USDT_ADDRESSES[network] || USDT_ADDRESSES.polygon;
  console.log(`Using USDT address: ${usdtAddress}\n`);

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying contracts with account: ${deployer.address}`);

  // Get account balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${hre.ethers.formatEther(balance)} MATIC\n`);

  if (hre.ethers.formatEther(balance) < 0.1) {
    console.warn("WARNING: Low MATIC balance. You may need more for deployment.");
  }

  // Deploy MarketFactory_V2
  console.log("Deploying MarketFactory (V2)...");
  const MarketFactory = await hre.ethers.getContractFactory("MarketFactory", {
    // Point to V2 source
  });
  const marketFactory = await MarketFactory.deploy(usdtAddress);
  await marketFactory.waitForDeployment();

  const factoryAddress = await marketFactory.getAddress();
  console.log(`MarketFactory V2 deployed to: ${factoryAddress}\n`);

  // Prepare deployment info
  const deploymentInfo = {
    version: "V2",
    network: network,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      MarketFactory: {
        address: factoryAddress,
        token: usdtAddress,
        version: "V2",
        note: "User-provided liquidity - platform has ZERO exposure",
      },
    },
    notes: [
      "No initial liquidity required from platform",
      "Users provide liquidity with provideLiquidity() on market contracts",
      "LPs get back remaining pool after resolution",
      "Fee: 1.5% on all trades (accumulated in market contract)",
    ],
  };

  // Save deployment info to file
  const deploymentPath = path.join(__dirname, "..", "deployment-v2.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`Deployment info saved to: ${deploymentPath}\n`);

  // Display deployment summary
  console.log("=".repeat(60));
  console.log("V2 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`Network:       ${network}`);
  console.log(`MarketFactory: ${factoryAddress}`);
  console.log(`USDT Token:    ${usdtAddress}`);
  console.log(`Owner/Oracle:  ${deployer.address}`);
  console.log("");
  console.log("HOW TO USE:");
  console.log("1. Call createMarket(question, endTime) - NO FUNDS NEEDED");
  console.log("2. User calls provideLiquidity(amount) on market contract");
  console.log("3. Trading opens automatically after liquidity provided");
  console.log("4. After resolution, LP calls withdrawLiquidity()");
  console.log("=".repeat(60));

  // Wait for block confirmations on live networks
  if (network !== "hardhat" && network !== "localhost") {
    console.log("\nWaiting for 6 block confirmations...");
    await marketFactory.deploymentTransaction().wait(6);
    console.log("Confirmed!\n");

    // Verify on Polygonscan if API key is available
    if (process.env.POLYGONSCAN_API_KEY) {
      console.log("Verifying contract on Polygonscan...");
      try {
        await hre.run("verify:verify", {
          address: factoryAddress,
          constructorArguments: [usdtAddress],
        });
        console.log("Contract verified successfully!");
      } catch (error) {
        console.log("Verification failed:", error.message);
      }
    } else {
      console.log("Tip: Set POLYGONSCAN_API_KEY in .env to auto-verify on Polygonscan");
      console.log(`Manual verification: https://polygonscan.com/address/${factoryAddress}`);
    }
  }

  console.log("\nV2 Deployment complete!");
  console.log("\nNEXT STEPS:");
  console.log(`1. Update src/config/contracts.js with new factory: ${factoryAddress}`);
  console.log("2. Create a test market: createMarket('Test question?', <endTime>)");
  console.log("3. Provide liquidity: provideLiquidity(20000000) on the market");
  console.log("4. Test trading: buyShares(true, 5000000) to buy YES shares");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
