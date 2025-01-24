import React, { useState } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw, Sliders, Wallet, Bell, Network, Shield, Coins } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  // Trading Settings
  const [slippage, setSlippage] = useState(0.5);
  const [maxTradeSize, setMaxTradeSize] = useState(1);
  const [minProfit, setMinProfit] = useState(2);
  const [maxLoss, setMaxLoss] = useState(1);

  // Wallet Settings
  const [rpcUrl, setRpcUrl] = useState('https://api.mainnet-beta.solana.com');
  const [autoTrack, setAutoTrack] = useState(true);
  const [trackingInterval, setTrackingInterval] = useState(30);

  // Notification Settings
  const [tradeNotifications, setTradeNotifications] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [walletAlerts, setWalletAlerts] = useState(true);

  // System Settings
  const [apiEndpoint, setApiEndpoint] = useState('http://localhost:8005');
  const [updateInterval, setUpdateInterval] = useState(30);
  const [maxRetries, setMaxRetries] = useState(3);

  const handleSave = async () => {
    try {
      // Here you would make API calls to save the settings
      console.log('Saving settings...');
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const SettingSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
  }> = ({ title, icon, children }) => (
    <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl border border-gray-800/50 overflow-hidden">
      <div className="p-6 border-b border-gray-800/50">
        <h2 className="text-xl font-semibold text-white flex items-center">
          {icon}
          <span className="ml-2">{title}</span>
        </h2>
      </div>
      <div className="p-6 space-y-6">
        {children}
      </div>
    </div>
  );

  const InputField: React.FC<{
    label: string;
    value: string | number;
    onChange: (value: any) => void;
    type?: string;
    min?: number;
    max?: number;
    step?: number;
  }> = ({ label, value, onChange, type = 'text', ...props }) => (
    <div>
      <label className="block text-sm font-medium text-gray-400 mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg py-2 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
        {...props}
      />
    </div>
  );

  const ToggleSetting: React.FC<{
    label: string;
    value: boolean;
    onChange: (value: boolean) => void;
  }> = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between">
      <span className="text-gray-400">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          value ? 'bg-blue-500' : 'bg-gray-700'
        }`}
      >
        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
          value ? 'translate-x-6' : 'translate-x-0'
        }`} />
      </button>
    </div>
  );

  return (
    <div className="flex-1 p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Settings</h1>
          <p className="text-gray-400 mt-1">Configure your trading preferences</p>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Save size={20} />
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Trading Settings */}
        <SettingSection title="Trading Settings" icon={<Sliders size={24} className="text-blue-400" />}>
          <InputField
            label="Slippage Tolerance (%)"
            value={slippage}
            onChange={setSlippage}
            type="number"
            min={0.1}
            max={5}
            step={0.1}
          />
          <InputField
            label="Maximum Trade Size (SOL)"
            value={maxTradeSize}
            onChange={setMaxTradeSize}
            type="number"
            min={0.1}
          />
          <InputField
            label="Minimum Profit Target (%)"
            value={minProfit}
            onChange={setMinProfit}
            type="number"
            min={0}
          />
          <InputField
            label="Maximum Loss Limit (%)"
            value={maxLoss}
            onChange={setMaxLoss}
            type="number"
            min={0}
          />
        </SettingSection>

        {/* Wallet Settings */}
        <SettingSection title="Wallet Settings" icon={<Wallet size={24} className="text-blue-400" />}>
          <InputField
            label="RPC URL"
            value={rpcUrl}
            onChange={setRpcUrl}
          />
          <InputField
            label="Tracking Interval (seconds)"
            value={trackingInterval}
            onChange={setTrackingInterval}
            type="number"
            min={5}
          />
          <div className="space-y-4">
            <ToggleSetting
              label="Auto-track New Wallets"
              value={autoTrack}
              onChange={setAutoTrack}
            />
          </div>
        </SettingSection>

        {/* Notification Settings */}
        <SettingSection title="Notifications" icon={<Bell size={24} className="text-blue-400" />}>
          <div className="space-y-4">
            <ToggleSetting
              label="Trade Notifications"
              value={tradeNotifications}
              onChange={setTradeNotifications}
            />
            <ToggleSetting
              label="Price Alerts"
              value={priceAlerts}
              onChange={setPriceAlerts}
            />
            <ToggleSetting
              label="Wallet Activity Alerts"
              value={walletAlerts}
              onChange={setWalletAlerts}
            />
          </div>
        </SettingSection>

        {/* System Settings */}
        <SettingSection title="System Settings" icon={<Network size={24} className="text-blue-400" />}>
          <InputField
            label="API Endpoint"
            value={apiEndpoint}
            onChange={setApiEndpoint}
          />
          <InputField
            label="Price Update Interval (seconds)"
            value={updateInterval}
            onChange={setUpdateInterval}
            type="number"
            min={5}
          />
          <InputField
            label="Maximum API Retries"
            value={maxRetries}
            onChange={setMaxRetries}
            type="number"
            min={1}
          />
        </SettingSection>
      </div>
    </div>
  );
};