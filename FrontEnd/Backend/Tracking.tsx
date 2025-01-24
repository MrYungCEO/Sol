import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Clock,
  ArrowRight,
  Wallet,
  Loader,
  Star,
  ExternalLink,
  Download,
  BarChart2,
  X
} from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';

// Constants from your existing code
const STABLECOINS = {
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BUSD',
  'Ea5SjE2Y6yvCeW5dYTn7PYMuW5ikXkvbGdcmSnXeaLjS': 'PAI',
  '9mWRABuz2x6koTPCWiCPM49WUbcrNqGTHBV9T9k7y1o7': 'HAY',
  'A9mUU4qviSctJVPJdBJWkb28deg915LYJKrzQ19ji3FM': 'UXD'
};

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const WSOL_MINT = 'So11111111111111111111111111111111111111112';

interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  price?: number;
}

interface Trade {
  signature: string;
  type: 'buy' | 'sell';
  tokenAddress: string;
  value: string;
  timestamp: number;
  html: string;
  profit?: number;
}

interface SavedWallet {
  address: string;
  name: string;
  timestamp: number;
}

declare global {
  interface Window {
    solanaWeb3: any;
  }
}

export default function Tracking() {
  const { addNotification } = useNotification();
  const [walletAddress, setWalletAddress] = useState('');
  const [walletName, setWalletName] = useState('');
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [connection, setConnection] = useState<any>(null);
  const [favoriteTokens, setFavoriteTokens] = useState<Map<string, 'buy' | 'sell'>>(new Map());
  const [tokenList, setTokenList] = useState<Map<string, TokenInfo>>(new Map());
  const [filters, setFilters] = useState({
    buys: true,
    sells: true,
    favorites: false,
    closed: false
  });
  const [savedWallets, setSavedWallets] = useState<SavedWallet[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [activeTrades, setActiveTrades] = useState<{
    tokenAddress: string;
    buyPrice: number;
    amount: number;
    timestamp: number;
    txHash: string;
    currentPrice: number;
    profitPercent: number;
  }[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('savedWallets');
    if (saved) {
      setSavedWallets(JSON.parse(saved));
    }

    const savedFavorites = localStorage.getItem('favoriteTokens');
    if (savedFavorites) {
      setFavoriteTokens(new Map(JSON.parse(savedFavorites)));
    }

    fetch('https://token.jup.ag/strict')
      .then(response => response.json())
      .then(data => {
        const tokenMap = new Map();
        data.forEach((token: TokenInfo) => {
          tokenMap.set(token.address, token);
        });
        setTokenList(tokenMap);
      })
      .catch(console.error);

    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/@solana/web3.js@1.87.6/lib/index.iife.min.js";
    script.async = true;
    script.onload = () => {
      const conn = new window.solanaWeb3.Connection(
        "https://mainnet.helius-rpc.com/?api-key=10fc4931-f192-4403-ab41-808bf0b80a67",
        "confirmed"
      );
      setConnection(conn);
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    const handleNewTrade = (event: CustomEvent) => {
      const { tokenAddress, buyPrice, amount, txHash } = event.detail;
      setActiveTrades(prev => [...prev, {
        tokenAddress,
        buyPrice,
        amount,
        timestamp: Date.now(),
        txHash,
        currentPrice: buyPrice,
        profitPercent: 0
      }]);
    };

    window.addEventListener('addTrade', handleNewTrade as EventListener);
    return () => window.removeEventListener('addTrade', handleNewTrade as EventListener);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('activeTrades');
    if (saved) {
      setActiveTrades(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('activeTrades', JSON.stringify(activeTrades));
  }, [activeTrades]);

  const toggleFavorite = useCallback((tokenAddress: string, tradeType: 'buy' | 'sell') => {
    const tokenInfo = getTokenInfo(tokenAddress);
    const tokenName = tokenInfo?.symbol || tokenAddress.slice(0, 4) + '...' + tokenAddress.slice(-4);

    setFavoriteTokens(prev => {
      const newMap = new Map(prev);
      if (newMap.has(tokenAddress)) {
        newMap.delete(tokenAddress);
        addNotification(`Removed ${tokenName} from favorites`, 'info');
      } else {
        newMap.set(tokenAddress, tradeType);
        addNotification(`Added ${tokenName} to favorites - Watching for ${tradeType === 'buy' ? 'SELL' : 'BUY'}`, 'success');
      }
      localStorage.setItem('favoriteTokens', JSON.stringify(Array.from(newMap.entries())));
      return newMap;
    });
  }, [addNotification]);

  const isSol = (mint: string) => mint === SOL_MINT || mint === WSOL_MINT;
  const isStablecoin = (mint: string) => mint in STABLECOINS;
  const isSolOrStable = (mint: string) => isSol(mint) || isStablecoin(mint);

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getTokenSymbol = (mint: string) => {
    if (isSol(mint)) return 'SOL';
    return STABLECOINS[mint] || mint.slice(0, 4);
  };

  const formatTokenDisplay = (symbol: string, address: string) => {
    return `${symbol} (${address.slice(0, 4)}...)`;
  };

  const parseRoute = async (tx: any) => {
    try {
      if (!tx.meta?.innerInstructions || !tx.meta?.innerInstructions.length) {
        console.log('No inner instructions found');
        return { html: '<span class="text-gray-500">No route</span>', type: null, value: 0, tokenAddress: null };
      }

      console.log('Pre balances:', tx.meta.preTokenBalances);
      console.log('Post balances:', tx.meta.postTokenBalances);

      const swaps: any[] = [];
      const preBalances = tx.meta.preTokenBalances || [];
      const postBalances = tx.meta.postTokenBalances || [];
      const balancesByOwner: { [key: string]: any[] } = {};

      for (const post of postBalances) {
        const pre = preBalances.find(p => 
          p.accountIndex === post.accountIndex && 
          p.mint === post.mint
        );

        if (pre) {
          const preAmount = pre.uiTokenAmount?.uiAmount || 0;
          const postAmount = post.uiTokenAmount?.uiAmount || 0;
          const diff = postAmount - preAmount;
          const owner = post.owner;

          if (!balancesByOwner[owner]) {
            balancesByOwner[owner] = [];
          }

          if (Math.abs(diff) > 0.001) {
            balancesByOwner[owner].push({
              mint: post.mint,
              amount: Math.abs(diff),
              direction: diff > 0 ? 'in' : 'out'
            });
          }
        }
      }

      let maxChanges = 0;
      let mainOwner = null;
      for (const [owner, ownerChanges] of Object.entries(balancesByOwner)) {
        if (ownerChanges.length > maxChanges) {
          maxChanges = ownerChanges.length;
          mainOwner = owner;
        }
      }

      if (!mainOwner) {
        console.log('No significant changes found');
        return { html: '<span class="text-gray-500">No route</span>', type: null, value: 0, tokenAddress: null };
      }

      const mainOwnerChanges = balancesByOwner[mainOwner];
      mainOwnerChanges.sort((a, b) => b.amount - a.amount);

      for (let i = 0; i <mainOwnerChanges.length - 1; i++) {
        const current = mainOwnerChanges[i];
        const next = mainOwnerChanges[i + 1];

        const currentIsSolOrStable = isSol(current.mint) || isStablecoin(current.mint);
        const nextIsSolOrStable = isSol(next.mint) || isStablecoin(next.mint);

        if (currentIsSolOrStable !== nextIsSolOrStable) {
          if (current.direction === 'out' && next.direction === 'in') {
            swaps.push({
              fromMint: current.mint,
              toMint: next.mint,
              fromAmount: current.amount,
              toAmount: next.amount
            });
          } else if (current.direction === 'in' && next.direction === 'out') {
            swaps.push({
              fromMint: next.mint,
              toMint: current.mint,
              fromAmount: next.amount,
              toAmount: current.amount
            });
          }
          i++;
        }
      }

      if (swaps.length === 0) {
        console.log('No swaps found');
        return { html: '<span class="text-gray-500">No route</span>', type: null, value: 0, tokenAddress: null };
      }

      const significantSwap = swaps.reduce((max, swap) => 
        (swap.fromAmount > max.fromAmount || swap.toAmount > max.toAmount) ? swap : max
      , swaps[0]);

      const fromIsSolOrStable = isSol(significantSwap.fromMint) || isStablecoin(significantSwap.fromMint);
      const toIsSolOrStable = isSol(significantSwap.toMint) || isStablecoin(significantSwap.toMint);

      let type = null;
      let routeHtml = null;
      let tradeValue = 0;
      let tokenAddress = null;

      if (fromIsSolOrStable && !toIsSolOrStable) {
        type = 'sell';
        routeHtml = formatTokenDisplay(getTokenSymbol(significantSwap.toMint), significantSwap.toMint);
        tradeValue = (significantSwap.fromAmount * 0.220611 * 1000).toFixed(2);
        tokenAddress = significantSwap.toMint;
      } else if (!fromIsSolOrStable && toIsSolOrStable) {
        type = 'buy';
        routeHtml = formatTokenDisplay(getTokenSymbol(significantSwap.fromMint), significantSwap.fromMint);
        tradeValue = (significantSwap.toAmount * 0.220611 * 1000).toFixed(2);
        tokenAddress = significantSwap.fromMint;
      }

      if (!type || !routeHtml) {
        console.log('Could not classify trade type');
        return { html: '<span class="text-gray-500">No route</span>', type: null, value: 0, tokenAddress: null };
      }

      return { html: routeHtml, type, value: tradeValue, tokenAddress };
    } catch (error) {
      console.error('Error parsing route:', error);
      return { html: '<span class="text-gray-500">No route</span>', type: null, value: 0, tokenAddress: null };
    }
  };

  const handleTransaction = async (tx: any, signature: string) => {
    try {
      console.log('Trade Analysis:', tx);
      const route = await parseRoute(tx);
      
      if (!route.type) {
        console.log('Classified as null:', route.html);
        return;
      }

      const newTrade = {
        signature,
        type: route.type,
        tokenAddress: route.tokenAddress,
        value: route.value,
        timestamp: tx.blockTime * 1000, // Convert to milliseconds
        html: route.html
      };

      setTrades(prev => {
        const newTrades = [newTrade, ...prev];
        return calculateProfits(newTrades);
      });

      // Check if this is a closing trade
      if (favoriteTokens.has(route.tokenAddress) && favoriteTokens.get(route.tokenAddress) !== route.type) {
        const tokenInfo = getTokenInfo(route.tokenAddress);
        const tokenName = tokenInfo?.symbol || route.tokenAddress.slice(0, 4) + '...' + route.tokenAddress.slice(-4);
        addNotification(`Closed position on ${tokenName}`, 'success');
      }
    } catch (error) {
      console.error('Error handling transaction:', error);
    }
  };

  const calculateProfits = (trades: Trade[]): Trade[] => {
    // Sort trades by timestamp ascending for profit calculation
    const sortedTrades = [...trades].sort((a, b) => {
      const aTime = a.timestamp;
      const bTime = b.timestamp;
      return aTime - bTime;
    });

    const tokenTrades: { [key: string]: { buys: Trade[], sells: Trade[] } } = {};

    // First pass: Group trades by token
    sortedTrades.forEach(trade => {
      const tokenInfo = getTokenInfo(trade.tokenAddress);
      const symbol = tokenInfo?.symbol || trade.tokenAddress.slice(0, 4);
      
      if (!tokenTrades[trade.tokenAddress]) {
        tokenTrades[trade.tokenAddress] = { buys: [], sells: [] };
      }
      
      if (trade.type === 'buy') {
        tokenTrades[trade.tokenAddress].buys.push(trade);
      } else {
        tokenTrades[trade.tokenAddress].sells.push(trade);
      }
    });

    // Second pass: Calculate profits
    const tradesWithProfits = sortedTrades.map(trade => {
      const tradeCopy = { ...trade };

      if (tradeCopy.type === 'sell') {
        const token = tokenTrades[trade.tokenAddress];
        console.log('Processing sell:', {
          address: trade.tokenAddress,
          sellTime: new Date(trade.timestamp).toISOString(),
          availableBuys: token.buys.map(b => ({
            time: new Date(b.timestamp).toISOString(),
            value: b.value
          }))
        });
        
        // Find the most recent buy before this sell
        const matchingBuys = token.buys.filter(buy => buy.timestamp < trade.timestamp);
        console.log('Matching buys:', matchingBuys);

        const matchingBuy = matchingBuys.sort((a, b) => b.timestamp - a.timestamp)[0];

        if (matchingBuy) {
          const buyValue = parseFloat(matchingBuy.value);
          const sellValue = parseFloat(tradeCopy.value);
          tradeCopy.profit = Number((sellValue - buyValue).toFixed(2));
          console.log('Calculated profit:', {
            buy: {
              time: new Date(matchingBuy.timestamp).toISOString(),
              value: buyValue
            },
            sell: {
              time: new Date(trade.timestamp).toISOString(),
              value: sellValue
            },
            profit: tradeCopy.profit
          });
        }
      }
      return tradeCopy;
    });

    // Sort by newest first for display
    return tradesWithProfits.sort((a, b) => b.timestamp - a.timestamp);
  };

  const handleTrack = async () => {
    if (!walletAddress.trim() || !connection || !window.solanaWeb3) return;
    
    setLoading(true);
    setError('');
    setStatus('Tracking wallet...');
    setTrades([]);

    try {
      const pubkey = new window.solanaWeb3.PublicKey(walletAddress);
      
      const signatures = await connection.getSignaturesForAddress(pubkey, { limit: 10 });

      for (const sig of signatures) {
        try {
          const tx = await connection.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0
          });
          
          if (tx) {
            await handleTransaction(tx, sig.signature);
          }
        } catch (e) {
          console.error(`Error processing transaction ${sig.signature}:`, e);
        }
      }

      connection.onLogs(
        pubkey,
        async (logs: any) => {
          if (logs.err) return;
          
          try {
            const tx = await connection.getTransaction(logs.signature, {
              maxSupportedTransactionVersion: 0
            });
            
            if (tx) {
              await handleTransaction(tx, logs.signature);
            }
          } catch (e) {
            console.error(`Error processing new transaction ${logs.signature}:`, e);
          }
        },
        "confirmed"
      );

      setStatus('Tracking active');
    } catch (err: any) {
      setError(err.message);
      setStatus('Error tracking wallet');
    } finally {
      setLoading(false);
    }
  };

  const getTokenInfo = (address: string): TokenInfo | undefined => {
    return tokenList.get(address);
  };

  const saveWallet = () => {
    if (!walletAddress.trim() || !walletName.trim()) return;

    const newWallet: SavedWallet = {
      address: walletAddress,
      name: walletName,
      timestamp: Date.now()
    };

    const updated = [...savedWallets, newWallet];
    setSavedWallets(updated);
    localStorage.setItem('savedWallets', JSON.stringify(updated));
    setWalletName('');
    setShowSaveDialog(false);
  };

  const loadWallet = (wallet: SavedWallet) => {
    setWalletAddress(wallet.address);
    handleTrack();
  };

  const deleteWallet = (index: number) => {
    const updated = savedWallets.filter((_, i) => i !== index);
    setSavedWallets(updated);
    localStorage.setItem('savedWallets', JSON.stringify(updated));
  };

  const filteredTrades = useMemo(() => {
    // Sort trades by newest first before filtering
    const sortedTrades = [...trades].sort((a, b) => {
      const aTime = a.timestamp;
      const bTime = b.timestamp;
      return bTime - aTime; // Newest first
    });

    return sortedTrades.filter(trade => {
      const isFavorite = favoriteTokens.has(trade.tokenAddress);
      const isClosingTrade = isFavorite && favoriteTokens.get(trade.tokenAddress) !== trade.type;
      
      // If favorites filter is on, only show favorited trades
      if (filters.favorites && !isFavorite) {
        return false;
      }
      
      // If closed filter is on, only show closed trades
      if (filters.closed && !isClosingTrade) {
        return false;
      }
      
      // If neither favorites nor closed filter is on, filter by buy/sell
      if (!filters.favorites && !filters.closed) {
        if (trade.type === 'buy' && !filters.buys) return false;
        if (trade.type === 'sell' && !filters.sells) return false;
      }
      
      return true;
    });
  }, [trades, filters, favoriteTokens]);

  const toggleFilter = (filter: keyof typeof filters) => {
    setFilters(prev => {
      // If toggling favorites or closed, turn off other filters
      if (filter === 'favorites' || filter === 'closed') {
        return {
          ...prev,
          buys: !prev[filter] ? true : prev.buys,
          sells: !prev[filter] ? true : prev.sells,
          favorites: filter === 'favorites' ? !prev.favorites : false,
          closed: filter === 'closed' ? !prev.closed : false
        };
      }
      // For buys/sells, turn off favorites and closed
      return {
        ...prev,
        [filter]: !prev[filter],
        favorites: false,
        closed: false
      };
    });
  };

  const calculateStats = () => {
    const stats: { [key: string]: any } = {};
    const tokenStats: { [key: string]: any } = {};

    // Group trades by token
    trades.forEach(trade => {
      const tokenInfo = getTokenInfo(trade.tokenAddress);
      const symbol = tokenInfo?.symbol || trade.tokenAddress.slice(0, 4);
      
      if (!tokenStats[trade.tokenAddress]) {
        tokenStats[trade.tokenAddress] = {
          symbol,
          address: trade.tokenAddress,
          totalTrades: 0,
          totalBuys: 0,
          totalSells: 0,
          totalVolume: 0,
          totalProfit: 0,
          profitableTrades: 0,
          largestProfit: 0,
          largestLoss: 0,
          holdTimes: []
        };
      }

      const token = tokenStats[trade.tokenAddress];
      token.totalTrades++;
      token.totalVolume += parseFloat(trade.value);
      
      if (trade.type === 'buy') {
        token.totalBuys++;
      } else {
        token.totalSells++;
        if (trade.profit !== undefined) {
          token.totalProfit += trade.profit;
          if (trade.profit > 0) token.profitableTrades++;
          if (trade.profit > token.largestProfit) token.largestProfit = trade.profit;
          if (trade.profit < token.largestLoss) token.largestLoss = trade.profit;
          
          // Find matching buy for hold time
          const matchingBuy = trades.find(t => 
            t.type === 'buy' && 
            t.tokenAddress === trade.tokenAddress && 
            t.timestamp < trade.timestamp
          );
          if (matchingBuy) {
            token.holdTimes.push(trade.timestamp - matchingBuy.timestamp);
          }
        }
      }
    });

    // Calculate overall stats
    stats.totalTrades = trades.length;
    stats.totalVolume = Object.values(tokenStats).reduce((sum: number, token: any) => sum + token.totalVolume, 0);
    stats.totalProfit = Object.values(tokenStats).reduce((sum: number, token: any) => sum + token.totalProfit, 0);
    
    const allSells = trades.filter(t => t.type === 'sell' && t.profit !== undefined);
    const profitableTrades = allSells.filter(t => t.profit! > 0);
    stats.winRate = allSells.length > 0 ? (profitableTrades.length / allSells.length) * 100 : 0;
    stats.averageProfit = allSells.length > 0 ? stats.totalProfit / allSells.length : 0;

    return { stats, tokenStats };
  };

  const downloadStats = () => {
    const formatDuration = (ms: number) => {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    };

    const { stats, tokenStats } = calculateStats();

    // Generate stats text
    let content = `SNIPE Trading Stats - ${walletAddress}\n`;
    content += `Generated at: ${new Date().toLocaleString()}\n\n`;
    
    content += `Overall Statistics\n`;
    content += `================\n`;
    content += `Total Trades: ${stats.totalTrades}\n`;
    content += `Total Volume: $${stats.totalVolume.toFixed(2)}\n`;
    content += `Total Profit: $${stats.totalProfit.toFixed(2)}\n`;
    content += `Win Rate: ${stats.winRate.toFixed(2)}%\n`;
    content += `Average Profit per Trade: $${stats.averageProfit.toFixed(2)}\n\n`;

    content += `Token Statistics\n`;
    content += `===============\n\n`;

    Object.values(tokenStats)
      .sort((a: any, b: any) => b.totalProfit - a.totalProfit)
      .forEach((token: any) => {
        if (token.totalTrades > 0) {
          const avgHoldTime = token.holdTimes.length > 0 
            ? token.holdTimes.reduce((a: number, b: number) => a + b, 0) / token.holdTimes.length 
            : 0;
          const winRate = token.totalSells > 0 ? (token.profitableTrades / token.totalSells) * 100 : 0;
          
          content += `${token.symbol} (${token.address})\n`;
          content += `-`.repeat(40) + '\n';
          content += `Total Trades: ${token.totalTrades} (${token.totalBuys} buys, ${token.totalSells} sells)\n`;
          content += `Total Volume: $${token.totalVolume.toFixed(2)}\n`;
          content += `Total Profit: $${token.totalProfit.toFixed(2)}\n`;
          content += `Win Rate: ${winRate.toFixed(2)}%\n`;
          content += `Average Profit per Trade: $${(token.totalProfit / token.totalSells || 0).toFixed(2)}\n`;
          content += `Largest Profit: $${token.largestProfit.toFixed(2)}\n`;
          content += `Largest Loss: $${token.largestLoss.toFixed(2)}\n`;
          content += `Average Hold Time: ${formatDuration(avgHoldTime)}\n\n`;
        }
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading_stats_${walletAddress.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const updateTokenPrices = async () => {
    const updatedTrades = await Promise.all(activeTrades.map(async (trade) => {
      try {
        const response = await fetch(`https://price.jup.ag/v4/price?ids=${trade.tokenAddress}`);
        const data = await response.json();
        const currentPrice = data.data[trade.tokenAddress]?.price || 0;
        const profitPercent = ((currentPrice - trade.buyPrice) / trade.buyPrice) * 100;
        return {
          ...trade,
          currentPrice,
          profitPercent
        };
      } catch (error) {
        console.error('Error fetching price:', error);
        return trade;
      }
    }));
    setActiveTrades(updatedTrades);
  };

  useEffect(() => {
    const interval = setInterval(updateTokenPrices, 30000);
    return () => clearInterval(interval);
  }, [activeTrades]);

  const addTradeToTracking = (tokenAddress: string, buyPrice: number, amount: number, txHash: string) => {
    setActiveTrades(prev => [...prev, {
      tokenAddress,
      buyPrice,
      amount,
      timestamp: Date.now(),
      txHash,
      currentPrice: buyPrice,
      profitPercent: 0
    }]);
  };

  const renderActiveTrades = () => (
    <div className="bg-gray-900/50 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Active Trades</h2>
        <button
          onClick={updateTokenPrices}
          className="text-sm bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-3 py-1.5 rounded-xl transition-colors"
        >
          Refresh Prices
        </button>
      </div>
      
      <div className="space-y-3">
        {activeTrades.map((trade, index) => (
          <div key={index} className="bg-gray-800/50 rounded-xl p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <img 
                  src={tokenList.get(trade.tokenAddress)?.logoURI} 
                  alt={tokenList.get(trade.tokenAddress)?.symbol} 
                  className="w-6 h-6 rounded-full"
                />
                <span className="font-medium text-white">
                  {tokenList.get(trade.tokenAddress)?.symbol || 'Unknown Token'}
                </span>
              </div>
              <div className="text-sm text-gray-400">
                Buy Price: ${trade.buyPrice.toFixed(6)}
              </div>
              <div className="text-sm text-gray-400">
                Amount: {trade.amount}
              </div>
            </div>
            
            <div className="text-right space-y-1">
              <div className={`text-lg font-bold ${
                trade.profitPercent > 0 ? 'text-green-400' : 
                trade.profitPercent < 0 ? 'text-red-400' : 
                'text-gray-400'
              }`}>
                {trade.profitPercent ? `${trade.profitPercent.toFixed(2)}%` : '0.00%'}
              </div>
              <a
                href={`https://solscan.io/tx/${trade.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 justify-end"
              >
                View Transaction
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        ))}
        
        {activeTrades.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            No active trades. Start trading to track your profits!
          </div>
        )}
      </div>
    </div>
  );

  useEffect(() => {
    if (!trades.length) return;

    trades.forEach(trade => {
      const isFavorite = favoriteTokens.has(trade.tokenAddress);
      if (isFavorite) {
        const favoriteType = favoriteTokens.get(trade.tokenAddress);
        if (favoriteType && favoriteType !== trade.type) {
          const tokenInfo = getTokenInfo(trade.tokenAddress);
          const tokenName = tokenInfo?.symbol || trade.html;
          addNotification(
            `🎯 Closed trade detected for ${tokenName} - ${trade.type.toUpperCase()} at $${trade.value}`,
            'success'
          );
        }
      }
    });
  }, [trades, favoriteTokens, addNotification]);

  useEffect(() => {
    const fetchTrades = async () => {
      if (!connection || !walletAddress) return;
      
      setLoading(true);
      setError('');
      
      try {
        const response = await fetch(`http://localhost:5000/trades/${walletAddress}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('No trades found for this wallet');
            setTrades([]);
          } else {
            throw new Error(`Failed to fetch trades: ${response.statusText}`);
          }
          return;
        }
        
        const data = await response.json();
        console.log('Raw trades:', data);
        
        const tradesWithProfits = calculateProfits(data);
        console.log('Trades with profits:', tradesWithProfits);
        
        setTrades(tradesWithProfits);
        setStatus(`Successfully fetched ${data.length} trades`);
      } catch (err) {
        console.error('Error fetching trades:', err);
        setError(err.message);
        setTrades([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTrades();
  }, [connection, walletAddress]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-green-400 to-red-500 bg-clip-text text-transparent">Wallet Tracking</h1>
        <p className="text-gray-400 text-lg">Monitor Solana wallet activities and transactions</p>
      </div>

      <div className="flex flex-col gap-6">
        {renderActiveTrades()}
        <div className="bg-gray-800/50 rounded-3xl border border-gray-700/50 backdrop-blur-xl shadow-xl p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Enter Solana wallet address..."
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl px-5 py-4 pr-12 text-base placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                />
                <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
              <button
                onClick={() => setShowSaveDialog(true)}
                className="px-4 py-4 rounded-2xl bg-gray-700/30 text-gray-300 hover:bg-gray-700/50 transition-all duration-200"
                title="Save Wallet"
              >
                <Star className="w-5 h-5" />
              </button>
              <button
                onClick={handleTrack}
                disabled={loading || !walletAddress.trim()}
                className="bg-gradient-to-r from-green-500 to-red-500 hover:from-green-600 hover:to-red-600 px-8 py-4 rounded-2xl font-medium transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-green-500 disabled:hover:to-red-500 shadow-lg shadow-green-500/20"
              >
                {loading ? (
                  <React.Fragment>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Loading...</span>
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    <Wallet className="w-5 h-5" />
                    <span>Track Wallet</span>
                  </React.Fragment>
                )}
              </button>
            </div>

            {/* Save Wallet Dialog */}
            {showSaveDialog && (
              <div className="mt-4 p-4 bg-gray-700/30 rounded-2xl border border-gray-600/50">
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    placeholder="Enter wallet name..."
                    value={walletName}
                    onChange={(e) => setWalletName(e.target.value)}
                    className="flex-1 bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-2 text-base placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  />
                  <button
                    onClick={saveWallet}
                    disabled={!walletName.trim() || !walletAddress.trim()}
                    className="px-4 py-2 rounded-xl bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowSaveDialog(false)}
                    className="px-4 py-2 rounded-xl bg-gray-600/20 text-gray-400 hover:bg-gray-600/30 transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Saved Wallets List */}
            {savedWallets.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {savedWallets.map((wallet, index) => (
                  <div
                    key={index}
                    className="group flex items-center gap-2 px-3 py-1.5 bg-gray-700/30 rounded-xl border border-gray-600/50 text-sm"
                  >
                    <button
                      onClick={() => loadWallet(wallet)}
                      className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
                    >
                      <span>{wallet.name}</span>
                      <span className="text-gray-500 text-xs">
                        {wallet.address.slice(0, 4)}...{wallet.address.slice(-4)}
                      </span>
                    </button>
                    <button
                      onClick={() => deleteWallet(index)}
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all duration-200"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="mt-4 text-red-400 text-sm">
                {error}
              </div>
            )}
            {status && (
              <div className="mt-4 text-green-400 text-sm">
                {status}
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-3xl border border-gray-700/50 backdrop-blur-xl shadow-xl">
          <div className="p-6 border-b border-gray-700/50">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Recent Trades</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowStatsModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition"
                  >
                    <BarChart2 className="w-4 h-4" />
                    Stats
                  </button>
                  <button
                    onClick={downloadStats}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => toggleFilter('buys')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    filters.buys 
                      ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                      : 'bg-gray-700/20 text-gray-400 hover:bg-gray-700/30'
                  }`}
                >
                  Buys
                </button>
                <button
                  onClick={() => toggleFilter('sells')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    filters.sells 
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                      : 'bg-gray-700/20 text-gray-400 hover:bg-gray-700/30'
                  }`}
                >
                  Sells
                </button>
                <button
                  onClick={() => toggleFilter('favorites')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    filters.favorites 
                      ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' 
                      : 'bg-gray-700/20 text-gray-400 hover:bg-gray-700/30'
                  }`}
                >
                  Favorites
                </button>
                <button
                  onClick={() => toggleFilter('closed')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    filters.closed 
                      ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' 
                      : 'bg-gray-700/20 text-gray-400 hover:bg-gray-700/30'
                  }`}
                >
                  Closed
                </button>
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-700/50">
            {loading ? (
              <div className="p-8 flex justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader className="w-8 h-8 animate-spin text-green-400" />
                  <p className="text-gray-400">Fetching trades...</p>
                </div>
              </div>
            ) : filteredTrades.length > 0 ? (
              filteredTrades.map((trade, index) => {
                const isFavorite = favoriteTokens.has(trade.tokenAddress);
                const isClosingTrade = isFavorite && favoriteTokens.get(trade.tokenAddress) !== trade.type;
                const tokenInfo = getTokenInfo(trade.tokenAddress);
                
                return (
                  <div 
                    key={index} 
                    className={`p-6 hover:bg-gray-700/20 transition-all duration-200 ${
                      isFavorite ? (isClosingTrade ? 'bg-gray-700/30' : 'bg-gray-800/30') : ''
                    }`}
                  >
                    <div className="flex items-center justify-between group">
                      <div className="flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-2xl ${
                          trade.type === 'buy' ? 'bg-green-500/20' : 'bg-red-500/20'
                        } flex items-center justify-center transition-transform duration-200 group-hover:scale-110 backdrop-blur-xl`}>
                          {trade.type === 'buy' ? (
                            <ArrowDownRight className={`w-6 h-6 ${
                              trade.type === 'buy' ? 'text-green-400' : 'text-red-400'
                            }`} />
                          ) : (
                            <ArrowUpRight className={`w-6 h-6 ${
                              trade.type === 'buy' ? 'text-green-400' : 'text-red-400'
                            }`} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`font-medium text-lg ${
                              trade.type === 'buy' ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {trade.type === 'buy' ? 'Buy' : 'Sell'}
                            </span>
                            <div className="flex items-center gap-2">
                              {tokenInfo?.logoURI && (
                                <img 
                                  src={tokenInfo.logoURI} 
                                  alt={tokenInfo.symbol} 
                                  className="w-5 h-5 rounded-full"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              )}
                              <a
                                href={`https://birdeye.so/token/${trade.tokenAddress}?chain=solana`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white/80 hover:text-white flex items-center gap-1 group/token"
                              >
                                {tokenInfo?.symbol || trade.html}
                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </a>
                            </div>
                            <button
                              onClick={() => toggleFavorite(trade.tokenAddress, trade.type)}
                              className={`p-1 rounded-lg transition-colors ${
                                isFavorite ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-500 hover:text-yellow-400'
                              }`}
                            >
                              <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                            </button>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Clock className="w-4 h-4" />
                              {formatTimeAgo(trade.timestamp)}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-2xl font-bold text-green-400">
                                ${trade.value}
                                {tokenInfo?.price && (
                                  <span className="text-sm font-normal ml-2 text-gray-400">
                                    ({(parseFloat(trade.value) / tokenInfo.price).toFixed(2)} {tokenInfo.symbol})
                                  </span>
                                )}
                              </div>
                              {trade.type === 'sell' && (
                                <div className={`text-lg font-semibold ${
                                  trade.profit === undefined ? 'text-gray-400' :
                                  trade.profit >= 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  ({trade.profit === undefined ? 'No matching buy' : 
                                    `${trade.profit >= 0 ? '+' : ''}$${trade.profit.toFixed(2)}`
                                  })
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={`https://birdeye.so/token/${trade.tokenAddress}?chain=solana`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all duration-200 text-sm font-medium group"
                        >
                          Chart
                          <ExternalLink className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </a>
                        <a
                          href={`https://solscan.io/tx/${trade.signature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all duration-200 text-sm font-medium group"
                        >
                          TX
                          <ArrowUpRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <Target className="w-12 h-12 text-gray-600" />
                  <div>
                    <p className="text-gray-400 text-lg mb-1">No trades found</p>
                    <p className="text-gray-600">Enter a wallet address to start tracking trades</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] overflow-auto">
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">Trading Statistics</h3>
                <button
                  onClick={() => setShowStatsModal(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {(() => {
                const { stats, tokenStats } = calculateStats();
                return (
                  <div className="space-y-8">
                    {/* Overall Stats */}
                    <div>
                      <h4 className="text-xl font-semibold mb-4">Overall Performance</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-800 rounded-lg p-4">
                          <div className="text-gray-400 text-sm">Total Profit</div>
                          <div className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ${stats.totalProfit.toFixed(2)}
                          </div>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                          <div className="text-gray-400 text-sm">Win Rate</div>
                          <div className="text-2xl font-bold">
                            {stats.winRate.toFixed(2)}%
                          </div>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                          <div className="text-gray-400 text-sm">Total Volume</div>
                          <div className="text-2xl font-bold">
                            ${stats.totalVolume.toFixed(2)}
                          </div>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                          <div className="text-gray-400 text-sm">Total Trades</div>
                          <div className="text-2xl font-bold">
                            {stats.totalTrades}
                          </div>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4">
                          <div className="text-gray-400 text-sm">Average Profit/Trade</div>
                          <div className={`text-2xl font-bold ${stats.averageProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ${stats.averageProfit.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Token Stats */}
                    <div>
                      <h4 className="text-xl font-semibold mb-4">Token Performance</h4>
                      <div className="space-y-4">
                        {Object.values(tokenStats)
                          .sort((a: any, b: any) => b.totalProfit - a.totalProfit)
                          .map((token: any) => {
                            if (token.totalTrades === 0) return null;
                            const winRate = token.totalSells > 0 ? (token.profitableTrades / token.totalSells) * 100 : 0;
                            const avgProfit = token.totalSells > 0 ? token.totalProfit / token.totalSells : 0;
                            
                            return (
                              <div key={token.address} className="bg-gray-800 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-2">
                                    <h5 className="text-lg font-semibold">{token.symbol}</h5>
                                    <span className="text-sm text-gray-400">{token.address.slice(0, 8)}...</span>
                                  </div>
                                  <div className={`text-lg font-bold ${token.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ${token.totalProfit.toFixed(2)}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div>
                                    <div className="text-gray-400 text-sm">Trades</div>
                                    <div>{token.totalTrades} ({token.totalBuys}/{token.totalSells})</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-400 text-sm">Win Rate</div>
                                    <div>{winRate.toFixed(2)}%</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-400 text-sm">Avg Profit</div>
                                    <div className={avgProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
                                      ${avgProfit.toFixed(2)}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-gray-400 text-sm">Volume</div>
                                    <div>${token.totalVolume.toFixed(2)}</div>
                                  </div>
                                </div>
                              </div>
                            );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}