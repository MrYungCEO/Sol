import React, { useState } from 'react';
import { Clock, ArrowUpRight, ArrowDownRight, Rocket, ExternalLink } from 'lucide-react';
import { Modal } from '../Modal/Modal';
import { TradeChart } from './TradeChart';
import { useTrades } from '../../hooks/useTrades';
import type { Trade } from '../../types/trades';

const truncateAddress = (address: string) => {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

export const RecentTrades: React.FC = () => {
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const { trades, loading, error } = useTrades();

  if (loading) return <div>Loading trades...</div>;
  if (error) return <div>Error: {error}</div>;

  // Sort trades by date and get the 5 most recent
  const recentTrades = [...trades]
    .sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime())
    .slice(0, 5);

  return (
    <>
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] animate-slide-up">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center tracking-tight">
          <Clock size={20} className="mr-2 text-blue-400" />
          Recent Trades
        </h2>
        <div className="space-y-3">
          {recentTrades.map((trade, index) => (
            <div 
              key={trade.id} 
              className="bg-gray-800/50 backdrop-blur-xl rounded-lg p-3 hover:bg-gray-800/70 transition-all duration-300 cursor-pointer"
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => setSelectedTrade(trade)}
            >
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-blue-500/10 rounded-lg">
                  <Rocket className="text-blue-400" size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <span className="font-medium text-white">
                      {truncateAddress(trade.token_address)}
                    </span>
                  </div>
                  <div className="text-gray-400 text-xs flex items-center space-x-2">
                    <span>{new Date(trade.date_time).toLocaleString()}</span>
                    <a 
                      href={trade.transaction_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <div className="flex items-center space-x-2">
                    <div className={`flex items-center ${trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {trade.profit >= 0 ? (
                        <ArrowUpRight size={14} className="mr-1" />
                      ) : (
                        <ArrowDownRight size={14} className="mr-1" />
                      )}
                      <span className="text-sm font-medium">
                        {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(4)} SOL
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs ${trade.profit_percentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ({trade.profit_percentage >= 0 ? '+' : ''}{trade.profit_percentage.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>
          ))}
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