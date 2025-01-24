import React, { useState } from 'react';
import { TrendingUp, Award, Users, Copy } from 'lucide-react';
import { traders } from '../../data/mockData';

export const TopTraders: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState('popular');

  return (
    <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] animate-slide-up">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white tracking-tight">Top Traders</h2>
        <div className="flex items-center space-x-4 bg-gray-800/50 backdrop-blur-xl rounded-lg p-1">
          <button
            onClick={() => setSelectedTab('popular')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${
              selectedTab === 'popular' 
                ? 'bg-blue-500 text-white shadow-lg' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <TrendingUp size={20} />
            <span>Popular</span>
          </button>
          <button
            onClick={() => setSelectedTab('trending')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${
              selectedTab === 'trending' 
                ? 'bg-blue-500 text-white shadow-lg' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Award size={20} />
            <span>Trending</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {traders.map((trader, index) => (
          <div 
            key={index} 
            className="bg-gray-800/50 backdrop-blur-xl rounded-xl p-4 hover:bg-gray-800/70 transition-all duration-300 hover:scale-[1.02] border border-gray-700/50 hover:border-blue-500/50"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center space-x-4 mb-4">
              <img 
                src={trader.avatar} 
                alt={trader.name} 
                className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-500/20"
              />
              <div>
                <h3 className="font-semibold text-white flex items-center">
                  {trader.name}
                  {trader.trending && (
                    <span className="ml-2 bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full">
                      Trending
                    </span>
                  )}
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <span className="flex items-center">
                    <Users size={14} className="mr-1" />
                    {trader.followers}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center mb-4">
              <div className="text-gray-400">
                Win Rate
                <div className="text-white font-semibold">{trader.winRate}%</div>
              </div>
              <div className="text-right">
                <div className="text-gray-400">ROI</div>
                <div className="text-green-400 font-semibold">+{trader.roi}%</div>
              </div>
            </div>
            <button className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]">
              <Copy size={16} className="mr-2" />
              Copy Trader
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};