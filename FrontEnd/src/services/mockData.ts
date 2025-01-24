import { v4 as uuidv4 } from 'uuid';
import type { TradeWithStats } from '../types/trades';

// Mock active trades data
export const mockActiveTrades: TradeWithStats[] = [
  {
    tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    entryPrice: 1.0,
    currentPrice: 1.05,
    volume24h: 1000000,
    marketCap: 10000000,
    signature: uuidv4(),
    timestamp: Date.now(),
    lastUpdate: Date.now()
  },
  {
    tokenAddress: "So11111111111111111111111111111111111111112",
    entryPrice: 98.5,
    currentPrice: 102.3,
    volume24h: 5000000,
    marketCap: 50000000,
    signature: uuidv4(),
    timestamp: Date.now() - 3600000,
    lastUpdate: Date.now()
  }
];

// Mock WebSocket messages
export const mockWebSocketMessages = [
  {
    type: 'trade',
    data: {
      tokenAddress: "bonk9Y3xZ4wQJ4Fp6tHGYQp6qYuLKnHV5FDCztxhHBA",
      entryPrice: 0.00000012,
      currentPrice: 0.00000013,
      volume24h: 2000000,
      marketCap: 15000000,
      signature: uuidv4(),
      timestamp: Date.now(),
      lastUpdate: Date.now()
    }
  },
  {
    type: 'price_update',
    data: {
      tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      price: 1.06,
      timestamp: Date.now()
    }
  }
];