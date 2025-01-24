import React, { useState, useEffect } from 'react';
import { Wallet } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';

// Add Phantom wallet types
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      on: (event: string, callback: () => void) => void;
      request: (params: { method: string }) => Promise<{ publicKey: { toString: () => string } }>;
    };
  }
}

export const WalletButton: React.FC = () => {
  const { addNotification } = useNotification();
  const [isConnected, setIsConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    // Check if Phantom is installed and connected on mount
    const checkConnection = async () => {
      try {
        if (window.solana?.isPhantom) {
          const response = await window.solana.connect({ onlyIfTrusted: true });
          setPublicKey(response.publicKey.toString());
          setIsConnected(true);
        }
      } catch (error) {
        // User hasn't connected to the app yet or has revoked permissions
        setIsConnected(false);
        setPublicKey(null);
      }
    };

    checkConnection();

    // Listen for account changes
    window.solana?.on('accountChanged', () => {
      checkConnection();
    });
  }, []);

  const connectWallet = async () => {
    try {
      if (!window.solana) {
        addNotification('Please install Phantom wallet', 'error');
        window.open('https://phantom.app/', '_blank');
        return;
      }

      if (!window.solana.isPhantom) {
        addNotification('Please install Phantom wallet', 'error');
        window.open('https://phantom.app/', '_blank');
        return;
      }

      // Request connection
      const response = await window.solana.connect();
      const walletPublicKey = response.publicKey.toString();
      
      setPublicKey(walletPublicKey);
      setIsConnected(true);
      
      // Show shortened public key in notification
      const shortKey = `${walletPublicKey.slice(0, 4)}...${walletPublicKey.slice(-4)}`;
      addNotification(`Connected: ${shortKey}`, 'success');

    } catch (error) {
      console.error('Error connecting wallet:', error);
      addNotification('Failed to connect wallet', 'error');
      setIsConnected(false);
      setPublicKey(null);
    }
  };

  const disconnectWallet = async () => {
    try {
      await window.solana?.disconnect();
      setIsConnected(false);
      setPublicKey(null);
      addNotification('Wallet disconnected', 'info');
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      addNotification('Failed to disconnect wallet', 'error');
    }
  };

  return (
    <div className="fixed bottom-4 left-4" style={{ zIndex: 9999 }}>
      <button
        onClick={isConnected ? disconnectWallet : connectWallet}
        className="relative p-3 rounded-xl bg-gray-900/95 backdrop-blur-xl border border-gray-800/50 hover:border-blue-500/50 transition-all duration-300 shadow-lg hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] group"
      >
        <Wallet size={24} className="text-gray-400 group-hover:text-blue-400 transition-colors" />
        <div className="absolute left-full ml-3 px-3 py-1 bg-gray-900/95 backdrop-blur-xl border border-gray-800/50 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          {isConnected ? (
            <>Disconnect Wallet ({publicKey?.slice(0, 4)}...{publicKey?.slice(-4)})</>
          ) : (
            'Connect Phantom'
          )}
        </div>
        {isConnected && (
          <div className="absolute top-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900" />
        )}
      </button>
    </div>
  );
};