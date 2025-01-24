import { useState, useEffect, useCallback } from 'react';
import { WebSocketService } from '../services/WebSocketService';
import { API_BASE_URL } from '../config/api';

export function useTradingWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);

  const wsService = new WebSocketService(
    `${API_BASE_URL.replace('http', 'ws')}/trades/ws`,
    // Message handler
    (data) => {
      setLastMessage(data);
    },
    // Connected handler
    () => {
      setIsConnected(true);
      setError(null);
    },
    // Disconnected handler
    () => {
      setIsConnected(false);
    },
    // Error handler
    (error) => {
      setError(error);
      setIsConnected(false);
    }
  );

  useEffect(() => {
    wsService.connect();
    return () => wsService.disconnect();
  }, []);

  const reconnect = useCallback(() => {
    wsService.connect();
  }, []);

  return {
    isConnected,
    lastMessage,
    error,
    reconnect
  };
}