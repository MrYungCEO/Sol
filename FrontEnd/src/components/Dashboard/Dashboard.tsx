import React, { useState } from 'react';
import { Header } from './Header';
import { StatCard } from './StatCard';
import { ProfitChart } from './ProfitChart';
import { RecentTrades } from './RecentTrades';
import { ActiveTrades } from './ActiveTrades';
import { RefreshCw } from 'lucide-react';
import { stats } from '../../data/mockData';
import { useNotification } from '../../contexts/NotificationContext';
import { useTrades } from '../../hooks/useTrades';

export const Dashboard: React.FC = () => {
  const { addNotification } = useNotification();
  const { refreshTrades, loading } = useTrades();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      await refreshTrades();
      addNotification('Dashboard data refreshed successfully', 'success');
    } catch (error) {
      console.error('Error refreshing data:', error);
      addNotification('Failed to refresh dashboard data', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="flex-1 p-8">
      <div className="flex justify-between items-center mb-8">
        <Header />
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl flex items-center space-x-2 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
        </button>
      </div>
      
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