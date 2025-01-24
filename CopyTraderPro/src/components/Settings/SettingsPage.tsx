import React, { useState } from 'react';
import { Settings as SettingsIcon, Save, RefreshCw, Network } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { useSettings } from '../../contexts/SettingsContext';
import { SettingsTabs } from './components/SettingsTabs';
import { WalletSettings } from './components/WalletSettings';
import { TradingSettings } from './components/TradingSettings';
import { ApiSettings } from './components/ApiSettings';
import { DatabaseSettings } from './components/DatabaseSettings';
import { GeneralSettings } from './components/GeneralSettings';

type TabType = 'general' | 'api' | 'database' | 'trading' | 'wallet';

export const SettingsPage: React.FC = () => {
  const { addNotification } = useNotification();
  const { settings, updateSettings, loadSettings, saveSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<TabType>('wallet');
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${settings.api.apiEndpoint}/api/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rpcUrl: settings.api.rpcUrl,
          dbHost: settings.database.host,
          dbPort: settings.database.port,
          dbName: settings.database.name,
          dbUser: settings.database.user,
          dbPassword: settings.database.password
        })
      });

      if (response.ok) {
        const result = await response.json();
        addNotification(result.message || 'Connection test successful', 'success');
      } else {
        throw new Error('Connection test failed');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      addNotification('Connection test failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await saveSettings();
      addNotification('Settings saved successfully', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      addNotification('Failed to save settings', 'error');
    } finally {
      setLoading(false);
    }
  };

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
            onClick={testConnection}
            disabled={loading}
            className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50"
          >
            <Network size={20} />
            <span>Test Connection</span>
          </button>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw size={20} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={20} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Settings Tabs */}
      <SettingsTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Settings Content */}
      <div className="grid grid-cols-2 gap-6">
        {activeTab === 'wallet' && (
          <WalletSettings
            walletAddress={settings.wallet.address}
            setWalletAddress={(address) => updateSettings({ wallet: { ...settings.wallet, address } })}
            privateKey=""
            setPrivateKey={() => {}}
            showPrivateKey={false}
            setShowPrivateKey={() => {}}
            autoConnect={settings.wallet.autoConnect}
            setAutoConnect={(autoConnect) => updateSettings({ wallet: { ...settings.wallet, autoConnect } })}
            confirmTrades={settings.wallet.confirmTrades}
            setConfirmTrades={(confirmTrades) => updateSettings({ wallet: { ...settings.wallet, confirmTrades } })}
            maxGasPrice={settings.wallet.maxGasPrice}
            setMaxGasPrice={(maxGasPrice) => updateSettings({ wallet: { ...settings.wallet, maxGasPrice } })}
            priorityFee={settings.wallet.priorityFee}
            setPriorityFee={(priorityFee) => updateSettings({ wallet: { ...settings.wallet, priorityFee } })}
          />
        )}

        {activeTab === 'trading' && (
          <TradingSettings
            slippage={settings.trading.slippage}
            setSlippage={(slippage) => updateSettings({ trading: { ...settings.trading, slippage } })}
            maxTradeSize={settings.trading.maxTradeSize}
            setMaxTradeSize={(maxTradeSize) => updateSettings({ trading: { ...settings.trading, maxTradeSize } })}
            copyAmount={settings.trading.copyAmount}
            setCopyAmount={(copyAmount) => updateSettings({ trading: { ...settings.trading, copyAmount } })}
            maxConcurrentTrades={settings.trading.maxConcurrentTrades}
            setMaxConcurrentTrades={(maxConcurrentTrades) => updateSettings({ trading: { ...settings.trading, maxConcurrentTrades } })}
            minProfit={settings.trading.minProfit}
            setMinProfit={(minProfit) => updateSettings({ trading: { ...settings.trading, minProfit } })}
            maxLoss={settings.trading.maxLoss}
            setMaxLoss={(maxLoss) => updateSettings({ trading: { ...settings.trading, maxLoss } })}
            tradeDelay={settings.trading.tradeDelay}
            setTradeDelay={(tradeDelay) => updateSettings({ trading: { ...settings.trading, tradeDelay } })}
            autoSell={settings.trading.autoSell}
            setAutoSell={(autoSell) => updateSettings({ trading: { ...settings.trading, autoSell } })}
            takeProfitEnabled={settings.trading.takeProfitEnabled}
            setTakeProfitEnabled={(takeProfitEnabled) => updateSettings({ trading: { ...settings.trading, takeProfitEnabled } })}
            stopLossEnabled={settings.trading.stopLossEnabled}
            setStopLossEnabled={(stopLossEnabled) => updateSettings({ trading: { ...settings.trading, stopLossEnabled } })}
            takeProfitPercentage={settings.trading.takeProfitPercentage}
            setTakeProfitPercentage={(takeProfitPercentage) => updateSettings({ trading: { ...settings.trading, takeProfitPercentage } })}
            stopLossPercentage={settings.trading.stopLossPercentage}
            setStopLossPercentage={(stopLossPercentage) => updateSettings({ trading: { ...settings.trading, stopLossPercentage } })}
            trailingStopEnabled={settings.trading.trailingStopEnabled}
            setTrailingStopEnabled={(trailingStopEnabled) => updateSettings({ trading: { ...settings.trading, trailingStopEnabled } })}
            trailingStopDistance={settings.trading.trailingStopDistance}
            setTrailingStopDistance={(trailingStopDistance) => updateSettings({ trading: { ...settings.trading, trailingStopDistance } })}
          />
        )}

        {activeTab === 'api' && (
          <ApiSettings
            rpcUrl={settings.api.rpcUrl}
            setRpcUrl={(rpcUrl) => updateSettings({ api: { ...settings.api, rpcUrl } })}
            apiEndpoint={settings.api.apiEndpoint}
            setApiEndpoint={(apiEndpoint) => updateSettings({ api: { ...settings.api, apiEndpoint } })}
            wsEndpoint={settings.api.wsEndpoint}
            setWsEndpoint={(wsEndpoint) => updateSettings({ api: { ...settings.api, wsEndpoint } })}
            heliusApiKey={settings.api.heliusApiKey}
            setHeliusApiKey={(heliusApiKey) => updateSettings({ api: { ...settings.api, heliusApiKey } })}
            jupiterApiKey={settings.api.jupiterApiKey}
            setJupiterApiKey={(jupiterApiKey) => updateSettings({ api: { ...settings.api, jupiterApiKey } })}
          />
        )}

        {activeTab === 'database' && (
          <DatabaseSettings
            dbHost={settings.database.host}
            setDbHost={(host) => updateSettings({ database: { ...settings.database, host } })}
            dbPort={settings.database.port}
            setDbPort={(port) => updateSettings({ database: { ...settings.database, port } })}
            dbName={settings.database.name}
            setDbName={(name) => updateSettings({ database: { ...settings.database, name } })}
            dbUser={settings.database.user}
            setDbUser={(user) => updateSettings({ database: { ...settings.database, user } })}
            dbPassword={settings.database.password}
            setDbPassword={(password) => updateSettings({ database: { ...settings.database, password } })}
          />
        )}

        {activeTab === 'general' && (
          <GeneralSettings
            updateInterval={settings.general.updateInterval}
            setUpdateInterval={(updateInterval) => updateSettings({ general: { ...settings.general, updateInterval } })}
            maxRetries={settings.general.maxRetries}
            setMaxRetries={(maxRetries) => updateSettings({ general: { ...settings.general, maxRetries } })}
            logLevel={settings.general.logLevel}
            setLogLevel={(logLevel) => updateSettings({ general: { ...settings.general, logLevel } })}
            notifications={settings.general.notifications}
            setNotifications={(notifications) => updateSettings({ general: { ...settings.general, notifications } })}
          />
        )}
      </div>
    </div>
  );
};