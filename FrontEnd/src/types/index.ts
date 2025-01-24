export interface Trader {
  name: string;
  avatar: string;
  roi: number;
  followers: number;
  winRate: number;
  trending: boolean;
}

export interface Trade {
  pair: string;
  type: 'BUY' | 'SELL';
  entry: number;
  profit: number;
  time: string;
  symbol: string;
  amount: string;
  profitPercentage: number;
  status: 'ACTIVE' | 'CLOSED';
  closePrice?: number;
  currentPrice?: number;
  txHash?: string;
}

export interface Stat {
  title: string;
  value: string;
  change: string;
  icon: React.ComponentType;
  positive: boolean;
}

export interface NavItem {
  icon: React.ComponentType;
  label: string;
  active?: boolean;
  path: string;
}

export interface Wallet {
  address: string;
  name: string;
  balance: number;
  value: number;
  change24h: number;
  tokens: Token[];
}

export interface Token {
  symbol: string;
  name: string;
  balance: number;
  price: number;
  value: number;
  change24h: number;
}

export interface TrackingWallet {
  address: string;
  name: string;
  isTracking: boolean;
  isCopying: boolean;
  lastTrade?: Trade;
}