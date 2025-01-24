import React from 'react';

type TabType = 'general' | 'api' | 'database' | 'trading' | 'wallet';

interface SettingsTabsProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const SettingsTabs: React.FC<SettingsTabsProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="flex items-center space-x-2 mb-6 bg-gray-800/50 rounded-lg p-1">
      <button
        onClick={() => setActiveTab('wallet')}
        className={`px-4 py-2 rounded-lg transition-colors ${
          activeTab === 'wallet'
            ? 'bg-blue-500 text-white'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        Wallet
      </button>
      <button
        onClick={() => setActiveTab('trading')}
        className={`px-4 py-2 rounded-lg transition-colors ${
          activeTab === 'trading'
            ? 'bg-blue-500 text-white'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        Trading
      </button>
      <button
        onClick={() => setActiveTab('api')}
        className={`px-4 py-2 rounded-lg transition-colors ${
          activeTab === 'api'
            ? 'bg-blue-500 text-white'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        API
      </button>
      <button
        onClick={() => setActiveTab('database')}
        className={`px-4 py-2 rounded-lg transition-colors ${
          activeTab === 'database'
            ? 'bg-blue-500 text-white'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        Database
      </button>
      <button
        onClick={() => setActiveTab('general')}
        className={`px-4 py-2 rounded-lg transition-colors ${
          activeTab === 'general'
            ? 'bg-blue-500 text-white'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        General
      </button>
    </div>
  );
};