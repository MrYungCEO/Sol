import React, { useState } from 'react';
import { Globe, Key, Network, Shield, Clock, Server, Database, Link, Lock, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { SettingSection } from './SettingSection';
import { InputField } from './InputField';
import { ToggleField } from './ToggleField';
import { ApiEndpointManager } from './ApiEndpointManager';

interface ApiEndpoint {
  id: string;
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description?: string;
}

const defaultEndpoints: ApiEndpoint[] = [
  // Trading Endpoints
  {
    id: 'trades-active',
    name: 'Get Active Trades',
    path: '/api/trades/active',
    method: 'GET',
    description: 'Retrieve all active trades'
  },
  {
    id: 'trades-history',
    name: 'Get Trade History',
    path: '/api/trades',
    method: 'GET',
    description: 'Get complete trade history'
  },
  {
    id: 'trades-stats',
    name: 'Get Trade Statistics',
    path: '/api/trades/stats',
    method: 'GET',
    description: 'Get trading performance statistics'
  },
  {
    id: 'trades-update',
    name: 'Update Trade Prices',
    path: '/api/trades/update',
    method: 'POST',
    description: 'Update prices for all active trades'
  },
  {
    id: 'trades-close',
    name: 'Close Trade',
    path: '/api/trades/{trade_id}/close',
    method: 'POST',
    description: 'Close a specific trade'
  },
  {
    id: 'refresh-prices',
    name: 'Refresh Prices',
    path: '/api/refresh-prices',
    method: 'POST',
    description: 'Refresh all token prices'
  },

  // Order Execution Endpoints
  {
    id: 'buy',
    name: 'Execute Buy',
    path: '/api/buy',
    method: 'POST',
    description: 'Execute a buy order'
  },
  {
    id: 'sell',
    name: 'Execute Sell',
    path: '/api/sell',
    method: 'POST',
    description: 'Execute a sell order'
  },
  {
    id: 'sell-all',
    name: 'Sell All Tokens',
    path: '/api/sell/all',
    method: 'POST',
    description: 'Sell entire token balance'
  },
  {
    id: 'sell-max',
    name: 'Sell Maximum Amount',
    path: '/api/sell/max',
    method: 'POST',
    description: 'Sell maximum possible amount'
  },
  {
    id: 'sell-percentage',
    name: 'Sell Percentage',
    path: '/api/sell/percentage',
    method: 'POST',
    description: 'Sell specific percentage of holdings'
  },

  // Wallet & Token Endpoints
  {
    id: 'wallet-balances',
    name: 'Get Wallet Balances',
    path: '/api/wallet/balances',
    method: 'GET',
    description: 'Get all token balances'
  },
  {
    id: 'wallet-transactions',
    name: 'Get Wallet Transactions',
    path: '/api/wallet/transactions',
    method: 'GET',
    description: 'Get recent transactions'
  },
  {
    id: 'token-price',
    name: 'Get Token Price',
    path: '/api/get_price/{token_address}',
    method: 'GET',
    description: 'Get current price for a token'
  },
  {
    id: 'calculate',
    name: 'Calculate Token Amount',
    path: '/api/calculate',
    method: 'POST',
    description: 'Calculate token amount based on percentage'
  },

  // Copy Trading Endpoints
  {
    id: 'track-wallet',
    name: 'Track Wallet',
    path: '/api/track-wallet',
    method: 'POST',
    description: 'Start tracking a wallet'
  },
  {
    id: 'stop-tracking',
    name: 'Stop Tracking',
    path: '/api/stop-tracking',
    method: 'POST',
    description: 'Stop tracking a wallet'
  },
  {
    id: 'copytrading-wallets',
    name: 'Get Tracked Wallets',
    path: '/api/copytrading/wallets',
    method: 'GET',
    description: 'Get list of tracked wallets'
  },
  {
    id: 'copytrading-add-wallet',
    name: 'Add Tracked Wallet',
    path: '/api/copytrading/wallets',
    method: 'POST',
    description: 'Add a new wallet to track'
  },
  {
    id: 'copytrading-remove-wallet',
    name: 'Remove Tracked Wallet',
    path: '/api/copytrading/wallets/{address}',
    method: 'DELETE',
    description: 'Remove a tracked wallet'
  },

  // Jupiter Integration Endpoints
  {
    id: 'jupiter-quote',
    name: 'Get Jupiter Quote',
    path: '/api/jupiter/quote',
    method: 'POST',
    description: 'Get quote for token swap'
  },
  {
    id: 'jupiter-swap',
    name: 'Execute Jupiter Swap',
    path: '/api/jupiter/swap',
    method: 'POST',
    description: 'Execute token swap via Jupiter'
  },

  // Settings & System Endpoints
  {
    id: 'settings',
    name: 'Get Settings',
    path: '/api/settings',
    method: 'GET',
    description: 'Get application settings'
  },
  {
    id: 'settings-update',
    name: 'Update Settings',
    path: '/api/settings',
    method: 'POST',
    description: 'Update application settings'
  },
  {
    id: 'test-connection',
    name: 'Test Connection',
    path: '/api/test-connection',
    method: 'POST',
    description: 'Test API and database connections'
  },
  {
    id: 'health',
    name: 'Health Check',
    path: '/api/health',
    method: 'GET',
    description: 'Check API health status'
  }
];

interface ApiKey {
  id: string;
  name: string;
  key: string;
  service: string;
  enabled: boolean;
}

interface ApiSettingsProps {
  rpcUrl: string;
  setRpcUrl: (value: string) => void;
  apiEndpoint: string;
  setApiEndpoint: (value: string) => void;
  wsEndpoint: string;
  setWsEndpoint: (value: string) => void;
  heliusApiKey: string;
  setHeliusApiKey: (value: string) => void;
  jupiterApiKey: string;
  setJupiterApiKey: (value: string) => void;
}

export const ApiSettings: React.FC<ApiSettingsProps> = ({
  rpcUrl,
  setRpcUrl,
  apiEndpoint,
  setApiEndpoint,
  wsEndpoint,
  setWsEndpoint,
  heliusApiKey,
  setHeliusApiKey,
  jupiterApiKey,
  setJupiterApiKey,
}) => {
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>(defaultEndpoints);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: '1',
      name: 'Helius API',
      key: heliusApiKey,
      service: 'helius',
      enabled: true
    },
    {
      id: '2',
      name: 'Jupiter API',
      key: jupiterApiKey,
      service: 'jupiter',
      enabled: true
    },
    {
      id: '3',
      name: 'Birdeye API',
      key: '',
      service: 'birdeye',
      enabled: true
    },
    {
      id: '4',
      name: 'Solana Tracker API',
      key: '',
      service: 'solana-tracker',
      enabled: true
    }
  ]);

  const [showKey, setShowKey] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState({
    name: '',
    key: '',
    service: '',
    enabled: true
  });

  const handleApiKeyChange = (id: string, key: string) => {
    const updatedKeys = apiKeys.map(apiKey => {
      if (apiKey.id === id) {
        return { ...apiKey, key };
      }
      return apiKey;
    });
    setApiKeys(updatedKeys);

    // Update parent state for specific services
    const updatedKey = updatedKeys.find(k => k.id === id);
    if (updatedKey) {
      switch (updatedKey.service) {
        case 'helius':
          setHeliusApiKey(key);
          break;
        case 'jupiter':
          setJupiterApiKey(key);
          break;
      }
    }
  };

  const handleAddApiKey = () => {
    if (!newApiKey.name || !newApiKey.service) return;

    const newKey: ApiKey = {
      id: Date.now().toString(),
      name: newApiKey.name,
      key: newApiKey.key,
      service: newApiKey.service,
      enabled: true
    };

    setApiKeys([...apiKeys, newKey]);
    setNewApiKey({ name: '', key: '', service: '', enabled: true });
  };

  const handleRemoveApiKey = (id: string) => {
    setApiKeys(apiKeys.filter(key => key.id !== id));
  };

  return (
    <>
      <SettingSection title="Connection Settings" icon={<Globe size={24} className="text-blue-400" />}>
        <InputField
          label="RPC URL"
          value={rpcUrl}
          onChange={setRpcUrl}
          placeholder="https://api.mainnet-beta.solana.com"
        />
        <InputField
          label="API Endpoint"
          value={apiEndpoint}
          onChange={setApiEndpoint}
          placeholder="http://localhost:8005"
        />
        <InputField
          label="WebSocket Endpoint"
          value={wsEndpoint}
          onChange={setWsEndpoint}
          placeholder="ws://localhost:8005/trades/ws"
        />
      </SettingSection>

      <SettingSection title="API Keys" icon={<Key size={24} className="text-blue-400" />}>
        <div className="space-y-6">
          {/* Existing API Keys */}
          {apiKeys.map((apiKey) => (
            <div key={apiKey.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-400">{apiKey.name}</span>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400">
                    {apiKey.service}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowKey(showKey === apiKey.id ? null : apiKey.id)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showKey === apiKey.id ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    onClick={() => handleRemoveApiKey(apiKey.id)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  type={showKey === apiKey.id ? 'text' : 'password'}
                  value={apiKey.key}
                  onChange={(e) => handleApiKeyChange(apiKey.id, e.target.value)}
                  placeholder={`Enter ${apiKey.name} key`}
                  className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg py-2 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </div>
          ))}

          {/* Add New API Key */}
          <div className="pt-4 border-t border-gray-800/50">
            <h3 className="text-sm font-medium text-gray-400 mb-4">Add New API Key</h3>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="API Name"
                value={newApiKey.name}
                onChange={(e) => setNewApiKey(prev => ({ ...prev, name: e.target.value }))}
                className="bg-gray-800/50 border border-gray-700/50 rounded-lg py-2 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
              />
              <input
                type="text"
                placeholder="Service Name"
                value={newApiKey.service}
                onChange={(e) => setNewApiKey(prev => ({ ...prev, service: e.target.value }))}
                className="bg-gray-800/50 border border-gray-700/50 rounded-lg py-2 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div className="mt-4">
              <input
                type="password"
                placeholder="API Key"
                value={newApiKey.key}
                onChange={(e) => setNewApiKey(prev => ({ ...prev, key: e.target.value }))}
                className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg py-2 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <button
              onClick={handleAddApiKey}
              disabled={!newApiKey.name || !newApiKey.service}
              className="mt-4 w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <Plus size={16} />
              <span>Add API Key</span>
            </button>
          </div>
        </div>
      </SettingSection>

      <SettingSection title="API Endpoints" icon={<Link size={24} className="text-blue-400" />}>
        <ApiEndpointManager
          endpoints={endpoints}
          onUpdate={setEndpoints}
        />
      </SettingSection>

      <SettingSection title="Security Settings" icon={<Shield size={24} className="text-blue-400" />}>
        <div className="space-y-4">
          <ToggleField
            label="Enable Rate Limiting"
            value={true}
            onChange={() => {}}
          />
          <ToggleField
            label="API Key Authentication"
            value={true}
            onChange={() => {}}
          />
          <ToggleField
            label="CORS Protection"
            value={true}
            onChange={() => {}}
          />
          <ToggleField
            label="Request Validation"
            value={true}
            onChange={() => {}}
          />
        </div>
      </SettingSection>

      <SettingSection title="Advanced Settings" icon={<Server size={24} className="text-blue-400" />}>
        <div className="space-y-4">
          <InputField
            label="Request Timeout (ms)"
            value={30000}
            onChange={() => {}}
            type="number"
            min={1000}
            step={1000}
          />
          <InputField
            label="Max Batch Size"
            value={10}
            onChange={() => {}}
            type="number"
            min={1}
          />
          <InputField
            label="Retry Attempts"
            value={3}
            onChange={() => {}}
            type="number"
            min={0}
          />
          <InputField
            label="Retry Delay (ms)"
            value={1000}
            onChange={() => {}}
            type="number"
            min={100}
            step={100}
          />
        </div>
      </SettingSection>

      <SettingSection title="Rate Limiting" icon={<Clock size={24} className="text-blue-400" />}>
        <div className="space-y-4">
          <InputField
            label="Max Requests per Second"
            value={40}
            onChange={() => {}}
            type="number"
            min={1}
          />
          <InputField
            label="Max Concurrent Requests"
            value={10}
            onChange={() => {}}
            type="number"
            min={1}
          />
          <InputField
            label="Rate Limit Window (ms)"
            value={1000}
            onChange={() => {}}
            type="number"
            min={100}
            step={100}
          />
          <ToggleField
            label="Enable IP-based Rate Limiting"
            value={true}
            onChange={() => {}}
          />
        </div>
      </SettingSection>

      <SettingSection title="Caching" icon={<Database size={24} className="text-blue-400" />}>
        <div className="space-y-4">
          <ToggleField
            label="Enable Response Caching"
            value={true}
            onChange={() => {}}
          />
          <InputField
            label="Cache Duration (seconds)"
            value={300}
            onChange={() => {}}
            type="number"
            min={0}
          />
          <InputField
            label="Max Cache Size (MB)"
            value={100}
            onChange={() => {}}
            type="number"
            min={1}
          />
          <ToggleField
            label="Cache Invalidation on Update"
            value={true}
            onChange={() => {}}
          />
        </div>
      </SettingSection>
    </>
  );
};