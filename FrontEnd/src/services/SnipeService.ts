import { API_BASE_URL, WS_URL, SOL_MINT, STABLECOINS } from '../config/api';
import { WebSocketService } from './WebSocketService';
import { PriceService } from './PriceService';
import type { Trade, TradeWithStats } from '../types/trades';
import { EventEmitter } from './EventEmitter';

export class SnipeService extends EventEmitter {
  private ws: WebSocketService | null = null;
  private isUpdatingPrices = false;
  private activeTrades: TradeWithStats[] = [];
  private tokenPositions: { [key: string]: number } = {};
  private portfolio = { totalValue: 0.1 };
  private copyEnabled = false;
  private isPaused = false;

  constructor() {
    super();
    this.initializeWebSocket();
  }

  private initializeWebSocket() {
    this.ws = new WebSocketService(
      WS_URL,
      this.handleMessage.bind(this),
      () => this.emit('connected'),
      () => this.emit('disconnected'),
      (error) => this.emit('error', error)
    );
    this.ws.connect();
  }

  private async handleMessage(data: any) {
    try {
      if (data.type === 'trade') {
        await this.processTrade(data);
      } else if (data.type === 'price_update') {
        await this.handlePriceUpdate(data);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.emit('error', error);
    }
  }

  private async processTrade(data: any) {
    if (!this.copyEnabled || this.isPaused) return;

    const trade = this.parseTrade(data);
    if (!this.isValidTrade(trade)) return;

    this.emit('pendingTrade', trade);
    const analysis = await this.analyzeTrade(trade);

    if (analysis.shouldExecute) {
      await this.executeTrade(trade);
    }
  }

  private parseTrade(data: any): Trade {
    return {
      signature: data.signature,
      type: data.type,
      tokenAddress: data.tokenAddress,
      value: data.value,
      timestamp: data.timestamp,
      html: data.html
    };
  }

  private isValidTrade(trade: Trade): boolean {
    if (!trade.tokenAddress || !trade.value) return false;
    if (trade.tokenAddress === SOL_MINT) return false;
    if (STABLECOINS[trade.tokenAddress]) return false;
    return true;
  }

  private async analyzeTrade(trade: Trade) {
    try {
      const response = await fetch(`${API_BASE_URL}/analyze_trade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ trade_data: trade })
      });

      if (!response.ok) throw new Error('Failed to analyze trade');
      const analysis = await response.json();
      return {
        shouldExecute: analysis.copy_trade && analysis.confidence > 0.7,
        ...analysis
      };
    } catch (error) {
      console.error('Trade analysis failed:', error);
      return { shouldExecute: false };
    }
  }

  private async executeTrade(trade: Trade) {
    if (!this.portfolio.totalValue) return;

    try {
      if (trade.type === 'buy') {
        const amount = 0.001; // Fixed position size
        const buyResponse = await fetch(`${API_BASE_URL}/buy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            token_address: trade.tokenAddress,
            amount_in_sol: amount
          })
        });

        if (!buyResponse.ok) throw new Error('Failed to execute buy order');
        const buyResult = await buyResponse.json();

        if (buyResult.success) {
          this.updateTokenPosition(trade.tokenAddress, amount, true);
          this.emit('tradeExecuted', { trade, result: buyResult });
        }
      }
    } catch (error) {
      console.error('Trade execution failed:', error);
      this.emit('error', error);
    }
  }

  private updateTokenPosition(tokenAddress: string, amount: number, isBuy: boolean) {
    const currentAmount = this.tokenPositions[tokenAddress] || 0;
    const newAmount = isBuy ? currentAmount + amount : currentAmount - amount;
    this.tokenPositions[tokenAddress] = Math.max(0, newAmount);
    this.emit('positionUpdated', { tokenAddress, amount: newAmount });
  }

  private async handlePriceUpdate(data: any) {
    const { tokenAddress, price, volume24h, marketCap } = data;
    const trade = this.activeTrades.find(t => t.tokenAddress === tokenAddress);
    
    if (trade) {
      Object.assign(trade, {
        currentPrice: price,
        volume24h,
        marketCap,
        lastUpdate: Date.now()
      });
      this.emit('priceUpdated', trade);
    }
  }

  public async updatePrices() {
    if (this.isUpdatingPrices) return;
    this.isUpdatingPrices = true;

    try {
      const updatedTrades = await Promise.all(
        this.activeTrades.map(async trade => {
          const priceData = await PriceService.getTokenPrice(trade.tokenAddress);
          return {
            ...trade,
            currentPrice: priceData?.price || trade.currentPrice,
            volume24h: priceData?.volume24h,
            marketCap: priceData?.marketCap,
            lastUpdate: Date.now()
          };
        })
      );

      this.activeTrades = updatedTrades;
      this.emit('pricesUpdated', updatedTrades);
    } catch (error) {
      console.error('Error updating prices:', error);
      this.emit('error', error);
    } finally {
      this.isUpdatingPrices = false;
    }
  }

  public toggleCopyTrading(enabled: boolean) {
    this.copyEnabled = enabled;
    this.emit('copyTradingToggled', enabled);
  }

  public togglePause(paused: boolean) {
    this.isPaused = paused;
    this.emit('pauseToggled', paused);
  }

  public getActiveTrades() {
    return this.activeTrades;
  }

  public getTokenPositions() {
    return this.tokenPositions;
  }

  public isConnected() {
    return this.ws?.isConnected() || false;
  }

  public disconnect() {
    this.ws?.disconnect();
  }
}