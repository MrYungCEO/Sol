import React, { useState } from 'react';
import { Target, Plus, Search, ArrowUpRight, ArrowDownRight, ExternalLink, Play, Pause, Copy, CheckCircle2 } from 'lucide-react';
import { trackingWallets } from '../../data/mockData';
import type { TrackingWallet } from '../../types';
import { Modal } from '../Modal/Modal';
import { TradingViewChart } from '../Dashboard/TradingViewChart';

export const TradingPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrade, setSelectedTrade] = useState<any>(null);

  const totalTracking = trackingWallets.filter(w => w.isTracking).length;
  const totalCopying = trackingWallets.filter(w => w.isCopying).length;

  return (
    <div className="flex-1 p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Trading</h1>
          <p className="text-gray-400 mt-1">Track and copy successful traders</p>
        </div>
        <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-4 border border-gray-800/50">
          <div className="flex items-center space-x-6">
            <div>
              <div className="text-gray-400 text-sm">Tracking</div>
              <div className="text-white font-semibold">{totalTracking} Wallets</div>
            </div>
            <div className="h-8 w-px bg-gray-800/50"></div>
            <div>
              <div className="text-gray-400 text-sm">Copying</div>
              <div className="text-white font-semibold">{totalCopying} Wallets</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Add Wallet */}
      <div className="flex space-x-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search wallets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-900/50 backdrop-blur-xl border border-gray-800/50 rounded-xl py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-colors">
          <Plus size={20} />
          <span>Add Wallet</span>
        </button>
      </div>

      {/* Wallets Grid */}
      <div className="grid grid-cols-2 gap-6">
        {trackingWallets.map((wallet, index) => (
          <div
            key={index}
            className="bg-gray-900/50 backdrop-blur-xl rounded-xl border border-gray-800/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]"
          >
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
                      <ExternalLink 
                        size={14} 
                        className="text-gray-400 hover:text-white cursor-pointer"
                        onClick={() => window.open(`https://solscan.io/account/${wallet.address}`, '_blank')}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button 
                    className={`p-2 rounded-lg transition-colors ${
                      wallet.isTracking 
                        ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' 
                        : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    {wallet.isTracking ? <Pause size={20} /> : <Play size={20} />}
                  </button>
                  <button 
                    className={`p-2 rounded-lg transition-colors ${
                      wallet.isCopying
                        ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                        : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    {wallet.isCopying ? <CheckCircle2 size={20} /> : <Copy size={20} />}
                  </button>
                </div>
              </div>
            </div>
            
            {wallet.lastTrade ? (
              <div className="p-6">
                <div className="text-sm text-gray-400 mb-3">Last Trade</div>
                <div 
                  className="bg-gray-800/50 backdrop-blur-xl rounded-lg p-4 cursor-pointer hover:bg-gray-800/70 transition-all duration-300"
                  onClick={() => setSelectedTrade(wallet.lastTrade)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Target className="text-blue-400" size={18} />
                      </div>
                      <div>
                        <div className="font-medium text-white">{wallet.lastTrade.symbol}</div>
                        <div className="flex items-center space-x-2 text-sm">
                          <span className={`${
                            wallet.lastTrade.type === 'BUY' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {wallet.lastTrade.type}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-400">{wallet.lastTrade.time}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${
                        wallet.lastTrade.profit > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {wallet.lastTrade.profit > 0 ? '+' : ''}{wallet.lastTrade.profit} USDT
                      </div>
                      <div className="text-sm text-gray-400">
                        {wallet.lastTrade.amount}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-400">
                No trades yet
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal 
        isOpen={selectedTrade !== null} 
        onClose={() => setSelectedTrade(null)}
      >
        {selectedTrade && <TradingViewChart trade={selectedTrade} />}
      </Modal>
    </div>
  );
};