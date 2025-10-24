import React from 'react';
import { TrendingUp, Wallet, AlertCircle, Search, Plus, BarChart3, PieChart, Activity } from 'lucide-react';

export const Header = ({
  walletConnected,
  walletAddress,
  usdtBalance,
  networkError,
  isPolygon,
  currentView,
  searchTerm,
  selectedCategory,
  categories,
  connectWallet,
  disconnectWallet,
  switchToPolygon,
  setCurrentView,
  setSearchTerm,
  setSelectedCategory,
  setShowCreateMarket,
  formatUSDT,
  formatAddress,
}) => {
  return (
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
  );
};
