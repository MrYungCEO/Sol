// API Response Types
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
}

// Token Types
export interface TokenPrice {
  address: string;
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  lastUpdated: string;
}

export interface TokenBalance {
  address: string;
  symbol: string;
  balance: number;
  decimals: number;
  price: number;
  value: number;
}

// Trade Types
export interface TradeRequest {
  tokenAddress: string;
  amount?: number;
  percentage?: number;
  slippage: number;
}

export interface TradeResponse {
  txHash: string;
  tokenAddress: string;
  type: 'BUY' | 'SELL';
  amount: number;
  price: number;
  value: number;
  timestamp: string;
}

// Wallet Types
export interface WalletTrackingRequest {
  walletAddress: string;
  name?: string;
}

export interface WalletTransaction {
  txHash: string;
  type: 'BUY' | 'SELL' | 'TRANSFER';
  tokenAddress: string;
  amount: number;
  price: number;
  timestamp: string;
}

// Trade Management Types
export interface ActiveTrade {
  id: string;
  tokenAddress: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  currentPrice: number;
  amount: number;
  profit: number;
  profitPercentage: number;
  timestamp: string;
  status: 'OPEN' | 'CLOSED';
}

export interface TradeHistory {
  trades: ActiveTrade[];
  totalProfit: number;
  winRate: number;
  totalTrades: number;
}