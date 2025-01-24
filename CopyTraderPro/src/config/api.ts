// Base URLs
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8005';
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8005/trades/ws';
export const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

// WebSocket Configuration
export const WS_RECONNECT_DELAY = 2000; // 2 seconds
export const WS_MAX_RECONNECT_ATTEMPTS = 5;

// Constants
export const STABLECOINS = {
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BUSD',
  'Ea5SjE2Y6yvCeW5dYTn7PYMuW5ikXkvbGdcmSnXeaLjS': 'PAI'
};

export const SOL_MINT = 'So11111111111111111111111111111111111111112';
export const WSOL_MINT = 'So11111111111111111111111111111111111111112';

// API Endpoints
export const API_ENDPOINTS = {
  // Price endpoints
  GET_TOKEN_PRICE: (address: string) => `${API_BASE_URL}/price/${address}`,
  
  // Wallet endpoints
  GET_WALLET_TRANSACTIONS: (address: string) => `${API_BASE_URL}/wallet/${address}/transactions`,
  ANALYZE_TRANSACTION: (signature: string) => `${API_BASE_URL}/transaction/analyze/${signature}`,
  
  // Trade endpoints
  BUY: `${API_BASE_URL}/buy`,
  SELL: `${API_BASE_URL}/sell`,
  
  // Token endpoints
  TOKEN_LIST: 'https://token.jup.ag/strict',

  // Dashboard endpoints
  DASHBOARD_STATS: '/api/dashboard_stats',
  WALLET_STATS: '/api/wallet_stats',
  TRADE_HISTORY: '/api/trade_history',
  TRADE_LOGS: '/api/trade_logs',
  ACTIVE_TRADES: '/api/active_trades',
};

// WebSocket message types
export const WS_MESSAGE_TYPES = {
  TRADE: 'trade',
  PRICE_UPDATE: 'price_update',
  ERROR: 'error',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected'
};

// Error messages
export const ERROR_MESSAGES = {
  INVALID_WALLET: 'Invalid wallet address format',
  CONNECTION_FAILED: 'Failed to connect to trading server',
  FETCH_FAILED: 'Failed to fetch wallet transactions',
  INVALID_RESPONSE: 'Invalid response from server',
  NO_TRANSACTIONS: 'No transactions found for this wallet',
  WEBSOCKET_ERROR: 'WebSocket connection error',
  RPC_ERROR: 'RPC connection error'
};

// Common fetch options
const commonFetchOptions = {
  credentials: 'include' as const,
  mode: 'cors' as const,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

// API client functions
export const apiClient = {
  async post(endpoint: string, data: any) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...commonFetchOptions,
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    return response.json();
  },

  async get(endpoint: string) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...commonFetchOptions,
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    return response.json();
  },
};

export default API_ENDPOINTS;