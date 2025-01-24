import React, { useState } from 'react';
import { Target, ArrowUpRight, ArrowDownRight, ExternalLink, Play, Pause, Copy, CheckCircle2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import type { WalletGroup } from '../../types/tracked-trades';

interface TrackedWalletProps {
  wallet: WalletGroup;
  onViewTrade: (tradeId: string) => void;
  isTracking: boolean;
  isCopying: boolean;
  onToggleTracking: () => void;
  onToggleCopying: () => void;
}

const TRADES_PER_PAGE = 5;

export const TrackedWallet: React.FC<TrackedWalletProps> = ({
  wallet,
  onViewTrade,
  isTracking,
  isCopying,
  onToggleTracking,
  onToggleCopying
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<'date_time' | 'profit'>('date_time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Sort trades
  const sortedTrades = [...wallet.trades].sort((a, b) => {
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

  const totalPages = Math.ceil(sortedTrades.length / TRADES_PER_PAGE);
  const startIndex = (currentPage - 1) * TRADES_PER_PAGE;
  const currentTrades = sortedTrades.slice(startIndex, startIndex + TRADES_PER_PAGE);

  const handleSort = (field: 'date_time' | 'profit') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl border border-gray-800/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]">
      <div className="p-6 border-b border-gray-800/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Target className="text-blue-400" size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-white">{wallet.name}</h3>
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-gray-400">{wallet.address}</span>
                <a 
                  href={`https://solscan.io/account/${wallet.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                isTracking 
                  ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' 
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              onClick={onToggleTracking}
              title={isTracking ? 'Stop Tracking' : 'Start Tracking'}
            >
              {isTracking ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button 
              className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                isCopying
                  ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              onClick={onToggleCopying}
              title={isCopying ? 'Stop Copying' : 'Start Copying'}
            >
              {isCopying ? <CheckCircle2 size={20} /> : <Copy size={20} />}
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-sm text-gray-400">Success Rate</div>
            <div className="text-white font-semibold">{wallet.winRate.toFixed(1)}%</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-sm text-gray-400">Total Profit</div>
            <div className={`font-semibold ${wallet.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {wallet.totalProfit >= 0 ? '+' : ''}{wallet.totalProfit.toFixed(4)} SOL
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-sm text-gray-400">Total Trades</div>
            <div className="text-white font-semibold">{wallet.totalTrades}</div>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-sm text-gray-400 hover:text-white transition-colors mb-3"
        >
          <span>Trades ({wallet.trades.length})</span>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        <div className={`transition-all duration-300 ${isExpanded ? 'block' : 'hidden'}`}>
          {/* Sort Controls */}
          <div className="flex items-center justify-between mb-4 text-sm">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => handleSort('date_time')}
                className={`flex items-center space-x-1 ${
                  sortField === 'date_time' ? 'text-blue-400' : 'text-gray-400'
                } hover:text-white transition-colors`}
              >
                <span>Date</span>
                {sortField === 'date_time' && (
                  <span>{sortDirection === 'desc' ? '↓' : '↑'}</span>
                )}
              </button>
              <button 
                onClick={() => handleSort('profit')}
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
          <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {currentTrades.map((trade) => (
              <div 
                key={trade.id}
                className="bg-gray-800/50 backdrop-blur-xl rounded-lg p-4 cursor-pointer hover:bg-gray-800/70 transition-all duration-300"
                onClick={() => onViewTrade(trade.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Target className="text-blue-400" size={18} />
                    </div>
                    <div>
                      <div className="font-medium text-white">{trade.token_address.slice(0, 8)}...</div>
                      <div className="flex items-center space-x-2 text-sm">
                        <span className={`flex items-center ${
                          trade.type === 'buy' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {trade.type === 'buy' ? (
                            <ArrowUpRight size={14} className="mr-1" />
                          ) : (
                            <ArrowDownRight size={14} className="mr-1" />
                          )}
                          {trade.type.toUpperCase()}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-400">
                          {new Date(trade.date_time).toLocaleString()}
                        </span>
                        <a 
                          href={trade.transaction_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(4)} SOL
                    </div>
                    <div className="text-sm text-gray-400">
                      {trade.token_amount.toFixed(4)} tokens
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div className="bg-gray-900/30 rounded-lg p-2">
                    <div className="text-xs text-gray-400">Buy Price</div>
                    <div className="text-sm text-white">{trade.buy_price.toFixed(8)} SOL</div>
                  </div>
                  <div className="bg-gray-900/30 rounded-lg p-2">
                    <div className="text-xs text-gray-400">Current Price</div>
                    <div className="text-sm text-white">{trade.current_price.toFixed(8)} SOL</div>
                  </div>
                  <div className="bg-gray-900/30 rounded-lg p-2">
                    <div className="text-xs text-gray-400">Status</div>
                    <div className="text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        trade.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {trade.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800/50">
              <div className="text-sm text-gray-400">
                Showing {startIndex + 1}-{Math.min(startIndex + TRADES_PER_PAGE, wallet.trades.length)} of {wallet.trades.length}
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
      </div>
    </div>
  );
};