import { useState } from 'react';
import { apiService } from '../services/api';
import type { ApiResponse } from '../types/api';

interface UseApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

interface UseApiResponse<T> extends UseApiState<T> {
  execute: (...args: any[]) => Promise<void>;
  reset: () => void;
}

export function useApi<T>(
  apiFunction: (...args: any[]) => Promise<ApiResponse<T>>
): UseApiResponse<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    error: null,
    loading: false,
  });

  const execute = async (...args: any[]) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await apiFunction(...args);
      if (response.status === 'error' || !response.data) {
        throw new Error(response.error || 'Unknown error occurred');
      }
      setState({ data: response.data, error: null, loading: false });
    } catch (error) {
      setState({
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        loading: false,
      });
    }
  };

  const reset = () => {
    setState({ data: null, error: null, loading: false });
  };

  return { ...state, execute, reset };
}

// Predefined hooks for common operations
export function useTokenPrice(tokenAddress: string) {
  return useApi(() => apiService.getTokenPrice(tokenAddress));
}

export function useActiveTrades() {
  return useApi(apiService.getActiveTrades);
}

export function useTradeHistory() {
  return useApi(apiService.getTradeHistory);
}

export function useWalletBalances() {
  return useApi(apiService.getWalletBalances);
}

export function useWalletTransactions(limit?: number) {
  return useApi(() => apiService.getWalletTransactions(limit));
}