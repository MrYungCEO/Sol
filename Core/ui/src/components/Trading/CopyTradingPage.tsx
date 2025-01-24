import React, { useState, useEffect } from 'react';
import { Target, Search, Star, Loader, Wallet, Activity, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { SaveWalletModal } from './SaveWalletModal';
import { SavedWalletsList } from './SavedWalletsList';
import { getSavedWallets, saveWallet, deleteWallet } from '../../utils/walletStorage';
import { useTradeTracking } from '../../hooks/useTradeTracking';
import { useTrackedTrades } from '../../hooks/useTrackedTrades';
import { TradesList } from './TradesList';
import { TradingViewChart } from '../Dashboard/TradingViewChart';
import { Modal } from '../Modal/Modal';
import type { SavedWallet, Trade, TradeWithStats } from '../../types/trades';

export const CopyTradingPage: React.FC = () => {
  const { addNotification } = useNotification();
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showSavedWallets, setShowSavedWallets] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<any>(null);
  const [trackedWallet, setTrackedWallet] = useState<string | null>(null);
  const [trackedWallets, setTrackedWallets] = useState<{ address: string; isTracking: boolean }[]>(JSON.parse(localStorage.getItem('trackedWallets') || '[]'));
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [expandedWallets, setExpandedWallets] = useState<Set<string>>(new Set());
  const [currentActiveTrades, setCurrentActiveTrades] = useState<any[]>([]);
  const [activeTradesLoading, setActiveTradesLoading] = useState(false);
  const [activeTradesError, setActiveTradesError] = useState<string | null>(null);
  const [copyEnabled, setCopyEnabled] = useState(false);
  const [savedWallets, setSavedWallets] = useState<SavedWallet[]>([]);

  // API base URL
  const API_BASE_URL = 'http://localhost:8005';

  // Function to map raw trade data to trade object
  const mapRawTradeToTrade = (rawTrade: any): TradeWithStats => {
    return {
      id: rawTrade.id || rawTrade.trade_id,
      timestamp: rawTrade.date_time ? new Date(rawTrade.date_time).getTime() : Date.now(),
      tokenAddress: rawTrade.tokenAddress || rawTrade.token_address,
      amount: rawTrade.amount_in_sol || rawTrade.value || 0,
      tokenAmount: rawTrade.token_amount || 0,
      type: rawTrade.type || rawTrade.trade_type || 'buy',
      status: rawTrade.status || 'active',
      profitPercentage: rawTrade.profit_percentage || 0,
      buyPrice: rawTrade.buy_price || 0,
      currentPrice: rawTrade.current_price || 0,
      closePrice: rawTrade.close_price || null,
      transactionLink: rawTrade.transaction_link || `https://solscan.io/token/${rawTrade.tokenAddress || rawTrade.token_address}`,
      walletGroup: rawTrade.wallet_group || null,
      result: rawTrade.result || 'pending'
    };
  };

  // Load trades from JSON file
  useEffect(() => {
    const fetchActiveTrades = async () => {
      setActiveTradesLoading(true);
      setActiveTradesError(null);
      try {
        // Import trades directly from JSON
        const tradesData = (await import('../../data/trades.json')).default;
        
        // Filter for active trades only
        const activeTrades = Object.entries(tradesData)
          .map(([_, trade]: [string, any]) => mapRawTradeToTrade(trade))
          .filter(trade => trade.status === 'active')
          .sort((a, b) => b.timestamp - a.timestamp);

        setCurrentActiveTrades(activeTrades);
      } catch (err) {
        setActiveTradesError(err instanceof Error ? err.message : 'Failed to load active trades');
      } finally {
        setActiveTradesLoading(false);
      }
    };

    fetchActiveTrades();
    const interval = setInterval(fetchActiveTrades, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const toggleWalletExpansion = (walletId: string) => {
    const newExpanded = new Set(expandedWallets);
    if (newExpanded.has(walletId)) {
      newExpanded.delete(walletId);
    } else {
      newExpanded.add(walletId);
    }
    setExpandedWallets(newExpanded);
  };

  // Initialize trade tracking
  const {
    trades,
    activeTrades,
    loading: tradesLoading,
    error: tradesError,
    isConnected: wsConnected,
    trackWallet
  } = useTradeTracking(trackedWallet);

  // Get tracked trades data
  const {
    walletGroups,
    totalProfit,
    winRate,
    loading: trackedTradesLoading,
    error: trackedTradesError,
    stats
  } = useTrackedTrades();

  // Load saved wallets on mount
  useEffect(() => {
    setSavedWallets(getSavedWallets());
  }, []);

  // Load tracked wallets from localStorage on mount
  useEffect(() => {
    const savedWallets = localStorage.getItem('trackedWallets');
    if (savedWallets) {
      setTrackedWallets(JSON.parse(savedWallets));
    }
  }, []);

  // Show WebSocket connection status
  useEffect(() => {
    if (trackedWallet) {
      if (wsConnected) {
        addNotification('Connected to trading server', 'success');
      } else {
        addNotification('Disconnected from trading server', 'warning');
      }
    }
  }, [wsConnected, trackedWallet, addNotification]);

  const handleTrackWallet = async (address: string) => {
    if (!address) return;
    
    setLoading(true);
    setError(null);
    setStatus(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/track-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to track wallet');
      }
      
      const data = await response.json();
      if (data.success) {
        setStatus('Wallet tracked successfully');
        addNotification('Wallet tracked successfully', 'success');
      } else {
        throw new Error(data.error || 'Failed to track wallet');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to track wallet');
      addNotification('Failed to track wallet', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStopTracking = async (address: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stop-tracking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to stop tracking wallet');
      }

      // Remove wallet from tracked wallets
      const updatedWallets = trackedWallets.filter(w => w.address !== address);
      setTrackedWallets(updatedWallets);
      localStorage.setItem('trackedWallets', JSON.stringify(updatedWallets));

      // Show success notification
      addNotification('Stopped tracking wallet', 'success');
    } catch (error: any) {
      console.error('Failed to stop tracking wallet:', error);
      addNotification(error.message || 'Failed to stop tracking wallet', 'error');
    }
  };

  const handleSaveWallet = (wallet: SavedWallet) => {
    const updated = saveWallet(wallet);
    setSavedWallets(updated);
    addNotification('Wallet saved successfully', 'success');
  };

  const handleDeleteWallet = (address: string) => {
    const updated = deleteWallet(address);
    setSavedWallets(updated);
    addNotification('Wallet removed from saved list', 'info');
  };

  const handleSelectWallet = (wallet: SavedWallet) => {
    setWalletAddress(wallet.address);
    setShowSavedWallets(false);
    addNotification(`Selected wallet: ${wallet.name}`, 'info');
  };

  const handleCopyToggle = () => {
    setCopyEnabled(!copyEnabled);
    addNotification(
      copyEnabled ? 'Copy trading disabled' : 'Copy trading enabled',
      copyEnabled ? 'info' : 'success'
    );
  };

  const fetchActiveTrades = async (address: string) => {
    setActiveTradesLoading(true);
    setActiveTradesError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/trades/active?wallet=${address}`);
      if (!response.ok) {
        throw new Error('Failed to fetch active trades');
      }
      const data = await response.json();
      const mappedTrades = Object.values(data)
        .filter((trade: any) => trade.status === 'active' || !trade.status)
        .map(mapRawTradeToTrade);
      setCurrentActiveTrades(mappedTrades);
    } catch (err) {
      setActiveTradesError(err instanceof Error ? err.message : 'Failed to fetch active trades');
      console.error('Error fetching active trades:', err);
    } finally {
      setActiveTradesLoading(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-white">Copy Trading</h1>
          <button
            onClick={() => setShowSavedWallets(true)}
            className="px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors flex items-center space-x-2"
          >
            <Star size={18} />
            <span>Saved Wallets</span>
          </button>
        </div>
        <div className="text-sm text-gray-400">
          {wsConnected ? (
            <span className="text-green-400">Connected to trading server</span>
          ) : (
            <span className="text-yellow-400">Connecting to trading server...</span>
          )}
        </div>
      </div>

      {/* Wallet Input */}
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800/50">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="Enter wallet address to track..."
              className="w-full bg-gray-800/50 text-white placeholder-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            {walletAddress && (
              <button
                onClick={() => setWalletAddress('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowSavedWallets(true)}
            className="px-4 py-2 bg-gray-800/50 text-white rounded-lg hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <Wallet size={20} />
          </button>
          <button
            onClick={() => handleTrackWallet(walletAddress)}
            disabled={!walletAddress || loading}
            className={`px-6 py-2 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
              !walletAddress || loading
                ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {loading ? (
              <div className="flex items-center">
                <Loader size={16} className="animate-spin mr-2" />
                Tracking...
              </div>
            ) : (
              'Track'
            )}
          </button>
        </div>
        {error && <div className="mt-2 text-red-400 text-sm">{error}</div>}
        {status && <div className="mt-2 text-green-400 text-sm">{status}</div>}
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="text-sm text-gray-400">Total Volume</div>
            <div className="text-lg font-medium text-white">
              {stats.totalVolume.toFixed(2)} SOL
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="text-sm text-gray-400">Total Trades</div>
            <div className="text-lg font-medium text-white">
              {stats.totalTrades}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="text-sm text-gray-400">Buy Trades</div>
            <div className="text-lg font-medium text-white">
              {stats.buyCount}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="text-sm text-gray-400">Sell Trades</div>
            <div className="text-lg font-medium text-white">
              {stats.sellCount}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="text-sm text-gray-400">Total Profit</div>
            <div className={`text-lg font-medium ${
              stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {stats.totalProfit.toFixed(2)}%
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-6">
        {/* Wallet Input Section */}
        <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800/50">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="Enter wallet address to track..."
                className="w-full bg-gray-800/50 text-white placeholder-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              {walletAddress && (
                <button
                  onClick={() => setWalletAddress('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowSavedWallets(true)}
              className="px-4 py-2 bg-gray-800/50 text-white rounded-lg hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <Wallet size={20} />
            </button>
            <button
              onClick={() => handleTrackWallet(walletAddress)}
              disabled={!walletAddress || loading}
              className={`px-6 py-2 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                !walletAddress || loading
                  ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {loading ? (
                <div className="flex items-center">
                  <Loader size={16} className="animate-spin mr-2" />
                  Tracking...
                </div>
              ) : (
                'Track'
              )}
            </button>
          </div>
          {error && <div className="mt-2 text-red-400 text-sm">{error}</div>}
          {status && <div className="mt-2 text-green-400 text-sm">{status}</div>}
        </div>

        {/* Tracked Wallets Section */}
        {walletGroups.length > 0 && (
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800/50">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center">
                <Activity size={24} className="mr-2 text-blue-400" />
                Tracked Wallets
              </h2>
              <div className="flex items-center space-x-4">
                <div className="text-sm">
                  <span className={`${(totalProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'} font-semibold`}>
                    {(totalProfit || 0) >= 0 ? '+' : ''}{(totalProfit || 0).toFixed(2)} SOL
                  </span>
                  <span className="text-gray-400 mx-2">•</span>
                  <span className="text-blue-400">{(winRate || 0).toFixed(1)}% Win Rate</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {walletGroups.map((wallet) => {
                const isExpanded = expandedWallets.has(wallet.id);
                const isSelected = selectedWalletId === wallet.id;

                return (
                  <div
                    key={wallet.id}
                    className={`bg-gray-900/50 backdrop-blur-xl rounded-xl border transition-all duration-300 ${
                      isSelected 
                        ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
                        : 'border-gray-800/50 hover:border-blue-500/50'
                    }`}
                  >
                    <div 
                      className="p-6 border-b border-gray-800/50 cursor-pointer"
                      onClick={() => {
                        setSelectedWalletId(isSelected ? null : wallet.id);
                        if (!isExpanded) {
                          toggleWalletExpansion(wallet.id);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${
                            isSelected ? 'bg-blue-500/20' : 'bg-blue-500/10'
                          }`}>
                            <Target className={`${
                              isSelected ? 'text-blue-400' : 'text-blue-400/70'
                            }`} size={20} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{wallet.name}</h3>
                            <div className="flex items-center space-x-2 text-sm">
                              <span className="text-gray-400">{wallet.address}</span>
                              <a
                                href={`https://solscan.io/account/${wallet.address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Target size={14} />
                              </a>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-6">
                          <div className="text-right">
                            <div className={`text-lg font-semibold ${
                              (wallet.totalProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {(wallet.totalProfit || 0) >= 0 ? '+' : ''}{(wallet.totalProfit || 0).toFixed(4)} SOL
                            </div>
                            <div className="text-sm text-gray-400">
                              {(wallet.successfulTrades || 0)} / {(wallet.totalTrades || 0)} Trades
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleWalletExpansion(wallet.id);
                            }}
                            className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp size={20} className="text-gray-400" />
                            ) : (
                              <ChevronDown size={20} className="text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className={`rounded-lg p-3 transition-colors ${
                          isSelected ? 'bg-gray-800/70' : 'bg-gray-800/50'
                        }`}>
                          <div className="text-sm text-gray-400">Success Rate</div>
                          <div className="text-white font-semibold">{(wallet.winRate || 0).toFixed(1)}%</div>
                        </div>
                        <div className={`rounded-lg p-3 transition-colors ${
                          isSelected ? 'bg-gray-800/70' : 'bg-gray-800/50'
                        }`}>
                          <div className="text-sm text-gray-400">Total Profit</div>
                          <div className={`font-semibold ${wallet.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {(wallet.totalProfit || 0) >= 0 ? '+' : ''}{(wallet.totalProfit || 0).toFixed(4)} SOL
                          </div>
                        </div>
                        <div className={`rounded-lg p-3 transition-colors ${
                          isSelected ? 'bg-gray-800/70' : 'bg-gray-800/50'
                        }`}>
                          <div className="text-sm text-gray-400">Total Trades</div>
                          <div className="text-white font-semibold">{(wallet.totalTrades || 0)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Trades List for each wallet group */}
                    {isExpanded && (
                      <div className="p-6">
                        {wallet.trades && wallet.trades.length > 0 ? (
                          <TradesList
                            trades={wallet.trades}
                            onViewTrade={setSelectedTrade}
                            listType="tracked"
                            itemsPerPage={10}
                          />
                        ) : (
                          <div className="text-center text-gray-400 py-4">
                            No trades available for this wallet
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Trades Section */}
        <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Activity className="text-blue-400" size={20} />
              </div>
              <h2 className="text-lg font-semibold text-white">Active Trades</h2>
            </div>
            {activeTradesLoading ? (
              <div className="flex items-center text-gray-400">
                <Loader size={16} className="animate-spin mr-2" />
                Loading trades...
              </div>
            ) : (
              <div className="text-sm text-gray-400">
                {currentActiveTrades.length} active {currentActiveTrades.length === 1 ? 'trade' : 'trades'}
              </div>
            )}
          </div>
          
          {activeTradesError ? (
            <div className="text-red-400">{activeTradesError}</div>
          ) : currentActiveTrades.length > 0 ? (
            <TradesList
              trades={currentActiveTrades.map(mapRawTradeToTrade)}
              onViewTrade={setSelectedTrade}
              listType="active"
              itemsPerPage={10}
            />
          ) : (
            <div className="text-center text-gray-400 py-4">
              No active trades
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={showSavedWallets}
        onClose={() => setShowSavedWallets(false)}
        title="Saved Wallets"
      >
        <SavedWalletsList
          wallets={savedWallets}
          onSelect={(wallet) => {
            setWalletAddress(wallet.address);
            setShowSavedWallets(false);
            handleTrackWallet(wallet.address);
          }}
          onDelete={(address) => {
            deleteWallet(address);
            setSavedWallets(getSavedWallets());
            addNotification('Wallet deleted', 'success');
          }}
        />
      </Modal>

      {/* Save Wallet Modal */}
      <SaveWalletModal
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSaveWallet}
        walletAddress={walletAddress}
      />

      {/* Trade Details Modal */}
      <Modal
        isOpen={selectedTrade !== null}
        onClose={() => setSelectedTrade(null)}
      >
        {selectedTrade && (
          <TradingViewChart trade={selectedTrade} />
        )}
      </Modal>
    </div>
  );
};