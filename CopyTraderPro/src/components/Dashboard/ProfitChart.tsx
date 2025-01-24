import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTrades } from '../../hooks/useTrades';

export const ProfitChart: React.FC = () => {
  const { trades, loading, error } = useTrades();

  if (loading) return <div>Loading chart...</div>;
  if (error) return <div>Error loading chart data</div>;

  // Process trades data for the chart
  const chartData = trades.reduce((acc: any[], trade) => {
    const date = new Date(trade.date_time);
    const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    
    const existingEntry = acc.find(entry => entry.name === monthYear);
    if (existingEntry) {
      existingEntry.profit += trade.profit;
    } else {
      acc.push({
        name: monthYear,
        profit: trade.profit
      });
    }
    return acc;
  }, []);

  // Sort by date
  chartData.sort((a, b) => {
    const dateA = new Date(a.name);
    const dateB = new Date(b.name);
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <div className="col-span-2 bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] animate-slide-up">
      <h2 className="text-xl font-semibold text-white mb-6 tracking-tight">Profit Overview</h2>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.5} />
            <XAxis 
              dataKey="name" 
              stroke="#9CA3AF" 
              tick={{ fill: '#9CA3AF' }}
              axisLine={{ stroke: '#1f2937' }}
            />
            <YAxis 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF' }}
              axisLine={{ stroke: '#1f2937' }}
              tickFormatter={(value) => `${value.toFixed(4)} SOL`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(17, 24, 39, 0.9)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '0.75rem',
                color: '#fff',
                backdropFilter: 'blur(4px)',
              }}
              formatter={(value: number) => [`${value.toFixed(4)} SOL`, 'Profit']}
            />
            <Area 
              type="monotone" 
              dataKey="profit" 
              stroke="#3B82F6" 
              strokeWidth={2}
              fill="url(#profitGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};