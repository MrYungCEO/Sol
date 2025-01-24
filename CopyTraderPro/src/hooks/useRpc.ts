import { useState, useCallback } from 'react';
import { RpcService } from '../services/RpcService';
import { useNotification } from '../contexts/NotificationContext';

export function useRpc() {
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getBalance = useCallback(async (address: string) => {
    setLoading(true);
    setError(null);
    try {
      const balance = await RpcService.getBalance(address);
      return balance;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get balance';
      setError(errorMessage);
      addNotification(errorMessage, 'error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const getTransaction = useCallback(async (signature: string) => {
    setLoading(true);
    setError(null);
    try {
      const transaction = await RpcService.getTransaction(signature);
      return transaction;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get transaction';
      setError(errorMessage);
      addNotification(errorMessage, 'error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const getTokenAccounts = useCallback(async (owner: string) => {
    setLoading(true);
    setError(null);
    try {
      const accounts = await RpcService.getTokenAccounts(owner);
      return accounts;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get token accounts';
      setError(errorMessage);
      addNotification(errorMessage, 'error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  return {
    getBalance,
    getTransaction,
    getTokenAccounts,
    loading,
    error
  };
}