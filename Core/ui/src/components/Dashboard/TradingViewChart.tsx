import React from 'react';
import { ArrowUpRight, ArrowDownRight, Rocket, Clock, DollarSign, BarChart2 } from 'lucide-react';
import type { TradeWithStats } from '../../types/trades';

interface TradingViewChartProps {
  trade: TradeWithStats;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({ trade }) => {
  // Calculate profit percentage
  const profitPercentage = ((trade.currentPrice - trade.entryPrice) / trade.entryPrice) * 100;
  const isProfitable = profitPercentage >= 0;

  // Format numbers with fallbacks
  const formatNumber = (value: number | undefined, decimals: number = 2) => {
    if (value === undefined || isNaN(value)) return '0';
    return value.toFixed(decimals);
  };

  // Format currency with fallbacks
  const formatCurrency = (value: number | undefined, decimals: number = 2) => {
    if (value === undefined || isNaN(value)) return '$0';
    return `$${value.toFixed(decimals)}`;
  };

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
      
      {/* Header */}
      <div className="relative px-8 pt-8 pb-6 border-b border-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Rocket className="text-blue-400" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center">
                {trade.tokenAddress.slice(0, 8)}...{trade.tokenAddress.slice(-8)}
                <span className="ml-2 text-sm bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                  Active Trade
                </span>
              </h2>
              <div className="text-gray-400 mt-1 font-medium">
                {new Date(trade.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">Entry Price</div>
              <div className="text-white font-semibold">
                {formatCurrency(trade.entryPrice, 6)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">Current Price</div>
              <div className={`font-semibold ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(trade.currentPrice, 6)}
                <span className="text-sm ml-1">
                  ({isProfitable ? '+' : ''}{formatNumber(profitPercentage)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trade Info Bar */}
      <div className="px-8 py-4 bg-gray-900/30 border-b border-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Clock size={16} className="text-gray-400" />
              <span className="text-gray-400">
                {new Date(trade.timestamp).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <BarChart2 size={16} className="text-gray-400" />
              <span className={`flex items-center ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                {isProfitable ? (
                  <ArrowUpRight size={16} className="mr-1" />
                ) : (
                  <ArrowDownRight size={16} className="mr-1" />
                )}
                {formatNumber(Math.abs(profitPercentage))}%
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button className="px-4 py-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors">
              1H
            </button>
            <button className="px-4 py-2 bg-gray-800/50 text-gray-400 rounded-lg hover:bg-gray-800 transition-colors">
              4H
            </button>
            <button className="px-4 py-2 bg-gray-800/50 text-gray-400 rounded-lg hover:bg-gray-800 transition-colors">
              1D
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-8">
        <div className="relative w-full rounded-xl border border-gray-800/50 overflow-hidden bg-gray-900/30 backdrop-blur-sm" style={{ height: '500px' }}>
          <iframe
            src={`https://www.tradingview.com/chart/?symbol=${trade.tokenAddress}&theme=dark`}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            title={`TradingView Chart - ${trade.tokenAddress}`}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-8 pb-8 grid grid-cols-4 gap-4">
        <div className="bg-gray-900/30 backdrop-blur-sm rounded-xl p-4 border border-gray-800/50">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-400 text-sm">Entry Price</div>
            <DollarSign size={16} className="text-blue-400" />
          </div>
          <div className="text-white font-semibold">
            {formatCurrency(trade.entryPrice, 6)}
          </div>
        </div>
        <div className="bg-gray-900/30 backdrop-blur-sm rounded-xl p-4 border border-gray-800/50">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-400 text-sm">Current Price</div>
            <BarChart2 size={16} className="text-blue-400" />
          </div>
          <div className="text-white font-semibold">
            {formatCurrency(trade.currentPrice, 6)}
          </div>
        </div>
        <div className="bg-gray-900/30 backdrop-blur-sm rounded-xl p-4 border border-gray-800/50">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-400 text-sm">24h Volume</div>
            <BarChart2 size={16} className="text-blue-400" />
          </div>
          <div className="text-white font-semibold">
            {trade.volume24h ? formatCurrency(trade.volume24h) : 'N/A'}
          </div>
        </div>
        <div className="bg-gray-900/30 backdrop-blur-sm rounded-xl p-4 border border-gray-800/50">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-400 text-sm">Market Cap</div>
            <BarChart2 size={16} className="text-blue-400" />
          </div>
          <div className="text-white font-semibold">
            {trade.marketCap ? formatCurrency(trade.marketCap) : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
};