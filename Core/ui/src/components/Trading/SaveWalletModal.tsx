import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import type { SavedWallet } from '../../types/trades';

interface SaveWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (wallet: SavedWallet) => void;
  walletAddress: string;
}

export const SaveWalletModal: React.FC<SaveWalletModalProps> = ({
  isOpen,
  onClose,
  onSave,
  walletAddress,
}) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) {
      setError('Please enter a name for this wallet');
      return;
    }

    onSave({
      address: walletAddress,
      name: name.trim(),
      timestamp: Date.now(),
    });

    setName('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[#0B1120] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] rounded-2xl border border-gray-800/50 w-[90vw] max-w-[500px] shadow-[0_0_50px_rgba(59,130,246,0.15)] animate-modal-slide-up">
        <div className="p-6 border-b border-gray-800/50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Save Wallet</h2>
            <button 
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-800/50 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Wallet Address
            </label>
            <div className="bg-gray-800/50 rounded-lg p-3 text-white font-mono text-sm break-all">
              {walletAddress}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Wallet Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="Enter a name for this wallet..."
              className="w-full bg-gray-800/50 rounded-lg px-4 py-3 text-white placeholder-gray-500 border border-gray-700/50 focus:border-blue-500/50 focus:outline-none transition-colors"
            />
            {error && (
              <div className="mt-2 text-red-400 text-sm flex items-center">
                <AlertCircle size={16} className="mr-1" />
                {error}
              </div>
            )}
          </div>

          <div className="flex space-x-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors flex items-center justify-center space-x-2"
            >
              <Save size={20} />
              <span>Save Wallet</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};