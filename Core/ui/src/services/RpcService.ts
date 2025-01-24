import { SOLANA_RPC_URL } from '../config/api';

// RPC rate limiting configuration
const RPC_CONFIG = {
  MAX_REQUESTS_PER_SECOND: 40, // Helius default rate limit
  BATCH_SIZE: 10,
  BATCH_INTERVAL: 1000, // 1 second between batches
  MAX_RETRIES: 3,
  BACKOFF_DELAY: 1000, // Start with 1 second
  COMMITMENT: 'finalized' as const
};

interface RpcRequest {
  method: string;
  params: any[];
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  retries: number;
}

export class RpcService {
  private static requestQueue: RpcRequest[] = [];
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
      if (this.requestCount >= RPC_CONFIG.MAX_REQUESTS_PER_SECOND) {
        await this.delay(1000 - timeSinceLastRequest);
        continue;
      }

      // Process batch of requests
      const batch = this.requestQueue.splice(0, RPC_CONFIG.BATCH_SIZE);
      if (batch.length === 0) break;

      try {
        // Prepare batch request
        const batchRequest = {
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'batchRequest',
          batchRequests: batch.map((req, index) => ({
            jsonrpc: '2.0',
            id: index,
            method: req.method,
            params: req.params
          }))
        };

        const response = await fetch(SOLANA_RPC_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
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
            
            // Requeue requests with backoff
            batch.forEach(req => {
              if (req.retries < RPC_CONFIG.MAX_RETRIES) {
                this.requestQueue.unshift({
                  ...req,
                  retries: req.retries + 1
                });
              } else {
                req.reject(new Error('Max retries exceeded'));
              }
            });
            
            // Calculate backoff delay
            const backoffDelay = RPC_CONFIG.BACKOFF_DELAY * 
              Math.pow(2, Math.min(...batch.map(req => req.retries)));
            
            await this.delay(backoffDelay);
            continue;
          }
          throw new Error(data.error.message || 'RPC request failed');
        }

        // Process batch responses
        data.batchResponses.forEach((response: any, index: number) => {
          if (response.error) {
            batch[index].reject(new Error(response.error.message));
          } else {
            batch[index].resolve(response.result);
          }
        });

        this.requestCount += batch.length;
        this.lastRequestTime = Date.now();

        // Add delay between batches
        await this.delay(RPC_CONFIG.BATCH_INTERVAL);
      } catch (error) {
        console.error('Batch processing error:', error);
        batch.forEach(req => req.reject(error));
      }
    }

    this.processingQueue = false;
  }

  private static async executeRequest<T>(method: string, params: any[] = []): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        method,
        params: [...params, { commitment: RPC_CONFIG.COMMITMENT }],
        resolve,
        reject,
        retries: 0
      });
      this.processQueue().catch(console.error);
    });
  }

  static async getBalance(address: string): Promise<number> {
    return this.executeRequest('getBalance', [address]);
  }

  static async getTransaction(signature: string): Promise<any> {
    return this.executeRequest('getTransaction', [
      signature,
      { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }
    ]);
  }

  static async getTokenAccounts(owner: string): Promise<any[]> {
    return this.executeRequest('getTokenAccountsByOwner', [
      owner,
      { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
      { encoding: 'jsonParsed' }
    ]);
  }

  static async getHealth(): Promise<string> {
    try {
      const response = await fetch(`${SOLANA_RPC_URL}/health`);
      return response.text();
    } catch (error) {
      console.error('Health check failed:', error);
      return 'unknown';
    }
  }
}