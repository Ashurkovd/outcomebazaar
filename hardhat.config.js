require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Only use private key if it's a valid 64-character hex string
const accounts = process.env.PRIVATE_KEY && process.env.PRIVATE_KEY.length === 64
  ? [process.env.PRIVATE_KEY]
  : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    amoy: {
      url: process.env.AMOY_RPC || 'https://rpc-amoy.polygon.technology',
      accounts: accounts,
      chainId: 80002
    },
    polygon: {
      url: process.env.POLYGON_RPC || "https://polygon-rpc.com",
      accounts: accounts,
      chainId: 137,
      gasPrice: 600000000000, // 600 gwei - high enough for current network
    },
  },
  etherscan: {
    apiKey: {
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || ""
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
