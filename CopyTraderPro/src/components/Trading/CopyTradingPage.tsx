import React, { useState } from 'react';
import { Target, Search, Star, Loader, Wallet, Activity } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { SaveWalletModal } from './SaveWalletModal';
import { SavedWalletsList } from './SavedWalletsList';
import { TradeSignals } from './TradeSignals';
import { ActiveTrades } from '../Dashboard/ActiveTrades';
import { Modal } from '../Modal/Modal';
import { getSavedWallets, saveWallet, deleteWallet } from '../../utils/walletStorage';
import { useTradeTracking } from '../../hooks/useTradeTracking';
import { useTrackedTrades } from '../../hooks/useTrackedTrades';
import type { SavedWallet } from '../../types/trades';
import type { TrackedTrade } from '../../types/tracked-trades';

export const CopyTradingPage: React.FC = () => {
  const { addNotification } = useNotification();
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savedWallets, setSavedWallets] = useState<SavedWallet[]>([]);
  const [copyEnabled, setCopyEnabled] = useState(false);
  const [showSavedWallets, setShowSavedWallets] = useState(false);
  const [trackedWallet, setTrackedWallet] = useState<string | null>(null);
  const [trades, setTrades] = useState<TrackedTrade[]>([]);

  // Initialize trade tracking
  const {
    trades: liveTradeData,
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
    error: trackedTradesError
  } = useTrackedTrades();

  // Load saved wallets on mount
  React.useEffect(() => {
    setSavedWallets(getSavedWallets());
  }, []);

  // Show WebSocket connection status
  React.useEffect(() => {
    if (trackedWallet) {
      if (wsConnected) {
        addNotification('Connected to trading server', 'success');
      } else {
        addNotification('Disconnected from trading server', 'warning');
      }
    }
  }, [wsConnected, trackedWallet, addNotification]);

  // Load trades automatically on mount
  React.useEffect(() => {
    loadPreviousTrades();
  }, []);

  const handleTrack = async () => {
    if (!walletAddress.trim()) {
      setError('Please enter a wallet address');
      return;
    }
    
    setLoading(true);
    setError('');
    setStatus('Tracking wallet...');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/track-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ wallet_address: walletAddress })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to track wallet');
      }

      setTrackedWallet(walletAddress);
      setStatus('Successfully tracking wallet');
      addNotification('Wallet tracking started successfully', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to track wallet';
      setError(errorMessage);
      addNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadPreviousTrades = async () => {
    setLoadingTrades(true);
    try {
      const response = await fetch('/src/data/tracked_trades.json');
      if (!response.ok) {
        throw new Error(`Failed to load trades: ${response.status}`);
      }
      const data = await response.json();
      
      // Convert object of trades to array and ensure each trade has required fields
      const tradesArray = Object.entries(data).map(([id, tradeData]) => {
        const trade = tradeData as any;
        return {
          id,
          type: trade.type || 'buy',
          value: trade.value || 0,
          tokenAddress: trade.tokenAddress || trade.token_address,
          tokenAmount: trade.tokenAmount || trade.token_amount || 0,
          amount_in_sol: trade.amount_in_sol || 0,
          signature: trade.signature || id,
          wallet_group: trade.wallet_group || null,
          date_time: trade.date_time,
          transactionLink: trade.transactionLink || trade.transaction_link || trade.TransactionLink,
          html: trade.html || `<span class='text-${(trade.type || 'buy') === 'buy' ? 'green' : 'red'}-500'>${(trade.type || 'buy').toUpperCase()}</span>`
        } as TrackedTrade;
      });
      
      setTrades(tradesArray);
      console.log('Loaded trades:', tradesArray);
      addNotification(`Loaded ${tradesArray.length} previous trades`, 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load trades';
      console.error('Error loading trades:', error);
      addNotification(message, 'error');
    } finally {
      setLoadingTrades(false);
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

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Copy Trading</h1>
          <p className="text-gray-400 mt-1">Copy trades from successful traders</p>
        </div>
        <div className="flex items-center space-x-4">
          {wsConnected && (
            <div className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span>Connected</span>
            </div>
          )}
          <button
            onClick={handleCopyToggle}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              copyEnabled 
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
            }`}
          >
            {copyEnabled ? 'Disable Copy Trading' : 'Enable Copy Trading'}
          </button>
        </div>
      </div>

      {/* Wallet Input */}
      <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-800/50 mb-8">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Enter wallet address..."
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="w-full bg-gray-800/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 border border-gray-700/50"
            />
            <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          </div>
          <button
            onClick={() => setShowSaveDialog(true)}
            className="p-3 rounded-xl bg-gray-800/50 text-gray-400 hover:text-white transition-colors"
            title="Save wallet"
          >
            <Star size={20} />
          </button>
          <button
            onClick={() => setShowSavedWallets(true)}
            className="p-3 rounded-xl bg-gray-800/50 text-gray-400 hover:text-white transition-colors"
            title="View saved wallets"
          >
            <Wallet size={20} />
          </button>
          <button
            onClick={handleTrack}
            disabled={loading || !walletAddress.trim()}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="animate-spin" size={20} />
                <span>Loading...</span>
              </>
            ) : (
              <>
                <Target size={20} />
                <span>Track Wallet</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 text-red-400 text-sm">{error}</div>
        )}
        {status && (
          <div className="mt-4 text-green-400 text-sm">{status}</div>
        )}
      </div>

      {/* Load Previous Trades Button */}
      <div className="mb-8">
        <button
          onClick={loadPreviousTrades}
          disabled={loadingTrades}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loadingTrades ? (
            <>
              <Loader className="animate-spin" size={20} />
              <span>Loading trades...</span>
            </>
          ) : (
            <>
              <Activity size={20} />
              <span>Refresh Trades</span>
            </>
          )}
        </button>
      </div>

      {/* Trade Signals */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center">
          <Activity size={24} className="mr-2 text-blue-400" />
          Trade Signals
          {trades.length > 0 && (
            <span className="ml-2 text-sm text-gray-400">
              ({trades.length} trades)
            </span>
          )}
        </h2>
        <TradeSignals
          trades={trades}
          onViewTrade={() => {}}
        />
      </div>

      {/* Active Trades */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center">
          <Activity size={24} className="mr-2 text-green-400" />
          Active Trades
          {trades.filter(t => t.type === 'buy').length > 0 && (
            <span className="ml-2 text-sm text-gray-400">
              ({trades.filter(t => t.type === 'buy').length} active)
            </span>
          )}
        </h2>
        <ActiveTrades />
      </div>

      {/* Save Wallet Modal */}
      <SaveWalletModal
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSaveWallet}
        walletAddress={walletAddress}
      />

      {/* Saved Wallets Modal */}
      <Modal
        isOpen={showSavedWallets}
        onClose={() => setShowSavedWallets(false)}
      >
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-6">Saved Wallets</h2>
          <SavedWalletsList
            wallets={savedWallets}
            onSelect={handleSelectWallet}
            onDelete={handleDeleteWallet}
          />
        </div>
      </Modal>
    </div>
  );
};