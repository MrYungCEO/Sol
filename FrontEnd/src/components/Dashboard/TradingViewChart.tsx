import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi } from 'lightweight-charts';
import { ArrowUpRight, ArrowDownRight, Rocket, Clock, DollarSign, BarChart2, Users } from 'lucide-react';
import type { TradeWithStats } from '../../types/trades';

interface TradingViewChartProps {
  trade: TradeWithStats;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({ trade }) => {
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
  const formatTokenAddress = (address: string | undefined) => {
    if (!address) return 'Unknown Token';
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  // Format date for display
  const formatDate = (timestamp: number) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch (error) {
      return 'Recent';
    }
  };

  // Calculate profit percentage with fallback
  const profitPercentage = trade.currentPrice && trade.entryPrice
    ? ((trade.currentPrice - trade.entryPrice) / trade.entryPrice) * 100
    : 0;

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
        secondsVisible: true,
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

    // Generate candlestick data
    const generateCandlestickData = () => {
      const now = Math.floor(Date.now() / 1000);
      const data = [];
      let lastClose = trade.entryPrice || trade.currentPrice || 1;
      let volume = 1000000;
      
      // Generate 60 one-minute candles
      for (let i = 0; i < 60; i++) {
        const time = now - (60 - i) * 60;
        const open = lastClose * (1 + (Math.random() - 0.5) * 0.01);
        const high = Math.max(open, lastClose) * (1 + Math.random() * 0.005);
        const low = Math.min(open, lastClose) * (1 - Math.random() * 0.005);
        const close = lastClose * (1 + (Math.random() - 0.5) * 0.01);
        
        volume *= (1 + (Math.random() - 0.5) * 0.3);

        data.push({
          candleData: {
            time,
            open,
            high,
            low,
            close,
          },
          volumeData: {
            time,
            value: volume,
            color: close >= open ? '#10B981' : '#EF4444',
          }
        });

        lastClose = close;
      }
      return data;
    };

    const candleData = generateCandlestickData();
    candlestickSeries.setData(candleData.map(d => d.candleData));
    volumeSeries.setData(candleData.map(d => d.volumeData));
    
    // Fit content and add margin
    chartRef.current?.timeScale().fitContent();

    // Update data every minute
    const interval = setInterval(() => {
      const lastData = candleData[candleData.length - 1];
      const newTime = Math.floor(Date.now() / 1000);
      
      const newClose = lastData.candleData.close * (1 + (Math.random() - 0.5) * 0.01);
      const newVolume = lastData.volumeData.value * (1 + (Math.random() - 0.5) * 0.2);
      
      const newCandleData = {
        time: newTime,
        open: lastData.candleData.close,
        high: Math.max(lastData.candleData.close, newClose),
        low: Math.min(lastData.candleData.close, newClose),
        close: newClose,
      };

      const newVolumeData = {
        time: newTime,
        value: newVolume,
        color: newClose >= lastData.candleData.close ? '#10B981' : '#EF4444',
      };

      candlestickSeries.update(newCandleData);
      volumeSeries.update(newVolumeData);
    }, 60000);

    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [trade.entryPrice, trade.currentPrice]);

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
                {formatTokenAddress(trade.tokenAddress)}
                <span className="ml-2 text-sm bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                  TRADE
                </span>
              </h2>
              <div className="text-gray-400 mt-1 font-medium">
                {formatDate(trade.timestamp)}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">Entry Price</div>
              <div className="text-white font-semibold">
                {formatCurrency(trade.entryPrice, 8)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">Current Price</div>
              <div className={`font-semibold ${profitPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(trade.currentPrice, 8)}
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
              <span className="text-gray-400">{formatDate(trade.timestamp)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <BarChart2 size={16} className="text-gray-400" />
              <span className={`flex items-center ${profitPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {profitPercentage >= 0 ? (
                  <ArrowUpRight size={16} className="mr-1" />
                ) : (
                  <ArrowDownRight size={16} className="mr-1" />
                )}
                {formatNumber(Math.abs(profitPercentage))}%
              </span>
            </div>
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
            <div className="text-gray-400 text-sm">Volume 24h</div>
            <DollarSign size={16} className="text-blue-400" />
          </div>
          <div className="text-white font-semibold">
            {formatCurrency(trade.volume24h)}
          </div>
        </div>
        <div className="bg-gray-900/30 backdrop-blur-sm rounded-xl p-4 border border-gray-800/50">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-400 text-sm">Market Cap</div>
            <BarChart2 size={16} className="text-blue-400" />
          </div>
          <div className="text-white font-semibold">
            {formatCurrency(trade.marketCap)}
          </div>
        </div>
        <div className="bg-gray-900/30 backdrop-blur-sm rounded-xl p-4 border border-gray-800/50">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-400 text-sm">Last Update</div>
            <Clock size={16} className="text-blue-400" />
          </div>
          <div className="text-white font-semibold">
            {formatDate(trade.lastUpdate)}
          </div>
        </div>
        <div className="bg-gray-900/30 backdrop-blur-sm rounded-xl p-4 border border-gray-800/50">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-400 text-sm">Status</div>
            <Users size={16} className="text-blue-400" />
          </div>
          <div className="text-white font-semibold">
            ACTIVE
          </div>
        </div>
      </div>
    </div>
  );
};