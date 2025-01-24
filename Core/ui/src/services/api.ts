import { API_BASE_URL } from '../config/api';
import type { TokenInfo, Trade, TradeWithStats } from '../types/trades';

class ApiService {
  // Price endpoints
  async getTokenPrice(tokenAddress: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/get_price/${tokenAddress}`);
      if (!response.ok) throw new Error('Failed to fetch price');
      return await response.json();
    } catch (error) {
      console.error('Error fetching price:', error);
      throw error;
    }
  }

  // Wallet tracking endpoints
  async trackWallet(walletAddress: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/track_wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ wallet_address: walletAddress })
      });
      return await response.json();
    } catch (error) {
      console.error('Error tracking wallet:', error);
      throw error;
    }
  }

  // Trade endpoints
  async executeBuy(tokenAddress: string, amountInSol: number) {
    try {
      const response = await fetch(`${API_BASE_URL}/buy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token_address: tokenAddress,
          amount_in_sol: amountInSol
        })
      });
      return await response.json();
    } catch (error) {
      console.error('Error executing buy:', error);
      throw error;
    }
  }

  async executeSell(tokenAddress: string, amountInSol: number) {
    try {
      const response = await fetch(`${API_BASE_URL}/sell`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token_address: tokenAddress,
          amount_in_sol: amountInSol
        })
      });
      return await response.json();
    } catch (error) {
      console.error('Error executing sell:', error);
      throw error;
    }
  }

  // Trade history endpoints
  async getTradeHistory() {
    try {
      const response = await fetch(`${API_BASE_URL}/trades`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching trade history:', error);
      throw error;
    }
  }

  async getActiveTrades() {
    try {
      const response = await fetch(`${API_BASE_URL}/trades/active`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching active trades:', error);
      throw error;
    }
  }

  async updateTrades() {
    try {
      const response = await fetch(`${API_BASE_URL}/trades/update`, {
        method: 'POST'
      });
      return await response.json();
    } catch (error) {
      console.error('Error updating trades:', error);
      throw error;
    }
  }

  // Trade statistics endpoints
  async getTradeStats(startTime?: string, endTime?: string) {
    try {
      let url = `${API_BASE_URL}/trades/stats`;
      if (startTime || endTime) {
        const params = new URLSearchParams();
        if (startTime) params.append('start_time', startTime);
        if (endTime) params.append('end_time', endTime);
        url += `?${params.toString()}`;
      }
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      console.error('Error fetching trade stats:', error);
      throw error;
    }
  }

  // WebSocket connection for real-time updates
  connectWebSocket(onMessage: (data: any) => void): WebSocket {
    const ws = new WebSocket(`${API_BASE_URL.replace('http', 'ws')}/trades/ws`);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return ws;
  }
}

export const apiService = new ApiService();