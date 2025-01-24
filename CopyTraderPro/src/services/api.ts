import { API_BASE_URL } from '../config/api';
import type { TokenInfo, Trade, TradeWithStats } from '../types/trades';

const API_URL = API_BASE_URL;

export interface APIError {
    message: string;
    status?: number;
}

export class ApiService {
    private static async handleResponse(response: Response) {
        if (!response.ok) {
            const error = await response.json();
            throw {
                message: error.message || 'API request failed',
                status: response.status
            } as APIError;
        }
        return response.json();
    }

    static async get(endpoint: string) {
        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error(`GET ${endpoint} failed:`, error);
            throw error;
        }
    }

    static async post(endpoint: string, data: any) {
        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error(`POST ${endpoint} failed:`, error);
            throw error;
        }
    }

    static async put(endpoint: string, data: any) {
        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error(`PUT ${endpoint} failed:`, error);
            throw error;
        }
    }

    static async delete(endpoint: string) {
        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            return await this.handleResponse(response);
        } catch (error) {
            console.error(`DELETE ${endpoint} failed:`, error);
            throw error;
        }
    }

    // Price endpoints
    static async getTokenPrice(tokenAddress: string) {
        return this.get(`/get_price/${tokenAddress}`);
    }

    // Wallet tracking endpoints
    static async trackWallet(walletAddress: string) {
        return this.post('/api/track-wallet', { wallet_address: walletAddress });
    }

    static async stopTracking(walletAddress: string) {
        return this.post('/api/stop-tracking', { wallet_address: walletAddress });
    }

    // Trade endpoints
    static async executeBuy(tokenAddress: string, amountInSol: number) {
        return this.post('/buy', { token_address: tokenAddress, amount_in_sol: amountInSol });
    }

    static async executeSell(tokenAddress: string, amountInSol: number) {
        return this.post('/sell', { token_address: tokenAddress, amount_in_sol: amountInSol });
    }

    // Trade history endpoints
    static async getTradeHistory() {
        return this.get('/trades');
    }

    static async getActiveTrades() {
        return this.get('/trades/active');
    }

    static async updateTrades() {
        return this.post('/trades/update', {});
    }

    // Trade statistics endpoints
    static async getTradeStats(startTime?: string, endTime?: string) {
        let endpoint = '/trades/stats';
        if (startTime || endTime) {
            const params = new URLSearchParams();
            if (startTime) params.append('start_time', startTime);
            if (endTime) params.append('end_time', endTime);
            endpoint += `?${params.toString()}`;
        }
        return this.get(endpoint);
    }

    // Test Connection
    static async testConnection() {
        try {
            const response = await this.get('/api/test-connection');
            return response;
        } catch (error) {
            console.error('Test connection failed:', error);
            throw error;
        }
    }

    // WebSocket connection for real-time updates
    static connectWebSocket(onMessage: (data: any) => void): WebSocket {
        const ws = new WebSocket(`${API_URL.replace('http', 'ws')}/trades/ws`);
        
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

// Export a singleton instance
export const apiService = new ApiService();