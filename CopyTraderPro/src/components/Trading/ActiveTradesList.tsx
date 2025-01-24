import React, { useState } from 'react';
import { Activity, ArrowUpRight, ExternalLink, Target, DollarSign, Loader, Percent, ChevronLeft, ChevronRight } from 'lucide-react';
import { Modal } from '../Modal/Modal';
import type { TrackedTrade } from '../../types/tracked-trades';

interface ActiveTradesListProps {
  trades: TrackedTrade[];
  onViewTrade: (trade: TrackedTrade) => void;
}

interface PartialSellModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade: TrackedTrade;
  onSell: (amount: number) => Promise<void>;
}

const PartialSellModal: React.FC<PartialSellModalProps> = ({ isOpen, onClose, trade, onSell }) => {
  const [amount, setAmount] = useState('');
  const [percentage, setPercentage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAmountChange = (value: string) => {
    setAmount(value);
    if (value) {
      const newPercentage = ((Number(value) / trade.tokenAmount) * 100).toFixed(2);
      setPercentage(newPercentage);
    } else {
      setPercentage('');
    }
  };

  const handlePercentageChange = (value: string) => {
    setPercentage(value);
    if (value) {
      const newAmount = ((Number(value) / 100) * trade.tokenAmount).toFixed(8);
      setAmount(newAmount);
    } else {
      setAmount('');
    }
  };

  const handleSell = async () => {
    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (Number(amount) > trade.tokenAmount) {
      setError('Amount cannot exceed total token amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSell(Number(amount));
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to sell tokens');
    } finally {
      setLoading(false);
    }
  };

  const presetPercentages = [25, 50, 75, 100];

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-xl font-bold text-white mb-6">Sell Tokens</h2>
        
        <div className="space-y-6">
          {/* Token Info */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Token</span>
              <span className="text-white font-medium">
                {trade.tokenAddress.slice(0, 4)}...{trade.tokenAddress.slice(-4)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Available</span>
              <span className="text-white font-medium">
                {trade.tokenAmount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 8
                })} tokens
              </span>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Amount
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
                className="w-full bg-gray-800/50 rounded-lg px-4 py-3 text-white placeholder-gray-500 border border-gray-700/50 focus:border-blue-500/50 focus:outline-none"
                min="0"
                max={trade.tokenAmount}
                step="0.00000001"
              />
              <button
                onClick={() => handleAmountChange(trade.tokenAmount.toString())}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-blue-400 hover:text-blue-300"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Percentage Input */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Percentage
            </label>
            <div className="relative">
              <input
                type="number"
                value={percentage}
                onChange={(e) => handlePercentageChange(e.target.value)}
                placeholder="0.00"
                className="w-full bg-gray-800/50 rounded-lg px-4 py-3 text-white placeholder-gray-500 border border-gray-700/50 focus:border-blue-500/50 focus:outline-none"
                min="0"
                max="100"
                step="0.01"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                %
              </div>
            </div>
          </div>

          {/* Preset Percentages */}
          <div className="grid grid-cols-4 gap-2">
            {presetPercentages.map((preset) => (
              <button
                key={preset}
                onClick={() => handlePercentageChange(preset.toString())}
                className="px-3 py-2 bg-gray-800/50 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
              >
                {preset}%
              </button>
            ))}
          </div>

          {error && (
            <div className="text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSell}
              disabled={loading || !amount || Number(amount) <= 0}
              className="flex-1 px-4 py-3 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  <span>Selling...</span>
                </>
              ) : (
                <>
                  <ArrowUpRight size={16} />
                  <span>Sell Tokens</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export const ActiveTradesList: React.FC<ActiveTradesListProps> = ({ trades = [], onViewTrade }) => {
  const [sellingTrade, setSellingTrade] = useState<string | null>(null);
  const [partialSellTrade, setPartialSellTrade] = useState<TrackedTrade | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Filter for active trades (buy trades that haven't been sold)
  const activeTrades = trades.filter(trade => 
    trade.type === 'buy' && 
    (!trade.status || trade.status === 'active')
  );

  // Calculate pagination
  const totalPages = Math.ceil(activeTrades.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const visibleTrades = activeTrades.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleSellTrade = async (trade: TrackedTrade, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent trade details modal from opening
    
    if (sellingTrade) return; // Prevent multiple simultaneous sells
    
    setSellingTrade(trade.id);
    
    try {
      const response = await fetch('http://127.0.0.1:5001/api/sell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token_address: trade.tokenAddress,
          amount: trade.tokenAmount // Send the full token amount
        })
      });

      if (!response.ok) {
        throw new Error('Failed to sell trade');
      }

      const data = await response.json();
      console.log('Trade sold:', data);
      
      // Add success notification here if you have a notification system
      
    } catch (error) {
      console.error('Error selling trade:', error);
      // Add error notification here if you have a notification system
    } finally {
      setSellingTrade(null);
    }
  };

  const handlePartialSell = async (amount: number) => {
    if (!partialSellTrade) return;
    
    try {
      const response = await fetch('http://127.0.0.1:5001/api/sell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token_address: partialSellTrade.tokenAddress,
          amount: amount
        })
      });

      if (!response.ok) {
        throw new Error('Failed to sell tokens');
      }

      const data = await response.json();
      console.log('Partial sell completed:', data);
      
      // Add success notification here if you have a notification system
      
    } catch (error) {
      console.error('Error selling tokens:', error);
      throw error;
      // Add error notification here if you have a notification system
    }
  };

  if (activeTrades.length === 0) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-xl p-8 border border-gray-700/50 text-center">
        <Activity size={40} className="text-gray-400 mx-auto mb-4" />
        <p className="text-gray-400 text-lg">No active trades</p>
        <p className="text-gray-500 mt-2">Active trades will appear here</p>
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
    <>
      {/* Trade Count */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-400">
          {activeTrades.length} active trade{activeTrades.length !== 1 ? 's' : ''}
        </div>
        <div className="text-sm text-gray-400">
          Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, activeTrades.length)} of {activeTrades.length}
        </div>
      </div>

      {/* Trades List */}
      <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
        {visibleTrades.map((trade) => {
          const tokenAddressStart = trade.tokenAddress.slice(0, 4);
          const tokenAddressEnd = trade.tokenAddress.slice(-4);
          const isSelling = sellingTrade === trade.id;
          
          return (
            <div
              key={trade.id}
              onClick={() => onViewTrade(trade)}
              className="relative overflow-hidden bg-gray-800/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 cursor-pointer group hover:bg-green-900/10"
            >
              {/* Active Trade Indicator */}
              <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-xl bg-green-500/10 text-green-400 group-hover:bg-green-500/20 transition-colors">
                    <ArrowUpRight size={20} />
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
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                        ACTIVE
                      </span>
                      <span className="text-sm text-gray-400">
                        Opened {trade.date_time ? formatTimeAgo(trade.date_time) : 'Unknown time'}
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
                  {/* Sell Buttons */}
                  <div className="mt-2 flex items-center space-x-2">
                    {/* Partial Sell Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPartialSellTrade(trade);
                      }}
                      className="px-3 py-1.5 rounded-lg text-sm flex items-center space-x-1 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                    >
                      <Percent size={14} />
                      <span>Partial Sell</span>
                    </button>
                    {/* Full Sell Button */}
                    <button
                      onClick={(e) => handleSellTrade(trade, e)}
                      disabled={isSelling}
                      className={`px-3 py-1.5 rounded-lg text-sm flex items-center space-x-1 transition-colors ${
                        isSelling
                          ? 'bg-red-500/20 text-red-400 cursor-not-allowed'
                          : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                      }`}
                    >
                      {isSelling ? (
                        <>
                          <Loader size={14} className="animate-spin" />
                          <span>Selling...</span>
                        </>
                      ) : (
                        <>
                          <ArrowUpRight size={14} />
                          <span>Sell All</span>
                        </>
                      )}
                    </button>
                  </div>
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
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800/50">
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

      {/* Partial Sell Modal */}
      {partialSellTrade && (
        <PartialSellModal
          isOpen={true}
          onClose={() => setPartialSellTrade(null)}
          trade={partialSellTrade}
          onSell={handlePartialSell}
        />
      )}
    </>
  );
};