const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Creating test market...\n");

  // Load deployment info
  const deploymentPath = path.join(__dirname, "..", "deployment.json");
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("deployment.json not found. Please run deploy.js first.");
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const factoryAddress = deploymentInfo.contracts.MarketFactory.address;
  const usdtAddress = deploymentInfo.contracts.MarketFactory.token;

  console.log(`MarketFactory address: ${factoryAddress}`);
  console.log(`USDT address: ${usdtAddress}\n`);

  // Get signer
  const [signer] = await hre.ethers.getSigners();
  console.log(`Using account: ${signer.address}\n`);

  // Get contract instances
  const marketFactory = await hre.ethers.getContractAt(
    "MarketFactory",
    factoryAddress
  );

  // For testnet, we'll need test USDT
  // On mainnet, you need real USDT
  const network = hre.network.name;
  console.log(`Network: ${network}`);

  if (network === "mumbai") {
    console.log("\nNOTE: You need Mumbai testnet USDT to create a market.");
    console.log("Get test USDT from a faucet or use a test token contract.\n");
  }

  // Market parameters
  const question = "Will India win the next cricket match against Australia?";
  const endTime = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days from now
  const initialLiquidity = hre.ethers.parseUnits("100", 6); // 100 USDT (6 decimals)

  console.log("Market Parameters:");
  console.log(`Question: ${question}`);
  console.log(`End Time: ${new Date(endTime * 1000).toISOString()}`);
  console.log(`Initial Liquidity: ${hre.ethers.formatUnits(initialLiquidity, 6)} USDT (per side)`);
  console.log(`Total Liquidity: ${hre.ethers.formatUnits(initialLiquidity * 2n, 6)} USDT\n`);

  // Check USDT balance
  const USDT = await hre.ethers.getContractAt("IERC20", usdtAddress);
  const balance = await USDT.balanceOf(signer.address);
  console.log(`Your USDT balance: ${hre.ethers.formatUnits(balance, 6)} USDT`);

  const requiredAmount = initialLiquidity * 2n;
  if (balance < requiredAmount) {
    console.log(
      `\nERROR: Insufficient USDT balance. Required: ${hre.ethers.formatUnits(requiredAmount, 6)} USDT`
    );
    console.log("\nTo get USDT:");
    if (network === "mumbai") {
      console.log("1. Use a Mumbai USDT faucet");
      console.log("2. Or deploy a test ERC20 token for testing");
    } else if (network === "polygon") {
      console.log("1. Bridge USDT to Polygon from Ethereum");
      console.log("2. Or buy USDT on a Polygon DEX");
    }
    return;
  }

  // Approve USDT
  console.log("\nApproving USDT...");
  const approveTx = await USDT.approve(factoryAddress, requiredAmount);
  await approveTx.wait();
  console.log("USDT approved!");

  // Create market
  console.log("\nCreating market...");
  const tx = await marketFactory.createMarket(
    question,
    endTime,
    initialLiquidity
  );

  console.log(`Transaction hash: ${tx.hash}`);
  console.log("Waiting for confirmation...");

  const receipt = await tx.wait();
  console.log("Market created!");

  // Get market address from event
  const event = receipt.logs.find((log) => {
    try {
      const parsed = marketFactory.interface.parseLog({
        topics: [...log.topics],
        data: log.data,
      });
      return parsed.name === "MarketCreated";
    } catch {
      return false;
    }
  });

  if (event) {
    const parsed = marketFactory.interface.parseLog({
      topics: [...event.topics],
      data: event.data,
    });
    const marketAddress = parsed.args.marketAddress;

    console.log("\n" + "=".repeat(60));
    console.log("MARKET CREATED SUCCESSFULLY");
    console.log("=".repeat(60));
    console.log(`Market address: ${marketAddress}`);
    console.log(`Question: ${question}`);
    console.log(`End time: ${new Date(endTime * 1000).toISOString()}`);
    console.log(`Initial liquidity: ${hre.ethers.formatUnits(initialLiquidity, 6)} USDT per side`);
    console.log("=".repeat(60));

    // Get market info
    const market = await hre.ethers.getContractAt(
      "PredictionMarket",
      marketAddress
    );
    const marketInfo = await market.getMarketInfo();

    console.log("\nMarket Info:");
    console.log(`YES Pool: ${hre.ethers.formatUnits(marketInfo._yesPool, 6)} USDT`);
    console.log(`NO Pool: ${hre.ethers.formatUnits(marketInfo._noPool, 6)} USDT`);
    console.log(`YES Price: ${Number(marketInfo._yesPrice) / 100}%`);
    console.log(`NO Price: ${Number(marketInfo._noPrice) / 100}%`);
    console.log("=".repeat(60));

    // Update deployment info with market
    deploymentInfo.testMarket = {
      address: marketAddress,
      question: question,
      endTime: endTime,
      createdAt: new Date().toISOString(),
    };

    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\nDeployment info updated: ${deploymentPath}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
