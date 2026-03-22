const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting deployment...\n");

  // Get network
  const network = hre.network.name;
  console.log(`Deploying to network: ${network}`);

  // USDT addresses for different networks
  const USDT_ADDRESSES = {
    polygon: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", // Polygon USDT
    mumbai: "0x2058A9D7613eEE744279e3856Ef0eAda5FCbaA7e", // Mumbai USDT (testnet)
    hardhat: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", // Use Polygon address for local testing
  };

  const usdtAddress = USDT_ADDRESSES[network] || USDT_ADDRESSES.polygon;
  console.log(`Using USDT address: ${usdtAddress}\n`);

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying contracts with account: ${deployer.address}`);

  // Get account balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${hre.ethers.formatEther(balance)} MATIC\n`);

  // Deploy MarketFactory
  console.log("Deploying MarketFactory...");
  const MarketFactory = await hre.ethers.getContractFactory("MarketFactory");
  const marketFactory = await MarketFactory.deploy(usdtAddress);
  await marketFactory.waitForDeployment();

  const factoryAddress = await marketFactory.getAddress();
  console.log(`MarketFactory deployed to: ${factoryAddress}\n`);

  // Prepare deployment info
  const deploymentInfo = {
    network: network,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      MarketFactory: {
        address: factoryAddress,
        token: usdtAddress,
      },
    },
  };

  // Save deployment info to file
  const deploymentPath = path.join(__dirname, "..", "deployment.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`Deployment info saved to: ${deploymentPath}\n`);

  // Display deployment summary
  console.log("=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`Network: ${network}`);
  console.log(`MarketFactory: ${factoryAddress}`);
  console.log(`USDT Token: ${usdtAddress}`);
  console.log(`Owner/Oracle: ${deployer.address}`);
  console.log("=".repeat(60));

  // Wait for block confirmations on live networks
  if (network !== "hardhat" && network !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await marketFactory.deploymentTransaction().wait(6);
    console.log("Confirmed!\n");

    // Verify on Etherscan/Polygonscan if API key is available
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
    }
  }

  console.log("\nDeployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
