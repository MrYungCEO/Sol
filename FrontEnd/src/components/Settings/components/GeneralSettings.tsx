import React from 'react';
import { Settings, Bell, Clock } from 'lucide-react';
import { SettingSection } from './SettingSection';
import { InputField } from './InputField';
import { ToggleField } from './ToggleField';

interface GeneralSettingsProps {
  updateInterval: number;
  setUpdateInterval: (value: number) => void;
  maxRetries: number;
  setMaxRetries: (value: number) => void;
  logLevel: string;
  setLogLevel: (value: string) => void;
  notifications: {
    enabled: boolean;
    sound: boolean;
    tradeAlerts: boolean;
    priceAlerts: boolean;
    errorAlerts: boolean;
  };
  setNotifications: (value: any) => void;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  updateInterval,
  setUpdateInterval,
  maxRetries,
  setMaxRetries,
  logLevel,
  setLogLevel,
  notifications,
  setNotifications,
}) => {
  return (
    <>
      <SettingSection title="System Settings" icon={<Settings size={24} className="text-blue-400" />}>
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
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Log Level
          </label>
          <select
            value={logLevel}
            onChange={(e) => setLogLevel(e.target.value)}
            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-blue-500/50"
          >
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>
      </SettingSection>

      <SettingSection title="Notifications" icon={<Bell size={24} className="text-blue-400" />}>
        <div className="space-y-4">
          <ToggleField
            label="Enable Notifications"
            value={notifications.enabled}
            onChange={(value) => setNotifications({ ...notifications, enabled: value })}
          />
          {notifications.enabled && (
            <div className="space-y-4 pl-4">
              <ToggleField
                label="Sound Notifications"
                value={notifications.sound}
                onChange={(value) => setNotifications({ ...notifications, sound: value })}
              />
              <ToggleField
                label="Trade Alerts"
                value={notifications.tradeAlerts}
                onChange={(value) => setNotifications({ ...notifications, tradeAlerts: value })}
              />
              <ToggleField
                label="Price Alerts"
                value={notifications.priceAlerts}
                onChange={(value) => setNotifications({ ...notifications, priceAlerts: value })}
              />
              <ToggleField
                label="Error Alerts"
                value={notifications.errorAlerts}
                onChange={(value) => setNotifications({ ...notifications, errorAlerts: value })}
              />
            </div>
          )}
        </div>
      </SettingSection>

      <SettingSection title="Auto-Backup" icon={<Clock size={24} className="text-blue-400" />}>
        <div className="space-y-4">
          <ToggleField
            label="Enable Auto-Backup"
            value={true}
            onChange={() => {}}
          />
          <InputField
            label="Backup Interval (hours)"
            value={24}
            onChange={() => {}}
            type="number"
            min={1}
          />
          <ToggleField
            label="Compress Backups"
            value={true}
            onChange={() => {}}
          />
          <ToggleField
            label="Keep Trade History"
            value={true}
            onChange={() => {}}
          />
        </div>
      </SettingSection>
    </>
  );
};