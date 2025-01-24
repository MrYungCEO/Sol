import { useState, useEffect, useCallback } from 'react';
import type { TradeWithStats } from '../types/trades';

type TradeStatus = 'recent' | 'favorites' | 'closed';

interface TradeWithStatus extends TradeWithStats {
  status: TradeStatus;
  pairedTradeId?: string;
  isFavorited: boolean;
}

export function useTradeTabs(initialTrades: TradeWithStats[]) {
  const [trades, setTrades] = useState<TradeWithStatus[]>([]);
  const [activeTab, setActiveTab] = useState<TradeStatus>('recent');

  // Load favorites from localStorage on mount
  useEffect(() => {
    const savedFavorites = JSON.parse(localStorage.getItem('favoriteTrades') || '[]');
    const tradesWithStatus = initialTrades.map(trade => ({
      ...trade,
      status: 'recent' as TradeStatus,
      isFavorited: savedFavorites.includes(trade.signature)
    }));
    setTrades(tradesWithStatus);
  }, [initialTrades]);

  // Add trade to favorites
  const addToFavorites = useCallback((tradeId: string) => {
    setTrades(prevTrades => {
      const updatedTrades = prevTrades.map(trade => 
        trade.signature === tradeId 
          ? { ...trade, isFavorited: true }
          : trade
      );
      
      // Save to localStorage
      const savedFavorites = JSON.parse(localStorage.getItem('favoriteTrades') || '[]');
      if (!savedFavorites.includes(tradeId)) {
        savedFavorites.push(tradeId);
        localStorage.setItem('favoriteTrades', JSON.stringify(savedFavorites));
      }
      
      return updatedTrades;
    });
  }, []);

  // Remove trade from favorites
  const removeFromFavorites = useCallback((tradeId: string) => {
    setTrades(prevTrades => {
      const updatedTrades = prevTrades.map(trade => 
        trade.signature === tradeId 
          ? { ...trade, isFavorited: false }
          : trade
      );
      
      // Remove from localStorage
      const savedFavorites = JSON.parse(localStorage.getItem('favoriteTrades') || '[]');
      const updatedFavorites = savedFavorites.filter((id: string) => id !== tradeId);
      localStorage.setItem('favoriteTrades', JSON.stringify(updatedFavorites));
      
      return updatedTrades;
    });
  }, []);

  // Check for matching trades and move to closed
  useEffect(() => {
    const favoriteTrades = trades.filter(t => t.isFavorited);
    const recentTrades = trades.filter(t => !t.isFavorited);

    for (const favTrade of favoriteTrades) {
      // Look for opposite trade type with same token
      const matchingTrade = recentTrades.find(t => 
        t.tokenAddress === favTrade.tokenAddress && 
        t.type !== favTrade.type &&
        new Date(t.timestamp).getTime() > new Date(favTrade.timestamp).getTime()
      );

      if (matchingTrade) {
        setTrades(prevTrades => {
          const updatedTrades = prevTrades.map(trade => {
            if (trade.signature === favTrade.signature || trade.signature === matchingTrade.signature) {
              return {
                ...trade,
                status: 'closed',
                pairedTradeId: trade.signature === favTrade.signature ? matchingTrade.signature : favTrade.signature
              };
            }
            return trade;
          });
          return updatedTrades;
        });
      }
    }
  }, [trades]);

  // Get trades for current tab
  const currentTrades = activeTab === 'favorites' 
    ? trades.filter(t => t.isFavorited && t.status !== 'closed')
    : trades.filter(t => t.status === 'recent');

  return {
    trades: currentTrades,
    activeTab,
    setActiveTab,
    addToFavorites,
    removeFromFavorites,
    isFavorite: useCallback((tradeId: string) => 
      trades.some(t => t.signature === tradeId && t.isFavorited),
    [trades])
  };
}
