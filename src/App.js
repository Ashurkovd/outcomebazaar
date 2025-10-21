import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Users, Wallet, Search, ExternalLink, AlertCircle, CheckCircle, PieChart, Clock, Plus, BarChart3, Activity } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

export default function OutcomeBazaar() {
  const [walletAddress, setWalletAddress] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);
  const [usdtBalance, setUsdtBalance] = useState(0);
  const [networkError, setNetworkError] = useState('');
  const [isPolygon, setIsPolygon] = useState(false);
  const [currentView, setCurrentView] = useState('markets');
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
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showWalletPrompt, setShowWalletPrompt] = useState(false);

  const categories = ['All', 'Cricket', 'Politics', 'Economy', 'Space', 'Entertainment'];
  const POLYGON_CHAIN_ID = '0x89';
  const FEE_PERCENTAGE = 2;
  const MAX_POOL_USAGE = 0.7;

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

  const [markets, setMarkets] = useState([
    {
      id: 1,
      title: "Will India win the 2025 ICC Champions Trophy?",
      category: "Cricket",
      contractAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      yesPrice: 0.68,
      noPrice: 0.32,
      totalLiquidity: 125000,
      endDate: "2025-03-09",
      participants: 15420,
      trending: true,
      yesShares: 850000,
      noShares: 1250000,
      priceHistory: [
        { time: '1D', price: 0.45 },
        { time: '2D', price: 0.52 },
        { time: '3D', price: 0.58 },
        { time: '4D', price: 0.65 },
        { time: '5D', price: 0.68 }
      ],
      poolSeed: 2500,
      poolUsage: 0,
      maxPoolUsage: 0.7,
      orderBookDepth: 3200,
      volume24h: 4250
    },
    {
      id: 2,
      title: "Will Nifty 50 cross 25,000 by December 2025?",
      category: "Economy",
      contractAddress: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
      yesPrice: 0.55,
      noPrice: 0.45,
      totalLiquidity: 280000,
      endDate: "2025-12-31",
      participants: 8934,
      trending: true,
      yesShares: 1100000,
      noShares: 900000,
      priceHistory: [
        { time: '1D', price: 0.38 },
        { time: '2D', price: 0.42 },
        { time: '3D', price: 0.48 },
        { time: '4D', price: 0.52 },
        { time: '5D', price: 0.55 }
      ],
      poolSeed: 2000,
      poolUsage: 0,
      maxPoolUsage: 0.7,
      orderBookDepth: 4100,
      volume24h: 3180
    },
    {
      id: 3,
      title: "Will BJP win majority in upcoming state elections?",
      category: "Politics",
      contractAddress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      yesPrice: 0.62,
      noPrice: 0.38,
      totalLiquidity: 450000,
      endDate: "2025-11-15",
      participants: 22156,
      trending: false,
      yesShares: 1550000,
      noShares: 950000,
      priceHistory: [
        { time: '1D', price: 0.72 },
        { time: '2D', price: 0.68 },
        { time: '3D', price: 0.65 },
        { time: '4D', price: 0.63 },
        { time: '5D', price: 0.62 }
      ],
      poolSeed: 2000,
      poolUsage: 0,
      maxPoolUsage: 0.7,
      orderBookDepth: 2800,
      volume24h: 5420
    },
    {
      id: 4,
      title: "Will India launch Gaganyaan mission in 2025?",
      category: "Space",
      contractAddress: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
      yesPrice: 0.41,
      noPrice: 0.59,
      totalLiquidity: 56000,
      endDate: "2025-12-31",
      participants: 4521,
      trending: false,
      yesShares: 410000,
      noShares: 590000,
      priceHistory: [
        { time: '1D', price: 0.55 },
        { time: '2D', price: 0.48 },
        { time: '3D', price: 0.44 },
        { time: '4D', price: 0.42 },
        { time: '5D', price: 0.41 }
      ],
      poolSeed: 1500,
      poolUsage: 0,
      maxPoolUsage: 0.7,
      orderBookDepth: 1200,
      volume24h: 1890
    },
    {
      id: 5,
      title: "Will RCB win IPL 2025?",
      category: "Cricket",
      contractAddress: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
      yesPrice: 0.18,
      noPrice: 0.82,
      totalLiquidity: 187000,
      endDate: "2025-05-30",
      participants: 31240,
      trending: true,
      yesShares: 338600,
      noShares: 1542400,
      priceHistory: [
        { time: '1D', price: 0.08 },
        { time: '2D', price: 0.11 },
        { time: '3D', price: 0.14 },
        { time: '4D', price: 0.16 },
        { time: '5D', price: 0.18 }
      ],
      poolSeed: 2500,
      poolUsage: 0,
      maxPoolUsage: 0.7,
      orderBookDepth: 4500,
      volume24h: 2760
    },
    {
      id: 6,
      title: "Will Jawan 2 release in 2025?",
      category: "Entertainment",
      contractAddress: "0x9Aa5d462A9F2C3c5e8D4c8F1B3e7A2d9C4b8E5f6",
      yesPrice: 0.35,
      noPrice: 0.65,
      totalLiquidity: 89000,
      endDate: "2025-12-31",
      participants: 12450,
      trending: true,
      yesShares: 450000,
      noShares: 850000,
      priceHistory: [
        { time: '1D', price: 0.28 },
        { time: '2D', price: 0.30 },
        { time: '3D', price: 0.32 },
        { time: '4D', price: 0.34 },
        { time: '5D', price: 0.35 }
      ],
      poolSeed: 1500,
      poolUsage: 0,
      maxPoolUsage: 0.7,
      orderBookDepth: 1800,
      volume24h: 2340
    },
    {
      id: 7,
      title: "Will Reliance acquire Disney+ Hotstar deal by Q2 2025?",
      category: "Economy",
      contractAddress: "0x7Bb6c563D4F9E8a6B2C9d5E3A8F1c7B4E9a6D2f8",
      yesPrice: 0.72,
      noPrice: 0.28,
      totalLiquidity: 340000,
      endDate: "2025-06-30",
      participants: 18900,
      trending: true,
      yesShares: 1800000,
      noShares: 700000,
      priceHistory: [
        { time: '1D', price: 0.58 },
        { time: '2D', price: 0.63 },
        { time: '3D', price: 0.67 },
        { time: '4D', price: 0.70 },
        { time: '5D', price: 0.72 }
      ],
      poolSeed: 2000,
      poolUsage: 0,
      maxPoolUsage: 0.7,
      orderBookDepth: 3500,
      volume24h: 4100
    },
    {
      id: 8,
      title: "Will India's GDP growth exceed 7% in 2025?",
      category: "Economy",
      contractAddress: "0x3Cc8d674E9F2A5b7D3e8C9a1F4B7d2E8A9c5F3b6",
      yesPrice: 0.58,
      noPrice: 0.42,
      totalLiquidity: 520000,
      endDate: "2025-12-31",
      participants: 25600,
      trending: false,
      yesShares: 1450000,
      noShares: 1050000,
      priceHistory: [
        { time: '1D', price: 0.52 },
        { time: '2D', price: 0.54 },
        { time: '3D', price: 0.56 },
        { time: '4D', price: 0.57 },
        { time: '5D', price: 0.58 }
      ],
      poolSeed: 2000,
      poolUsage: 0,
      maxPoolUsage: 0.7,
      orderBookDepth: 3900,
      volume24h: 3850
    },
    {
      id: 9,
      title: "Will Virat Kohli score 100th international century in 2025?",
      category: "Cricket",
      contractAddress: "0x5Dd9e785C3F1B2a8E4c9D6F2A7b8E3C5d9F4A1b7",
      yesPrice: 0.44,
      noPrice: 0.56,
      totalLiquidity: 215000,
      endDate: "2025-12-31",
      participants: 28340,
      trending: true,
      yesShares: 880000,
      noShares: 1120000,
      priceHistory: [
        { time: '1D', price: 0.38 },
        { time: '2D', price: 0.40 },
        { time: '3D', price: 0.41 },
        { time: '4D', price: 0.43 },
        { time: '5D', price: 0.44 }
      ],
      poolSeed: 2500,
      poolUsage: 0,
      maxPoolUsage: 0.7,
      orderBookDepth: 3400,
      volume24h: 2950
    },
    {
      id: 10,
      title: "Will Indian rupee trade below 80 against USD by end of 2025?",
      category: "Economy",
      contractAddress: "0x8Ee7f896D2B3c5A8F4e9C1d7A3b8F2E9c6D5A4b1",
      yesPrice: 0.31,
      noPrice: 0.69,
      totalLiquidity: 178000,
      endDate: "2025-12-31",
      participants: 14780,
      trending: false,
      yesShares: 620000,
      noShares: 1380000,
      priceHistory: [
        { time: '1D', price: 0.35 },
        { time: '2D', price: 0.34 },
        { time: '3D', price: 0.33 },
        { time: '4D', price: 0.32 },
        { time: '5D', price: 0.31 }
      ],
      poolSeed: 2000,
      poolUsage: 0,
      maxPoolUsage: 0.7,
      orderBookDepth: 2400,
      volume24h: 2420
    }
  ]);

  const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const connectWallet = async () => {
    // Check if on mobile and MetaMask is not injected
    if (isMobile() && typeof window.ethereum === 'undefined') {
      // Deep link to MetaMask app with current URL
      const currentUrl = window.location.href;
      const metamaskDeepLink = `https://metamask.app.link/dapp/${currentUrl.replace(/^https?:\/\//, '')}`;

      // Open MetaMask app
      window.location.href = metamaskDeepLink;
      return;
    }

    if (typeof window.ethereum === 'undefined') {
      setNetworkError('Please install MetaMask to use this dApp');
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== POLYGON_CHAIN_ID) {
        setNetworkError('Please switch to Polygon network');
        setIsPolygon(false);
        await switchToPolygon();
      } else {
        setIsPolygon(true);
        setNetworkError('');
      }
      setWalletAddress(accounts[0]);
      setWalletConnected(true);
      const mockBalance = Math.floor(Math.random() * 10000) + 1000;
      setUsdtBalance(mockBalance);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setNetworkError('Failed to connect wallet');
    }
  };

  const switchToPolygon = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: POLYGON_CHAIN_ID }],
      });
      setIsPolygon(true);
      setNetworkError('');
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: POLYGON_CHAIN_ID,
              chainName: 'Polygon Mainnet',
              nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
              rpcUrls: ['https://polygon-rpc.com/'],
              blockExplorerUrls: ['https://polygonscan.com/']
            }]
          });
          setIsPolygon(true);
          setNetworkError('');
        } catch (addError) {
          setNetworkError('Failed to add Polygon network');
        }
      }
    }
  };

  const disconnectWallet = () => {
    setWalletAddress('');
    setWalletConnected(false);
    setUsdtBalance(0);
    setIsPolygon(false);
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
    const priceImpact = calculatePriceImpact(netAmount, selectedMarket.totalLiquidity);
    const endPrice = Math.min(0.99, Math.max(0.01, startPrice + priceImpact));
    const avgPrice = (startPrice + endPrice) / 2;
    const shares = netAmount / avgPrice;
    const slippagePercent = ((avgPrice - startPrice) / startPrice * 100);

    return { startPrice, endPrice, avgPrice, shares, slippagePercent, priceImpact };
  };

  const calculateShares = () => {
    const details = calculateSlippageDetails();
    return details ? details.shares.toFixed(4) : 0;
  };

  const calculatePayout = () => {
    if (!betAmount || !selectedMarket) return 0;
    return parseFloat(calculateShares()).toFixed(2);
  };

  const calculateMaxFill = (market) => {
    if (!market) return 0;
    const poolAvailable = market.poolSeed * (1 - market.poolUsage);
    const orderBookDepth = market.orderBookDepth || 0;
    const maxFill = poolAvailable + orderBookDepth;
    return maxFill;
  };

  const processInstantFill = (instantAmount, poolNeeded, totalPaid) => {
    const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64);
    setTxHash(mockTxHash);
    setTxStatus('success');
    setUsdtBalance(prev => prev - totalPaid);

    const shares = instantAmount / (betType === 'yes' ? selectedMarket.yesPrice : selectedMarket.noPrice);

    // Update market pool usage and prices
    setMarkets(prevMarkets => prevMarkets.map(m => {
      if (m.id === selectedMarket.id) {
        const newLiquidity = m.totalLiquidity + instantAmount;
        const priceImpact = calculatePriceImpact(instantAmount, m.totalLiquidity);

        const newYesPrice = betType === 'yes'
          ? Math.min(0.99, m.yesPrice + priceImpact)
          : Math.max(0.01, m.yesPrice - priceImpact);

        const newNoPrice = betType === 'no'
          ? Math.min(0.99, m.noPrice + priceImpact)
          : Math.max(0.01, m.noPrice - priceImpact);

        console.log(`PlaceBet (partial) price update - Market ${m.id}:`, {
          betType,
          amount: totalPaid,
          instantAmount,
          totalLiquidity: m.totalLiquidity,
          priceImpact,
          oldYesPrice: m.yesPrice,
          newYesPrice,
          oldNoPrice: m.noPrice,
          newNoPrice
        });

        return {
          ...m,
          totalLiquidity: newLiquidity,
          participants: m.participants + 1,
          poolUsage: m.poolUsage + (poolNeeded / m.poolSeed),
          yesShares: betType === 'yes' ? m.yesShares + shares * 1000000 : m.yesShares,
          noShares: betType === 'no' ? m.noShares + shares * 1000000 : m.noShares,
          yesPrice: newYesPrice,
          noPrice: newNoPrice
        };
      }
      return m;
    }));

    const newPosition = {
      id: Date.now(),
      marketId: selectedMarket.id,
      marketTitle: selectedMarket.title,
      outcome: betType,
      shares: shares,
      avgPrice: betType === 'yes' ? selectedMarket.yesPrice : selectedMarket.noPrice,
      invested: instantAmount,
      totalPaid: totalPaid,
      buyFee: totalPaid - instantAmount,
      netAmount: instantAmount,
      currentPrice: betType === 'yes' ? selectedMarket.yesPrice : selectedMarket.noPrice,
      timestamp: new Date().toISOString()
    };
    setUserPositions(prev => [...prev, newPosition]);

    setTimeout(() => {
      setTxStatus('');
      setTxHash('');
      setSelectedMarket(null);
      setBetAmount('');
      setNetworkError('');
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

    // Calculate maximum fillable amount
    const poolAvailable = selectedMarket.poolSeed * (1 - selectedMarket.poolUsage);
    const orderBookDepth = selectedMarket.orderBookDepth || 0;
    const maxFill = poolAvailable + orderBookDepth;

    // Debug logging
    console.log('=== LIQUIDITY DEBUG ===');
    console.log('Pool seed:', selectedMarket.poolSeed);
    console.log('Pool usage:', selectedMarket.poolUsage);
    console.log('Pool available:', poolAvailable);
    console.log('Order book depth:', orderBookDepth);
    console.log('Max instant fill:', maxFill);
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
    const poolNeeded = Math.min(netAmount * 0.4, poolAvailable);

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

      // Calculate slippage details
      const startPrice = betType === 'yes' ? selectedMarket.yesPrice : selectedMarket.noPrice;
      const priceImpact = calculatePriceImpact(netAmount, selectedMarket.totalLiquidity);
      const endPrice = Math.min(0.99, Math.max(0.01, startPrice + priceImpact));
      const avgPrice = (startPrice + endPrice) / 2;
      const shares = netAmount / avgPrice;

      // Update market pool usage and prices
      setMarkets(prevMarkets => prevMarkets.map(m => {
        if (m.id === selectedMarket.id) {
          const newLiquidity = m.totalLiquidity + netAmount;

          const newYesPrice = betType === 'yes'
            ? endPrice
            : Math.max(0.01, m.yesPrice - priceImpact);

          const newNoPrice = betType === 'no'
            ? endPrice
            : Math.max(0.01, m.noPrice - priceImpact);

          console.log(`PlaceBet price update - Market ${m.id}:`, {
            betType,
            amount,
            netAmount,
            totalLiquidity: m.totalLiquidity,
            startPrice,
            endPrice,
            avgPrice,
            shares,
            priceImpact,
            oldYesPrice: m.yesPrice,
            newYesPrice,
            oldNoPrice: m.noPrice,
            newNoPrice
          });

          const updatedMarket = {
            ...m,
            totalLiquidity: newLiquidity,
            participants: m.participants + 1,
            poolUsage: m.poolUsage + (poolNeeded / m.poolSeed),
            yesShares: betType === 'yes' ? m.yesShares + shares * 1000000 : m.yesShares,
            noShares: betType === 'no' ? m.noShares + shares * 1000000 : m.noShares,
            yesPrice: newYesPrice,
            noPrice: newNoPrice
          };

          console.log('Market after trade:', {
            id: updatedMarket.id,
            participants: updatedMarket.participants,
            totalLiquidity: updatedMarket.totalLiquidity
          });

          return updatedMarket;
        }
        return m;
      }));

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

      setTimeout(() => {
        setTxStatus('');
        setTxHash('');
        setSelectedMarket(null);
        setBetAmount('');
        setNetworkError('');
      }, 800);
    }, 2000);
  };

  const filteredMarkets = markets.filter(market => {
    const matchesSearch = market.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || market.category === selectedCategory;
    return matchesSearch && matchesCategory;
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

    // Update position (reduce shares)
    setUserPositions(prev => prev.map(p => {
      if (p.id === positionId) {
        const remainingShares = p.shares - sharesToClose;
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
    }));

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
    alert(`Closed ${sharesToClose.toFixed(2)} shares for ${formatUSDT(netProceeds)}`);
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

    // Check liquidity
    const availableLiquidity = (market.poolSeed * (1 - market.poolUsage)) + market.orderBookDepth;
    if (actualValue > availableLiquidity) {
      // Calculate max closeable amount
      const maxCloseableShares = (availableLiquidity / avgPrice) * 0.98; // Account for fees
      const maxCloseableValue = maxCloseableShares * avgPrice;

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

  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('chainChanged', (chainId) => {
        setIsPolygon(chainId === POLYGON_CHAIN_ID);
        if (chainId !== POLYGON_CHAIN_ID) {
          setNetworkError('Please switch to Polygon network');
        } else {
          setNetworkError('');
        }
      });
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setWalletAddress(accounts[0]);
        }
      });
    }
  }, []);

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
      <header className="bg-black bg-opacity-40 backdrop-blur-md border-b border-purple-500 border-opacity-30 md:sticky md:top-0 z-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-1.5 sm:py-4">
          <div className="flex items-center justify-between mb-1.5 sm:mb-4">
            <button
              onClick={() => {
                setCurrentView('markets');
                setSearchTerm('');
                setSelectedCategory('All');
              }}
              className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-white">OutcomeBazaar</h1>
                <p className="hidden sm:flex text-sm text-purple-300 items-center gap-2">
                  Forecast Exchange
                  <span className="px-2 py-0.5 bg-purple-500 bg-opacity-30 rounded text-xs">Polygon</span>
                </p>
              </div>
            </button>
            <div className="flex items-center gap-1 sm:gap-3">
              {walletConnected ? (
                <>
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-lg flex items-center gap-1 sm:gap-2">
                    <span className="text-base sm:text-xl">💵</span>
                    <span className="font-semibold text-sm sm:text-base">{formatUSDT(usdtBalance)}</span>
                  </div>
                  <div className="hidden sm:flex bg-purple-500 bg-opacity-20 backdrop-blur-sm border border-purple-400 border-opacity-30 px-4 py-2 rounded-lg items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-white font-mono text-sm">{formatAddress(walletAddress)}</span>
                  </div>
                  <button onClick={disconnectWallet} className="hidden sm:block px-4 py-2 bg-red-500 bg-opacity-20 hover:bg-opacity-30 text-red-300 rounded-lg transition-all text-sm">
                    Disconnect
                  </button>
                  <button onClick={disconnectWallet} className="sm:hidden p-2 bg-red-500 bg-opacity-20 hover:bg-opacity-30 text-red-300 rounded-lg transition-all">
                    <span className="text-sm">✕</span>
                  </button>
                </>
              ) : (
                <button onClick={connectWallet} className="px-3 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-purple-500/50 text-sm sm:text-base">
                  <Wallet size={16} className="sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Connect Wallet</span>
                  <span className="sm:hidden">Connect</span>
                </button>
              )}
            </div>
          </div>
          {networkError && (
            <div className="bg-red-500 bg-opacity-20 border border-red-500 border-opacity-30 rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
              <AlertCircle className="text-red-400" size={20} />
              <span className="text-red-300 text-sm">{networkError}</span>
              {!isPolygon && walletConnected && (
                <button onClick={switchToPolygon} className="ml-auto px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium transition-colors">
                  Switch Network
                </button>
              )}
            </div>
          )}
          <div className="flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
            <div className="flex gap-1 sm:gap-2 flex-1 min-w-0">
              <button onClick={() => setCurrentView('markets')} className={`flex-1 px-2 sm:px-4 py-2 sm:py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap text-xs sm:text-base ${currentView === 'markets' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' : 'bg-purple-500 bg-opacity-20 text-purple-300 hover:bg-opacity-30'}`}>
                <BarChart3 size={14} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden sm:inline">Markets</span>
                <span className="sm:hidden text-base">📊</span>
              </button>
              <button onClick={() => setCurrentView('portfolio')} className={`flex-1 px-2 sm:px-4 py-2 sm:py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap text-xs sm:text-base ${currentView === 'portfolio' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' : 'bg-purple-500 bg-opacity-20 text-purple-300 hover:bg-opacity-30'}`}>
                <PieChart size={14} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden sm:inline">Portfolio</span>
                <span className="sm:hidden text-base">💼</span>
              </button>
              <button onClick={() => setCurrentView('activity')} className={`flex-1 px-2 sm:px-4 py-2 sm:py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap text-xs sm:text-base ${currentView === 'activity' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' : 'bg-purple-500 bg-opacity-20 text-purple-300 hover:bg-opacity-30'}`}>
                <Activity size={14} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden sm:inline">Activity</span>
                <span className="sm:hidden text-base">📜</span>
              </button>
              <button onClick={() => setCurrentView('trending')} className={`flex-1 px-2 sm:px-4 py-2 sm:py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap text-xs sm:text-base ${currentView === 'trending' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' : 'bg-purple-500 bg-opacity-20 text-purple-300 hover:bg-opacity-30'}`}>
                <TrendingUp size={14} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden sm:inline">Trending</span>
                <span className="sm:hidden text-base">🔥</span>
              </button>
            </div>
            {currentView === 'markets' && (
              <button onClick={() => setShowCreateMarket(true)} className="px-3 sm:px-4 py-2.5 sm:py-2 bg-green-500 bg-opacity-20 hover:bg-opacity-30 text-green-300 rounded-lg font-medium transition-all flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base whitespace-nowrap">
                <Plus size={18} />
                <span className="hidden sm:inline">Suggest Market</span>
                <span className="sm:hidden">Suggest</span>
              </button>
            )}
          </div>
          {currentView === 'markets' && (
            <div className="flex gap-2 sm:gap-3 flex-wrap mt-2 sm:mt-4">
              <div className="flex-1 min-w-0 sm:min-w-64 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400" size={18} />
                <input type="text" placeholder="Search markets..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-3 sm:pr-4 py-2.5 sm:py-2 bg-purple-900 bg-opacity-30 border border-purple-500 border-opacity-30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-purple-400 text-sm sm:text-base" />
              </div>
              <div className="flex gap-2 flex-wrap">
                {categories.map(cat => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg font-medium transition-all text-sm sm:text-base whitespace-nowrap ${selectedCategory === cat ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg' : 'bg-purple-500 bg-opacity-20 text-purple-300 hover:bg-opacity-30'}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8 overflow-x-hidden">
        {currentView === 'markets' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-black bg-opacity-40 backdrop-blur-md rounded-xl p-6 border border-purple-500 border-opacity-30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-300 mb-1">Active Markets</p>
                    <p className="text-2xl font-bold text-white">{markets.length}</p>
                    <p className="text-xs text-purple-400 mt-1">Live on Polygon</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <TrendingUp className="text-white" size={24} />
                  </div>
                </div>
              </div>
              <div className="bg-black bg-opacity-40 backdrop-blur-md rounded-xl p-6 border border-purple-500 border-opacity-30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-300 mb-1">New This Week</p>
                    <p className="text-2xl font-bold text-white">3 markets</p>
                    <p className="text-xs text-purple-400 mt-1">Fresh predictions daily</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-2xl">🎯</div>
                </div>
              </div>
              <div className="bg-black bg-opacity-40 backdrop-blur-md rounded-xl p-6 border border-purple-500 border-opacity-30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-300 mb-1">24h Volume</p>
                    <p className="text-2xl font-bold text-white">
                      {formatUSDT(markets.reduce((sum, m) => sum + (m.volume24h || 0), 0))}
                    </p>
                    <p className="text-xs text-green-400 mt-1 font-semibold">+23% from yesterday</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    <TrendingUp className="text-white" size={24} />
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredMarkets.map(market => {
                console.log(`Rendering market ${market.id}: YES=${market.yesPrice}, NO=${market.noPrice}`);
                return (
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
                    <div className="mb-4 h-20">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={market.priceHistory}>
                          <defs>
                            <linearGradient id={`gradient-${market.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
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
                );
              })}
            </div>
          </>
        )}
        {currentView === 'portfolio' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-black bg-opacity-40 backdrop-blur-md rounded-xl p-6 border border-purple-500 border-opacity-30">
                <p className="text-sm text-purple-300 mb-1">Portfolio Value</p>
                <p className="text-3xl font-bold text-white">{formatUSDT(calculatePortfolioValue())}</p>
              </div>
              <div className="bg-black bg-opacity-40 backdrop-blur-md rounded-xl p-6 border border-purple-500 border-opacity-30">
                <p className="text-sm text-purple-300 mb-1">Total Invested</p>
                <p className="text-3xl font-bold text-white">{formatUSDT(userPositions.reduce((sum, pos) => sum + pos.invested, 0))}</p>
              </div>
              <div className="bg-black bg-opacity-40 backdrop-blur-md rounded-xl p-6 border border-purple-500 border-opacity-30">
                <p className="text-sm text-purple-300 mb-1">Total PNL</p>
                <p className={`text-3xl font-bold ${calculateTotalPNL() >= 0 ? 'text-green-400' : 'text-red-400'}`}>{calculateTotalPNL() >= 0 ? '+' : ''}{formatUSDT(calculateTotalPNL())}</p>
              </div>
            </div>
            {userPositions.length === 0 ? (
              <div className="bg-black bg-opacity-40 backdrop-blur-md rounded-xl p-12 border border-purple-500 border-opacity-30 text-center">
                <PieChart className="mx-auto text-purple-400 mb-4" size={64} />
                <h3 className="text-xl font-semibold text-white mb-2">No Positions Yet</h3>
                <p className="text-purple-300 mb-4">Start trading to build your portfolio</p>
                <button onClick={() => setCurrentView('markets')} className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all">
                  Browse Markets
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  // Aggregate positions by market and outcome
                  const aggregatedPositions = userPositions.reduce((acc, pos) => {
                    const key = `${pos.marketId}-${pos.outcome}`;

                    if (!acc[key]) {
                      acc[key] = {
                        marketId: pos.marketId,
                        marketTitle: pos.marketTitle,
                        outcome: pos.outcome,
                        totalShares: 0,
                        totalInvested: 0,
                        totalPaid: 0,
                        positions: []
                      };
                    }

                    acc[key].totalShares += pos.shares;
                    acc[key].totalInvested += pos.invested;
                    acc[key].totalPaid += (pos.totalPaid || pos.invested / 0.98);
                    acc[key].positions.push(pos);

                    return acc;
                  }, {});

                  const aggregatedList = Object.values(aggregatedPositions);

                  return aggregatedList.map(aggPos => {
                    const market = markets.find(m => m.id === aggPos.marketId);
                    const currentPrice = aggPos.outcome === 'yes' ? market.yesPrice : market.noPrice;
                    const currentValue = aggPos.totalShares * currentPrice;
                    const avgCost = aggPos.totalPaid / aggPos.totalShares;
                    const sellFee = currentValue * (FEE_PERCENTAGE / 100);
                    const netProceeds = currentValue - sellFee;
                    const pnl = netProceeds - aggPos.totalPaid;
                    const pnlPercent = ((pnl / aggPos.totalPaid) * 100).toFixed(2);

                    return (
                      <div key={`${aggPos.marketId}-${aggPos.outcome}`} className="bg-black bg-opacity-40 backdrop-blur-md rounded-xl p-6 border border-purple-500 border-opacity-30">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white mb-2">{aggPos.marketTitle}</h3>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${aggPos.outcome === 'yes' ? 'bg-green-500 bg-opacity-20 text-green-300' : 'bg-red-500 bg-opacity-20 text-red-300'}`}>
                                {aggPos.outcome.toUpperCase()}
                              </span>
                              <span className="text-purple-400 text-sm">{aggPos.totalShares.toFixed(2)} shares</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-purple-400">
                              <span>Avg Cost: ${avgCost.toFixed(4)}</span>
                              <span>•</span>
                              <span>{aggPos.positions.length} order(s)</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-white">{formatUSDT(currentValue)}</p>
                            <p className={`text-sm font-semibold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{pnl >= 0 ? '+' : ''}{formatUSDT(pnl)} ({pnlPercent}%)</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-purple-500 border-opacity-30">
                          <div>
                            <p className="text-xs text-purple-400 mb-1">Avg Price</p>
                            <p className="text-white font-semibold">${avgCost.toFixed(4)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-purple-400 mb-1">Current Price</p>
                            <p className="text-white font-semibold">${currentPrice.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-purple-400 mb-1">Total Paid</p>
                            <p className="text-white font-semibold">{formatUSDT(aggPos.totalPaid)}</p>
                          </div>
                        </div>
                        <div className="flex justify-end pt-4 border-t border-purple-500 border-opacity-30 mt-4">
                          <button
                            onClick={() => closePosition(aggPos.positions[0].id)}
                            className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-red-500/50 flex items-center gap-2"
                          >
                            <span>Close All for {formatUSDT(currentValue)}</span>
                            <span className={`text-sm ${pnl >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                              ({pnl >= 0 ? '+' : ''}{formatUSDT(pnl)})
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {limitOrders.length > 0 && (
              <div className="mt-8">
                <h2 className="text-2xl font-bold text-white mb-4">Pending Limit Orders</h2>
                <div className="space-y-4">
                  {limitOrders.map(order => {
                    const market = markets.find(m => m.id === order.marketId);
                    return (
                      <div key={order.id} className="bg-black bg-opacity-40 backdrop-blur-md rounded-xl p-6 border border-yellow-500 border-opacity-30">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white mb-2">{order.marketTitle}</h3>
                            <div className="flex items-center gap-2 mb-3">
                              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${order.outcome === 'yes' ? 'bg-green-500 bg-opacity-20 text-green-300' : 'bg-red-500 bg-opacity-20 text-red-300'}`}>
                                {order.outcome.toUpperCase()}
                              </span>
                              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-yellow-500 bg-opacity-20 text-yellow-300">
                                {order.status.toUpperCase()}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-purple-400 mb-1">Order Amount</p>
                                <p className="text-white font-semibold">{formatUSDT(order.amount)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-purple-400 mb-1">Target Price</p>
                                <p className="text-white font-semibold">${order.targetPrice.toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => setLimitOrders(prev => prev.filter(o => o.id !== order.id))}
                            className="px-4 py-2 bg-red-500 bg-opacity-20 hover:bg-opacity-30 text-red-300 rounded-lg font-medium transition-all text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
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
                    <div className="mb-4 h-20">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={market.priceHistory}>
                          <defs>
                            <linearGradient id={`gradient-${market.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
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
      {selectedMarket && (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-purple-500 border-opacity-30">
            <h2 className="text-xl font-bold text-white mb-4">Place Your Trade</h2>
            <p className="text-purple-200 mb-4 text-sm">{selectedMarket.title}</p>
            <div className="bg-black bg-opacity-30 rounded-lg p-3 mb-4 border border-purple-500 border-opacity-20">
              <div className="flex items-center gap-2 text-xs text-purple-300 mb-1">
                <span>Contract:</span>
                <span className="font-mono">{selectedMarket.contractAddress}</span>
                <a href={`https://polygonscan.com/address/${selectedMarket.contractAddress}`} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
            <div className="flex gap-2 mb-4">
              <button onClick={() => setBetType('yes')} className={`flex-1 py-3 rounded-lg font-semibold transition-all ${betType === 'yes' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg' : 'bg-green-500 bg-opacity-20 text-green-300 hover:bg-opacity-30'}`}>
                Yes ${selectedMarket.yesPrice.toFixed(2)}
              </button>
              <button onClick={() => setBetType('no')} className={`flex-1 py-3 rounded-lg font-semibold transition-all ${betType === 'no' ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg' : 'bg-red-500 bg-opacity-20 text-red-300 hover:bg-opacity-30'}`}>
                No ${selectedMarket.noPrice.toFixed(2)}
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-purple-300 mb-2">Amount (USDT)</label>
              <div className="relative">
                <input type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} placeholder="Enter amount" className="w-full px-4 py-3 pr-20 bg-black bg-opacity-30 border border-purple-500 border-opacity-30 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-purple-500" min="1" max={usdtBalance} step="0.01" />
                <button
                  onClick={() => {
                    // Calculate max affordable amount accounting for fees
                    // Max = available balance (fees already deducted from what we can invest)
                    const maxAmount = Math.floor(usdtBalance * 100) / 100; // Round down to 2 decimals
                    setBetAmount(maxAmount.toString());
                  }}
                  className="absolute right-12 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs font-semibold rounded transition-all"
                >
                  Max
                </button>
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xl">💵</span>
              </div>
              <p className="text-sm text-purple-400 mt-2">Available: {formatUSDT(usdtBalance)}</p>
            </div>
            {betAmount && (() => {
              const slippage = calculateSlippageDetails();
              const amount = parseFloat(betAmount);
              const shares = slippage ? slippage.shares : 0;
              const avgPrice = slippage ? slippage.avgPrice : 0;
              const slippagePercent = slippage ? slippage.slippagePercent : 0;

              return (
              <div className="bg-black bg-opacity-30 rounded-lg p-4 mb-4 border border-purple-500 border-opacity-20">
                {slippagePercent > 1 && (
                  <div className="bg-yellow-500 bg-opacity-20 border border-yellow-500 border-opacity-30 rounded-lg px-4 py-2 mb-4 flex items-center gap-2">
                    <AlertCircle className="text-yellow-400" size={18} />
                    <div className="flex-1">
                      <p className="text-sm text-yellow-300 font-semibold">Large Order Detected</p>
                      <p className="text-xs text-yellow-400">
                        Avg price: ${avgPrice.toFixed(4)} ({slippagePercent.toFixed(2)}% slippage)
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-between text-sm mb-2">
                  <span className="text-purple-300">You pay:</span>
                  <span className="font-semibold text-white">{formatUSDT(amount)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-purple-300">Platform fee ({FEE_PERCENTAGE}%):</span>
                  <span className="font-semibold text-yellow-400">-{formatUSDT(amount * (FEE_PERCENTAGE / 100))}</span>
                </div>
                <div className="flex justify-between text-sm mb-2 pb-2 border-b border-purple-500 border-opacity-20">
                  <span className="text-purple-300">Invested:</span>
                  <span className="font-semibold text-white">{formatUSDT(amount * (1 - FEE_PERCENTAGE / 100))}</span>
                </div>

                <div className="flex justify-between text-sm mb-2">
                  <span className="text-purple-300">Shares to receive:</span>
                  <span className="font-semibold text-white">{shares.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-purple-300">Avg price per share:</span>
                  <span className="font-semibold text-white">${avgPrice.toFixed(4)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-purple-300">Max payout if wins:</span>
                  <span className="font-semibold text-green-400">{formatUSDT(shares)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-purple-300">Max profit:</span>
                  <span className="font-semibold text-green-400">
                    {formatUSDT(Math.max(0, shares - amount))}
                  </span>
                </div>
              </div>
              );
            })()}
            {txStatus === 'pending' && (
              <div className="bg-yellow-500 bg-opacity-20 border border-yellow-500 border-opacity-30 rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-400 border-t-transparent"></div>
                <span className="text-yellow-300 text-sm">Transaction pending...</span>
              </div>
            )}
            {txStatus === 'success' && (
              <div className="bg-green-500 bg-opacity-20 border border-green-500 border-opacity-30 rounded-lg px-4 py-3 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="text-green-400" size={20} />
                  <span className="text-green-300 text-sm font-semibold">Transaction successful!</span>
                </div>
                <a href={`https://polygonscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                  View on PolygonScan <ExternalLink size={12} />
                </a>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setSelectedMarket(null); setBetAmount(''); setTxStatus(''); setTxHash(''); }} className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors">
                Cancel
              </button>
              <button onClick={placeBet} disabled={!betAmount || parseFloat(betAmount) <= 0 || parseFloat(betAmount) > usdtBalance || txStatus === 'pending'} className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg">
                {txStatus === 'pending' ? 'Processing...' : 'Confirm Trade'}
              </button>
            </div>
          </div>
        </div>
      )}
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
            <h2 className="text-xl font-bold text-white mb-4">Partial Close - Insufficient Liquidity</h2>

            <div className="bg-red-500 bg-opacity-20 border border-red-500 border-opacity-30 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-300">
                Not enough liquidity to close full position
              </p>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-purple-300">Your shares:</span>
                <span className="text-white font-semibold">{selectedClosePosition.position.shares.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-purple-300">Max closeable:</span>
                <span className="text-white font-semibold">{selectedClosePosition.maxShares.toFixed(2)} shares</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-purple-300">Available liquidity:</span>
                <span className="text-white font-semibold">{formatUSDT(selectedClosePosition.availableLiquidity)}</span>
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
                    // Set to max closeable shares (rounded down to avoid errors)
                    const maxShares = Math.floor(selectedClosePosition.maxShares * 100) / 100;
                    setPartialCloseAmount(maxShares.toString());
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs font-semibold rounded transition-all"
                >
                  Max
                </button>
              </div>
              <p className="text-xs text-purple-400 mt-1">
                Max: {selectedClosePosition.maxShares.toFixed(2)} shares
              </p>
            </div>

            {partialCloseAmount && parseFloat(partialCloseAmount) > 0 && (() => {
              const amount = parseFloat(partialCloseAmount);
              const totalShares = selectedClosePosition.position.shares;
              const percentage = ((amount / totalShares) * 100).toFixed(1);
              const isFull = amount === totalShares;

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
                  partialCloseAmount && parseFloat(partialCloseAmount) === selectedClosePosition.position.shares
                    ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                }`}
              >
                {!partialCloseAmount || parseFloat(partialCloseAmount) <= 0
                  ? 'Close Position'
                  : parseFloat(partialCloseAmount) === selectedClosePosition.position.shares
                  ? 'Close Full Position'
                  : 'Close Partial Position'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCloseConfirmModal && closePositionData && (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-purple-500 border-opacity-30">
            <h2 className="text-xl font-bold text-white mb-4">Close Position</h2>
            <p className="text-purple-200 mb-4 text-sm">{closePositionData.position.marketTitle}</p>

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
      )}
    </div>
  );
}
