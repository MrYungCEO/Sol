import { useState, useEffect, useCallback } from 'react';
import { SnipeService } from '../services/SnipeService';
import { useNotification } from '../contexts/NotificationContext';
import type { Trade, TradeWithStats } from '../types/trades';

export function useSnipeTrading() {
  const { addNotification } = useNotification();
  const [snipeService] = useState(() => new SnipeService());
  const [isConnected, setIsConnected] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeTrades, setActiveTrades] = useState<TradeWithStats[]>([]);
  const [pendingTrade, setPendingTrade] = useState<Trade | null>(null);

  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      addNotification('Connected to trading server', 'success');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      addNotification('Disconnected from trading server', 'warning');
    };

    const handleError = (error: Error) => {
      addNotification(`Error: ${error.message}`, 'error');
    };

    const handlePendingTrade = (trade: Trade) => {
      setPendingTrade(trade);
      addNotification(`New trade detected: ${trade.tokenAddress}`, 'info');
    };

    const handleTradeExecuted = ({ trade, result }: any) => {
      addNotification(`Trade executed: ${trade.tokenAddress}`, 'success');
      setPendingTrade(null);
    };

    const handlePriceUpdated = (trade: TradeWithStats) => {
      setActiveTrades(prev => 
        prev.map(t => t.tokenAddress === trade.tokenAddress ? trade : t)
      );
    };

    snipeService.on('connected', handleConnect);
    snipeService.on('disconnected', handleDisconnect);
    snipeService.on('error', handleError);
    snipeService.on('pendingTrade', handlePendingTrade);
    snipeService.on('tradeExecuted', handleTradeExecuted);
    snipeService.on('priceUpdated', handlePriceUpdated);

    return () => {
      snipeService.removeAllListeners();
      snipeService.disconnect();
    };
  }, [snipeService, addNotification]);

  const toggleCopyTrading = useCallback((enabled: boolean) => {
    snipeService.toggleCopyTrading(enabled);
    setIsCopying(enabled);
    addNotification(
      enabled ? 'Copy trading enabled' : 'Copy trading disabled',
      enabled ? 'success' : 'info'
    );
  }, [snipeService, addNotification]);

  const togglePause = useCallback((paused: boolean) => {
    snipeService.togglePause(paused);
    setIsPaused(paused);
    addNotification(
      paused ? 'Trading paused' : 'Trading resumed',
      'info'
    );
  }, [snipeService, addNotification]);

  return {
    isConnected,
    isCopying,
    isPaused,
    activeTrades,
    pendingTrade,
    toggleCopyTrading,
    togglePause
  };
}