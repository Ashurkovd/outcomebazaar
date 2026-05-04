import React, { useState } from 'react';
import { TrendingUp, Search, Plus, BarChart3, PieChart, Activity, RefreshCw, LogOut, User } from 'lucide-react';

const formatBalance = (n) => {
  const num = typeof n === 'number' ? n : parseFloat(n || 0);
  if (Number.isNaN(num)) return '$0.00';
  return `$${num.toFixed(2)}`;
};

const truncateEmail = (email = '') => {
  if (email.length <= 22) return email;
  const [name, domain] = email.split('@');
  if (!domain) return email.slice(0, 22) + '…';
  if (name.length > 12) return name.slice(0, 12) + '…@' + domain;
  return email;
};

export const Header = ({
  user,
  onLogout,
  refreshBalance,
  currentView,
  searchTerm,
  selectedCategory,
  categories,
  setCurrentView,
  setSearchTerm,
  setSelectedCategory,
  setShowCreateMarket,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!refreshBalance || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refreshBalance();
    } finally {
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  const balance = user?.usdt_balance ?? 0;
  const email = user?.email ?? '';

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
              </p>
            </div>
          </button>
          <div className="flex items-center gap-1 sm:gap-3">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-lg flex items-center gap-1 sm:gap-2">
              <span className="text-base sm:text-xl">💵</span>
              <span className="font-semibold text-sm sm:text-base">{formatBalance(balance)}</span>
              {refreshBalance && (
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="ml-1 p-1 hover:bg-white hover:bg-opacity-20 rounded transition-all disabled:opacity-50"
                  title="Refresh balance"
                >
                  <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
              )}
            </div>
            <div className="hidden sm:flex bg-purple-500 bg-opacity-20 backdrop-blur-sm border border-purple-400 border-opacity-30 px-3 py-2 rounded-lg items-center gap-2 max-w-[220px]">
              <User size={14} className="text-purple-300 flex-shrink-0" />
              <span className="text-white text-sm truncate" title={email}>
                {truncateEmail(email)}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="hidden sm:flex px-3 py-2 bg-red-500 bg-opacity-20 hover:bg-opacity-30 text-red-300 rounded-lg transition-all text-sm items-center gap-1.5"
            >
              <LogOut size={14} /> Sign out
            </button>
            <button
              onClick={onLogout}
              className="sm:hidden p-2 bg-red-500 bg-opacity-20 hover:bg-opacity-30 text-red-300 rounded-lg transition-all"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
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
