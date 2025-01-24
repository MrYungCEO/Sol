import { API_BASE_URL, ERROR_MESSAGES, apiClient } from '../config/api';
import type { TokenInfo, Trade, TradeWithStats } from '../types/trades';

export class TradeService {
  static async getWalletTransactions(walletAddress: string) {
    try {
      if (!walletAddress) {
        throw new Error(ERROR_MESSAGES.INVALID_WALLET);
      }

      // Use the apiClient for consistent error handling
      const response = await apiClient.get(`/trades/${walletAddress}`);
      
      // Ensure we have a valid response structure
      if (!response || typeof response !== 'object') {
        throw new Error(ERROR_MESSAGES.INVALID_RESPONSE);
      }

      // If the response is empty, return an empty array
      if (!response.data || !Array.isArray(response.data)) {
        return {
          success: true,
          data: [],
          message: 'No transactions found'
        };
      }

      // Transform the data into the expected format
      const trades = response.data.map(tx => ({
        signature: tx.signature || '',
        timestamp: tx.timestamp || Date.now(),
        type: tx.type || 'unknown',
        tokenAddress: tx.tokenAddress || '',
        value: tx.value || '0',
        walletAddress: tx.walletAddress || walletAddress,
        tokenTransfers: tx.tokenTransfers || []
      }));

      return {
        success: true,
        data: trades,
        message: trades.length > 0 ? `Found ${trades.length} transactions` : 'No transactions found'
      };
    } catch (error) {
      console.error('Error fetching wallet transactions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : ERROR_MESSAGES.FETCH_FAILED,
        data: [], // Always return an empty array for consistent data structure
        message: 'Failed to fetch transactions'
      };
    }
  }

  static async getTokenPrice(tokenAddress: string) {
    try {
      const response = await apiClient.get(`/price?address=${tokenAddress}`);
      if (!response || !response.success) {
        return null;
      }
      
      return {
        price: response.price || 0,
        volume24h: response.volume24h,
        marketCap: response.marketCap,
        lastUpdate: Date.now()
      };
    } catch (error) {
      console.error('Error fetching token price:', error);
      return null;
    }
  }

  static async getTokenPrices(tokenAddresses: string[]) {
    try {
      const response = await apiClient.post('/price', { token_addresses: tokenAddresses });
      return response.success ? response.data : null;
    } catch (error) {
      console.error('Error fetching token prices:', error);
      return null;
    }
  }
}