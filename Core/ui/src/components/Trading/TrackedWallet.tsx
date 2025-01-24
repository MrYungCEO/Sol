import React, { useState } from 'react';
import { Target, ArrowUpRight, ArrowDownRight, ExternalLink, Play, Pause, Copy, CheckCircle2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import type { WalletGroup } from '../../types/tracked-trades';

interface TrackedWalletProps {
  wallet: WalletGroup;
  onViewTrade: (tradeId: string) => void;
  isTracking: boolean;
  isCopying: boolean;
  onToggleTracking: () => void;
  onToggleCopying: () => void;
  onTrack: (address: string) => void;
}

const TRADES_PER_PAGE = 5;

export const TrackedWallet: React.FC<TrackedWalletProps> = ({
  wallet,
  onViewTrade,
  isTracking,
  isCopying,
  onToggleTracking,
  onToggleCopying,
  onTrack
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<'date_time' | 'profit'>('date_time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const totalPages = Math.ceil(sortedTrades.length / 10);
  const startIndex = (currentPage - 1) * 10;
  const currentTrades = sortedTrades.slice(startIndex, startIndex + 10);

  const handleSort = (field: 'date_time' | 'profit') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleTrack = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/track-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: wallet.address }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to track wallet');
      }

      onTrack(wallet.address);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to track wallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
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
            Showing {startIndex + 1}-{Math.min(startIndex + 10, wallet.trades.length)} of {wallet.trades.length}
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