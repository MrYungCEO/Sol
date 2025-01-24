import React, { useState } from 'react';
import { Wallet as WalletIcon, Plus, Search, ArrowUpRight, ArrowDownRight, ExternalLink } from 'lucide-react';
import { wallets } from '../../data/mockData';
import type { Wallet, Token } from '../../types';

export const WalletPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const totalValue = wallets.reduce((sum, wallet) => sum + wallet.value, 0);
  const totalChange = wallets.reduce((sum, wallet) => sum + (wallet.value * wallet.change24h / 100), 0);
  const changePercentage = (totalChange / (totalValue - totalChange)) * 100;

  const TokenRow: React.FC<{ token: Token }> = ({ token }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-800/50 last:border-0">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <WalletIcon className="text-blue-400" size={18} />
        </div>
        <div>
          <div className="font-medium text-white">{token.symbol}</div>
          <div className="text-sm text-gray-400">{token.name}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-white font-medium">${token.value.toLocaleString()}</div>
        <div className="flex items-center justify-end space-x-2">
          <span className="text-gray-400 text-sm">{token.balance.toLocaleString()} {token.symbol}</span>
          <span className={`text-sm flex items-center ${
            token.change24h >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {token.change24h >= 0 ? (
              <ArrowUpRight size={14} className="mr-1" />
            ) : (
              <ArrowDownRight size={14} className="mr-1" />
            )}
            {Math.abs(token.change24h)}%
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Wallets</h1>
          <p className="text-gray-400 mt-1">Track your crypto assets</p>
        </div>
        <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-4 border border-gray-800/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <WalletIcon className="text-blue-400" size={24} />
            </div>
            <div>
              <span className="text-xl font-semibold text-white tracking-tight">
                ${totalValue.toLocaleString()}
              </span>
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${changePercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {changePercentage >= 0 ? '+' : ''}{changePercentage.toFixed(2)}%
                </span>
                <span className="text-gray-400 text-sm">24h</span>
              </div>
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
            placeholder="Search wallets or tokens..."
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
        {wallets.map((wallet, index) => (
          <div
            key={index}
            className="bg-gray-900/50 backdrop-blur-xl rounded-xl border border-gray-800/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]"
          >
            <div className="p-6 border-b border-gray-800/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <WalletIcon className="text-blue-400" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{wallet.name}</h3>
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="text-gray-400">{wallet.address}</span>
                      <ExternalLink size={14} className="text-gray-400 hover:text-white cursor-pointer" />
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-semibold">${wallet.value.toLocaleString()}</div>
                  <div className={`text-sm flex items-center justify-end ${
                    wallet.change24h >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {wallet.change24h >= 0 ? (
                      <ArrowUpRight size={14} className="mr-1" />
                    ) : (
                      <ArrowDownRight size={14} className="mr-1" />
                    )}
                    {Math.abs(wallet.change24h)}%
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6">
              {wallet.tokens.map((token, tokenIndex) => (
                <TokenRow key={tokenIndex} token={token} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};