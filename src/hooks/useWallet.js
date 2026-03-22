import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, NETWORK_CONFIG, FACTORY_ABI, MARKET_ABI, USDT_ABI } from '../config/contracts';

const POLYGON_CHAIN_ID = NETWORK_CONFIG.chainId; // Polygon Amoy Testnet

export const useWallet = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);
  const [balance, setBalance] = useState(0);
  const [isPolygon, setIsPolygon] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contracts, setContracts] = useState({
    factory: null,
    usdt: null
  });

  const isMobile = useCallback(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);

  const isIPhone = useCallback(() => {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }, []);

  const isSafari = useCallback(() => {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  }, []);

  const isDesktop = useCallback(() => {
    return !/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }, []);

  const getBrowserType = useCallback(() => {
    if (isIPhone()) return 'iphone';
    if (isSafari() && isDesktop()) return 'safari-desktop';
    if (isDesktop()) return 'desktop';
    return 'mobile';
  }, [isIPhone, isSafari, isDesktop]);

  // Wait for MetaMask to inject window.ethereum
  const waitForMetaMask = useCallback(async (maxAttempts = 10, delayMs = 100) => {
    for (let i = 0; i < maxAttempts; i++) {
      if (typeof window.ethereum !== 'undefined') {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    return false;
  }, []);

  const switchToPolygon = useCallback(async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: POLYGON_CHAIN_ID }],
      });
      setIsPolygon(true);
      setError('');
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: POLYGON_CHAIN_ID,
              chainName: NETWORK_CONFIG.chainName,
              nativeCurrency: NETWORK_CONFIG.nativeCurrency,
              rpcUrls: NETWORK_CONFIG.rpcUrls,
              blockExplorerUrls: NETWORK_CONFIG.blockExplorerUrls
            }]
          });
          setIsPolygon(true);
          setError('');
        } catch (addError) {
          setError('Failed to add Polygon Amoy network');
        }
      }
    }
  }, []);

  const connect = useCallback(async () => {
    setLoading(true);
    setError('');

    // Wait for MetaMask to inject window.ethereum (up to 1 second)
    const isMetaMaskAvailable = await waitForMetaMask();

    // Check if on mobile and MetaMask is not injected after waiting
    if (isMobile() && !isMetaMaskAvailable) {
      // Deep link to MetaMask app with current URL
      const currentUrl = window.location.href;
      const metamaskDeepLink = `https://metamask.app.link/dapp/${currentUrl.replace(/^https?:\/\//, '')}`;

      // Open MetaMask app
      window.location.href = metamaskDeepLink;
      setLoading(false);
      return;
    }

    if (!isMetaMaskAvailable) {
      setError('metamask-required');
      setLoading(false);
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });

      if (chainId !== POLYGON_CHAIN_ID) {
        setError('Please switch to Polygon network');
        setIsPolygon(false);
        await switchToPolygon();
      } else {
        setIsPolygon(true);
        setError('');
      }

      setWalletAddress(accounts[0]);
      setWalletConnected(true);

      // Initialize ethers provider and signer
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const web3Signer = await web3Provider.getSigner();

      setProvider(web3Provider);
      setSigner(web3Signer);

      // Initialize contracts
      const factoryContract = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, web3Signer);
      const usdtContract = new ethers.Contract(CONTRACTS.USDT, USDT_ABI, web3Signer);

      setContracts({
        factory: factoryContract,
        usdt: usdtContract
      });

      // Get real USDT balance
      try {
        console.log('🔍 Fetching USDT balance...');
        console.log('Address:', accounts[0]);
        console.log('USDT Contract:', CONTRACTS.USDT);

        const usdtBalance = await usdtContract.balanceOf(accounts[0]);
        console.log('Raw balance:', usdtBalance.toString());

        const formattedBalance = parseFloat(ethers.formatUnits(usdtBalance, 6));
        console.log('Formatted balance:', formattedBalance, 'USDT');

        setBalance(formattedBalance);
      } catch (err) {
        console.error('❌ Error fetching USDT balance:', err);
        console.error('Error message:', err.message);
        setBalance(0);
      }
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError('Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  }, [isMobile, switchToPolygon, waitForMetaMask]);

  const refreshBalance = useCallback(async () => {
    if (!walletAddress || !contracts.usdt) {
      console.log('⏸ Cannot refresh balance: wallet not connected or contract not initialized');
      return;
    }

    try {
      console.log('🔄 Refreshing USDT balance...');
      console.log('Address:', walletAddress);
      console.log('USDT Contract:', CONTRACTS.USDT);

      const usdtBalance = await contracts.usdt.balanceOf(walletAddress);
      console.log('Raw balance:', usdtBalance.toString());

      const formattedBalance = parseFloat(ethers.formatUnits(usdtBalance, 6));
      console.log('Formatted balance:', formattedBalance, 'USDT');

      setBalance(formattedBalance);
      console.log('✅ Balance refreshed successfully!');
    } catch (err) {
      console.error('❌ Error refreshing USDT balance:', err);
      console.error('Error message:', err.message);
    }
  }, [walletAddress, contracts.usdt]);

  const disconnect = useCallback(() => {
    setWalletAddress('');
    setWalletConnected(false);
    setBalance(0);
    setIsPolygon(false);
    setError('');
    setProvider(null);
    setSigner(null);
    setContracts({ factory: null, usdt: null });
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = async (accounts) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          setWalletAddress(accounts[0]);
          // Refresh balance when account changes
          if (contracts.usdt) {
            try {
              const usdtBalance = await contracts.usdt.balanceOf(accounts[0]);
              const formattedBalance = parseFloat(ethers.formatUnits(usdtBalance, 6));
              setBalance(formattedBalance);
              console.log('✅ Balance updated for new account:', formattedBalance, 'USDT');
            } catch (err) {
              console.error('Error fetching balance for new account:', err);
            }
          }
        }
      };

      const handleChainChanged = (chainId) => {
        setIsPolygon(chainId === POLYGON_CHAIN_ID);
        if (chainId !== POLYGON_CHAIN_ID) {
          setError('Please switch to Polygon network');
        } else {
          setError('');
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [disconnect, contracts.usdt]);

  // Helper to get market contract
  const getMarketContract = useCallback((address, withSigner = true) => {
    try {
      if (withSigner && signer) {
        return new ethers.Contract(address, MARKET_ABI, signer);
      } else if (provider) {
        return new ethers.Contract(address, MARKET_ABI, provider);
      }
      return null;
    } catch (error) {
      console.error('Error getting market contract:', error);
      return null;
    }
  }, [signer, provider]);

  return {
    walletAddress,
    walletConnected,
    balance,
    setBalance,
    refreshBalance,
    isPolygon,
    error,
    setError,
    loading,
    connect,
    disconnect,
    switchToPolygon,
    isConnected: walletConnected,
    isMobile,
    isIPhone,
    isSafari,
    isDesktop,
    getBrowserType,
    provider,
    signer,
    contracts,
    getMarketContract,
  };
};
