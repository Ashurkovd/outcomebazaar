# OutcomeBazaar Smart Contracts

This directory contains the smart contracts for OutcomeBazaar, a decentralized prediction market platform built on Polygon.

## Overview

OutcomeBazaar uses a two-contract system:

1. **PredictionMarket.sol** - Individual prediction market contract with:
   - Constant Product AMM (Automated Market Maker) for pricing
   - Buy/sell YES and NO shares
   - 1.5% trading fee (150 basis points)
   - Claim winnings after resolution
   - Refund system for cancelled markets

2. **MarketFactory.sol** - Factory contract to create and manage markets:
   - Create new prediction markets
   - Resolve markets (oracle function)
   - Cancel markets if needed
   - Treasury management for collected fees
   - Owner and oracle roles

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v16 or higher)
- npm or yarn
- A wallet with MATIC tokens for gas fees
- USDT tokens for creating markets (on Polygon or Mumbai testnet)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file from the example:
```bash
cp .env.example .env
```

3. Edit `.env` and add your configuration:
```env
PRIVATE_KEY=your_private_key_without_0x_prefix
POLYGON_RPC=https://polygon-rpc.com
MUMBAI_RPC=https://rpc-mumbai.maticvigil.com
POLYGONSCAN_API_KEY=your_polygonscan_api_key
```

**IMPORTANT:** Never commit your `.env` file to version control!

## Getting Test Tokens (Mumbai Testnet)

Before deploying to Mumbai testnet, you'll need:

1. **MATIC tokens** for gas fees:
   - Get from Mumbai faucet: https://faucet.polygon.technology/

2. **Test USDT** for creating markets:
   - Mumbai USDT address: `0x2058A9D7613eEE744279e3856Ef0eAda5FCbaA7e`
   - You may need to deploy a test ERC20 token or use a testnet faucet

## Compilation

Compile the smart contracts:

```bash
npx hardhat compile
```

This will create the compiled contracts in the `artifacts/` directory.

## Deployment

### Deploy to Mumbai Testnet

1. Ensure you have Mumbai MATIC and test USDT
2. Deploy the contracts:

```bash
npx hardhat run scripts/deploy.js --network mumbai
```

3. The deployment info will be saved to `deployment.json`

### Deploy to Polygon Mainnet

1. Ensure you have MATIC for gas and USDT for initial liquidity
2. **IMPORTANT:** Review all contract code and test thoroughly before mainnet deployment
3. Deploy:

```bash
npx hardhat run scripts/deploy.js --network polygon
```

### Deployment Output

After deployment, you'll see:

```
DEPLOYMENT SUMMARY
============================================================
Network: mumbai
MarketFactory: 0x1234...5678
USDT Token: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F
Owner/Oracle: 0xYourAddress
============================================================
```

The deployment information is saved to `deployment.json` for later use.

## Creating a Test Market

After deploying the factory, create a test market:

```bash
npx hardhat run scripts/create-test-market.js --network mumbai
```

This will:
1. Load deployment info from `deployment.json`
2. Create a sample cricket prediction market
3. Initialize with 100 USDT liquidity per side (200 USDT total)
4. Display market details and address

**Note:** You need USDT tokens approved for the factory to create a market.

## Contract Addresses

### Polygon Mainnet
- USDT Token: `0xc2132D05D31c914a87C6611C10748AEb04B58e8F`

### Mumbai Testnet
- Test USDT: `0x2058A9D7613eEE744279e3856Ef0eAda5FCbaA7e`

## Testing

Run the test suite (coming soon):

```bash
npx hardhat test
```

## Verifying Contracts

If you have a PolygonScan API key, contracts are automatically verified during deployment.

To manually verify:

```bash
npx hardhat verify --network mumbai FACTORY_ADDRESS "USDT_ADDRESS"
```

## Usage Guide

### Creating a Market

Only the factory owner can create markets:

```javascript
const tx = await marketFactory.createMarket(
  "Will India win the next cricket match?",
  endTime,           // Unix timestamp
  initialLiquidity   // Amount in USDT (with 6 decimals)
);
```

### Buying Shares

Users can buy YES or NO shares:

```javascript
// Approve USDT first
await usdt.approve(marketAddress, amount);

// Buy YES shares
await market.buyShares(true, amount);

// Buy NO shares
await market.buyShares(false, amount);
```

### Selling Shares

Users can sell their shares before market ends:

```javascript
// Sell YES shares
await market.sellShares(true, shareAmount);

// Sell NO shares
await market.sellShares(false, shareAmount);
```

### Resolving Markets

Only the oracle can resolve markets after they end:

```javascript
// Resolve as YES
await marketFactory.resolveMarket(marketAddress, true);

// Resolve as NO
await marketFactory.resolveMarket(marketAddress, false);
```

### Claiming Winnings

After resolution, winners can claim:

```javascript
await market.claimWinnings();
```

### Cancelling Markets

Owner can cancel markets if needed:

```javascript
await marketFactory.cancelMarket(marketAddress);

// Users can then claim refunds
await market.claimRefund();
```

## Fee Structure

- Trading fee: 1.5% (150 basis points)
- Fees are collected in USDT
- Fees go to the factory treasury
- Owner can withdraw treasury funds

## Security Considerations

1. **Oracle Trust:** The oracle role has significant power to resolve markets. Use a trusted multi-sig or decentralized oracle system.

2. **Initial Liquidity:** Markets need sufficient initial liquidity for price stability. Recommend at least 100-1000 USDT per side.

3. **End Time:** Ensure market end times are set correctly. Markets cannot be resolved before end time.

4. **Token Approval:** Users must approve USDT before trading. The contract uses `transferFrom`.

5. **Reentrancy:** Contracts use checks-effects-interactions pattern to prevent reentrancy attacks.

6. **Integer Overflow:** Using Solidity 0.8.19 with built-in overflow protection.

## Key Features

### Constant Product AMM

The market uses the formula: `k = yesPool * noPool`

- Prices adjust automatically based on supply/demand
- No order books needed
- Always liquid (until pools are depleted)
- Slippage increases with trade size

### Fair Pricing

- Initial odds: 50/50 (equal pools)
- Prices in basis points (5000 = 50%)
- Dynamic pricing based on pool ratios

### Trustless Resolution

- Markets can only be resolved after end time
- Oracle role is separate from owner
- Can cancel markets and refund users if needed

## Architecture

```
MarketFactory (Owner/Oracle)
├── Creates PredictionMarket contracts
├── Resolves markets
├── Manages treasury
└── Can cancel markets

PredictionMarket (Individual Market)
├── AMM for buying/selling shares
├── Tracks user positions
├── Handles winnings/refunds
└── Sends fees to factory
```

## Gas Optimization

- Uses `immutable` for variables set in constructor
- Efficient storage packing
- Optimized with `runs: 200` in Hardhat config
- Events for off-chain indexing

## Events

All important actions emit events for off-chain tracking:

- `MarketCreated` - New market deployed
- `SharesPurchased` - User bought shares
- `SharesSold` - User sold shares
- `MarketResolved` - Market resolved with outcome
- `MarketCancelled` - Market cancelled
- `WinningsClaimed` - User claimed winnings
- `RefundClaimed` - User claimed refund

## Support

For issues or questions:
- Check the contract code comments
- Review this documentation
- Test on Mumbai before mainnet
- Audit contracts before large-scale deployment

## License

MIT License - See contract files for details

---

**DISCLAIMER:** This is experimental software. Use at your own risk. Always test thoroughly on testnet before deploying to mainnet. Consider getting a professional audit for production use.
