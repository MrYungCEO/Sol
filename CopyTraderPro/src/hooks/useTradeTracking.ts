import { useState, useEffect, useCallback } from 'react';
import { WebSocketService } from '../services/WebSocketService';
import { TradeService } from '../services/TradeService';
import { WS_URL } from '../config/api';
import type { Trade, TradeWithStats } from '../types/trades';
import { useNotification } from '../contexts/NotificationContext';

export function useTradeTracking(walletAddress: string | null) {
  const { addNotification } = useNotification();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [activeTrades, setActiveTrades] = useState<TradeWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [ws, setWs] = useState<WebSocketService | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!walletAddress) return;

    const wsService = new WebSocketService(
      WS_URL,
      // Message handler
      async (message) => {
        try {
          if (message.type === 'trade') {
            const stats = await TradeService.getTokenPrice(message.data.tokenAddress);
            if (stats) {
              const tradeWithStats: TradeWithStats = {
                ...message.data,
                currentPrice: stats.price || 0,
                volume24h: stats.volume24h,
                marketCap: stats.marketCap,
                lastUpdate: Date.now()
              };

              setTrades(prev => [tradeWithStats, ...prev]);
              if (message.data.type === 'buy') {
                setActiveTrades(prev => [tradeWithStats, ...prev]);
              }

              addNotification('New trade detected', 'info');
            }
          } else if (message.type === 'price_update') {
            setActiveTrades(prev => 
              prev.map(trade => 
                trade.tokenAddress === message.data.tokenAddress
                  ? { 
                      ...trade, 
                      currentPrice: message.data.price || trade.currentPrice,
                      volume24h: message.data.volume24h,
                      marketCap: message.data.marketCap,
                      lastUpdate: Date.now()
                    }
                  : trade
              )
            );
          }
        } catch (error) {
          console.error('Error processing trade message:', error);
        }
      },
      // Connected handler
      () => {
        setIsConnected(true);
        setError(null);
        addNotification('Connected to trading server', 'success');
      },
      // Disconnected handler
      () => {
        setIsConnected(false);
        addNotification('Disconnected from trading server', 'warning');
      },
      // Error handler
      (error) => {
        console.error('WebSocket error:', error);
        setError(error instanceof Error ? error.message : 'WebSocket connection error');
      }
    );

    wsService.connect();
    setWs(wsService);

    return () => {
      wsService.disconnect();
      setWs(null);
    };
  }, [walletAddress, addNotification]);

  // Track new wallet
  const trackWallet = useCallback(async (address: string) => {
    if (!address) {
      addNotification('Please enter a wallet address', 'error');
      return false;
    }

    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
      addNotification('Invalid wallet address format', 'error');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await TradeService.getWalletTransactions(address);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to track wallet');
      }

      // If WebSocket is connected, send subscription message
      if (ws?.isConnected()) {
        ws.send(JSON.stringify({
          type: 'subscribe',
          walletAddress: address
        }));
      }

      addNotification(`Successfully tracking wallet with ${response.data.length} transactions`, 'success');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to track wallet';
      setError(errorMessage);
      addNotification(errorMessage, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [ws, addNotification]);

  return {
    trades,
    activeTrades,
    loading,
    error,
    isConnected,
    trackWallet
  };
}