export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  price?: number;
}

export interface Trade {
  signature: string;
  type: 'buy' | 'sell';
  tokenAddress: string;
  value: string;
  timestamp: number;
  html: string;
  profit?: number;
  amount?: number;
  entryPrice?: number;
  currentPrice?: number;
}

export interface SavedWallet {
  address: string;
  name: string;
  timestamp: number;
}

export interface TradeWithStats {
  tokenAddress: string;
  entryPrice: number;
  currentPrice: number;
  volume24h?: number;
  marketCap?: number;
  signature: string;
  timestamp: number;
  lastUpdate: number;
  priceError?: string;
}