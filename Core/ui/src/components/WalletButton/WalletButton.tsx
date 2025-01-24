import React, { useState } from 'react';
import { Wallet } from 'lucide-react';

export const WalletButton: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);

  const connectWallet = async () => {
    try {
      // @ts-ignore - Phantom wallet types
      const { solana } = window;

      if (!solana?.isPhantom) {
        window.open('https://phantom.app/', '_blank');
        return;
      }

      const response = await solana.connect();
      console.log('Connected with Public Key:', response.publicKey.toString());
      setIsConnected(true);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="fixed bottom-24 left-4" style={{ zIndex: 9999 }}>
      <button
        onClick={connectWallet}
        className="relative p-3 rounded-xl bg-gray-900/95 backdrop-blur-xl border border-gray-800/50 hover:border-blue-500/50 transition-all duration-300 shadow-lg hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] group"
      >
        <Wallet size={24} className="text-gray-400 group-hover:text-blue-400 transition-colors" />
        <div className="absolute left-full ml-3 px-3 py-1 bg-gray-900/95 backdrop-blur-xl border border-gray-800/50 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          {isConnected ? 'Wallet Connected' : 'Connect Phantom'}
        </div>
        {isConnected && (
          <div className="absolute top-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900" />
        )}
      </button>
    </div>
  );
};