import React from 'react';
import { Header } from './Header';
import { StatCard } from './StatCard';
import { ProfitChart } from './ProfitChart';
import { RecentTrades } from './RecentTrades';
import { ActiveTrades } from './ActiveTrades';
import { stats } from '../../data/mockData';

export const Dashboard: React.FC = () => {
  return (
    <div className="flex-1 p-8">
      <Header />
      
      <div className="grid grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <ProfitChart />
        <div className="space-y-6">
          <RecentTrades />
        </div>
      </div>

      <ActiveTrades />
    </div>
  );
};