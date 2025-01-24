import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, ExternalLink, Copy, Loader, ChevronLeft, ChevronRight } from 'lucide-react';
import type { TradeWithStats } from '../../types/trades';
import { v4 as uuidv4 } from 'uuid';

interface TradesListProps {
  trades: TradeWithStats[];
  onViewTrade: (trade: TradeWithStats) => void;
  itemsPerPage?: number;
}

export const TradesList: React.FC<TradesListProps> = ({ 
  trades, 
  onViewTrade,
  itemsPerPage = 5 
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<'timestamp' | 'profit'>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const calculateProfit = (trade: TradeWithStats) => {
    if (!trade.currentPrice || !trade.entryPrice) return { value: 0, formatted: '0.00%' };
    const profitPercentage = ((trade.currentPrice - trade.entryPrice) / trade.entryPrice) * 100;
    return {
      value: profitPercentage,
      formatted: `${profitPercentage >= 0 ? '+' : ''}${profitPercentage.toFixed(2)}%`
    };
  };

  const isValidSignature = (signature: string) => {
    return signature && /^[A-Za-z0-9]{87,88}$/.test(signature);
  };

  const copyToClipboard = async (text: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getTimeSinceUpdate = (lastUpdate: number) => {
    const seconds = Math.floor((Date.now() - lastUpdate) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  if (!trades || trades.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        No trades available
      </div>
    );
  }

  // Sort trades
  const sortedTrades = [...trades].sort((a, b) => {
    if (sortField === 'timestamp') {
      return sortDirection === 'desc'
        ? b.timestamp - a.timestamp
        : a.timestamp - b.timestamp;
    } else {
      const profitA = calculateProfit(a).value;
      const profitB = calculateProfit(b).value;
      return sortDirection === 'desc'
        ? profitB - profitA
        : profitA - profitB;
    }
  });

  // Calculate pagination
  const totalPages = Math.ceil(sortedTrades.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const visibleTrades = sortedTrades.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Sort Controls */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => {
              if (sortField === 'timestamp') {
                setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
              } else {
                setSortField('timestamp');
                setSortDirection('desc');
              }
            }}
            className={`flex items-center space-x-1 ${
              sortField === 'timestamp' ? 'text-blue-400' : 'text-gray-400'
            } hover:text-white transition-colors`}
          >
            <span>Date</span>
            {sortField === 'timestamp' && (
              <span>{sortDirection === 'desc' ? '↓' : '↑'}</span>
            )}
          </button>
          <button 
            onClick={() => {
              if (sortField === 'profit') {
                setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
              } else {
                setSortField('profit');
                setSortDirection('desc');
              }
            }}
            className={`flex items-center space-x-1 ${
              sortField === 'profit' ? 'text-blue-400' : 'text-gray-400'
            } hover:text-white transition-colors`}
          >
            <span>Profit</span>
            {sortField === 'profit' && (
              <span>{sortDirection === 'desc' ? '↓' : '↑'}</span>
            )}
          </button>
        </div>
      </div>

      {/* Trades List */}
      <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
        {visibleTrades.map((trade) => {
          if (!trade || !trade.tokenAddress) return null;

          const profit = calculateProfit(trade);
          const key = `${trade.signature || ''}-${trade.timestamp}-${uuidv4()}`;
          const isBuy = trade.entryPrice > 0;
          const timeSinceUpdate = trade.lastUpdate ? getTimeSinceUpdate(trade.lastUpdate) : '';
          
          return (
            <div
              key={key}
              onClick={() => onViewTrade(trade)}
              className={`relative overflow-hidden bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 cursor-pointer ${
                isBuy 
                  ? 'hover:bg-green-900/10' 
                  : 'hover:bg-red-900/10'
              }`}
            >
              {/* Trade Type Indicator */}
              <div className={`absolute top-0 left-0 w-1 h-full ${
                isBuy ? 'bg-green-500' : 'bg-red-500'
              }`} />

              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      isBuy 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {isBuy ? 'BUY' : 'SELL'}
                    </span>
                    <span className="text-white font-medium">
                      {trade.tokenAddress.slice(0, 8)}...{trade.tokenAddress.slice(-8)}
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => copyToClipboard(trade.tokenAddress, e)}
                        className="p-1 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
                        title="Copy token address"
                      >
                        <Copy size={14} />
                      </button>
                      <a
                        href={`https://solscan.io/token/${trade.tokenAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
                        title="View token on Solscan"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-400 mt-1">
                    <span>{formatTimestamp(trade.timestamp)}</span>
                    {isValidSignature(trade.signature) && (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">•</span>
                        <div className="flex items-center space-x-2">
                          <a
                            href={`https://solscan.io/tx/${trade.signature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <ExternalLink size={14} />
                            <span>View Transaction</span>
                          </a>
                          <button
                            onClick={(e) => copyToClipboard(trade.signature, e)}
                            className="p-1 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
                            title="Copy transaction signature"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className={`flex items-center justify-end space-x-1 ${
                    profit.value >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {profit.value >= 0 ? (
                      <ArrowUpRight size={16} />
                    ) : (
                      <ArrowDownRight size={16} />
                    )}
                    <span className="font-medium">{profit.formatted}</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    Entry: ${trade.entryPrice?.toFixed(6) || '0.000000'}
                  </div>
                  <div className="text-sm text-gray-400 flex items-center justify-end space-x-1">
                    <span>Current: ${trade.currentPrice?.toFixed(6) || '0.000000'}</span>
                    {timeSinceUpdate && (
                      <>
                        <span className="text-xs text-gray-500">({timeSinceUpdate})</span>
                        {Date.now() - (trade.lastUpdate || 0) < 5000 && (
                          <Loader size={12} className="animate-spin text-blue-400" />
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Market Stats */}
              {(trade.volume24h || trade.marketCap) && (
                <div className="mt-3 pt-3 border-t border-gray-700/50 grid grid-cols-2 gap-4">
                  {trade.volume24h && (
                    <div>
                      <div className="text-xs text-gray-400">24h Volume</div>
                      <div className="text-sm text-white">
                        ${trade.volume24h.toLocaleString()}
                      </div>
                    </div>
                  )}
                  {trade.marketCap && (
                    <div>
                      <div className="text-xs text-gray-400">Market Cap</div>
                      <div className="text-sm text-white">
                        ${trade.marketCap.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-800/50">
          <div className="text-sm text-gray-400">
            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, trades.length)} of {trades.length}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg ${
                currentPage === 1
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
              }`}
            >
              <ChevronLeft size={20} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg text-sm ${
                  currentPage === page
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-lg ${
                currentPage === totalPages
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
              }`}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};