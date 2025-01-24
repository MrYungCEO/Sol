export const getActiveTrades = () => {
  try {
    const saved = localStorage.getItem('activeTrades');
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error loading active trades:', error);
    return [];
  }
};

export const getTradingTrades = () => {
  try {
    const saved = localStorage.getItem('tradingTrades');
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error loading trading trades:', error);
    return [];
  }
};

export const updateTradeStorage = (activeTrade: any, tradingTrade: any) => {
  try {
    const activeTrades = getActiveTrades();
    const tradingTrades = getTradingTrades();

    // Add new trades
    const updatedActiveTrades = [...activeTrades, activeTrade];
    const updatedTradingTrades = [...tradingTrades, tradingTrade];

    // Save to localStorage
    localStorage.setItem('activeTrades', JSON.stringify(updatedActiveTrades));
    localStorage.setItem('tradingTrades', JSON.stringify(updatedTradingTrades));

    return {
      activeTrades: updatedActiveTrades,
      tradingTrades: updatedTradingTrades
    };
  } catch (error) {
    console.error('Error updating trade storage:', error);
    return {
      activeTrades: [],
      tradingTrades: []
    };
  }
};

export const closeTrade = (trade: any, closePrice: number) => {
  try {
    const activeTrades = getActiveTrades();
    const tradingTrades = getTradingTrades();

    // Remove trade from active trades
    const updatedActiveTrades = activeTrades.filter((t: any) => t.signature !== trade.signature);

    // Update trade in trading trades
    const updatedTradingTrades = tradingTrades.map((t: any) => {
      if (t.signature === trade.signature) {
        return {
          ...t,
          closePrice,
          status: 'closed',
          profit: ((closePrice - t.entryPrice) / t.entryPrice) * 100
        };
      }
      return t;
    });

    // Save to localStorage
    localStorage.setItem('activeTrades', JSON.stringify(updatedActiveTrades));
    localStorage.setItem('tradingTrades', JSON.stringify(updatedTradingTrades));

    return {
      activeTrades: updatedActiveTrades,
      tradingTrades: updatedTradingTrades
    };
  } catch (error) {
    console.error('Error closing trade:', error);
    return {
      activeTrades: [],
      tradingTrades: []
    };
  }
};