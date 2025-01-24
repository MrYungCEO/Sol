import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi } from 'lightweight-charts';
import { ArrowUpRight, ArrowDownRight, Rocket, Clock, DollarSign, BarChart2, Users } from 'lucide-react';
import type { Trade } from '../../types';

interface TradeChartProps {
  trade: Trade;
}

export const TradeChart: React.FC<TradeChartProps> = ({ trade }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    // Initialize chart
    chartRef.current = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9CA3AF',
      },
      grid: {
        vertLines: { color: 'rgba(59, 130, 246, 0.1)' },
        horzLines: { color: 'rgba(59, 130, 246, 0.1)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        borderColor: 'rgba(59, 130, 246, 0.1)',
      },
      rightPriceScale: {
        borderColor: 'rgba(59, 130, 246, 0.1)',
      },
    });

    // Add candlestick series
    const candlestickSeries = chartRef.current.addCandlestickSeries({
      upColor: '#10B981',
      downColor: '#EF4444',
      borderVisible: false,
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });

    // Add volume series
    const volumeSeries = chartRef.current.addHistogramSeries({
      color: '#3B82F6',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Generate and set data
    const generateMockData = () => {
      const now = Math.floor(Date.now() / 1000);
      const data = [];
      let lastClose = trade.entry;
      let volume = 1000000;

      for (let i = 0; i < 1000; i++) {
        const time = now - (1000 - i) * 60;
        const multiplier = 1 + (Math.random() - 0.5) * 0.02;
        lastClose *= multiplier;
        
        const open = lastClose / (1 + (Math.random() - 0.5) * 0.01);
        const high = Math.max(open, lastClose) * (1 + Math.random() * 0.005);
        const low = Math.min(open, lastClose) * (1 - Math.random() * 0.005);
        
        volume *= (1 + (Math.random() - 0.5) * 0.3);

        data.push({
          candleData: {
            time,
            open,
            high,
            low,
            close: lastClose,
          },
          volumeData: {
            time,
            value: volume,
            color: lastClose >= open ? '#10B981' : '#EF4444',
          }
        });
      }
      return data;
    };

    const mockData = generateMockData();
    candlestickSeries.setData(mockData.map(d => d.candleData));
    volumeSeries.setData(mockData.map(d => d.volumeData));
    
    chartRef.current?.timeScale().fitContent();

    const interval = setInterval(() => {
      const lastData = mockData[mockData.length - 1];
      const newClose = lastData.candleData.close * (1 + (Math.random() - 0.5) * 0.01);
      const newVolume = lastData.volumeData.value * (1 + (Math.random() - 0.5) * 0.2);
      
      const newData = {
        candleData: {
          time: Math.floor(Date.now() / 1000),
          open: lastData.candleData.close,
          high: Math.max(lastData.candleData.close, newClose),
          low: Math.min(lastData.candleData.close, newClose),
          close: newClose,
        },
        volumeData: {
          time: Math.floor(Date.now() / 1000),
          value: newVolume,
          color: newClose >= lastData.candleData.close ? '#10B981' : '#EF4444',
        }
      };

      candlestickSeries.update(newData.candleData);
      volumeSeries.update(newData.volumeData);
    }, 1000);

    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [trade.pair, trade.entry]);

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />
      
      {/* Header */}
      <div className="relative px-8 pt-8 pb-6 border-b border-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Rocket className="text-blue-400" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center">
                {trade.symbol || trade.pair}
                {trade.symbol && (
                  <span className="ml-2 text-sm bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                    Pump Token
                  </span>
                )}
              </h2>
              <div className="text-gray-400 mt-1 font-medium">{trade.pair}</div>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">Entry Price</div>
              <div className="text-white font-semibold">${trade.entry.toFixed(8)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">Profit/Loss</div>
              <div className={`font-semibold ${trade.profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {trade.profit > 0 ? '+' : ''}{trade.profit} USDT
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trade Info Bar */}
      <div className="px-8 py-4 bg-gray-900/30 border-b border-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Clock size={16} className="text-gray-400" />
              <span className="text-gray-400">{trade.time}</span>
            </div>
            <div className="flex items-center space-x-2">
              <BarChart2 size={16} className="text-gray-400" />
              <span className={`flex items-center ${trade.profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {trade.type === 'BUY' ? (
                  <ArrowUpRight size={16} className="mr-1" />
                ) : (
                  <ArrowDownRight size={16} className="mr-1" />
                )}
                {trade.type}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button className="px-4 py-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors">
              1H
            </button>
            <button className="px-4 py-2 bg-gray-800/50 text-gray-400 rounded-lg hover:bg-gray-800 transition-colors">
              4H
            </button>
            <button className="px-4 py-2 bg-gray-800/50 text-gray-400 rounded-lg hover:bg-gray-800 transition-colors">
              1D
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-8">
        <div className="relative w-full rounded-xl border border-gray-800/50 overflow-hidden bg-gray-900/30 backdrop-blur-sm" style={{ height: '500px' }}>
          <div ref={chartContainerRef} className="w-full h-full" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-8 pb-8 grid grid-cols-4 gap-4">
        {[
          { label: 'Volume 24h', value: '$2,345,678', icon: BarChart2 },
          { label: 'Market Cap', value: '$12.5M', icon: DollarSign },
          { label: 'Holders', value: '1,234', icon: Users },
          { label: 'Total Trades', value: '45,678', icon: BarChart2 },
        ].map((stat, index) => (
          <div key={index} className="bg-gray-900/30 backdrop-blur-sm rounded-xl p-4 border border-gray-800/50">
            <div className="flex items-center justify-between mb-2">
              <div className="text-gray-400 text-sm">{stat.label}</div>
              <stat.icon size={16} className="text-blue-400" />
            </div>
            <div className="text-white font-semibold">{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};