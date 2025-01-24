import { useState, useEffect, useMemo } from 'react';
import trackedTradesData from '../data/tracked_trades.json';
import type { TrackedTrade, TrackedTradesData, WalletGroup } from '../types/tracked-trades';
import type { TradeWithStats } from '../types/trades';

export function useTrackedTrades() {
  const [trades, setTrades] = useState<TrackedTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Convert the object to an array of trades
      const tradesArray = Object.entries(trackedTradesData as TrackedTradesData).map(([id, trade]) => ({
        ...trade,
        id,
        amount_in_sol: parseFloat(trade.amount_in_sol?.toString() || '0'),
        tokenAmount: parseFloat(trade.tokenAmount?.toString() || '0')
      }));
      setTrades(tradesArray);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load tracked trades:', err);
      setError('Failed to load tracked trades data');
      setLoading(false);
    }
  }, []);

  const walletGroups = useMemo(() => {
    // Group trades by wallet_group
    const groupedByWallet = trades.reduce((acc, trade) => {
      const groupId = trade.wallet_group || 'unknown';
      if (!acc.has(groupId)) {
        acc.set(groupId, []);
      }
      acc.get(groupId)?.push(trade);
      return acc;
    }, new Map<string, TrackedTrade[]>());

    // Convert to WalletGroup objects
    const groupedWallets = Array.from(groupedByWallet.entries()).map(([groupId, groupTrades]): WalletGroup => {
      // Calculate total volume and stats
      const totalVolume = groupTrades.reduce((sum, t) => sum + (t.amount_in_sol || 0), 0);
      const buyTrades = groupTrades.filter(t => t.type === 'buy');
      const sellTrades = groupTrades.filter(t => t.type === 'sell');
      
      // Convert TrackedTrade to TradeWithStats
      const convertedTrades: TradeWithStats[] = groupTrades.map(trade => ({
        tokenAddress: trade.tokenAddress,
        tokenSymbol: trade.html?.replace(/<[^>]*>/g, '').trim() || '',  // Extract text from HTML
        entryPrice: 0,  // We don't have this data yet
        currentPrice: 0,  // We don't have this data yet
        signature: trade.signature || '',
        timestamp: new Date(trade.date_time).getTime(),
        lastUpdate: new Date(trade.date_time).getTime(),
        updating: false,
        volume24h: 0,  // We don't have this data yet
        marketCap: 0,  // We don't have this data yet
        type: trade.type || 'buy',
        profit: 0,  // We don't have this data yet
        amount: trade.amount_in_sol || 0,
        tokenAmount: trade.tokenAmount || 0
      }));

      // Sort trades by date, most recent first
      const sortedTrades = convertedTrades.sort((a, b) => b.timestamp - a.timestamp);

      return {
        id: groupId,
        name: `Wallet ${groupId.slice(0, 6)}...${groupId.slice(-4)}`,
        address: groupId,
        trades: sortedTrades,
        totalProfit: 0,  // Calculate this when we have price data
        totalVolume,
        buyCount: buyTrades.length,
        sellCount: sellTrades.length,
        totalTrades: groupTrades.length,
        winRate: 0,  // Calculate this when we have price data
        successfulTrades: 0  // Calculate this when we have price data
      };
    });

    return groupedWallets;
  }, [trades]);

  // Calculate overall stats
  const stats = useMemo(() => {
    const allTrades = trades || [];
    const buyTrades = allTrades.filter(t => t.type === 'buy');
    const sellTrades = allTrades.filter(t => t.type === 'sell');
    const totalVolume = allTrades.reduce((sum, t) => sum + (t.amount_in_sol || 0), 0);

    return {
      totalTrades: allTrades.length,
      buyCount: buyTrades.length,
      sellCount: sellTrades.length,
      totalVolume,
      totalProfit: 0  // We'll calculate this when we have price data
    };
  }, [trades]);

  return {
    walletGroups,
    stats,
    loading,
    error,
    totalProfit: 0,  // We'll calculate this when we have price data
    winRate: 0  // We'll calculate this when we have price data
  };
}