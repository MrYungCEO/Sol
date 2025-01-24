import { useState, useCallback } from 'react';
import { JupiterService } from '../services/JupiterService';
import { useNotification } from '../contexts/NotificationContext';

export function useJupiter() {
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeSwap = useCallback(async (
    inputMint: string,
    outputMint: string,
    amount: number,
    userPublicKey: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      // Get quote
      const quote = await JupiterService.getQuote(inputMint, outputMint, amount);
      if (!quote || quote.error) {
        throw new Error(quote?.error || 'Failed to get quote');
      }

      // Execute swap
      const swap = await JupiterService.swap(quote, userPublicKey);
      if (!swap || swap.error) {
        throw new Error(swap?.error || 'Failed to execute swap');
      }

      // Get transaction details
      const transaction = await JupiterService.getTransaction(swap.txid);
      
      addNotification('Swap executed successfully', 'success');
      return {
        success: true,
        txid: swap.txid,
        transaction
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Swap failed';
      setError(errorMessage);
      addNotification(errorMessage, 'error');
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  return {
    executeSwap,
    loading,
    error
  };
}