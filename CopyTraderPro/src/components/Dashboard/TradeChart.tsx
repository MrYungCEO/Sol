import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi } from 'lightweight-charts';
import { ArrowUpRight, ArrowDownRight, Rocket, Clock, DollarSign, BarChart2, Users } from 'lucide-react';
import type { Trade } from '../../types/trades';

interface TradeChartProps {
  trade: Trade;
}

export const TradeChart: React.FC<TradeChartProps> = ({ trade }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Format numbers with fallbacks
  const formatNumber = (value: number | undefined, decimals: number = 2) => {
    if (value === undefined || isNaN(value)) return '0';
    return value.toFixed(decimals);
  };

  // Format currency with fallbacks
  const formatCurrency = (value: number | undefined, decimals: number = 2) => {
    if (value === undefined || isNaN(value)) return '$0';
    return `$${value.toFixed(decimals)}`;
  };

  // Format token address for display
  const formatTokenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch (error) {
      return 'Recent';
    }
  };

  // Calculate profit percentage with fallback
  const profitPercentage = trade.profit ? (trade.profit / (trade.amount || 1)) * 100 : 0;

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

    // Initialize chart with standard settings
    chartRef.current = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9CA3AF',
        fontSize: 12,
        fontFamily: "'Inter', sans-serif",
      },
      grid: {
        vertLines: { color: 'rgba(59, 130, 246, 0.1)', style: 1 },
        horzLines: { color: 'rgba(59, 130, 246, 0.1)', style: 1 },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: 'rgba(59, 130, 246, 0.1)',
        barSpacing: 6,
        minBarSpacing: 4,
        rightOffset: 12,
        fixLeftEdge: true,
        fixRightEdge: true,
        lockVisibleTimeRangeOnResize: true,
      },
      rightPriceScale: {
        borderColor: 'rgba(59, 130, 246, 0.1)',
        autoScale: true,
        scaleMargins: {
          top: 0.2,
          bottom: 0.2,
        },
        alignLabels: true,
        borderVisible: true,
        entireTextOnly: true,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: 'rgba(59, 130, 246, 0.3)',
          width: 1,
          style: 2,
          labelBackgroundColor: '#1F2937',
        },
        horzLine: {
          color: 'rgba(59, 130, 246, 0.3)',
          width: 1,
          style: 2,
          labelBackgroundColor: '#1F2937',
        },
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
    });

    // Add candlestick series with standard settings
    const candlestickSeries = chartRef.current.addCandlestickSeries({
      upColor: '#10B981',
      downColor: '#EF4444',
      borderVisible: false,
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
      priceFormat: {
        type: 'price',
        precision: 8,
        minMove: 0.00000001,
      },
      priceScaleId: 'right',
    });

    // Generate candlestick data
    const generateCandlestickData = () => {
      const now = Math.floor(Date.now() / 1000);
      const data = [];
      let lastClose = trade.buy_price || trade.current_price || 1;
      
      // Generate 100 candles
      for (let i = 0; i < 100; i++) {
        const time = now - (100 - i) * 60;
        const open = lastClose * (1 + (Math.random() - 0.5) * 0.01);
        const high = Math.max(open, lastClose) * (1 + Math.random() * 0.005);
        const low = Math.min(open, lastClose) * (1 - Math.random() * 0.005);
        const close = lastClose * (1 + (Math.random() - 0.5) * 0.01);
        
        data.push({
          time,
          open,
          high,
          low,
          close,
        });

        lastClose = close;
      }
      return data;
    };

    const candleData = generateCandlestickData();
    candlestickSeries.setData(candleData);
    
    // Fit content and add margin
    chartRef.current?.timeScale().fitContent();

    // Update data every minute
    const interval = setInterval(() => {
      const lastData = candleData[candleData.length - 1];
      const newTime = Math.floor(Date.now() / 1000);
      
      const newData = {
        time: newTime,
        open: lastData.close,
        high: lastData.close * (1 + Math.random() * 0.005),
        low: lastData.close * (1 - Math.random() * 0.005),
        close: lastData.close * (1 + (Math.random() - 0.5) * 0.01),
      };

      candlestickSeries.update(newData);
    }, 60000);

    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [trade.buy_price, trade.current_price]);

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
                {formatTokenAddress(trade.token_address || trade.tokenAddress)}
                <span className="ml-2 text-sm bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                  {trade.type?.toUpperCase() || 'TRADE'}
                </span>
              </h2>
              <div className="text-gray-400 mt-1 font-medium">
                {formatDate(trade.date_time)}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">Entry Price</div>
              <div className="text-white font-semibold">
                {formatCurrency(trade.buy_price, 8)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">Current Price</div>
              <div className={`font-semibold ${trade.profit_percentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(trade.current_price, 8)}
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
              <span className="text-gray-400">{formatDate(trade.date_time)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <BarChart2 size={16} className="text-gray-400" />
              <span className={`flex items-center ${trade.profit_percentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {trade.profit_percentage >= 0 ? (
                  <ArrowUpRight size={16} className="mr-1" />
                ) : (
                  <ArrowDownRight size={16} className="mr-1" />
                )}
                {formatNumber(Math.abs(trade.profit_percentage))}%
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button className="px-4 py-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors">
              1M
            </button>
            <button className="px-4 py-2 bg-gray-800/50 text-gray-400 rounded-lg hover:bg-gray-800 transition-colors">
              5M
            </button>
            <button className="px-4 py-2 bg-gray-800/50 text-gray-400 rounded-lg hover:bg-gray-800 transition-colors">
              15M
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
        <div className="bg-gray-900/30 backdrop-blur-sm rounded-xl p-4 border border-gray-800/50">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-400 text-sm">Amount</div>
            <DollarSign size={16} className="text-blue-400" />
          </div>
          <div className="text-white font-semibold">
            {formatNumber(trade.amount_in_sol)} SOL
          </div>
        </div>
        <div className="bg-gray-900/30 backdrop-blur-sm rounded-xl p-4 border border-gray-800/50">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-400 text-sm">Token Amount</div>
            <BarChart2 size={16} className="text-blue-400" />
          </div>
          <div className="text-white font-semibold">
            {formatNumber(trade.token_amount || trade.tokenAmount)}
          </div>
        </div>
        <div className="bg-gray-900/30 backdrop-blur-sm rounded-xl p-4 border border-gray-800/50">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-400 text-sm">Profit/Loss</div>
            <BarChart2 size={16} className="text-blue-400" />
          </div>
          <div className={`font-semibold ${trade.profit_percentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trade.profit_percentage >= 0 ? '+' : ''}{formatNumber(trade.profit_percentage)}%
          </div>
        </div>
        <div className="bg-gray-900/30 backdrop-blur-sm rounded-xl p-4 border border-gray-800/50">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-400 text-sm">Status</div>
            <Users size={16} className="text-blue-400" />
          </div>
          <div className="text-white font-semibold">
            {trade.status?.toUpperCase() || 'ACTIVE'}
          </div>
        </div>
      </div>
    </div>
  );
};