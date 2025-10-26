import { useState, useEffect, useCallback } from 'react';

const POLYGON_CHAIN_ID = '0x89'; // Polygon Mainnet

export const useWallet = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);
  const [balance, setBalance] = useState(0);
  const [isPolygon, setIsPolygon] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
              chainName: 'Polygon Mainnet',
              nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
              rpcUrls: ['https://polygon-rpc.com/'],
              blockExplorerUrls: ['https://polygonscan.com/']
            }]
          });
          setIsPolygon(true);
          setError('');
        } catch (addError) {
          setError('Failed to add Polygon network');
        }
      }
    }
  }, []);

  const connect = useCallback(async () => {
    setLoading(true);
    setError('');

    // Check if on mobile and MetaMask is not injected
    if (isMobile() && typeof window.ethereum === 'undefined') {
      // Deep link to MetaMask app with current URL
      const currentUrl = window.location.href;
      const metamaskDeepLink = `https://metamask.app.link/dapp/${currentUrl.replace(/^https?:\/\//, '')}`;

      // Open MetaMask app
      window.location.href = metamaskDeepLink;
      setLoading(false);
      return;
    }

    if (typeof window.ethereum === 'undefined') {
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

      // Mock balance for now - can be replaced with actual USDT balance fetching
      const mockBalance = Math.floor(Math.random() * 10000) + 1000;
      setBalance(mockBalance);
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError('Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  }, [isMobile, switchToPolygon]);

  const disconnect = useCallback(() => {
    setWalletAddress('');
    setWalletConnected(false);
    setBalance(0);
    setIsPolygon(false);
    setError('');
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          setWalletAddress(accounts[0]);
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
  }, [disconnect]);

  return {
    walletAddress,
    walletConnected,
    balance,
    setBalance,
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
  };
};
