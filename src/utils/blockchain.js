import { ethers } from 'ethers';
import { CONTRACTS, MARKET_ABI, USDT_ABI } from '../config/contracts';

/**
 * Buy shares in a prediction market
 * @param {string} marketAddress - The market contract address
 * @param {boolean} isYes - True for YES shares, false for NO shares
 * @param {string} amount - Amount in USDT (as string, e.g., "10")
 * @param {object} signer - Ethers signer object
 * @returns {Promise<object>} Transaction receipt and shares purchased
 */
export async function buyShares(marketAddress, isYes, amount, signer) {
  try {
    // Convert amount to USDT units (6 decimals)
    const amountInUSDT = ethers.parseUnits(amount, 6);

    // Get USDT contract
    const usdtContract = new ethers.Contract(CONTRACTS.USDT, USDT_ABI, signer);

    // Check allowance
    const userAddress = await signer.getAddress();
    const currentAllowance = await usdtContract.allowance(userAddress, marketAddress);

    // Approve if needed
    if (currentAllowance < amountInUSDT) {
      console.log('Approving USDT...');
      const approveTx = await usdtContract.approve(marketAddress, amountInUSDT);
      await approveTx.wait();
      console.log('USDT approved');
    }

    // Get market contract
    const marketContract = new ethers.Contract(marketAddress, MARKET_ABI, signer);

    // Buy shares
    console.log('Buying shares...');
    const tx = await marketContract.buyShares(isYes, amountInUSDT);
    const receipt = await tx.wait();

    // Parse SharesPurchased event to get exact shares received
    let sharesPurchased = 0;
    for (const log of receipt.logs) {
      try {
        const parsed = marketContract.interface.parseLog(log);
        if (parsed && parsed.name === 'SharesPurchased') {
          sharesPurchased = parsed.args.shareAmount;
          break;
        }
      } catch (e) {
        // Skip logs that don't match
      }
    }

    return {
      success: true,
      txHash: receipt.hash,
      shares: Number(ethers.formatUnits(sharesPurchased, 6)),
      receipt
    };
  } catch (error) {
    console.error('Error buying shares:', error);
    throw error;
  }
}

/**
 * Sell shares in a prediction market
 * @param {string} marketAddress - The market contract address
 * @param {boolean} isYes - True for YES shares, false for NO shares
 * @param {string} shareAmount - Amount of shares to sell
 * @param {object} signer - Ethers signer object
 * @returns {Promise<object>} Transaction receipt and USDT received
 */
export async function sellShares(marketAddress, isYes, shareAmount, signer) {
  try {
    const sharesInUnits = ethers.parseUnits(shareAmount, 6);

    const marketContract = new ethers.Contract(marketAddress, MARKET_ABI, signer);

    console.log('Selling shares...');
    const tx = await marketContract.sellShares(isYes, sharesInUnits);
    const receipt = await tx.wait();

    // Parse SharesSold event
    let usdtReceived = 0;
    for (const log of receipt.logs) {
      try {
        const parsed = marketContract.interface.parseLog(log);
        if (parsed && parsed.name === 'SharesSold') {
          usdtReceived = parsed.args.tokenAmount;
          break;
        }
      } catch (e) {
        // Skip logs that don't match
      }
    }

    return {
      success: true,
      txHash: receipt.hash,
      usdtReceived: Number(ethers.formatUnits(usdtReceived, 6)),
      receipt
    };
  } catch (error) {
    console.error('Error selling shares:', error);
    throw error;
  }
}

/**
 * Get user's shares in a market
 * @param {string} marketAddress - The market contract address
 * @param {string} userAddress - User's wallet address
 * @param {object} provider - Ethers provider object
 * @returns {Promise<object>} YES and NO shares
 */
export async function getUserShares(marketAddress, userAddress, provider) {
  try {
    const marketContract = new ethers.Contract(marketAddress, MARKET_ABI, provider);

    const yesShares = await marketContract.yesShares(userAddress);
    const noShares = await marketContract.noShares(userAddress);

    return {
      yesShares: Number(ethers.formatUnits(yesShares, 6)),
      noShares: Number(ethers.formatUnits(noShares, 6))
    };
  } catch (error) {
    console.error('Error getting user shares:', error);
    return { yesShares: 0, noShares: 0 };
  }
}

/**
 * Get market information
 * @param {string} marketAddress - The market contract address
 * @param {object} provider - Ethers provider object
 * @returns {Promise<object>} Market info
 */
export async function getMarketInfo(marketAddress, provider) {
  try {
    const marketContract = new ethers.Contract(marketAddress, MARKET_ABI, provider);

    const info = await marketContract.getMarketInfo();

    return {
      question: info._question,
      endTime: Number(info._endTime),
      state: Number(info._state),
      outcome: info._outcome,
      yesPool: Number(ethers.formatUnits(info._yesPool, 6)),
      noPool: Number(ethers.formatUnits(info._noPool, 6)),
      yesPrice: Number(ethers.formatUnits(info._yesPrice, 18)),
      noPrice: Number(ethers.formatUnits(info._noPrice, 18))
    };
  } catch (error) {
    console.error('Error getting market info:', error);
    throw error;
  }
}

/**
 * Get USDT balance
 * @param {string} userAddress - User's wallet address
 * @param {object} provider - Ethers provider object
 * @returns {Promise<number>} USDT balance
 */
export async function getUSDTBalance(userAddress, provider) {
  try {
    const usdtContract = new ethers.Contract(CONTRACTS.USDT, USDT_ABI, provider);
    const balance = await usdtContract.balanceOf(userAddress);
    return Number(ethers.formatUnits(balance, 6));
  } catch (error) {
    console.error('Error getting USDT balance:', error);
    return 0;
  }
}

/**
 * Get all markets from factory
 * @param {object} provider - Ethers provider object
 * @returns {Promise<Array>} List of market addresses
 */
export async function getAllMarkets(provider) {
  try {
    const factoryABI = [
      'function getAllMarkets() view returns (address[])'
    ];
    const factory = new ethers.Contract(CONTRACTS.FACTORY, factoryABI, provider);
    return await factory.getAllMarkets();
  } catch (error) {
    console.error('Error getting markets:', error);
    return [];
  }
}
