import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { Stat } from '../../types';

export const StatCard: React.FC<Stat> = ({ title, value, change, icon: Icon, positive }) => {
  return (
    <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] animate-slide-up">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-400 font-medium">{title}</p>
          <h3 className="text-2xl font-bold text-white mt-1 tracking-tight">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl ${
          positive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
        } backdrop-blur-xl transition-transform duration-300 hover:scale-110`}>
          <Icon size={24} />
        </div>
      </div>
      <div className={`flex items-center mt-3 ${
        positive ? 'text-green-400' : 'text-red-400'
      }`}>
        <ArrowUpRight size={16} className="mr-1" />
        <span className="text-sm font-medium">{change}</span>
      </div>
    </div>
  );
};