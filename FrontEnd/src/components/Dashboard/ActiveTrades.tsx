import React, { useState } from 'react';
import { Activity, ArrowUpRight, ArrowDownRight, Timer, TrendingUp, ChevronLeft, ChevronRight, ExternalLink, History } from 'lucide-react';
import { Modal } from '../Modal/Modal';
import { TradeChart } from './TradeChart';
import { useTrades } from '../../hooks/useTrades';
import type { Trade, PartialSale } from '../../types/trades';

const ITEMS_PER_PAGE = 5;

const PartialSalesList: React.FC<{ sales: PartialSale[] }> = ({ sales }) => (
  <div className="mt-4 space-y-2">
    <div className="text-sm text-gray-400 font-medium">Partial Sales History</div>
    {sales.map((sale, index) => (
      <div key={index} className="bg-gray-900/30 rounded-lg p-3 text-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400">
            {new Date(sale.date_time).toLocaleString()}
          </span>
          <a
            href={sale.transaction_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={14} />
          </a>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="text-gray-400">Amount</div>
            <div className="text-white">{sale.amount.toFixed(4)}</div>
          </div>
          <div>
            <div className="text-gray-400">Price</div>
            <div className="text-white">{sale.price.toFixed(8)}</div>
          </div>
          <div>
            <div className="text-gray-400">Profit</div>
            <div className={`${sale.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {sale.profit >= 0 ? '+' : ''}{sale.profit.toFixed(4)}
              <span className="text-xs ml-1">
                ({sale.profit_percentage.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const ActiveTrades: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'closed'>('active');
  const { activeTrades, closedTrades, totalProfit, winRate, loading, error } = useTrades();

  if (loading) return <div>Loading trades...</div>;
  if (error) return <div>Error: {error}</div>;

  const trades = activeTab === 'active' ? activeTrades : closedTrades;
  const totalPages = Math.ceil(trades.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentTrades = trades.slice(startIndex, endIndex);

  const profitableCount = trades.filter(trade => trade.profit > 0).length;

  return (
    <>
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl border border-gray-800/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] animate-slide-up">
        <div className="p-6 border-b border-gray-800/50">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center tracking-tight">
              <Activity size={20} className="mr-2 text-blue-400" />
              Trades
            </h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-gray-800/50 rounded-lg p-1">
                <button
                  onClick={() => {
                    setActiveTab('active');
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${
                    activeTab === 'active'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Active ({activeTrades.length})
                </button>
                <button
                  onClick={() => {
                    setActiveTab('closed');
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${
                    activeTab === 'closed'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Closed ({closedTrades.length})
                </button>
              </div>
              <div className="text-sm">
                <span className={`${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'} font-semibold`}>
                  {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)} SOL
                </span>
                <span className="text-gray-400 mx-2">•</span>
                <span className="text-blue-400">{winRate.toFixed(1)}% Win Rate</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Total Trades</div>
              <div className="text-white font-semibold">{trades.length}</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Profitable</div>
              <div className="text-green-400 font-semibold">{profitableCount}</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Loss Making</div>
              <div className="text-red-400 font-semibold">{trades.length - profitableCount}</div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Total Profit</div>
              <div className={`font-semibold ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(4)} SOL
              </div>
            </div>
          </div>
        </div>

        <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
          <div className="space-y-4 p-6">
            {currentTrades.map((trade, index) => (
              <div 
                key={trade.id}
                className="bg-gray-800/50 backdrop-blur-xl rounded-xl p-4 border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 cursor-pointer"
                onClick={() => setSelectedTrade(trade)}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <TrendingUp className="text-blue-400" size={18} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{trade.token_address}</h3>
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="text-gray-400">
                          {new Date(trade.date_time).toLocaleString()}
                        </span>
                        <a 
                          href={trade.transaction_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 flex items-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={14} className="ml-1" />
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <span className={`font-semibold ${
                        trade.profit > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {trade.profit > 0 ? '+' : ''}{trade.profit.toFixed(4)} SOL
                      </span>
                      <span className={`text-sm ${
                        trade.profit_percentage > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        ({trade.profit_percentage > 0 ? '+' : ''}{trade.profit_percentage.toFixed(2)}%)
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">
                      Entry: {trade.buy_price.toFixed(8)} SOL
                    </div>
                    <div className="text-sm text-gray-400">
                      Amount: {trade.token_amount.toFixed(8)}
                      {trade.initial_token_amount && trade.initial_token_amount > trade.token_amount && (
                        <span className="ml-1 text-blue-400">
                          (Initial: {trade.initial_token_amount.toFixed(8)})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {trade.partial_sales && trade.partial_sales.length > 0 && (
                  <PartialSalesList sales={trade.partial_sales} />
                )}

                <div className="flex justify-between mt-3">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTrade(trade);
                    }}
                    className="px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-sm hover:bg-blue-500/20 transition-colors"
                  >
                    View Chart
                  </button>
                  {activeTab === 'active' && (
                    <div className="flex items-center space-x-2">
                      <button 
                        className="px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-sm hover:bg-blue-500/20 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Sell Partial
                      </button>
                      <button 
                        className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Close Position
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-800/50 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Showing {startIndex + 1}-{Math.min(endIndex, trades.length)} of {trades.length}
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
      </div>

      <Modal 
        isOpen={selectedTrade !== null} 
        onClose={() => setSelectedTrade(null)}
      >
        {selectedTrade && <TradeChart trade={selectedTrade} />}
      </Modal>
    </>
  );
};