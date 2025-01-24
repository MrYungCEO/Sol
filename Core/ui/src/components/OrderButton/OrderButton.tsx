import React, { useState } from 'react';
import { ShoppingCart, X, ArrowRight, Search, ChevronDown, Coins } from 'lucide-react';

// Mock token data - in a real app, this would come from an API
const tokens = [
  { 
    symbol: 'BONK',
    name: 'Bonk'
  },
  {
    symbol: 'JUP',
    name: 'Jupiter'
  }
];

export const OrderButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTokenSelect, setShowTokenSelect] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedToken, setSelectedToken] = useState(tokens[0]);
  const [amount, setAmount] = useState('');

  const filteredTokens = tokens.filter(token => 
    token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ token: selectedToken, amount });
    setIsOpen(false);
  };

  return (
    <>
      <div className="fixed bottom-4 left-4" style={{ zIndex: 9999 }}>
        <button
          onClick={() => setIsOpen(true)}
          className="relative p-3 rounded-xl bg-gray-900/95 backdrop-blur-xl border border-gray-800/50 hover:border-blue-500/50 transition-all duration-300 shadow-lg hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] group"
        >
          <ShoppingCart size={24} className="text-gray-400 group-hover:text-blue-400 transition-colors" />
        </button>
      </div>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            style={{ zIndex: 9998 }}
            onClick={() => {
              setIsOpen(false);
              setShowTokenSelect(false);
            }}
          />
          <div 
            className="fixed bottom-20 left-4 w-96 rounded-xl bg-gray-900/95 backdrop-blur-xl border border-gray-800/50 shadow-lg animate-slide-up"
            style={{ zIndex: 9999 }}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
              <h3 className="text-lg font-semibold text-white">Place Order</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-800/50 text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Token Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Token
                </label>
                <button
                  type="button"
                  onClick={() => setShowTokenSelect(true)}
                  className="w-full flex items-center justify-between p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white hover:bg-gray-800/70 hover:border-blue-500/50 transition-all duration-300"
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Coins size={16} className="text-blue-400" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-900 rounded-full flex items-center justify-center">
                        <ChevronDown size={12} className="text-gray-400" />
                      </div>
                    </div>
                    <div className="font-semibold text-lg">{selectedToken.symbol}</div>
                  </div>
                </button>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg py-2 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <button
                      type="button"
                      onClick={() => setAmount('100')}
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 shadow-lg hover:shadow-blue-500/25"
              >
                <span>Place Order</span>
                <ArrowRight size={18} />
              </button>
            </form>

            {/* Token Selection Modal */}
            {showTokenSelect && (
              <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-xl rounded-xl border border-gray-800/50">
                <div className="p-4 border-b border-gray-800/50 flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-white">Select Token</h4>
                  <button
                    onClick={() => setShowTokenSelect(false)}
                    className="p-1 rounded-lg hover:bg-gray-800/50 text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="p-4">
                  <div className="relative mb-4">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search tokens"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {filteredTokens.map((token) => (
                      <button
                        key={token.symbol}
                        type="button"
                        onClick={() => {
                          setSelectedToken(token);
                          setShowTokenSelect(false);
                        }}
                        className="w-full p-3 rounded-lg hover:bg-gray-800/50 transition-all duration-300 border border-transparent hover:border-blue-500/50"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <Coins size={16} className="text-blue-400" />
                          </div>
                          <span className="font-semibold text-lg text-white">{token.symbol}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};