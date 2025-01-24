import { useState, useEffect, useMemo } from 'react';
import trackedTradesData from '../data/tracked_trades.json';
import type { TrackedTrade, TrackedTradesData, WalletGroup } from '../types/tracked-trades';

export function useTrackedTrades() {
  const [trades, setTrades] = useState<TrackedTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const tradesArray = Object.values(trackedTradesData as TrackedTradesData);
      setTrades(tradesArray);
      setLoading(false);
    } catch (err) {
      setError('Failed to load tracked trades data');
      setLoading(false);
    }
  }, []);

  const walletGroups = useMemo(() => {
    const groups = new Map<string, TrackedTrade[]>();
    const ungroupedTrades: TrackedTrade[] = [];
    
    // Group trades by wallet_group
    trades.forEach(trade => {
      if (trade.wallet_group) {
        const group = groups.get(trade.wallet_group) || [];
        groups.set(trade.wallet_group, [...group, trade]);
      } else {
        ungroupedTrades.push(trade);
      }
    });

    // Convert to WalletGroup objects
    const groupedWallets = Array.from(groups.entries()).map(([groupId, groupTrades]): WalletGroup => {
      const successfulTrades = groupTrades.filter(t => t.result === 'success').length;
      const totalProfit = groupTrades.reduce((sum, t) => sum + t.profit, 0);

      return {
        id: groupId,
        name: `Wallet ${groupId.slice(0, 6)}...`,
        address: groupId,
        trades: groupTrades.sort((a, b) => 
          new Date(b.date_time).getTime() - new Date(a.date_time).getTime()
        ),
        totalProfit,
        winRate: (successfulTrades / groupTrades.length) * 100,
        successfulTrades,
        totalTrades: groupTrades.length
      };
    });

    // Add ungrouped trades as individual wallets if they exist
    if (ungroupedTrades.length > 0) {
      ungroupedTrades.forEach(trade => {
        groupedWallets.push({
          id: trade.id,
          name: `Individual Trade ${trade.id.slice(0, 6)}...`,
          address: trade.token_address,
          trades: [trade],
          totalProfit: trade.profit,
          winRate: trade.result === 'success' ? 100 : 0,
          successfulTrades: trade.result === 'success' ? 1 : 0,
          totalTrades: 1
        });
      });
    }

    return groupedWallets;
  }, [trades]);

  const activeTrades = trades.filter(trade => trade.status === 'active');
  const totalProfit = trades.reduce((sum, trade) => sum + trade.profit, 0);
  const successfulTrades = trades.filter(trade => trade.result === 'success').length;
  const winRate = trades.length > 0 ? (successfulTrades / trades.length) * 100 : 0;

  return {
    trades,
    activeTrades,
    walletGroups,
    totalProfit,
    winRate,
    loading,
    error
  };
}