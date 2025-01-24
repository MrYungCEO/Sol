export interface TrackedTrade {
  id: string;
  type: 'buy' | 'sell';
  value: number;
  tokenAddress: string;
  tokenAmount: number;
  amount_in_sol: number;
  signature: string;
  wallet_group: string | null;
  date_time: string;
  transactionLink: string;
  html?: string;
}

export interface TrackedTradesData {
  [key: string]: TrackedTrade;
}

export interface WalletGroup {
  id: string;
  name: string;
  address: string;
  trades: TrackedTrade[];
  totalProfit: number;
  winRate: number;
  successfulTrades: number;
  totalTrades: number;
}