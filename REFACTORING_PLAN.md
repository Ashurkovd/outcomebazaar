# OutcomeBazaar Refactoring Plan

## Overview
This document outlines a comprehensive, incremental refactoring plan for OutcomeBazaar to improve code quality, maintainability, and scalability while maintaining production stability.

**Current State:** ~2000 lines in App.js, working production app
**Goal:** Well-structured, maintainable codebase with best practices

---

## Phase 1: Foundation & Design System (Week 1)

### 1.1 Create Design System
**File:** `src/theme/designSystem.js`

```javascript
// Design tokens for consistent styling
export const colors = {
  primary: {
    purple: '#9333ea',
    pink: '#ec4899',
    indigo: '#4f46e5',
  },
  status: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  neutral: {
    black: '#000000',
    gray: {
      100: '#f3f4f6',
      200: '#e5e7eb',
      700: '#374151',
      900: '#111827',
    },
    white: '#ffffff',
  },
  market: {
    yes: '#10b981',
    no: '#ef4444',
  },
};

export const spacing = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '1rem',       // 16px
  lg: '1.5rem',     // 24px
  xl: '2rem',       // 32px
  '2xl': '3rem',    // 48px
};

export const breakpoints = {
  mobile: '375px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1280px',
};

export const typography = {
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
};

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  purple: '0 10px 30px rgba(147, 51, 234, 0.3)',
};

export const borderRadius = {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  full: '9999px',
};
```

**Benefits:**
- Consistent styling across all components
- Easy theme changes (light/dark mode future)
- Centralized design decisions
- Better maintainability

---

## Phase 2: State Management (Week 2)

### 2.1 Install State Management Library
```bash
npm install zustand
```

### 2.2 Create Store Structure
**File:** `src/store/useAppStore.js`

```javascript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export const useAppStore = create(
  devtools(
    persist(
      (set, get) => ({
        // Wallet State
        walletConnected: false,
        walletAddress: '',
        chainId: '',
        isPolygon: false,

        // User State
        usdtBalance: 1000,
        realizedPnL: 0,
        userPositions: [],

        // Market State
        markets: [],
        selectedMarket: null,
        selectedCategory: 'All',
        searchTerm: '',

        // Actions
        setWalletConnected: (connected) => set({ walletConnected: connected }),
        setWalletAddress: (address) => set({ walletAddress: address }),
        setUserPositions: (positions) => set({ userPositions: positions }),
        addPosition: (position) => set((state) => ({
          userPositions: [...state.userPositions, position]
        })),
        removePosition: (positionId) => set((state) => ({
          userPositions: state.userPositions.filter(p => p.id !== positionId)
        })),

        // Reset
        reset: () => set({
          walletConnected: false,
          walletAddress: '',
          userPositions: [],
          realizedPnL: 0,
        }),
      }),
      {
        name: 'outcomebazaar-storage',
        partialize: (state) => ({
          // Only persist certain fields
          userPositions: state.userPositions,
          realizedPnL: state.realizedPnL,
        }),
      }
    )
  )
);
```

**Files to create:**
- `src/store/useWalletStore.js` - Wallet-specific state
- `src/store/useMarketStore.js` - Market-specific state
- `src/store/useUIStore.js` - UI state (modals, notifications)

**Benefits:**
- Separation of concerns
- Easier testing
- Better performance (selective re-renders)
- DevTools integration
- Persistence out of the box

---

## Phase 3: Custom Hooks (Week 2-3)

### 3.1 Wallet Hook
**File:** `src/hooks/useWallet.js`

```javascript
import { useState, useEffect, useCallback } from 'react';
import { useWalletStore } from '../store/useWalletStore';

export const useWallet = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    walletConnected,
    walletAddress,
    chainId,
    isPolygon,
    setWalletConnected,
    setWalletAddress,
    setChainId,
    setIsPolygon,
  } = useWalletStore();

  const isMobile = useCallback(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }, []);

  const connectWallet = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Mobile deep link logic
      if (isMobile() && typeof window.ethereum === 'undefined') {
        const currentUrl = window.location.href;
        const metamaskDeepLink = `https://metamask.app.link/dapp/${currentUrl.replace(/^https?:\/\//, '')}`;
        window.location.href = metamaskDeepLink;
        return;
      }

      if (typeof window.ethereum === 'undefined') {
        throw new Error('Please install MetaMask to use this dApp');
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      const chainId = await window.ethereum.request({
        method: 'eth_chainId'
      });

      setWalletAddress(accounts[0]);
      setChainId(chainId);
      setIsPolygon(chainId === '0x89');
      setWalletConnected(true);

    } catch (err) {
      setError(err.message);
      console.error('Wallet connection error:', err);
    } finally {
      setLoading(false);
    }
  }, [isMobile, setWalletAddress, setChainId, setIsPolygon, setWalletConnected]);

  const disconnectWallet = useCallback(() => {
    setWalletConnected(false);
    setWalletAddress('');
    setChainId('');
    setIsPolygon(false);
  }, [setWalletConnected, setWalletAddress, setChainId, setIsPolygon]);

  const switchToPolygon = useCallback(async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x89' }],
      });
    } catch (error) {
      if (error.code === 4902) {
        // Chain not added, add it
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x89',
            chainName: 'Polygon Mainnet',
            nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
            rpcUrls: ['https://polygon-rpc.com/'],
            blockExplorerUrls: ['https://polygonscan.com/'],
          }],
        });
      }
    }
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        } else {
          disconnectWallet();
        }
      });

      window.ethereum.on('chainChanged', (chainId) => {
        setChainId(chainId);
        setIsPolygon(chainId === '0x89');
      });
    }

    return () => {
      if (typeof window.ethereum !== 'undefined') {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, [setWalletAddress, setChainId, setIsPolygon, disconnectWallet]);

  return {
    walletConnected,
    walletAddress,
    chainId,
    isPolygon,
    loading,
    error,
    connectWallet,
    disconnectWallet,
    switchToPolygon,
  };
};
```

### 3.2 Trading Hook
**File:** `src/hooks/useTrading.js`

```javascript
import { useState, useCallback } from 'react';
import { useMarketStore } from '../store/useMarketStore';
import { useWalletStore } from '../store/useWalletStore';

export const useTrading = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState('');

  const { markets, updateMarket } = useMarketStore();
  const { usdtBalance, setUsdtBalance, addPosition } = useWalletStore();

  const placeTrade = useCallback(async ({
    market,
    outcome,
    amount,
    onSuccess,
    onError,
  }) => {
    setLoading(true);
    setError(null);

    try {
      // Validation
      if (amount <= 0 || amount > usdtBalance) {
        throw new Error('Invalid amount or insufficient balance');
      }

      // Mock transaction
      const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64);

      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Calculate trade details
      const fee = amount * 0.02;
      const netAmount = amount - fee;
      const price = outcome === 'yes' ? market.yesPrice : market.noPrice;
      const shares = netAmount / price;

      // Update balance
      setUsdtBalance(usdtBalance - amount);

      // Create position
      const position = {
        id: Date.now(),
        marketId: market.id,
        marketTitle: market.title,
        outcome,
        shares,
        avgPrice: price,
        invested: netAmount,
        totalPaid: amount,
        timestamp: new Date().toISOString(),
      };

      addPosition(position);
      setTxHash(mockTxHash);

      if (onSuccess) {
        onSuccess({ position, txHash: mockTxHash });
      }

      return { success: true, position, txHash: mockTxHash };

    } catch (err) {
      setError(err.message);
      if (onError) {
        onError(err);
      }
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [usdtBalance, setUsdtBalance, addPosition]);

  return {
    loading,
    error,
    txHash,
    placeTrade,
  };
};
```

**Other hooks to create:**
- `src/hooks/useMarkets.js` - Market fetching and filtering
- `src/hooks/usePositions.js` - Position management
- `src/hooks/useResponsive.js` - Responsive utilities

---

## Phase 4: Component Library (Week 3-4)

### 4.1 Base Components

**File:** `src/components/ui/Button.jsx`
```javascript
import React from 'react';
import { colors, spacing, borderRadius } from '../../theme/designSystem';

const variants = {
  primary: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white',
  secondary: 'bg-gray-700 hover:bg-gray-600 text-white',
  success: 'bg-green-500 hover:bg-green-600 text-white',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
  ghost: 'bg-transparent hover:bg-gray-800 text-purple-300',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg',
};

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  ...props
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        rounded-lg font-medium transition-all
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};
```

**File:** `src/components/ui/Modal.jsx`
```javascript
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className={`
          bg-gradient-to-br from-purple-900 to-indigo-900
          rounded-xl ${sizeClasses[size]} w-full
          shadow-2xl border border-purple-500 border-opacity-30
          flex flex-col max-h-[85vh]
        `}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="p-6 pb-4 flex-shrink-0 flex items-center justify-between">
            {title && <h2 className="text-xl font-bold text-white">{title}</h2>}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-purple-300 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="px-6 overflow-y-auto flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
          {children}
        </div>
      </div>
    </div>
  );
};
```

**Other UI components to create:**
- `Card.jsx` - Reusable card component
- `Input.jsx` - Form input with validation
- `Select.jsx` - Dropdown select
- `Badge.jsx` - Status badges
- `Tabs.jsx` - Tab navigation
- `Toast.jsx` - Notification system

### 4.2 Feature Components

**File:** `src/components/features/MarketCard.jsx`
```javascript
import React from 'react';
import { TrendingUp, Users, Clock } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export const MarketCard = ({ market, onTrade }) => {
  return (
    <Card className="hover:border-purple-400 transition-colors cursor-pointer">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-white flex-1">
            {market.title}
          </h3>
          <Badge variant={market.status}>{market.category}</Badge>
        </div>

        {/* Prices */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-500 bg-opacity-10 border border-green-500 border-opacity-30 rounded-lg p-3">
            <div className="text-xs text-green-300 mb-1">YES</div>
            <div className="text-2xl font-bold text-green-400">
              ${market.yesPrice.toFixed(2)}
            </div>
          </div>
          <div className="bg-red-500 bg-opacity-10 border border-red-500 border-opacity-30 rounded-lg p-3">
            <div className="text-xs text-red-300 mb-1">NO</div>
            <div className="text-2xl font-bold text-red-400">
              ${market.noPrice.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-purple-300">
          <div className="flex items-center gap-1">
            <TrendingUp size={16} />
            <span>{market.totalLiquidity.toLocaleString()} USDT</span>
          </div>
          <div className="flex items-center gap-1">
            <Users size={16} />
            <span>{market.participants}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={16} />
            <span>{new Date(market.endDate).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Trade Button */}
        <Button onClick={() => onTrade(market)} className="w-full">
          Trade
        </Button>
      </div>
    </Card>
  );
};
```

**Other feature components:**
- `WalletButton.jsx` - Wallet connection button
- `TradeModal.jsx` - Trading interface
- `PositionCard.jsx` - Portfolio position display
- `Header.jsx` - App header
- `Navigation.jsx` - Tab navigation

---

## Phase 5: Error Handling (Week 4)

### 5.1 Error Boundary
**File:** `src/components/ErrorBoundary.jsx`

```javascript
import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error tracking service (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-900 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-xl max-w-md w-full p-8 shadow-2xl border border-purple-500 border-opacity-30">
            <h2 className="text-2xl font-bold text-white mb-4">Something went wrong</h2>
            <p className="text-purple-200 mb-6">
              We're sorry, but something unexpected happened. Please refresh the page to try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 5.2 Error Handling Utilities
**File:** `src/utils/errorHandling.js`

```javascript
export class AppError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

export const ErrorCodes = {
  WALLET_NOT_CONNECTED: 'WALLET_NOT_CONNECTED',
  WRONG_NETWORK: 'WRONG_NETWORK',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  MARKET_NOT_FOUND: 'MARKET_NOT_FOUND',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
};

export const handleError = (error) => {
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      details: error.details,
    };
  }

  // MetaMask errors
  if (error.code === 4001) {
    return {
      message: 'Transaction rejected by user',
      code: 'USER_REJECTED',
    };
  }

  // Default
  return {
    message: error.message || 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
  };
};
```

---

## Phase 6: Mobile UX Improvements (Week 5)

### 6.1 Responsive Hook
**File:** `src/hooks/useResponsive.js`

```javascript
import { useState, useEffect } from 'react';

export const useResponsive = () => {
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    isMobile: screenSize.width < 768,
    isTablet: screenSize.width >= 768 && screenSize.width < 1024,
    isDesktop: screenSize.width >= 1024,
    width: screenSize.width,
    height: screenSize.height,
  };
};
```

### 6.2 Mobile-Optimized Components
- Touch-friendly button sizes (min 44x44px)
- Swipe gestures for navigation
- Bottom sheet modals for mobile
- Pull-to-refresh functionality
- Optimized image loading

---

## Phase 7: Testing Strategy

### 7.1 Unit Tests (Jest + React Testing Library)
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

**Example test:**
```javascript
// src/components/ui/__tests__/Button.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables when loading', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### 7.2 Integration Tests
- Test wallet connection flow
- Test trading flow
- Test position management

### 7.3 E2E Tests (Playwright - already installed)
- Complete user journeys
- Mobile testing
- Cross-browser testing

---

## Implementation Timeline

### Week 1: Foundation
- [ ] Create design system
- [ ] Set up Zustand store
- [ ] Create base UI components

### Week 2: Hooks & State
- [ ] Create custom hooks
- [ ] Migrate state to Zustand
- [ ] Test hooks thoroughly

### Week 3: Components
- [ ] Extract feature components
- [ ] Build component library
- [ ] Replace inline components

### Week 4: Error Handling
- [ ] Add error boundaries
- [ ] Implement error utilities
- [ ] Add comprehensive validation

### Week 5: Mobile & Polish
- [ ] Mobile UX improvements
- [ ] Performance optimization
- [ ] Accessibility improvements

### Week 6: Testing & Deploy
- [ ] Write tests
- [ ] Fix bugs found in testing
- [ ] Deploy to production

---

## Migration Strategy

### Incremental Approach
1. **Keep App.js working** - Don't break production
2. **Create new components alongside old code**
3. **Gradually replace sections** - One feature at a time
4. **Test extensively** - After each migration step
5. **Deploy incrementally** - Small, safe deployments

### Example Migration Order
1. Design system (no breaking changes)
2. UI components (Button, Modal, Card)
3. Zustand store (parallel to useState)
4. Custom hooks (extract logic)
5. Feature components (replace sections)
6. Remove old code (final cleanup)

---

## Benefits of Refactoring

### Developer Experience
- ✅ Easier to find and fix bugs
- ✅ Faster feature development
- ✅ Better code reusability
- ✅ Improved onboarding for new developers

### User Experience
- ✅ Faster load times (code splitting)
- ✅ Better mobile experience
- ✅ More consistent UI
- ✅ Fewer bugs

### Maintainability
- ✅ Separation of concerns
- ✅ Testable code
- ✅ Clear architecture
- ✅ Scalable structure

---

## Risks & Mitigation

### Risk: Breaking Production
**Mitigation:**
- Always work in feature branches
- Extensive testing before merge
- Incremental deployments
- Keep old code until new code is proven

### Risk: Time Investment
**Mitigation:**
- Do it incrementally (1-2 hours per week)
- Focus on high-value areas first
- Document as you go

### Risk: Scope Creep
**Mitigation:**
- Stick to the plan
- Resist adding new features during refactor
- Complete one phase before starting next

---

## Next Steps

1. **Review this plan** - Adjust based on priorities
2. **Set up branch** - Create `refactor/design-system` branch
3. **Start Phase 1** - Begin with design system
4. **Regular commits** - Commit after each small change
5. **Test continuously** - Don't let bugs accumulate

---

## Resources

- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Tailwind CSS Best Practices](https://tailwindcss.com/docs/reusing-styles)
- [Component Driven Development](https://www.componentdriven.org/)

---

**Remember:** This is a marathon, not a sprint. Take it one step at a time, and your codebase will gradually transform into a maintainable, scalable application! 🚀
