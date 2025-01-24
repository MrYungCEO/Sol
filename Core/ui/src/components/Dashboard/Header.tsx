import React from 'react';
import { Wallet } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <div className="flex justify-between items-center mb-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-gray-400 mt-1">Welcome back, Trader</p>
      </div>
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-4 border border-gray-800/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Wallet className="text-blue-400" size={24} />
          </div>
          <div>
            <span className="text-xl font-semibold text-white tracking-tight">$24,567.89</span>
            <p className="text-gray-400 text-sm">Available Balance</p>
          </div>
        </div>
      </div>
    </div>
  );
};