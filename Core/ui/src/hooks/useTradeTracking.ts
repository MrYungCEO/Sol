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

  // Fetch initial transactions
  useEffect(() => {
    if (!walletAddress) return;

    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await TradeService.getWalletTransactions(walletAddress);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch transactions');
        }

        // Process transactions into trades
        const processedTrades = await Promise.all(
          response.data.map(async (tx: any) => {
            try {
              // For each token transfer, get current price
              const tradesFromTransfer = await Promise.all(
                (tx.tokenTransfers || []).map(async (transfer: any) => {
                  try {
                    const priceData = await TradeService.getTokenPrice(transfer.mint);
                    
                    return {
                      tokenAddress: transfer.mint,
                      signature: tx.signature,
                      timestamp: tx.blockTime * 1000, // Convert to milliseconds
                      entryPrice: 0, // We'll need historical price data for this
                      currentPrice: priceData?.price || 0,
                      volume24h: priceData?.volume24h,
                      marketCap: priceData?.marketCap,
                      amount: transfer.uiAmount,
                      type: transfer.amount > 0 ? 'buy' : 'sell',
                      lastUpdate: Date.now()
                    };
                  } catch (error) {
                    console.error('Error processing transfer:', error);
                    return null;
                  }
                })
              );

              return tradesFromTransfer.filter(Boolean);
            } catch (error) {
              console.error('Error processing transaction:', error);
              return null;
            }
          })
        );

        const flattenedTrades = processedTrades.flat().filter(Boolean);
        setTrades(flattenedTrades);
        
        // Set active trades (only buys without corresponding sells)
        const activeTokenTrades = flattenedTrades.reduce((acc: any[], trade: any) => {
          if (trade.type === 'buy') {
            const sellFound = flattenedTrades.find(
              t => t.type === 'sell' && t.tokenAddress === trade.tokenAddress
            );
            if (!sellFound) acc.push(trade);
          }
          return acc;
        }, []);

        setActiveTrades(activeTokenTrades);
        
        if (flattenedTrades.length > 0) {
          addNotification(`Found ${flattenedTrades.length} transactions`, 'success');
        } else {
          addNotification('No transactions found for this wallet', 'info');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch transactions';
        setError(errorMessage);
        addNotification(errorMessage, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [walletAddress, addNotification]);

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