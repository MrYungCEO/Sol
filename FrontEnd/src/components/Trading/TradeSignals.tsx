import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, ExternalLink, Target, Clock, DollarSign, Rocket, AlertCircle, ChevronLeft, ChevronRight, Copy, Loader } from 'lucide-react';
import type { TrackedTrade } from '../../types/tracked-trades';

interface TradeSignalsProps {
  trades: TrackedTrade[];
  onViewTrade: (trade: TrackedTrade) => void;
}

export const TradeSignals: React.FC<TradeSignalsProps> = ({ trades = [], onViewTrade }) => {
  const [sortField, setSortField] = useState<'date_time'>('date_time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [copyingTrade, setCopyingTrade] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 5;

  // Sort trades
  const sortedTrades = [...trades].sort((a, b) => {
    if (!a?.date_time || !b?.date_time) return 0;
    return sortDirection === 'desc'
      ? new Date(b.date_time).getTime() - new Date(a.date_time).getTime()
      : new Date(a.date_time).getTime() - new Date(b.date_time).getTime();
  });

  // Calculate pagination
  const totalPages = Math.ceil(sortedTrades.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const visibleTrades = sortedTrades.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleCopyTrade = async (trade: TrackedTrade, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent trade details modal from opening
    
    if (copyingTrade) return; // Prevent multiple simultaneous copies
    
    setCopyingTrade(trade.id);
    
    try {
      const response = await fetch('http://127.0.0.1:5001/api/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token_address: trade.tokenAddress,
          amount_in_sol: 0.001
        })
      });

      if (!response.ok) {
        throw new Error('Failed to copy trade');
      }

      const data = await response.json();
      console.log('Trade copied:', data);
      
      // Add success notification here if you have a notification system
      
    } catch (error) {
      console.error('Error copying trade:', error);
      // Add error notification here if you have a notification system
    } finally {
      setCopyingTrade(null);
    }
  };

  if (!Array.isArray(trades) || trades.length === 0) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl p-8 border border-gray-700/50 text-center">
        <AlertCircle size={40} className="text-gray-400 mx-auto mb-4" />
        <p className="text-gray-400 text-lg">No trades available</p>
        <p className="text-gray-500 mt-2">Click "Refresh Trades" to view trade history</p>
      </div>
    );
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="space-y-4">
      {/* Sort Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-800/50 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <Clock size={16} />
            <span>Time</span>
            <span className="text-blue-400">{sortDirection === 'desc' ? '↓' : '↑'}</span>
          </button>
        </div>
        <div className="flex items-center space-x-2 px-4 py-2 bg-gray-800/50 rounded-lg text-gray-400">
          <Rocket size={16} className="text-blue-400" />
          <span>Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, trades.length)} of {trades.length}</span>
        </div>
      </div>

      {/* Trades List */}
      <div className="grid grid-cols-1 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
        {visibleTrades.map((trade, index) => {
          if (!trade?.tokenAddress) return null;
          
          const tokenAddressStart = trade.tokenAddress.slice(0, 4);
          const tokenAddressEnd = trade.tokenAddress.slice(-4);
          const isBuy = trade.type === 'buy';
          const isCopying = copyingTrade === trade.id;
          
          return (
            <div
              key={trade.id || trade.signature}
              onClick={() => onViewTrade(trade)}
              className={`relative overflow-hidden bg-gray-800/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 cursor-pointer group ${
                isBuy ? 'hover:bg-green-900/10' : 'hover:bg-red-900/10'
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Trade Type Indicator */}
              <div className={`absolute top-0 left-0 w-1 h-full ${
                isBuy ? 'bg-green-500' : 'bg-red-500'
              }`} />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-xl ${
                    isBuy 
                      ? 'bg-green-500/10 text-green-400 group-hover:bg-green-500/20' 
                      : 'bg-red-500/10 text-red-400 group-hover:bg-red-500/20'
                  } transition-colors`}>
                    {isBuy ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-lg text-white">
                        {tokenAddressStart}...{tokenAddressEnd}
                      </span>
                      <div className="flex items-center space-x-2">
                        <a
                          href={`https://solscan.io/token/${trade.tokenAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
                          title="View token on Solscan"
                        >
                          <ExternalLink size={14} />
                        </a>
                        {trade.transactionLink && (
                          <a
                            href={trade.transactionLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
                            title="View transaction on Solscan"
                          >
                            <Target size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        isBuy 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {trade.type.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-400">
                        {trade.date_time ? formatTimeAgo(trade.date_time) : 'Unknown time'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end space-x-2 mb-1">
                    <DollarSign size={16} className="text-blue-400" />
                    <span className="text-lg font-semibold text-white">
                      {typeof trade.amount_in_sol === 'number' ? trade.amount_in_sol.toFixed(4) : '0.0000'} SOL
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    {typeof trade.tokenAmount === 'number' ? trade.tokenAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }) : '0.00'} tokens
                  </div>
                  {/* Copy Trade Button - Only show for buy trades */}
                  {isBuy && (
                    <button
                      onClick={(e) => handleCopyTrade(trade, e)}
                      disabled={isCopying}
                      className={`mt-2 px-3 py-1.5 rounded-lg text-sm flex items-center space-x-1 transition-colors ${
                        isCopying
                          ? 'bg-blue-500/20 text-blue-400 cursor-not-allowed'
                          : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                      }`}
                    >
                      {isCopying ? (
                        <>
                          <Loader size={14} className="animate-spin" />
                          <span>Copying...</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copy Trade (0.001 SOL)</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* HTML Display */}
              {trade.html && (
                <div 
                  className="mt-3 pt-3 border-t border-gray-700/50"
                  dangerouslySetInnerHTML={{ __html: trade.html }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-800/50">
          <div className="text-sm text-gray-400">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg ${
                currentPage === 1
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
              } transition-colors`}
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
                } transition-colors`}
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
              } transition-colors`}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};