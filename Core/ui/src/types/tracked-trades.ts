import type { Trade } from './trades';

export interface TrackedTrade {
  id: string;
  html: string;
  type: 'buy' | 'sell';
  value: number;
  tokenAddress: string;
  tokenAmount: number;
  amount_in_sol: number;
  signature: string;
  wallet_group: string;
  date_time: string;
}

export interface TrackedTradesData {
  [key: string]: TrackedTrade;
}

export interface WalletGroup {
  id: string;
  name: string;
  address: string;
  trades: TradeWithStats[];
  totalProfit: number;
  totalVolume: number;
  buyCount: number;
  sellCount: number;
  totalTrades: number;
  winRate: number;
  successfulTrades: number;
}

export interface TradeStats {
  totalTrades: number;
  buyCount: number;
  sellCount: number;
  totalVolume: number;
  totalProfit: number;
}