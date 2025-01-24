import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNotification } from './NotificationContext';

interface Settings {
  useJsonFiles: boolean;
  jsonFiles: {
    trades: string;
    wallets: string;
    settings: string;
    tracked_trades: string;
  };
  database: {
    host: string;
    port: string;
    name: string;
    user: string;
    password: string;
  };
  api: {
    rpcUrl: string;
    apiEndpoint: string;
    wsEndpoint: string;
    heliusApiKey: string;
    jupiterApiKey: string;
  };
  trading: {
    slippage: number;
    maxTradeSize: number;
    copyAmount: number;
    maxConcurrentTrades: number;
    minProfit: number;
    maxLoss: number;
    tradeDelay: number;
    autoSell: boolean;
    takeProfitEnabled: boolean;
    stopLossEnabled: boolean;
    takeProfitPercentage: number;
    stopLossPercentage: number;
    trailingStopEnabled: boolean;
    trailingStopDistance: number;
  };
  wallet: {
    address: string;
    autoConnect: boolean;
    confirmTrades: boolean;
    maxGasPrice: number;
    priorityFee: number;
  };
  general: {
    updateInterval: number;
    maxRetries: number;
    logLevel: string;
    notifications: {
      enabled: boolean;
      sound: boolean;
      tradeAlerts: boolean;
      priceAlerts: boolean;
      errorAlerts: boolean;
    };
  };
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

const defaultSettings: Settings = {
  useJsonFiles: true,
  jsonFiles: {
    trades: '/home/project/data/trades.json',
    wallets: '/home/project/data/wallets.json',
    settings: '/home/project/data/settings.json',
    tracked_trades: '/home/project/data/tracked_trades.json'
  },
  database: {
    host: 'localhost',
    port: '5432',
    name: 'trading_db',
    user: 'postgres',
    password: ''
  },
  api: {
    rpcUrl: import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    apiEndpoint: import.meta.env.VITE_API_URL || 'http://localhost:8005',
    wsEndpoint: import.meta.env.VITE_WS_URL || 'ws://localhost:8005/trades/ws',
    heliusApiKey: '',
    jupiterApiKey: ''
  },
  trading: {
    slippage: 0.5,
    maxTradeSize: 1,
    copyAmount: 0.001,
    maxConcurrentTrades: 3,
    minProfit: 2,
    maxLoss: 1,
    tradeDelay: 500,
    autoSell: true,
    takeProfitEnabled: true,
    stopLossEnabled: true,
    takeProfitPercentage: 10,
    stopLossPercentage: 5,
    trailingStopEnabled: false,
    trailingStopDistance: 2
  },
  wallet: {
    address: '',
    autoConnect: true,
    confirmTrades: true,
    maxGasPrice: 0.000005,
    priorityFee: 0.000001
  },
  general: {
    updateInterval: 30,
    maxRetries: 3,
    logLevel: 'info',
    notifications: {
      enabled: true,
      sound: true,
      tradeAlerts: true,
      priceAlerts: true,
      errorAlerts: true
    }
  }
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addNotification } = useNotification();
  const [settings, setSettings] = useState<Settings>(() => {
    // Initialize from localStorage if available
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
      try {
        return {
          ...defaultSettings,
          ...JSON.parse(savedSettings)
        };
      } catch (error) {
        console.error('Error parsing saved settings:', error);
      }
    }
    return defaultSettings;
  });

  const loadSettings = async () => {
    try {
      // First try to load from API
      const response = await fetch(`${settings.api.apiEndpoint}/api/settings`);
      
      if (response.ok) {
        const loadedSettings = await response.json();
        const mergedSettings = {
          ...defaultSettings,
          ...loadedSettings
        };
        setSettings(mergedSettings);
        localStorage.setItem('settings', JSON.stringify(mergedSettings));
        addNotification('Settings loaded successfully', 'success');
      } else {
        // If API fails, load from localStorage
        const savedSettings = localStorage.getItem('settings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          setSettings(prevSettings => ({
            ...prevSettings,
            ...parsedSettings
          }));
          addNotification('Using saved settings from local storage', 'info');
        } else {
          // If no localStorage settings, use defaults
          setSettings(defaultSettings);
          localStorage.setItem('settings', JSON.stringify(defaultSettings));
          addNotification('Using default settings', 'info');
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // On error, ensure we have valid settings from localStorage or defaults
      const savedSettings = localStorage.getItem('settings');
      if (savedSettings) {
        try {
          const parsedSettings = JSON.parse(savedSettings);
          setSettings(prevSettings => ({
            ...prevSettings,
            ...parsedSettings
          }));
          addNotification('Using saved settings from local storage', 'info');
        } catch (parseError) {
          setSettings(defaultSettings);
          localStorage.setItem('settings', JSON.stringify(defaultSettings));
          addNotification('Using default settings', 'info');
        }
      }
    }
  };

  const saveSettings = async () => {
    try {
      // Always save to localStorage first
      localStorage.setItem('settings', JSON.stringify(settings));

      // Try to save to API
      try {
        const response = await fetch(`${settings.api.apiEndpoint}/api/settings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(settings)
        });

        if (response.ok) {
          addNotification('Settings saved successfully', 'success');
        } else {
          addNotification('Settings saved locally (API unavailable)', 'info');
        }
      } catch (apiError) {
        console.error('Error saving to API:', apiError);
        addNotification('Settings saved locally (API unavailable)', 'info');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      addNotification('Failed to save settings', 'error');
    }
  };

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prevSettings => {
      const updatedSettings = {
        ...prevSettings,
        ...newSettings
      };
      // Save to localStorage immediately on update
      localStorage.setItem('settings', JSON.stringify(updatedSettings));
      return updatedSettings;
    });
  };

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loadSettings, saveSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};