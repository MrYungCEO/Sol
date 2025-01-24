import { API_BASE_URL, SOLANA_RPC_URL } from '../config/api';
import { useNotification } from '../contexts/NotificationContext';

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_REQUESTS_PER_SECOND: 3,
  BATCH_SIZE: 2,
  BATCH_INTERVAL: 2000, // 2 seconds
  MAX_RETRIES: 3,
  BACKOFF_DELAY: 2000, // Start with 2 seconds
};

export class JupiterService {
  private static requestQueue: Array<{
    request: () => Promise<any>;
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
        // Process each request in the batch
        const results = await Promise.allSettled(
          batch.map(item => item.request())
        );

        // Handle results
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            batch[index].resolve(result.value);
          } else {
            const error = result.reason;
            
            // Handle rate limit errors
            if (error.message?.includes('rate limit') || 
                error.message?.includes('429') ||
                error.message?.includes('exceeded limit')) {
              
              console.log('Rate limit hit, applying backoff...');
              
              // Requeue with backoff if under max retries
              if (batch[index].retries < RATE_LIMIT.MAX_RETRIES) {
                this.requestQueue.unshift({
                  ...batch[index],
                  retries: batch[index].retries + 1
                });
              } else {
                batch[index].reject(new Error('Max retries exceeded'));
              }
            } else {
              batch[index].reject(error);
            }
          }
        });

        this.requestCount += batch.length;
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

  private static async executeRequest<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        request,
        resolve,
        reject,
        retries: 0
      });
      this.processQueue().catch(console.error);
    });
  }

  static async getQuote(inputMint: string, outputMint: string, amount: number) {
    return this.executeRequest(async () => {
      const url = `${API_BASE_URL}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Quote failed: ${response.statusText}`);
      }
      return response.json();
    });
  }

  static async swap(quoteResponse: any, userPublicKey: string) {
    return this.executeRequest(async () => {
      const url = `${API_BASE_URL}/swap`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quoteResponse,
          userPublicKey,
          wrapUnwrapSOL: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`Swap failed: ${response.statusText}`);
      }
      
      return response.json();
    });
  }

  static async getTransaction(signature: string) {
    return this.executeRequest(async () => {
      const response = await fetch(SOLANA_RPC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTransaction',
          params: [
            signature,
            {
              encoding: 'jsonParsed',
              commitment: 'confirmed',
              maxSupportedTransactionVersion: 0
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch transaction: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message || 'Failed to fetch transaction');
      }

      return data.result;
    });
  }
}