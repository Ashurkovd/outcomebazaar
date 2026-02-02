import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Wallet, ExternalLink, AlertCircle, CheckCircle, Clock, Activity } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { useWallet } from './hooks/useWallet';
import { Header } from './components/Header';
import { MarketCard } from './components/MarketCard';
import { TradeModal } from './components/TradeModal';
import { Portfolio } from './components/Portfolio';
import { MetaMaskInstallModal } from './components/MetaMaskInstallModal';
import { HowItWorks } from './components/HowItWorks';
import Footer from './components/Footer';
import TermsAcceptanceModal from './components/TermsAcceptanceModal';
import LegalDocModal from './components/LegalDocModal';
import TermsContent from './components/TermsContent';
import PrivacyContent from './components/PrivacyContent';
import { initAnalytics } from './utils/analytics';
import { useAnalytics, useViewTracking } from './hooks/useAnalytics';

export default function OutcomeBazaar() {
  const {
    walletAddress,
    walletConnected,
    balance: usdtBalance,
    setBalance: setUsdtBalance,
    refreshBalance,
    isPolygon,
    error: networkError,
    setError: setNetworkError,
    connect: connectWallet,
    disconnect: disconnectWallet,
    switchToPolygon,
    isMobile,
    getBrowserType,
    provider,
    // signer,
    contracts,
    getMarketContract,
  } = useWallet();

  // Analytics hook
  const analytics = useAnalytics();

  const [currentView, setCurrentView] = useState('markets');

  // Track view changes
  useViewTracking(currentView);
  const [userPositions, setUserPositions] = useState([]);
  const [limitOrders, setLimitOrders] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [betAmount, setBetAmount] = useState('');
  const [betType, setBetType] = useState('yes');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [txStatus, setTxStatus] = useState('');
  const [txHash, setTxHash] = useState('');
  const [showCreateMarket, setShowCreateMarket] = useState(false);
  const [newMarket, setNewMarket] = useState({ title: '', category: 'Cricket', endDate: '' });
  const [showPartialCloseModal, setShowPartialCloseModal] = useState(false);
  const [selectedClosePosition, setSelectedClosePosition] = useState(null);
  const [partialCloseAmount, setPartialCloseAmount] = useState('');
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);
  const [closePositionData, setClosePositionData] = useState(null);
  const [realizedPnL, setRealizedPnL] = useState(0);
  const [activityHistory, setActivityHistory] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showWalletPrompt, setShowWalletPrompt] = useState(false);
  const [showTradeSuccessModal, setShowTradeSuccessModal] = useState(false);
  const [tradeSuccessData, setTradeSuccessData] = useState(null);
  const [marketsLoading, setMarketsLoading] = useState(false);
  const [marketsError, setMarketsError] = useState(null);
  const [showTermsAcceptance, setShowTermsAcceptance] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const categories = ['All', 'Cricket', 'Politics', 'Economy', 'Space', 'Entertainment'];
  const FEE_PERCENTAGE = 1.5; // Matches smart contract: 150 basis points / 10000 = 1.5%
  // const MAX_POOL_USAGE = 0.7;

  // TODO: Before production, change BASE_IMPACT from 1.5 to 1.0
  const calculatePriceImpact = (tradeSize, marketLiquidity) => {
    // Base impact factor (adjust for testing vs production)
    const BASE_IMPACT = 1.5; // Change to 1.0 for production
    const MAX_IMPACT = 0.10; // Maximum 10% price move per trade

    const liquidityRatio = tradeSize / marketLiquidity;
    const impact = liquidityRatio * BASE_IMPACT;

    // Cap at maximum
    return Math.min(impact, MAX_IMPACT);
  };

  const [markets, setMarkets] = useState([]);

  // Load markets from blockchain
  const loadMarkets = async () => {
    if (!contracts.factory || !provider) {
      console.log('⏸ Waiting for contracts to initialize...');
      return;
    }

    try {
      setMarketsLoading(true);
      setMarketsError(null);
      console.log('🔍 Loading markets from blockchain...');

      // Get market count using direct contract call (event queries timeout on Amoy)
      const count = await contracts.factory.getMarketCount();
      const marketCount = Number(count);
      console.log(`📊 Found ${marketCount} markets`);

      const loadedMarkets = [];

      // Load each market
      for (let i = 0; i < marketCount; i++) {
        try {
          const marketAddress = await contracts.factory.markets(i);
          const marketContract = getMarketContract(marketAddress, false);

          if (!marketContract) {
            console.warn(`⚠️ Could not create contract for market ${i}`);
            continue;
          }

          // Get market info
          const info = await marketContract.getMarketInfo();

          // Convert prices from basis points (out of 10000) to decimal (0.0-1.0)
          // Contract returns: 5000 = 0.50 (50%), 6800 = 0.68 (68%), etc.
          const yesPrice = parseFloat(info._yesPrice) / 10000;
          const noPrice = parseFloat(info._noPrice) / 10000;
          // Convert pool amounts from 6 decimals (USDT)
          const yesPool = parseFloat(info._yesPool) / 1e6;
          const noPool = parseFloat(info._noPool) / 1e6;
          const totalLiquidity = yesPool + noPool;

          // Convert end time to date string
          const endDate = new Date(Number(info._endTime) * 1000).toISOString().split('T')[0];

          // Generate price history based on actual market duration
          const generatePriceHistory = (endTime, currentPrice) => {
            const now = Date.now();
            const endTimeMs = Number(endTime) * 1000;
            const durationMs = endTimeMs - now;
            const durationHours = durationMs / (1000 * 60 * 60);
            const durationDays = durationHours / 24;

            let dataPoints = 5;
            let timeUnit = 'D';
            let intervalMs;

            // Determine appropriate time scale and intervals
            if (durationDays < 1) {
              // Less than 1 day - show hours
              dataPoints = Math.min(Math.max(Math.ceil(durationHours), 3), 12);
              timeUnit = 'h';
              intervalMs = durationMs / dataPoints;
            } else if (durationDays <= 7) {
              // 1-7 days - show days
              dataPoints = Math.min(Math.max(Math.ceil(durationDays), 3), 7);
              timeUnit = 'D';
              intervalMs = durationMs / dataPoints;
            } else if (durationDays <= 30) {
              // 1-4 weeks - show every few days
              dataPoints = Math.min(Math.max(Math.ceil(durationDays / 3), 5), 10);
              timeUnit = 'D';
              intervalMs = durationMs / dataPoints;
            } else {
              // More than 30 days - show weeks
              const durationWeeks = durationDays / 7;
              dataPoints = Math.min(Math.max(Math.ceil(durationWeeks), 4), 8);
              timeUnit = 'W';
              intervalMs = durationMs / dataPoints;
            }

            // Generate data points from now to end time
            const history = [];
            for (let i = 0; i < dataPoints; i++) {
              const timeMs = now + (intervalMs * i);
              const progress = i / (dataPoints - 1); // 0 to 1

              // Calculate label
              let label;
              if (timeUnit === 'h') {
                const hoursFromNow = Math.round((timeMs - now) / (1000 * 60 * 60));
                label = `${hoursFromNow}h`;
              } else if (timeUnit === 'D') {
                const daysFromNow = Math.round((timeMs - now) / (1000 * 60 * 60 * 24));
                label = `${daysFromNow}D`;
              } else if (timeUnit === 'W') {
                const weeksFromNow = Math.round((timeMs - now) / (1000 * 60 * 60 * 24 * 7));
                label = `${weeksFromNow}W`;
              }

              // Generate mock price variation (slight increase toward current price)
              // Start lower and gradually reach current price
              const priceVariation = currentPrice * (0.7 + (progress * 0.3));
              const price = Math.max(0.01, Math.min(0.99, priceVariation));

              history.push({ time: label, price });
            }

            return history;
          };

          const priceHistory = generatePriceHistory(info._endTime, yesPrice);

          // Determine category from question (simple heuristic)
          let category = 'Economy'; // default
          const question = info._question.toLowerCase();
          if (question.includes('cricket') || question.includes('ipl') || question.includes('india win')) {
            category = 'Cricket';
          } else if (question.includes('bjp') || question.includes('election') || question.includes('politics')) {
            category = 'Politics';
          } else if (question.includes('space') || question.includes('isro') || question.includes('gaganyaan')) {
            category = 'Space';
          } else if (question.includes('movie') || question.includes('film') || question.includes('release')) {
            category = 'Entertainment';
          }

          // Build market object matching existing structure
          const market = {
            id: i + 1,
            title: info._question,
            category: category,
            contractAddress: marketAddress,
            state: Number(info._state), // 0=Active, 1=Resolved, 2=Cancelled
            outcome: info._outcome, // true=YES, false=NO (only valid when resolved)
            yesPrice: yesPrice,
            noPrice: noPrice,
            totalLiquidity: totalLiquidity,
            endDate: endDate,
            participants: 0, // Will be populated from events later
            trending: totalLiquidity > 500, // Mark as trending if liquidity > 500
            yesShares: yesPool * 1000000, // Convert to shares format
            noShares: noPool * 1000000,
            priceHistory: priceHistory,
            poolSeed: totalLiquidity, // Use actual blockchain liquidity
            poolUsage: 0, // Calculate if needed
            maxPoolUsage: 0.7,
            orderBookDepth: 0, // No separate order book - using AMM pools only
            volume24h: 0, // Will be calculated from events later
            yesPool: yesPool, // Store individual pool amounts
            noPool: noPool
          };

          loadedMarkets.push(market);
          console.log(`✅ Loaded market ${i + 1}: ${info._question.substring(0, 50)}...`);
        } catch (error) {
          console.error(`❌ Error loading market ${i}:`, error);
        }
      }

      // Reverse to show newest first
      setMarkets(loadedMarkets.reverse());
      console.log(`✅ Successfully loaded ${loadedMarkets.length} markets`);
    } catch (error) {
      console.error('❌ Error loading markets:', error);
      setMarketsError('Failed to load markets. Please refresh the page.');
    } finally {
      setMarketsLoading(false);
    }
  };

  const formatAddress = (address) => `${address.slice(0, 6)}...${address.slice(-4)}`;
  const formatUSDT = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateSlippageDetails = () => {
    if (!betAmount || !selectedMarket) return null;
    const amount = parseFloat(betAmount);
    const fee = amount * (FEE_PERCENTAGE / 100);
    const netAmount = amount - fee;

    const startPrice = betType === 'yes' ? selectedMarket.yesPrice : selectedMarket.noPrice;

    // Use constant product AMM formula (matching smart contract)
    const k = selectedMarket.yesPool * selectedMarket.noPool;
    let newYesPool, newNoPool, shares;

    if (betType === 'yes') {
      // Buying YES: add to NO pool, remove from YES pool
      newNoPool = selectedMarket.noPool + netAmount;
      newYesPool = k / newNoPool;
      shares = selectedMarket.yesPool - newYesPool;
    } else {
      // Buying NO: add to YES pool, remove from NO pool
      newYesPool = selectedMarket.yesPool + netAmount;
      newNoPool = k / newYesPool;
      shares = selectedMarket.noPool - newNoPool;
    }

    // Calculate new price after trade
    const totalPool = newYesPool + newNoPool;
    const endPrice = betType === 'yes' ? (newNoPool / totalPool) : (newYesPool / totalPool);

    // Average price and slippage
    const avgPrice = netAmount / shares;
    const slippagePercent = ((avgPrice - startPrice) / startPrice * 100);
    const priceImpact = endPrice - startPrice;

    return { startPrice, endPrice, avgPrice, shares, slippagePercent, priceImpact };
  };

  // const calculateShares = () => {
  //   const details = calculateSlippageDetails();
  //   return details ? details.shares.toFixed(4) : 0;
  // };

  // const calculatePayout = () => {
  //   if (!betAmount || !selectedMarket) return 0;
  //   return parseFloat(calculateShares()).toFixed(2);
  // };

  const processInstantFill = (instantAmount, poolNeeded, totalPaid) => {
    const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64);
    setTxHash(mockTxHash);
    setTxStatus('success');
    setUsdtBalance(prev => prev - totalPaid);

    // Calculate fee and net amount
    const fee = totalPaid * (FEE_PERCENTAGE / 100);
    const amountAfterFee = totalPaid - fee;

    // Update market pools using constant product AMM formula (matching smart contract)
    setMarkets(prevMarkets => prevMarkets.map(m => {
      if (m.id === selectedMarket.id) {
        // Constant product AMM: k = yesPool * noPool
        const k = m.yesPool * m.noPool;

        let newYesPool, newNoPool, shares;

        if (betType === 'yes') {
          // Buying YES: add to NO pool, remove from YES pool
          newNoPool = m.noPool + amountAfterFee;
          newYesPool = k / newNoPool;
          shares = m.yesPool - newYesPool;
        } else {
          // Buying NO: add to YES pool, remove from NO pool
          newYesPool = m.yesPool + amountAfterFee;
          newNoPool = k / newYesPool;
          shares = m.noPool - newNoPool;
        }

        // Calculate new prices from pools
        const totalPool = newYesPool + newNoPool;
        const newYesPrice = newNoPool / totalPool;
        const newNoPrice = newYesPool / totalPool;
        const newLiquidity = totalPool;

        // VERIFICATION: Prices must sum to 1.0
        const priceSum = newYesPrice + newNoPrice;
        console.log('💯 Price verification (partial fill):', {
          yesPrice: newYesPrice,
          noPrice: newNoPrice,
          sum: priceSum,
          correct: Math.abs(priceSum - 1.0) < 0.0001
        });

        if (Math.abs(priceSum - 1.0) > 0.0001) {
          console.error('❌ PRICES DO NOT SUM TO 1!', {
            yesPrice: newYesPrice,
            noPrice: newNoPrice,
            sum: priceSum,
            difference: priceSum - 1.0
          });
        }

        console.log(`PlaceBet (partial) pool update - Market ${m.id}:`, {
          betType,
          amountPaid: totalPaid,
          amountAfterFee,
          fee,
          shares,
          oldYesPool: m.yesPool,
          newYesPool,
          oldNoPool: m.noPool,
          newNoPool,
          oldYesPrice: m.yesPrice,
          newYesPrice,
          oldNoPrice: m.noPrice,
          newNoPrice,
          k,
          newK: newYesPool * newNoPool
        });

        return {
          ...m,
          yesPool: newYesPool,
          noPool: newNoPool,
          totalLiquidity: newLiquidity,
          participants: m.participants + 1,
          poolUsage: m.poolUsage + (poolNeeded / m.poolSeed),
          yesShares: betType === 'yes' ? m.yesShares + shares * 1000000 : m.yesShares,
          noShares: betType === 'no' ? m.noShares + shares * 1000000 : m.noShares,
          yesPrice: newYesPrice,
          noPrice: newNoPrice,
          poolSeed: newLiquidity
        };
      }
      return m;
    }));

    // Calculate shares for position (same as market update)
    const k = selectedMarket.yesPool * selectedMarket.noPool;
    let positionShares, positionAvgPrice;

    if (betType === 'yes') {
      const newNoPool = selectedMarket.noPool + amountAfterFee;
      const newYesPool = k / newNoPool;
      positionShares = selectedMarket.yesPool - newYesPool;
    } else {
      const newYesPool = selectedMarket.yesPool + amountAfterFee;
      const newNoPool = k / newYesPool;
      positionShares = selectedMarket.noPool - newNoPool;
    }

    positionAvgPrice = amountAfterFee / positionShares;

    const newPosition = {
      id: Date.now(),
      marketId: selectedMarket.id,
      marketTitle: selectedMarket.title,
      outcome: betType,
      shares: positionShares,
      avgPrice: positionAvgPrice,
      invested: amountAfterFee,
      totalPaid: totalPaid,
      buyFee: fee,
      netAmount: instantAmount,
      currentPrice: betType === 'yes' ? selectedMarket.yesPrice : selectedMarket.noPrice,
      timestamp: new Date().toISOString()
    };
    setUserPositions(prev => [...prev, newPosition]);

    setTimeout(() => {
      console.log('🎉 PARTIAL FILL SUCCESS - Showing success modal');
      console.log('Market:', selectedMarket.title);
      console.log('Outcome:', betType);
      console.log('Shares filled:', positionShares);
      console.log('Instant amount:', instantAmount);
      console.log('Total paid:', totalPaid);

      // Store success data for partial fill
      const successData = {
        marketTitle: selectedMarket.title,
        outcome: betType,
        shares: positionShares,
        amountSpent: totalPaid,
        txHash: mockTxHash,
        isPartialFill: true,
        requestedAmount: totalPaid,
        filledAmount: instantAmount,
        fillPercentage: (instantAmount / (totalPaid * (1 - FEE_PERCENTAGE / 100))) * 100
      };

      console.log('Setting partial fill success data:', successData);
      setTradeSuccessData(successData);

      // Close trade modal
      setTxStatus('');
      setTxHash('');
      setSelectedMarket(null);
      setBetAmount('');
      setNetworkError('');

      // Show success modal
      setTimeout(() => {
        console.log('✅ Opening partial fill success modal');
        setShowTradeSuccessModal(true);
      }, 100);
    }, 800);
  };

  const placeBet = async () => {
    if (!walletConnected) {
      setNetworkError('Please connect your wallet first');
      return;
    }
    if (!isPolygon) {
      setNetworkError('Please switch to Polygon network');
      return;
    }
    const amount = parseFloat(betAmount);
    if (amount <= 0 || amount > usdtBalance) {
      setNetworkError('Invalid bet amount or insufficient balance');
      return;
    }

    // Calculate fee and net amount
    const fee = amount * (FEE_PERCENTAGE / 100);
    const netAmount = amount - fee;

    // Calculate maximum fillable amount based on which outcome is being traded
    // When buying YES, you're limited by the NO pool (and vice versa)
    const relevantPool = betType === 'yes' ? selectedMarket.noPool : selectedMarket.yesPool;
    const maxFill = relevantPool * 0.95; // 95% to prevent extreme price movements

    // Debug logging
    console.log('=== LIQUIDITY DEBUG ===');
    console.log('Bet type:', betType);
    console.log('YES pool:', selectedMarket.yesPool);
    console.log('NO pool:', selectedMarket.noPool);
    console.log('Relevant pool:', relevantPool);
    console.log('Max instant fill (95%):', maxFill);
    console.log('Order amount:', amount);
    console.log('Net amount:', netAmount);

    // Check if this is a large order requiring partial fill
    if (netAmount > maxFill && maxFill > 0) {
      const partialFillConfirm = window.confirm(
        `Large Order Detected\n\n` +
        `Your order: ${formatUSDT(amount)}\n` +
        `Max instant fill: ${formatUSDT(maxFill)}\n\n` +
        `This order exceeds available liquidity.\n` +
        `We can:\n` +
        `• Fill ${formatUSDT(maxFill)} instantly\n` +
        `• Place ${formatUSDT(netAmount - maxFill)} as limit order\n\n` +
        `Continue with partial fill?`
      );

      if (!partialFillConfirm) {
        setNetworkError('Order cancelled. Try a smaller amount for instant fill.');
        return;
      }

      // Process partial fill and create limit order
      const instantAmount = maxFill;
      const limitAmount = netAmount - maxFill;

      // Create limit order for remaining
      const limitOrder = {
        id: Date.now(),
        marketId: selectedMarket.id,
        marketTitle: selectedMarket.title,
        outcome: betType,
        amount: limitAmount,
        targetPrice: betType === 'yes' ? selectedMarket.yesPrice : selectedMarket.noPrice,
        status: 'pending',
        timestamp: new Date().toISOString()
      };
      setLimitOrders(prev => [...prev, limitOrder]);

      // Continue with instant fill amount
      const poolNeeded = instantAmount * 0.4;

      setTxStatus('pending');
      setTimeout(() => {
        processInstantFill(instantAmount, poolNeeded, amount);
      }, 2000);
      return;
    }

    // Check pool availability for normal orders
    const poolNeeded = Math.min(netAmount * 0.4, maxFill);

    // Only block trades at 95%+ pool usage
    if (selectedMarket.poolUsage >= 0.95) {
      setNetworkError('Pool usage at 95%+ (capital protection). Try a smaller amount.');
      return;
    }

    const newPoolUsage = (poolNeeded + (selectedMarket.poolUsage * selectedMarket.poolSeed)) / selectedMarket.poolSeed;
    if (newPoolUsage > 0.95) {
      setNetworkError('This trade would push pool usage above 95%. Please reduce amount.');
      return;
    }

    setTxStatus('pending');
    setTimeout(() => {
      const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64);
      setTxHash(mockTxHash);
      setTxStatus('success');
      setUsdtBalance(prev => prev - amount);

      // Update market pools using constant product AMM formula (matching smart contract)
      setMarkets(prevMarkets => prevMarkets.map(m => {
        if (m.id === selectedMarket.id) {
          // Constant product AMM: k = yesPool * noPool
          const k = m.yesPool * m.noPool;

          let newYesPool, newNoPool, shares;

          if (betType === 'yes') {
            // Buying YES: add to NO pool, remove from YES pool
            newNoPool = m.noPool + netAmount;
            newYesPool = k / newNoPool;
            shares = m.yesPool - newYesPool;
          } else {
            // Buying NO: add to YES pool, remove from NO pool
            newYesPool = m.yesPool + netAmount;
            newNoPool = k / newYesPool;
            shares = m.noPool - newNoPool;
          }

          // Calculate new prices from pools
          const totalPool = newYesPool + newNoPool;
          const newYesPrice = newNoPool / totalPool;
          const newNoPrice = newYesPool / totalPool;
          const newLiquidity = totalPool;

          // VERIFICATION: Prices must sum to 1.0
          const priceSum = newYesPrice + newNoPrice;
          console.log('💯 Price verification (full trade):', {
            yesPrice: newYesPrice,
            noPrice: newNoPrice,
            sum: priceSum,
            correct: Math.abs(priceSum - 1.0) < 0.0001
          });

          if (Math.abs(priceSum - 1.0) > 0.0001) {
            console.error('❌ PRICES DO NOT SUM TO 1!', {
              yesPrice: newYesPrice,
              noPrice: newNoPrice,
              sum: priceSum,
              difference: priceSum - 1.0
            });
          }

          console.log(`PlaceBet pool update - Market ${m.id}:`, {
            betType,
            amountPaid: amount,
            netAmount,
            shares,
            oldYesPool: m.yesPool,
            newYesPool,
            oldNoPool: m.noPool,
            newNoPool,
            oldYesPrice: m.yesPrice,
            newYesPrice,
            oldNoPrice: m.noPrice,
            newNoPrice,
            k,
            newK: newYesPool * newNoPool
          });

          const updatedMarket = {
            ...m,
            yesPool: newYesPool,
            noPool: newNoPool,
            totalLiquidity: newLiquidity,
            participants: m.participants + 1,
            poolUsage: m.poolUsage + (poolNeeded / m.poolSeed),
            yesShares: betType === 'yes' ? m.yesShares + shares * 1000000 : m.yesShares,
            noShares: betType === 'no' ? m.noShares + shares * 1000000 : m.noShares,
            yesPrice: newYesPrice,
            noPrice: newNoPrice,
            poolSeed: newLiquidity
          };

          console.log('Market after trade:', {
            id: updatedMarket.id,
            participants: updatedMarket.participants,
            yesPool: updatedMarket.yesPool,
            noPool: updatedMarket.noPool,
            totalLiquidity: updatedMarket.totalLiquidity
          });

          return updatedMarket;
        }
        return m;
      }));

      // Calculate shares using constant product formula (same as market update)
      const k = selectedMarket.yesPool * selectedMarket.noPool;
      let shares, avgPrice;

      if (betType === 'yes') {
        const newNoPool = selectedMarket.noPool + netAmount;
        const newYesPool = k / newNoPool;
        shares = selectedMarket.yesPool - newYesPool;
      } else {
        const newYesPool = selectedMarket.yesPool + netAmount;
        const newNoPool = k / newYesPool;
        shares = selectedMarket.noPool - newNoPool;
      }

      avgPrice = netAmount / shares;

      // Create and add position
      const newPosition = {
        id: Date.now(),
        marketId: selectedMarket.id,
        marketTitle: selectedMarket.title,
        outcome: betType,
        shares: shares,
        avgPrice: avgPrice,
        invested: netAmount,
        totalPaid: amount,
        buyFee: fee,
        netAmount: netAmount,
        currentPrice: betType === 'yes' ? selectedMarket.yesPrice : selectedMarket.noPrice,
        timestamp: new Date().toISOString()
      };

      setUserPositions(prev => [...prev, newPosition]);

      // Track trade in analytics
      analytics.trackTrade({
        outcome: betType.toUpperCase(),
        amount: amount,
        category: selectedMarket.category
      });

      // Log activity
      setActivityHistory(prev => [{
        id: Date.now(),
        type: 'BUY',
        marketId: selectedMarket.id,
        marketTitle: selectedMarket.title,
        outcome: betType,
        shares: shares,
        price: avgPrice,
        amount: amount,
        fee: fee,
        timestamp: new Date().toISOString()
      }, ...prev]);

      // Show warnings based on pool usage thresholds
      const newPoolUsage = selectedMarket.poolUsage + (poolNeeded / selectedMarket.poolSeed);
      if (newPoolUsage > 0.85) {
        console.warn(`⚠️ HIGH POOL USAGE: ${(newPoolUsage * 100).toFixed(1)}% for market ${selectedMarket.id}`);
      } else if (newPoolUsage > 0.7) {
        console.warn(`⚠️ Pool usage at ${(newPoolUsage * 100).toFixed(1)}% for market ${selectedMarket.id}`);
      }

      // Show success modal instead of auto-closing
      setTimeout(() => {
        console.log('🎉 TRADE SUCCESS - Showing success modal');
        console.log('Market:', selectedMarket.title);
        console.log('Outcome:', betType);
        console.log('Shares:', shares);
        console.log('Amount spent:', amount);

        // Store success data BEFORE closing trade modal
        const successData = {
          marketTitle: selectedMarket.title,
          outcome: betType,
          shares: shares,
          amountSpent: amount,
          txHash: mockTxHash
        };

        console.log('Setting success data:', successData);
        setTradeSuccessData(successData);

        // Close trade modal first
        setTxStatus('');
        setTxHash('');
        setSelectedMarket(null);
        setBetAmount('');
        setNetworkError('');

        // Then show success modal after a tiny delay to ensure trade modal is closed
        setTimeout(() => {
          console.log('✅ Opening success modal now');
          setShowTradeSuccessModal(true);
        }, 100);
      }, 800);
    }, 2000);
  };

  const filteredMarkets = markets.filter(market => {
    const matchesSearch = market.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || market.category === selectedCategory;
    const isActive = market.state === 0; // Only show active markets (0=Active, 1=Resolved, 2=Cancelled)
    return matchesSearch && matchesCategory && isActive;
  });

  const resolvedMarkets = markets.filter(market => {
    const matchesSearch = market.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || market.category === selectedCategory;
    const isResolved = market.state === 1; // Show resolved markets
    return matchesSearch && matchesCategory && isResolved;
  });

  const calculatePortfolioValue = () => {
    return userPositions.reduce((total, pos) => {
      const market = markets.find(m => m.id === pos.marketId);
      if (!market) return total;
      const currentPrice = pos.outcome === 'yes' ? market.yesPrice : market.noPrice;
      return total + (pos.shares * currentPrice);
    }, 0);
  };

  const calculateTotalPNL = () => {
    const unrealizedPnL = userPositions.reduce((total, pos) => {
      const market = markets.find(m => m.id === pos.marketId);
      if (!market) return total;
      const currentPrice = pos.outcome === 'yes' ? market.yesPrice : market.noPrice;
      const currentValue = pos.shares * currentPrice;
      const totalPaidAmount = pos.totalPaid || pos.invested;
      const sellFee = currentValue * (FEE_PERCENTAGE / 100);
      const netProceeds = currentValue - sellFee;
      const pnl = netProceeds - totalPaidAmount;
      return total + pnl;
    }, 0);
    return unrealizedPnL + realizedPnL;
  };

  const executePartialClose = (positionId, sharesToClose) => {
    const position = userPositions.find(p => p.id === positionId);
    const market = markets.find(m => m.id === position.marketId);

    // Calculate for partial amount
    const startPrice = position.outcome === 'yes' ? market.yesPrice : market.noPrice;
    const estimatedValue = sharesToClose * startPrice;
    const priceImpact = calculatePriceImpact(estimatedValue, market.totalLiquidity);
    const endPrice = Math.max(0.01, startPrice - priceImpact);
    const avgPrice = (startPrice + endPrice) / 2;
    const actualValue = sharesToClose * avgPrice;
    const fee = actualValue * (FEE_PERCENTAGE / 100);
    const netProceeds = actualValue - fee;

    // Update balance
    setUsdtBalance(prev => prev + netProceeds);

    // Update position (reduce shares or remove if closing all)
    setUserPositions(prev => {
      return prev.map(p => {
        if (p.id === positionId) {
          const remainingShares = p.shares - sharesToClose;

          // If remaining shares are less than 0.01, treat as full close
          if (remainingShares < 0.01) {
            return null; // Will be filtered out below
          }

          const proportionClosed = sharesToClose / p.shares;
          const investmentClosed = p.invested * proportionClosed;

          return {
            ...p,
            shares: remainingShares,
            invested: p.invested - investmentClosed,
            totalPaid: p.totalPaid - (p.totalPaid * proportionClosed)
          };
        }
        return p;
      }).filter(p => p !== null); // Remove null entries (fully closed positions)
    });

    // Update market
    setMarkets(prev => prev.map(m => {
      if (m.id === market.id) {
        const updatedMarket = {
          ...m,
          yesPrice: position.outcome === 'yes' ? endPrice : Math.min(0.99, m.yesPrice + priceImpact),
          noPrice: position.outcome === 'no' ? endPrice : Math.min(0.99, m.noPrice + priceImpact),
          totalLiquidity: m.totalLiquidity - actualValue
        };

        console.log('Market after partial close:', {
          id: updatedMarket.id,
          participants: updatedMarket.participants,
          totalLiquidity: updatedMarket.totalLiquidity,
          liquidityRemoved: actualValue
        });

        return updatedMarket;
      }
      return m;
    }));

    // Calculate P&L for partial close
    const proportionClosed = sharesToClose / position.shares;
    const amountInvested = (position.totalPaid || position.invested) * proportionClosed;
    const partialPnL = netProceeds - amountInvested;

    // Update realized P&L
    setRealizedPnL(prev => prev + partialPnL);

    // Log activity
    setActivityHistory(prev => [{
      id: Date.now(),
      type: 'SELL',
      marketId: position.marketId,
      marketTitle: position.marketTitle,
      outcome: position.outcome,
      shares: sharesToClose,
      price: avgPrice,
      amount: netProceeds,
      fee: fee,
      pnl: partialPnL,
      timestamp: new Date().toISOString()
    }, ...prev]);

    setShowPartialCloseModal(false);
    setPartialCloseAmount('');

    // Determine if it was a full or partial close
    const remainingShares = position.shares - sharesToClose;
    const isFull = remainingShares < 0.01;

    // Track position close in analytics
    analytics.trackPositionClose({
      outcome: position.outcome.toUpperCase(),
      partial: !isFull,
      pnl: partialPnL
    });

    if (isFull) {
      alert(`Position closed! Received ${formatUSDT(netProceeds)}`);
    } else {
      alert(`Closed ${sharesToClose.toFixed(2)} shares for ${formatUSDT(netProceeds)}. ${remainingShares.toFixed(2)} shares remaining.`);
    }
  };

  const openPartialCloseModal = (data) => {
    setSelectedClosePosition(data);
    setShowPartialCloseModal(true);
    setPartialCloseAmount('');
  };

  const closePosition = (positionId) => {
    const position = userPositions.find(p => p.id === positionId);
    if (!position) return;

    const market = markets.find(m => m.id === position.marketId);
    const startPrice = position.outcome === 'yes' ? market.yesPrice : market.noPrice;

    // Estimate sell value at current price
    const estimatedValue = position.shares * startPrice;

    // Calculate price impact (selling pushes price DOWN)
    const priceImpact = calculatePriceImpact(estimatedValue, market.totalLiquidity);

    // End price after your sell
    const endPrice = Math.max(0.01, startPrice - priceImpact);

    // Average price you'll receive
    const avgPrice = (startPrice + endPrice) / 2;

    // Actual proceeds at average price
    const actualValue = position.shares * avgPrice;
    const fee = actualValue * (FEE_PERCENTAGE / 100);
    const netProceeds = actualValue - fee;

    // Slippage loss
    const slippage = estimatedValue - actualValue;
    const slippagePercent = (slippage / estimatedValue * 100).toFixed(2);

    // Real P&L
    const totalPaid = position.totalPaid || position.invested;
    const realPnL = netProceeds - totalPaid;

    // Check liquidity - when selling, you're limited by the same side's pool
    // (opposite of buying where you're limited by the opposite pool)
    const relevantPool = position.outcome === 'yes' ? market.yesPool : market.noPool;
    const availableLiquidity = relevantPool * 0.95;
    if (actualValue > availableLiquidity) {
      // Calculate max closeable amount
      const maxCloseableShares = (availableLiquidity / avgPrice) * 0.98; // Account for fees
      // const maxCloseableValue = maxCloseableShares * avgPrice;

      // Open a modal for partial close
      setSelectedClosePosition({
        position: position,
        maxShares: maxCloseableShares,
        availableLiquidity: availableLiquidity,
        avgPrice: avgPrice
      });
      setShowPartialCloseModal(true);
      return;
    }

    // Instead of window.confirm, set the data and show modal
    setClosePositionData({
      position,
      startPrice,
      endPrice,
      avgPrice,
      actualValue,
      fee,
      netProceeds,
      slippage,
      slippagePercent,
      totalPaid,
      realPnL
    });
    setShowCloseConfirmModal(true);
  };

  const executeClosePosition = () => {
    if (!closePositionData) return;

    const { position, netProceeds, endPrice, actualValue } = closePositionData;
    const market = markets.find(m => m.id === position.marketId);
    const priceImpact = calculatePriceImpact(actualValue, market.totalLiquidity);

    // Update balance
    setUsdtBalance(prev => prev + netProceeds);

    // Remove position
    setUserPositions(prev => prev.filter(p => p.id !== position.id));

    // Update market with END price
    setMarkets(prevMarkets => prevMarkets.map(m => {
      if (m.id === market.id) {
        const newYesPrice = position.outcome === 'yes'
          ? endPrice
          : Math.min(0.99, m.yesPrice + priceImpact);

        const newNoPrice = position.outcome === 'no'
          ? endPrice
          : Math.min(0.99, m.noPrice + priceImpact);

        console.log('ClosePosition price update:', {
          outcome: position.outcome,
          startPrice: closePositionData.startPrice,
          endPrice,
          avgPrice: closePositionData.avgPrice,
          priceImpact,
          oldYesPrice: m.yesPrice,
          newYesPrice,
          oldNoPrice: m.noPrice,
          newNoPrice
        });

        const updatedMarket = {
          ...m,
          yesPrice: newYesPrice,
          noPrice: newNoPrice,
          totalLiquidity: m.totalLiquidity - actualValue
        };

        console.log('Market after close:', {
          id: updatedMarket.id,
          participants: updatedMarket.participants,
          totalLiquidity: updatedMarket.totalLiquidity,
          liquidityRemoved: actualValue
        });

        return updatedMarket;
      }
      return m;
    }));

    // Update realized P&L
    setRealizedPnL(prev => prev + closePositionData.realPnL);

    // Log activity
    setActivityHistory(prev => [{
      id: Date.now(),
      type: 'SELL',
      marketId: position.marketId,
      marketTitle: position.marketTitle,
      outcome: position.outcome,
      shares: position.shares,
      price: closePositionData.avgPrice,
      amount: netProceeds,
      fee: closePositionData.fee,
      pnl: closePositionData.realPnL,
      timestamp: new Date().toISOString()
    }, ...prev]);

    setShowCloseConfirmModal(false);
    setClosePositionData(null);

    setTimeout(() => {
      alert(`Position closed! ${formatUSDT(netProceeds)} received`);
    }, 100);
  };

  const createMarket = () => {
    if (!newMarket.title || !newMarket.endDate) {
      alert('Please fill all fields');
      return;
    }

    setShowCreateMarket(false);
    setNewMarket({ title: '', category: 'Cricket', endDate: '' });
    alert('Market suggestion submitted! We\'ll review it soon.');
  };

  const handleAcceptTerms = () => {
    localStorage.setItem('outcomebazaar_terms_accepted', 'true');
    setShowTermsAcceptance(false);
  };

  const handleOpenTerms = () => {
    setShowTermsModal(true);
  };

  const handleOpenPrivacy = () => {
    setShowPrivacyModal(true);
  };


  // Load markets when contracts are ready
  useEffect(() => {
    loadMarkets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contracts.factory, provider]);

  // Check if user has accepted terms - DISABLED
  // useEffect(() => {
  //   const hasAcceptedTerms = localStorage.getItem('outcomebazaar_terms_accepted');
  //   if (!hasAcceptedTerms) {
  //     setShowTermsAcceptance(true);
  //   }
  // }, []);

  // Initialize analytics
  useEffect(() => {
    initAnalytics();
  }, []);

  // Track wallet connections/disconnections
  useEffect(() => {
    if (walletConnected && walletAddress) {
      analytics.trackWalletConnect(walletAddress);
    }
  }, [walletConnected, walletAddress, analytics]);

  // Auto-hide header on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Only hide on mobile (viewport width < 768px)
      if (window.innerWidth < 768) {
        if (currentScrollY > lastScrollY && currentScrollY > 80) {
          // Scrolling down & past threshold
          setIsHeaderVisible(false);
        } else {
          // Scrolling up or at top
          setIsHeaderVisible(true);
        }
      } else {
        // Always show header on desktop
        setIsHeaderVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
      <Header
        walletConnected={walletConnected}
        walletAddress={walletAddress}
        usdtBalance={usdtBalance}
        refreshBalance={refreshBalance}
        networkError={networkError}
        isPolygon={isPolygon}
        currentView={currentView}
        searchTerm={searchTerm}
        selectedCategory={selectedCategory}
        categories={categories}
        connectWallet={connectWallet}
        disconnectWallet={disconnectWallet}
        switchToPolygon={switchToPolygon}
        setCurrentView={setCurrentView}
        setSearchTerm={setSearchTerm}
        setSelectedCategory={setSelectedCategory}
        setShowCreateMarket={setShowCreateMarket}
        formatUSDT={formatUSDT}
        formatAddress={formatAddress}
      />
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8 overflow-x-hidden">
        {currentView === 'markets' && (
          <>
            {/* How It Works Section - Show only to non-connected users */}
            {!walletConnected && <HowItWorks />}

            {/* Loading State */}
            {marketsLoading && (
              <div className="bg-black bg-opacity-40 backdrop-blur-md rounded-xl p-12 border border-purple-500 border-opacity-30 text-center mb-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p className="text-purple-300 text-lg">Loading markets from blockchain...</p>
                <p className="text-purple-400 text-sm mt-2">This may take a few seconds</p>
              </div>
            )}

            {/* Error State */}
            {marketsError && (
              <div className="bg-red-500 bg-opacity-20 border border-red-500 border-opacity-30 rounded-xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle className="text-red-400" size={24} />
                  <h3 className="text-lg font-semibold text-red-300">Error Loading Markets</h3>
                </div>
                <p className="text-red-200 text-sm mb-4">{marketsError}</p>
                <button
                  onClick={loadMarkets}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Empty state when no markets */}
            {!marketsLoading && !marketsError && markets.length === 0 && walletConnected && (
              <div className="bg-black bg-opacity-40 backdrop-blur-md rounded-xl p-12 border border-purple-500 border-opacity-30 text-center mb-8">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-semibold text-white mb-2">No Markets Found</h3>
                <p className="text-purple-300 mb-4">There are currently no active markets on the blockchain.</p>
              </div>
            )}

            {/* Message for non-connected users */}
            {!walletConnected && markets.length === 0 && (
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 bg-opacity-20 border border-purple-500 border-opacity-50 rounded-xl p-8 mb-8 text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Wallet className="text-purple-300" size={32} />
                  <h3 className="text-2xl font-bold text-white">Connect Your Wallet to Get Started</h3>
                </div>
                <p className="text-purple-200 text-lg mb-6">
                  Connect your wallet to view live prediction markets from the Polygon blockchain
                </p>
                <button
                  onClick={connectWallet}
                  className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-bold text-lg transition-all shadow-lg hover:shadow-purple-500/50"
                >
                  Connect Wallet to View Markets
                </button>
              </div>
            )}

            {/* Value Propositions Section */}
            <div id="markets" className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Instant Settlement */}
              <div className="bg-black bg-opacity-40 backdrop-blur-md rounded-xl p-6 border border-purple-500 border-opacity-30 text-center hover:border-opacity-60 transition-all">
                <div className="text-5xl mb-3">⚡</div>
                <div className="text-xl font-bold text-white mb-2">Instant Settlement</div>
                <div className="text-sm text-purple-300">Trade settles in seconds on blockchain</div>
              </div>

              {/* Live 24/7 */}
              <div className="bg-black bg-opacity-40 backdrop-blur-md rounded-xl p-6 border border-purple-500 border-opacity-30 text-center hover:border-opacity-60 transition-all">
                <div className="text-5xl mb-3">📊</div>
                <div className="text-xl font-bold text-white mb-2">Live 24/7</div>
                <div className="text-sm text-purple-300">Markets always open, trade anytime</div>
              </div>

              {/* Low Fees */}
              <div className="bg-black bg-opacity-40 backdrop-blur-md rounded-xl p-6 border border-purple-500 border-opacity-30 text-center hover:border-opacity-60 transition-all">
                <div className="text-5xl mb-3">💰</div>
                <div className="text-xl font-bold text-white mb-2">Low Fees</div>
                <div className="text-sm text-purple-300">Only 1.5% trading fee on Polygon</div>
              </div>
            </div>

            {/* Active Markets Section */}
            <div className="flex items-center gap-3 mb-6 mt-8">
              <h2 className="text-2xl font-bold text-white">Active Markets</h2>
              <span className="px-3 py-1 bg-green-500 bg-opacity-20 text-green-300 text-sm font-semibold rounded-full">
                {filteredMarkets.length} Open
              </span>
            </div>
            {filteredMarkets.length === 0 ? (
              <div className="bg-black bg-opacity-40 backdrop-blur-md rounded-xl p-12 border border-purple-500 border-opacity-30 text-center mb-8">
                <h3 className="text-xl font-semibold text-white mb-2">No Active Markets</h3>
                <p className="text-purple-300">All markets have been resolved. Check Past Markets below to see outcomes.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredMarkets.map(market => (
                  <MarketCard
                    key={`${market.id}-${market.yesPrice}-${market.noPrice}`}
                    market={market}
                    walletConnected={walletConnected}
                    setShowWalletPrompt={setShowWalletPrompt}
                    setSelectedMarket={setSelectedMarket}
                    setBetType={setBetType}
                    formatUSDT={formatUSDT}
                  />
                ))}
              </div>
            )}

            {/* Past Markets Section */}
            {resolvedMarkets.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-2xl font-bold text-white">Past Markets</h2>
                  <span className="px-3 py-1 bg-blue-500 bg-opacity-20 text-blue-300 text-sm font-semibold rounded-full">
                    {resolvedMarkets.length} Resolved
                  </span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {resolvedMarkets.map(market => (
                    <MarketCard
                      key={`${market.id}-${market.yesPrice}-${market.noPrice}`}
                      market={market}
                      walletConnected={walletConnected}
                      setShowWalletPrompt={setShowWalletPrompt}
                      setSelectedMarket={setSelectedMarket}
                      setBetType={setBetType}
                      formatUSDT={formatUSDT}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {currentView === 'portfolio' && (
          <Portfolio
            userPositions={userPositions}
            limitOrders={limitOrders}
            markets={markets}
            FEE_PERCENTAGE={FEE_PERCENTAGE}
            formatUSDT={formatUSDT}
            calculatePortfolioValue={calculatePortfolioValue}
            calculateTotalPNL={calculateTotalPNL}
            closePosition={closePosition}
            setCurrentView={setCurrentView}
            setLimitOrders={setLimitOrders}
            openPartialCloseModal={openPartialCloseModal}
          />
        )}
        {currentView === 'activity' && (
          <div className="space-y-4">
            {activityHistory.length === 0 ? (
              <div className="bg-black bg-opacity-40 backdrop-blur-md rounded-xl p-12 border border-purple-500 border-opacity-30 text-center">
                <Activity className="mx-auto text-purple-400 mb-4" size={64} />
                <h3 className="text-xl font-semibold text-white mb-2">No Activity Yet</h3>
                <p className="text-purple-300">Your trading history will appear here</p>
              </div>
            ) : (
              activityHistory.map(activity => (
                <div key={activity.id} className="bg-black bg-opacity-40 backdrop-blur-md rounded-xl p-6 border border-purple-500 border-opacity-30">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          activity.type === 'BUY'
                            ? activity.outcome === 'yes'
                              ? 'bg-green-500 bg-opacity-20 text-green-300'
                              : 'bg-red-500 bg-opacity-20 text-red-300'
                            : 'bg-orange-500 bg-opacity-20 text-orange-300'
                        }`}>
                          {activity.type} {activity.outcome.toUpperCase()}
                        </span>
                        <span className="text-purple-400 text-xs flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(activity.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <h3 className="text-white font-semibold mb-2">{activity.marketTitle}</h3>
                      <div className="flex items-center gap-4 text-sm text-purple-300">
                        <span>{activity.shares.toFixed(2)} shares @ ${activity.price.toFixed(4)}</span>
                        {activity.pnl !== undefined && (
                          <span className={activity.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                            P&L: {activity.pnl >= 0 ? '+' : ''}{formatUSDT(activity.pnl)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-semibold ${activity.type === 'BUY' ? 'text-white' : activity.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {activity.type === 'BUY' ? '-' : '+'}{formatUSDT(activity.amount)}
                      </p>
                      <p className="text-xs text-purple-400">Fee: {formatUSDT(activity.fee)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        {currentView === 'trending' && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">🔥 Trending Markets</h2>
              <p className="text-purple-300">Most active markets in the last 24 hours</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {markets
                .filter(m => m.trending)
                .sort((a, b) => b.totalLiquidity - a.totalLiquidity)
                .map(market => (
                <div key={`${market.id}-${market.yesPrice}-${market.noPrice}`} className="bg-black bg-opacity-40 backdrop-blur-md rounded-xl border border-purple-500 border-opacity-30 overflow-hidden hover:border-opacity-60 transition-all">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-3 py-1 bg-purple-500 bg-opacity-30 text-purple-300 text-xs font-semibold rounded-full">{market.category}</span>
                          {market.trending && (
                            <span className="px-3 py-1 bg-green-500 bg-opacity-30 text-green-300 text-xs font-semibold rounded-full flex items-center gap-1">
                              <TrendingUp size={12} />
                              Trending
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">{market.title}</h3>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-purple-400 font-mono">{market.contractAddress.slice(0, 10)}...</span>
                          <a href={`https://polygonscan.com/address/${market.contractAddress}`} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      </div>
                    </div>
                    <div className="mb-4 h-24">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={market.priceHistory} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <defs>
                            <linearGradient id={`gradient-${market.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis
                            dataKey="time"
                            stroke="#a78bfa"
                            style={{ fontSize: '10px' }}
                            tick={{ fill: '#a78bfa' }}
                          />
                          <YAxis
                            hide={true}
                            domain={[0, 1]}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(0, 0, 0, 0.8)',
                              border: '1px solid rgba(168, 85, 247, 0.3)',
                              borderRadius: '8px',
                              fontSize: '12px'
                            }}
                            labelStyle={{ color: '#a78bfa' }}
                            formatter={(value) => `$${Number(value).toFixed(2)}`}
                          />
                          <Area type="monotone" dataKey="price" stroke="#10b981" fill={`url(#gradient-${market.id})`} strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-green-500 bg-opacity-10 rounded-lg p-3 border border-green-500 border-opacity-30">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-green-300">Yes</span>
                          <TrendingUp className="text-green-400" size={16} />
                        </div>
                        <div className="text-2xl font-bold text-green-400">${market.yesPrice.toFixed(2)}</div>
                        <div className="text-xs text-green-300 mt-1">{(market.yesPrice * 100).toFixed(0)}% chance</div>
                      </div>
                      <div className="bg-red-500 bg-opacity-10 rounded-lg p-3 border border-red-500 border-opacity-30">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-red-300">No</span>
                          <TrendingDown className="text-red-400" size={16} />
                        </div>
                        <div className="text-2xl font-bold text-red-400">${market.noPrice.toFixed(2)}</div>
                        <div className="text-xs text-red-300 mt-1">{(market.noPrice * 100).toFixed(0)}% chance</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-purple-300 mb-4">
                      {market.totalLiquidity > 10000 && market.participants > 100 ? (
                        <>
                          <span>{market.participants.toLocaleString('en-US')} traders</span>
                          <span>•</span>
                          <span>{formatUSDT(market.totalLiquidity)} liquidity</span>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-green-400">🌱</span>
                            <span className="text-purple-400">New market - Be an early trader!</span>
                          </div>
                          <span className="px-2 py-1 bg-green-500 bg-opacity-20 text-green-300 text-xs font-semibold rounded-full">
                            Early Access
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-purple-500 border-opacity-30 mt-4">
                      <span className="text-sm text-purple-400">Ends: {new Date(market.endDate).toLocaleDateString('en-US')}</span>
                      <button onClick={() => { if (!walletConnected) { setShowWalletPrompt(true); return; } setSelectedMarket(market); }} className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-purple-500/50">
                        Trade
                      </button>
                    </div>
                  </div>
                </div>
                ))}

              {markets.filter(m => m.trending).length === 0 && (
                <div className="col-span-2 bg-black bg-opacity-40 backdrop-blur-md rounded-xl p-12 border border-purple-500 border-opacity-30 text-center">
                  <TrendingUp className="mx-auto text-purple-400 mb-4" size={64} />
                  <h3 className="text-xl font-semibold text-white mb-2">No Trending Markets Yet</h3>
                  <p className="text-purple-300">Markets will appear here as they gain activity</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>
      <TradeModal
        selectedMarket={selectedMarket}
        betType={betType}
        betAmount={betAmount}
        usdtBalance={usdtBalance}
        txStatus={txStatus}
        txHash={txHash}
        FEE_PERCENTAGE={FEE_PERCENTAGE}
        setBetType={setBetType}
        setBetAmount={setBetAmount}
        setSelectedMarket={setSelectedMarket}
        setTxStatus={setTxStatus}
        setTxHash={setTxHash}
        placeBet={placeBet}
        calculateSlippageDetails={calculateSlippageDetails}
        formatUSDT={formatUSDT}
      />
      {showCreateMarket && (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-purple-500 border-opacity-30">
            <h2 className="text-xl font-bold text-white mb-4">Suggest a Market</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">
                  Market Question
                </label>
                <input
                  type="text"
                  value={newMarket.title}
                  onChange={(e) => setNewMarket({...newMarket, title: e.target.value})}
                  placeholder="Will X happen by Y date?"
                  className="w-full px-4 py-3 bg-black bg-opacity-30 border border-purple-500 border-opacity-30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">
                  Category
                </label>
                <select
                  value={newMarket.category}
                  onChange={(e) => setNewMarket({...newMarket, category: e.target.value})}
                  className="w-full px-4 py-3 bg-black bg-opacity-30 border border-purple-500 border-opacity-30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                >
                  {categories.filter(c => c !== 'All').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={newMarket.endDate}
                  onChange={(e) => setNewMarket({...newMarket, endDate: e.target.value})}
                  className="w-full px-4 py-3 bg-black bg-opacity-30 border border-purple-500 border-opacity-30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateMarket(false)}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createMarket}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all shadow-lg"
              >
                Submit Suggestion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Connection Prompt Modal */}
      {showWalletPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-purple-500 border-opacity-30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Wallet className="text-white" size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">Connect Wallet Required</h2>
            </div>

            <p className="text-purple-200 mb-6">
              {isMobile() && typeof window.ethereum === 'undefined'
                ? "Clicking Connect will open MetaMask app. If you don't have MetaMask, you'll be redirected to install it."
                : "Please connect your wallet to place trades and interact with the prediction markets."}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowWalletPrompt(false);
                  connectWallet();
                }}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-purple-500/50 flex items-center justify-center gap-2"
              >
                <Wallet size={18} />
                Connect Wallet
              </button>
              <button
                onClick={() => setShowWalletPrompt(false)}
                className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showPartialCloseModal && selectedClosePosition && (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-purple-500 border-opacity-30">
            <h2 className="text-xl font-bold text-white mb-4">Close Position</h2>
            <p className="text-purple-300 text-sm mb-4">{selectedClosePosition.position.marketTitle}</p>

            <div className="bg-black bg-opacity-30 rounded-lg p-4 mb-4 border border-purple-500 border-opacity-20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-purple-300 text-sm">Position:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  selectedClosePosition.position.outcome === 'yes'
                    ? 'bg-green-500 bg-opacity-20 text-green-300'
                    : 'bg-red-500 bg-opacity-20 text-red-300'
                }`}>
                  {selectedClosePosition.position.outcome.toUpperCase()}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-purple-300">Total shares:</span>
                  <span className="text-white font-semibold">{selectedClosePosition.position.shares.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-purple-300">Amount invested:</span>
                  <span className="text-white font-semibold">{formatUSDT(selectedClosePosition.position.totalPaid)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-purple-300">Current value:</span>
                  <span className="text-white font-semibold">{formatUSDT(selectedClosePosition.availableLiquidity)}</span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-purple-300 mb-2">
                Shares to Close
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={partialCloseAmount}
                  onChange={(e) => setPartialCloseAmount(e.target.value)}
                  placeholder="Enter shares to close"
                  max={selectedClosePosition.maxShares}
                  className="w-full px-4 py-3 pr-16 bg-black bg-opacity-30 border border-purple-500 border-opacity-30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-purple-500"
                />
                <button
                  onClick={() => {
                    // Set to exact position shares to close everything
                    setPartialCloseAmount(selectedClosePosition.position.shares.toString());
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs font-semibold rounded transition-all"
                >
                  Max
                </button>
              </div>
              <p className="text-xs text-purple-400 mt-1">
                You can close all or part of your position (max: {selectedClosePosition.maxShares.toFixed(2)} shares)
              </p>
            </div>

            {partialCloseAmount && parseFloat(partialCloseAmount) > 0 && (() => {
              const amount = parseFloat(partialCloseAmount);
              const totalShares = selectedClosePosition.position.shares;
              const percentage = ((amount / totalShares) * 100).toFixed(1);
              // Consider it a full close if within 0.01 shares (handles floating point precision)
              const isFull = Math.abs(amount - totalShares) < 0.01;

              // Calculate estimated proceeds (same logic as executePartialClose)
              const market = markets.find(m => m.id === selectedClosePosition.position.marketId);
              const startPrice = selectedClosePosition.position.outcome === 'yes' ? market.yesPrice : market.noPrice;
              const estimatedValue = amount * startPrice;
              const priceImpact = calculatePriceImpact(estimatedValue, market.totalLiquidity);
              const endPrice = Math.max(0.01, startPrice - priceImpact);
              const avgPrice = (startPrice + endPrice) / 2;
              const actualValue = amount * avgPrice;
              const fee = actualValue * (FEE_PERCENTAGE / 100);
              const netProceeds = actualValue - fee;
              const remainingShares = totalShares - amount;

              return (
                <div className="bg-black bg-opacity-30 rounded-lg p-4 mb-4 border border-purple-500 border-opacity-20">
                  {/* Confirmation Text */}
                  <div className={`text-sm font-semibold mb-3 ${isFull ? 'text-orange-400' : 'text-yellow-400'}`}>
                    {isFull
                      ? `You will close all ${totalShares.toFixed(2)} shares (100%)`
                      : `You will close ${amount.toFixed(2)} of ${totalShares.toFixed(2)} shares (${percentage}%)`
                    }
                  </div>

                  {/* Estimated Proceeds */}
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-purple-300">Estimated proceeds:</span>
                    <span className="text-white font-semibold">~{formatUSDT(netProceeds)}</span>
                  </div>

                  {/* Remaining Position (only show if partial) */}
                  {!isFull && (
                    <div className="flex justify-between text-sm">
                      <span className="text-purple-300">Remaining position:</span>
                      <span className="text-white font-semibold">{remainingShares.toFixed(2)} shares</span>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPartialCloseModal(false);
                  setSelectedClosePosition(null);
                  setPartialCloseAmount('');
                }}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => executePartialClose(selectedClosePosition.position.id, parseFloat(partialCloseAmount))}
                disabled={!partialCloseAmount || parseFloat(partialCloseAmount) > selectedClosePosition.maxShares || parseFloat(partialCloseAmount) <= 0}
                className={`flex-1 px-4 py-3 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  partialCloseAmount && Math.abs(parseFloat(partialCloseAmount) - selectedClosePosition.position.shares) < 0.01
                    ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                }`}
              >
                {!partialCloseAmount || parseFloat(partialCloseAmount) <= 0
                  ? 'Close Position'
                  : Math.abs(parseFloat(partialCloseAmount) - selectedClosePosition.position.shares) < 0.01
                  ? 'Close Full Position'
                  : 'Close Partial Position'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCloseConfirmModal && closePositionData && (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-xl max-w-md w-full shadow-2xl border border-purple-500 border-opacity-30 flex flex-col max-h-[85vh]">
            {/* Modal Header - Fixed */}
            <div className="p-6 pb-4 flex-shrink-0">
              <h2 className="text-xl font-bold text-white mb-2">Close Position</h2>
              <p className="text-purple-200 text-sm">{closePositionData.position.marketTitle}</p>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="px-6 overflow-y-auto flex-1" style={{WebkitOverflowScrolling: 'touch'}}>

            <div className="bg-black bg-opacity-30 rounded-lg p-3 mb-4 border border-purple-500 border-opacity-20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-300 text-sm">Position:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  closePositionData.position.outcome === 'yes'
                    ? 'bg-green-500 bg-opacity-20 text-green-300'
                    : 'bg-red-500 bg-opacity-20 text-red-300'
                }`}>
                  {closePositionData.position.outcome.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-purple-300">Shares:</span>
                <span className="text-white font-semibold">{closePositionData.position.shares.toFixed(2)}</span>
              </div>
            </div>

            {closePositionData.slippagePercent > 1 && (
              <div className="bg-yellow-500 bg-opacity-20 border border-yellow-500 border-opacity-30 rounded-lg px-4 py-2 mb-4 flex items-center gap-2">
                <AlertCircle className="text-yellow-400" size={18} />
                <div className="flex-1">
                  <p className="text-sm text-yellow-300 font-semibold">Large Position</p>
                  <p className="text-xs text-yellow-400">
                    Avg exit: ${closePositionData.avgPrice.toFixed(4)} ({closePositionData.slippagePercent}% slippage)
                  </p>
                </div>
              </div>
            )}

            <div className="bg-black bg-opacity-30 rounded-lg p-4 mb-4 border border-purple-500 border-opacity-20">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-purple-300">Gross proceeds:</span>
                <span className="font-semibold text-white">{formatUSDT(closePositionData.actualValue)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-purple-300">Platform fee (2%):</span>
                <span className="font-semibold text-white">{formatUSDT(closePositionData.fee)}</span>
              </div>
              <div className="flex justify-between text-sm mb-3 pb-3 border-b border-purple-500 border-opacity-30">
                <span className="text-purple-300">Net proceeds:</span>
                <span className="font-semibold text-white">{formatUSDT(closePositionData.netProceeds)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-purple-300">Original investment:</span>
                <span className="font-semibold text-white">{formatUSDT(closePositionData.totalPaid)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-purple-300">Total profit/loss:</span>
                <span className={`font-semibold text-lg ${closePositionData.realPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {closePositionData.realPnL >= 0 ? '+' : ''}{formatUSDT(closePositionData.realPnL)}
                </span>
              </div>
            </div>
            </div>

            {/* Modal Footer - Sticky */}
            <div className="p-6 pt-4 flex-shrink-0 border-t border-purple-500 border-opacity-20">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCloseConfirmModal(false);
                    setClosePositionData(null);
                  }}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeClosePosition}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-lg font-medium transition-all shadow-lg"
                >
                  Confirm Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trade Success Modal */}
      {showTradeSuccessModal && tradeSuccessData && (() => {
        console.log('📱 RENDERING SUCCESS MODAL', {
          showTradeSuccessModal,
          tradeSuccessData
        });
        return (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-xl max-w-md w-full shadow-2xl border border-purple-500 border-opacity-30 flex flex-col max-h-[85vh]">
            {/* Modal Header - Fixed */}
            <div className="p-6 pb-4 flex-shrink-0">
              <div className="flex items-center gap-3 mb-2">
                {tradeSuccessData.isPartialFill ? (
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                    <AlertCircle className="text-white" size={28} />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                    <CheckCircle className="text-white" size={28} />
                  </div>
                )}
                <h2 className="text-xl font-bold text-white">
                  {tradeSuccessData.isPartialFill ? 'Partial Fill - Trade Successful' : 'Position Opened!'}
                </h2>
              </div>
              <p className="text-purple-200 text-sm">{tradeSuccessData.marketTitle}</p>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="px-6 overflow-y-auto flex-1" style={{WebkitOverflowScrolling: 'touch'}}>
              {tradeSuccessData.isPartialFill ? (
                <div className="bg-yellow-500 bg-opacity-10 border border-yellow-500 border-opacity-30 rounded-lg px-4 py-3 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="text-yellow-400" size={20} />
                    <span className="text-yellow-300 text-sm font-semibold">Partial Fill - Not enough liquidity for full order</span>
                  </div>
                  <p className="text-yellow-200 text-xs mt-2">
                    Your order was partially filled. The remaining amount has been placed as a limit order and will execute when liquidity becomes available.
                  </p>
                </div>
              ) : (
                <div className="bg-green-500 bg-opacity-10 border border-green-500 border-opacity-30 rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
                  <CheckCircle className="text-green-400" size={20} />
                  <span className="text-green-300 text-sm font-semibold">Your position is now active in your portfolio</span>
                </div>
              )}

              {tradeSuccessData.isPartialFill && (
                <div className="bg-yellow-500 bg-opacity-10 border border-yellow-500 border-opacity-30 rounded-lg p-4 mb-4">
                  <div className="text-sm font-semibold text-yellow-300 mb-3">Partial Fill Details</div>

                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-purple-300">Requested amount:</span>
                    <span className="font-semibold text-white">{formatUSDT(tradeSuccessData.requestedAmount)}</span>
                  </div>

                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-purple-300">Filled amount:</span>
                    <span className="font-semibold text-yellow-300">{formatUSDT(tradeSuccessData.filledAmount)}</span>
                  </div>

                  <div className="flex justify-between text-sm mb-2 pb-2 border-b border-yellow-500 border-opacity-20">
                    <span className="text-purple-300">Fill percentage:</span>
                    <span className="font-semibold text-yellow-300">{tradeSuccessData.fillPercentage.toFixed(1)}%</span>
                  </div>

                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-purple-300">Remaining (limit order):</span>
                    <span className="font-semibold text-white">{formatUSDT(tradeSuccessData.requestedAmount - tradeSuccessData.filledAmount)}</span>
                  </div>
                </div>
              )}

              <div className="bg-black bg-opacity-30 rounded-lg p-4 mb-4 border border-purple-500 border-opacity-20">
                <div className="flex justify-between text-sm mb-3 pb-3 border-b border-purple-500 border-opacity-20">
                  <span className="text-purple-300">Position:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    tradeSuccessData.outcome === 'yes'
                      ? 'bg-green-500 bg-opacity-20 text-green-300'
                      : 'bg-red-500 bg-opacity-20 text-red-300'
                  }`}>
                    {tradeSuccessData.outcome.toUpperCase()}
                  </span>
                </div>

                <div className="flex justify-between text-sm mb-2">
                  <span className="text-purple-300">Shares {tradeSuccessData.isPartialFill ? 'filled' : 'purchased'}:</span>
                  <span className="font-semibold text-white">{tradeSuccessData.shares.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-sm mb-2">
                  <span className="text-purple-300">Total amount paid:</span>
                  <span className="font-semibold text-white">{formatUSDT(tradeSuccessData.amountSpent)}</span>
                </div>
              </div>

              <div className="bg-black bg-opacity-30 rounded-lg p-3 mb-4 border border-purple-500 border-opacity-20">
                <a href={`https://polygonscan.com/tx/${tradeSuccessData.txHash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                  <span>View transaction on PolygonScan</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>

            {/* Modal Footer - Sticky */}
            <div className="p-6 pt-4 flex-shrink-0 border-t border-purple-500 border-opacity-20">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowTradeSuccessModal(false);
                    setTradeSuccessData(null);
                  }}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowTradeSuccessModal(false);
                    setTradeSuccessData(null);
                    setCurrentView('portfolio');
                  }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <TrendingUp size={18} />
                  View Portfolio
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* MetaMask Install Modal */}
      {networkError === 'metamask-required' && (
        <MetaMaskInstallModal
          browserType={getBrowserType()}
          onClose={() => setNetworkError('')}
        />
      )}

      {/* Terms Acceptance Modal */}
      {showTermsAcceptance && (
        <TermsAcceptanceModal
          onAccept={handleAcceptTerms}
          onViewTerms={handleOpenTerms}
          onViewPrivacy={handleOpenPrivacy}
        />
      )}

      {/* Terms of Service Modal */}
      {showTermsModal && (
        <LegalDocModal
          title="Terms of Service"
          content={<TermsContent />}
          onClose={() => setShowTermsModal(false)}
        />
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <LegalDocModal
          title="Privacy Policy"
          content={<PrivacyContent />}
          onClose={() => setShowPrivacyModal(false)}
        />
      )}

      {/* Footer */}
      <Footer
        onOpenTerms={handleOpenTerms}
        onOpenPrivacy={handleOpenPrivacy}
      />
    </div>
  );
}
