import React from 'react';
import { Wallet } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';

export const Header: React.FC = () => {
  const { settings } = useSettings();

  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-gray-400 mt-1">Welcome back, Trader</p>
      </div>
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-2 text-gray-400">
          <span>Balance:</span>
          <span className="text-xl font-semibold text-white">0.00 SOL</span>
        </div>
        <div className="h-8 w-px bg-gray-800/50 mx-4"></div>
        <div className="flex items-center space-x-2 text-gray-400">
          <Wallet size={16} />
          <span className="text-sm">{settings.wallet.address ? 
            `${settings.wallet.address.slice(0, 4)}...${settings.wallet.address.slice(-4)}` : 
            'Not Connected'
          }</span>
        </div>
      </div>
    </div>
  );
};