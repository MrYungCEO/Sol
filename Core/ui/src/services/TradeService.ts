import { API_BASE_URL, ERROR_MESSAGES, apiClient } from '../config/api';
import type { TokenInfo, Trade, TradeWithStats } from '../types/trades';

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_REQUESTS_PER_SECOND: 5,
  BATCH_SIZE: 3,
  BATCH_INTERVAL: 2000, // 2 seconds
  MAX_RETRIES: 3,
  BACKOFF_DELAY: 1000, // Start with 1 second
};

export class TradeService {
  private static requestQueue: Array<{
    signature: string;
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
    retries: number;
  }> = [];
  private static processingQueue = false;
  private static lastRequestTime = 0;
  private static requestCount = 0;

  private static async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private static async processQueue() {
    if (this.processingQueue) return;
    this.processingQueue = true;

    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      // Reset counter if a second has passed
      if (timeSinceLastRequest >= 1000) {
        this.requestCount = 0;
        this.lastRequestTime = now;
      }
      
      // If we've hit the rate limit, wait before continuing
      if (this.requestCount >= RATE_LIMIT.MAX_REQUESTS_PER_SECOND) {
        await this.delay(1000 - timeSinceLastRequest);
        continue;
      }

      // Process batch of requests
      const batch = this.requestQueue.splice(0, RATE_LIMIT.BATCH_SIZE);
      if (batch.length === 0) break;

      try {
        // Prepare batch request
        const batchRequest = {
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'getTransaction',
          params: batch.map(item => ([
            item.signature,
            {
              encoding: 'jsonParsed',
              commitment: 'confirmed',
              maxSupportedTransactionVersion: 0
            }
          ]))
        };

        const response = await fetch(API_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batchRequest)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.error) {
          // Handle rate limit errors
          if (data.error.code === -32429 || 
              data.error.message?.includes('rate limit') ||
              data.error.message?.includes('exceeded limit')) {
            
            console.log('Rate limit hit, applying backoff...');
            
            // Put requests back in queue with increased retry count
            batch.forEach(item => {
              if (item.retries < RATE_LIMIT.MAX_RETRIES) {
                this.requestQueue.unshift({
                  ...item,
                  retries: item.retries + 1
                });
              } else {
                item.reject(new Error('Max retries exceeded'));
              }
            });
            
            // Calculate backoff delay
            const backoffDelay = RATE_LIMIT.BACKOFF_DELAY * 
              Math.pow(2, Math.min(...batch.map(item => item.retries)));
            
            await this.delay(backoffDelay);
            continue;
          }
          throw new Error(data.error.message || 'Failed to fetch transactions');
        }

        // Process each transaction in the batch
        data.result.forEach((result: any, index: number) => {
          if (result && result.transaction) {
            batch[index].resolve(result);
          } else {
            batch[index].reject(new Error('Transaction not found or invalid'));
          }
        });

        this.requestCount++;
        this.lastRequestTime = Date.now();

        // Add delay between batches
        await this.delay(RATE_LIMIT.BATCH_INTERVAL);
      } catch (error) {
        console.error('Batch processing error:', error);
        batch.forEach(item => item.reject(error));
      }
    }

    this.processingQueue = false;
  }

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