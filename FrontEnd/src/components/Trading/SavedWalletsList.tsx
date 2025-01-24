import React from 'react';
import { Wallet, ExternalLink, Trash2, Clock } from 'lucide-react';
import type { SavedWallet } from '../../types/trades';

interface SavedWalletsListProps {
  wallets: SavedWallet[];
  onSelect: (wallet: SavedWallet) => void;
  onDelete: (address: string) => void;
}

export const SavedWalletsList: React.FC<SavedWalletsListProps> = ({
  wallets,
  onSelect,
  onDelete,
}) => {
  if (wallets.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        No saved wallets yet
      </div>
    );
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="space-y-4">
      {wallets.map((wallet) => (
        <div
          key={wallet.address}
          className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Wallet className="text-blue-400" size={20} />
              </div>
              <div>
                <h3 className="font-medium text-white">{wallet.name}</h3>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-400">{wallet.address.slice(0, 8)}...{wallet.address.slice(-8)}</span>
                  <a
                    href={`https://solscan.io/account/${wallet.address}`}
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
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onDelete(wallet.address)}
                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                title="Delete wallet"
              >
                <Trash2 size={18} />
              </button>
              <button
                onClick={() => onSelect(wallet)}
                className="px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
              >
                Select
              </button>
            </div>
          </div>
          <div className="flex items-center text-sm text-gray-400">
            <Clock size={14} className="mr-1" />
            Saved on {formatTimestamp(wallet.timestamp)}
          </div>
        </div>
      ))}
    </div>
  );
};