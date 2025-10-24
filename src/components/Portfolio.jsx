import React from 'react';
import { PieChart } from 'lucide-react';

export const Portfolio = ({
  userPositions,
  limitOrders,
  markets,
  FEE_PERCENTAGE,
  formatUSDT,
  calculatePortfolioValue,
  calculateTotalPNL,
  closePosition,
  setCurrentView,
  setLimitOrders,
}) => {
  return (
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
  );
};
