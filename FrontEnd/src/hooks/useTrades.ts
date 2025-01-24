import { useState, useEffect, useMemo, useCallback } from 'react';
import tradesData from '../data/trades.json';
import type { Trade, TradesData } from '../types/trades';

export function useTrades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrades = useCallback(async () => {
    try {
      // In a real app, this would be an API call
      // For now, we'll simulate loading from the JSON file
      const tradesArray = Object.values(tradesData as TradesData);
      setTrades(tradesArray);
      setError(null);
    } catch (err) {
      setError('Failed to load trades data');
      console.error('Error loading trades:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  const refreshTrades = useCallback(async () => {
    setLoading(true);
    try {
      // In a real app, this would be an API call to refresh data
      // For now, we'll just reload from the JSON file
      await loadTrades();
    } catch (err) {
      setError('Failed to refresh trades data');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadTrades]);

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
    refreshTrades
  };
}