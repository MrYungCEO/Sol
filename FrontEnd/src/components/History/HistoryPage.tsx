import React, { useState } from 'react';
import { BarChart3, Calendar, ArrowUpRight, ArrowDownRight, ExternalLink, Filter, TrendingUp, DollarSign, Clock, Percent, RefreshCw, Loader } from 'lucide-react';
import { useTrades } from '../../hooks/useTrades';
import { useNotification } from '../../contexts/NotificationContext';

export const HistoryPage: React.FC = () => {
  const { addNotification } = useNotification();
  const { trades, totalProfit, winRate, loading, error, refreshTrades } = useTrades();
  const [timeFilter, setTimeFilter] = useState<'all' | 'day' | 'week' | 'month'>('all');
  const [sortField, setSortField] = useState<'date_time' | 'profit'>('date_time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [refreshing, setRefreshing] = useState(false);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  // Calculate additional statistics
  const totalTrades = trades.length;
  const successfulTrades = trades.filter(trade => trade.result === 'success').length;
  const failedTrades = trades.filter(trade => trade.result === 'failed').length;
  const averageProfit = totalProfit / totalTrades;
  const largestProfit = Math.max(...trades.map(t => t.profit));
  const largestLoss = Math.min(...trades.map(t => t.profit));
  const totalVolume = trades.reduce((sum, t) => sum + t.amount_in_sol, 0);

  const handleRefresh = async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      await refreshTrades();
      addNotification('Trade data refreshed successfully', 'success');
    } catch (error) {
      addNotification('Failed to refresh trade data', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  // Filter trades by time
  const filteredTrades = trades.filter(trade => {
    if (timeFilter === 'all') return true;
    const tradeDate = new Date(trade.date_time);
    const now = new Date();
    switch (timeFilter) {
      case 'day':
        return tradeDate >= new Date(now.setDate(now.getDate() - 1));
      case 'week':
        return tradeDate >= new Date(now.setDate(now.getDate() - 7));
      case 'month':
        return tradeDate >= new Date(now.setMonth(now.getMonth() - 1));
      default:
        return true;
    }
  });

  // Sort trades
  const sortedTrades = [...filteredTrades].sort((a, b) => {
    if (sortField === 'date_time') {
      return sortDirection === 'desc'
        ? new Date(b.date_time).getTime() - new Date(a.date_time).getTime()
        : new Date(a.date_time).getTime() - new Date(b.date_time).getTime();
    } else {
      return sortDirection === 'desc'
        ? b.profit - a.profit
        : a.profit - b.profit;
    }
  });

  return (
    <div className="flex-1 p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Trade History</h1>
          <p className="text-gray-400 mt-1">View and analyze your trading performance</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-4 border border-gray-800/50">
            <div className="flex items-center space-x-6">
              <div>
                <div className="text-gray-400 text-sm">Total Profit</div>
                <div className={`text-xl font-semibold ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(4)} SOL
                </div>
              </div>
              <div className="h-8 w-px bg-gray-800/50"></div>
              <div>
                <div className="text-gray-400 text-sm">Win Rate</div>
                <div className="text-white font-semibold">{winRate.toFixed(1)}%</div>
              </div>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl flex items-center space-x-2 transition-colors disabled:opacity-50"
          >
            {refreshing ? (
              <>
                <Loader size={20} className="animate-spin" />
                <span>Refreshing...</span>
              </>
            ) : (
              <>
                <RefreshCw size={20} />
                <span>Refresh Data</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {[
          { 
            label: 'Total Volume',
            value: `${totalVolume.toFixed(2)} SOL`,
            icon: BarChart3,
            color: 'blue'
          },
          { 
            label: 'Largest Profit',
            value: `${largestProfit.toFixed(4)} SOL`,
            icon: TrendingUp,
            color: 'green'
          },
          { 
            label: 'Largest Loss',
            value: `${largestLoss.toFixed(4)} SOL`,
            icon: TrendingUp,
            color: 'red'
          },
          { 
            label: 'Average Profit',
            value: `${averageProfit.toFixed(4)} SOL`,
            icon: DollarSign,
            color: averageProfit >= 0 ? 'green' : 'red'
          },
        ].map((stat, index) => (
          <div key={index} className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800/50">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-400">{stat.label}</div>
              <div className={`p-2 bg-${stat.color}-500/10 rounded-lg`}>
                <stat.icon className={`text-${stat.color}-400`} size={20} />
              </div>
            </div>
            <div className={`text-xl font-semibold ${
              stat.color === 'green' ? 'text-green-400' : 
              stat.color === 'red' ? 'text-red-400' : 
              stat.color === 'blue' ? 'text-blue-400' : 'text-white'
            }`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800/50">
          <h3 className="text-lg font-semibold text-white mb-4">Trade Distribution</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Successful Trades</span>
              <span className="text-green-400">{successfulTrades}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Failed Trades</span>
              <span className="text-red-400">{failedTrades}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Total Trades</span>
              <span className="text-white">{totalTrades}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800/50">
          <h3 className="text-lg font-semibold text-white mb-4">Success Metrics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Win Rate</span>
              <span className="text-blue-400">{winRate.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Average Hold Time</span>
              <span className="text-white">2.5 days</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Risk/Reward Ratio</span>
              <span className="text-white">1.5</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800/50">
          <h3 className="text-lg font-semibold text-white mb-4">Profit Analysis</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Average Win</span>
              <span className="text-green-400">+2.34 SOL</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Average Loss</span>
              <span className="text-red-400">-0.89 SOL</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Profit Factor</span>
              <span className="text-white">2.63</span>
            </div>
          </div>
        </div>
      </div>

      {/* Trade History */}
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl border border-gray-800/50">
        <div className="p-6 border-b border-gray-800/50">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Trade History</h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-gray-800/50 rounded-lg p-1">
                {(['all', 'day', 'week', 'month'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTimeFilter(filter)}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      timeFilter === filter
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
              <button className="p-2 rounded-lg bg-gray-800/50 text-gray-400 hover:text-white transition-colors">
                <Filter size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-4 text-sm text-gray-400 font-medium mb-4">
            <button 
              className="flex items-center space-x-1 hover:text-white transition-colors"
              onClick={() => {
                if (sortField === 'date_time') {
                  setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortField('date_time');
                  setSortDirection('desc');
                }
              }}
            >
              <Calendar size={16} />
              <span>Date/Time</span>
              {sortField === 'date_time' && (
                <span className="text-blue-400">
                  {sortDirection === 'desc' ? '↓' : '↑'}
                </span>
              )}
            </button>
            <div>Token</div>
            <div>Type</div>
            <div>Amount</div>
            <button
              className="flex items-center space-x-1 hover:text-white transition-colors"
              onClick={() => {
                if (sortField === 'profit') {
                  setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortField('profit');
                  setSortDirection('desc');
                }
              }}
            >
              <span>Profit</span>
              {sortField === 'profit' && (
                <span className="text-blue-400">
                  {sortDirection === 'desc' ? '↓' : '↑'}
                </span>
              )}
            </button>
            <div>Status</div>
            <div>Transaction</div>
          </div>

          <div className="space-y-2">
            {sortedTrades.map((trade) => (
              <div 
                key={trade.id}
                className="grid grid-cols-7 gap-4 p-4 bg-gray-800/50 rounded-lg items-center"
              >
                <div className="text-sm">
                  <div className="text-white">
                    {new Date(trade.date_time).toLocaleDateString()}
                  </div>
                  <div className="text-gray-400">
                    {new Date(trade.date_time).toLocaleTimeString()}
                  </div>
                </div>
                <div className="text-white font-medium">
                  {trade.token_address.slice(0, 6)}...
                </div>
                <div className={`flex items-center ${
                  trade.status === 'active' ? 'text-green-400' : 'text-blue-400'
                }`}>
                  {trade.status === 'active' ? (
                    <ArrowUpRight size={16} className="mr-1" />
                  ) : (
                    <ArrowDownRight size={16} className="mr-1" />
                  )}
                  BUY
                </div>
                <div className="text-white">
                  {trade.token_amount.toFixed(4)}
                  <div className="text-sm text-gray-400">
                    {trade.amount_in_sol.toFixed(4)} SOL
                  </div>
                </div>
                <div className={`${trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(4)} SOL
                  <div className="text-sm">
                    ({trade.profit_percentage.toFixed(2)}%)
                  </div>
                </div>
                <div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    trade.result === 'success'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {trade.result.toUpperCase()}
                  </span>
                </div>
                <div>
                  <a
                    href={trade.transaction_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <ExternalLink size={16} className="mr-1" />
                    View
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};