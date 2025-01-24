import { useState, useEffect, useMemo } from 'react';
import tradesData from '../data/trades.json';
import type { Trade, TradesData } from '../types/trades';

export function useTrades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial trades
  useEffect(() => {
    try {
      const tradesArray = Object.values(tradesData as TradesData);
      setTrades(tradesArray);
      setLoading(false);
    } catch (err) {
      setError('Failed to load trades data');
      setLoading(false);
    }
  }, []);

  // Function to update trades
  const updateTrades = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8005/api/refresh-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to refresh prices');
      }
      if (data.success && data.data) {
        const updatedTrades = Object.values(data.data);
        setTrades(updatedTrades);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh prices');
    } finally {
      setLoading(false);
    }
  };

  const activeTrades = useMemo(() => 
    trades.filter(trade => trade.status === 'active'),
    [trades]
  );

  const closedTrades = useMemo(() => 
    trades.filter(trade => trade.status === 'closed'),
    [trades]
  );
  
  const totalProfit = useMemo(() => 
    trades.reduce((sum, trade) => sum + trade.profit, 0),
    [trades]
  );

  const successfulTrades = useMemo(() => 
    trades.filter(trade => trade.result === 'success').length,
    [trades]
  );

  const winRate = useMemo(() => 
    trades.length > 0 ? (successfulTrades / trades.length) * 100 : 0,
    [trades, successfulTrades]
  );

  return {
    trades,
    activeTrades,
    closedTrades,
    totalProfit,
    winRate,
    loading,
    error,
    updateTrades,
  };
}