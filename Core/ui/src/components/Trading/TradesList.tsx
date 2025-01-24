import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, RefreshCw } from 'lucide-react';
import type { TradeWithStats } from '../../types/trades';
import { useTradeTabs } from '../../hooks/useTradeTabs';
import { useTrades } from '../../hooks/useTrades';

interface TradesListProps {
  trades: any[];
  onViewTrade?: (trade: any) => void;
  itemsPerPage?: number;
  listType?: 'tracked' | 'active';
}

export const TradesList: React.FC<TradesListProps> = ({ trades = [], onViewTrade, itemsPerPage = 10, listType = 'tracked' }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<'timestamp'>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localTrades, setLocalTrades] = useState(trades);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const { updateTrades, loading, error } = useTrades();

  // Only update localTrades from props when trades array reference changes
  useEffect(() => {
    // Only update from props if not in middle of refresh and trades have changed
    if (!isRefreshing) {
      setLocalTrades(trades);
    }
  }, [trades]);

  // Sort trades
  const sortedTrades = [...localTrades].sort((a, b) => {
    const aTime = new Date(a.date_time || a.timestamp).getTime();
    const bTime = new Date(b.date_time || b.timestamp).getTime();
    return sortDirection === 'desc' ? bTime - aTime : aTime - bTime;
  });

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshError(null);
    
    try {
      await updateTrades();
    } catch (err) {
      console.error('Error refreshing prices:', err);
      setRefreshError(err instanceof Error ? err.message : 'Failed to refresh prices');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(sortedTrades.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedTrades = sortedTrades.slice(startIndex, startIndex + itemsPerPage);

  const formatTimestamp = (timestamp: string | number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatTokenAddress = (address: string) => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatAmount = (amount: number) => {
    if (!amount) return '0.0000';
    if (amount < 0.0001) {
      return amount.toExponential(4);
    }
    return amount.toFixed(4);
  };

  return (
    <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          {listType === 'tracked' ? 'Trade Signals' : 'Active Trades'}
        </h3>
        <div className="flex gap-2">
          {listType === 'active' && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors ${isRefreshing ? 'opacity-50' : ''}`}
              title="Refresh Prices"
            >
              <RefreshCw size={16} className={`${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-1 rounded bg-gray-700"
          >
            {sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {refreshError && (
        <div className="mb-4 p-3 bg-red-500/20 text-red-400 rounded-lg text-sm">
          {refreshError}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-400">
              <th className="px-4 py-2">Time</th>
              {listType === 'tracked' && <th className="px-4 py-2">Type</th>}
              <th className="px-4 py-2">Token</th>
              {listType === 'tracked' && (
                <>
                  <th className="px-4 py-2">Wallet</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Links</th>
                </>
              )}
              {listType === 'active' && (
                <>
                  <th className="px-4 py-2">Buy Price</th>
                  <th className="px-4 py-2">Current Price</th>
                  <th className="px-4 py-2">Profit %</th>
                  <th className="px-4 py-2">Links</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {displayedTrades.map((trade, index) => (
              <tr key={index} className="border-t border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-2 text-gray-300">
                  {formatTimestamp(trade.date_time || trade.timestamp)}
                </td>
                {listType === 'tracked' && (
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded ${trade.type === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {trade.type.toUpperCase()}
                    </span>
                  </td>
                )}
                <td className="px-4 py-2">
                  {trade.html ? (
                    <div className="flex items-center gap-2">
                      <div dangerouslySetInnerHTML={{ __html: trade.html }} />
                      <a
                        href={`https://birdeye.so/token/${trade.tokenAddress}?chain=solana`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300"
                        title="View Chart on Birdeye"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">
                        {formatTokenAddress(trade.tokenAddress || trade.token_address)}
                      </span>
                      <a
                        href={`https://birdeye.so/token/${trade.tokenAddress || trade.token_address}?chain=solana`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300"
                        title="View Chart on Birdeye"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  )}
                </td>
                {listType === 'tracked' && (
                  <>
                    <td className="px-4 py-2">
                      <span className="text-gray-400">
                        {formatTokenAddress(trade.wallet_group)}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-col">
                        <span className="text-gray-300">{formatAmount(trade.amount_in_sol)} SOL</span>
                        <span className="text-xs text-gray-400">
                          {formatAmount(trade.buy_price)} SOL/token
                        </span>
                        {trade.tokenAmount && (
                          <span className="text-xs text-gray-400">
                            {formatAmount(trade.tokenAmount)} tokens
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        {trade.signature && (
                          <a
                            href={`https://solscan.io/tx/${trade.signature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300"
                            title="View Transaction"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                        {trade.tokenAddress && (
                          <a
                            href={`https://birdeye.so/token/${trade.tokenAddress}?chain=solana`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 ml-2"
                            title="View Chart on Birdeye"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </td>
                  </>
                )}
                {listType === 'active' && (
                  <>
                    <td className="px-4 py-2 text-gray-300">
                      {formatAmount(trade.buy_price)} SOL
                    </td>
                    <td className="px-4 py-2 text-gray-300">
                      {formatAmount(trade.current_price)} SOL
                    </td>
                    <td className="px-4 py-2">
                      <span className={trade.profit_percentage >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {(trade.profit_percentage || 0).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://solscan.io/tx/${trade.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                          title="View Transaction"
                        >
                          <ExternalLink size={14} />
                        </a>
                        <a
                          href={`https://birdeye.so/token/${trade.token_address}?chain=solana`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 ml-2"
                          title="View Chart on Birdeye"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center mt-4 gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded bg-gray-700 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded bg-gray-700 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};