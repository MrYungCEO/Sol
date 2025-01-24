import React, { useState } from 'react';
import { Database, Shield, File, FolderOpen, Plus, Trash2 } from 'lucide-react';
import { SettingSection } from './SettingSection';
import { InputField } from './InputField';
import { ToggleField } from './ToggleField';

interface DatabaseSettingsProps {
  dbHost: string;
  setDbHost: (value: string) => void;
  dbPort: string;
  setDbPort: (value: string) => void;
  dbName: string;
  setDbName: (value: string) => void;
  dbUser: string;
  setDbUser: (value: string) => void;
  dbPassword: string;
  setDbPassword: (value: string) => void;
}

interface JsonFile {
  id: string;
  name: string;
  path: string;
  type: 'trades' | 'wallets' | 'settings' | 'tracked_trades' | 'other';
}

export const DatabaseSettings: React.FC<DatabaseSettingsProps> = ({
  dbHost,
  setDbHost,
  dbPort,
  setDbPort,
  dbName,
  setDbName,
  dbUser,
  setDbUser,
  dbPassword,
  setDbPassword,
}) => {
  const [useJsonFiles, setUseJsonFiles] = useState(true);
  const [jsonFiles, setJsonFiles] = useState<JsonFile[]>([
    {
      id: '1',
      name: 'Trades',
      path: '/home/project/data/trades.json',
      type: 'trades'
    },
    {
      id: '2',
      name: 'Wallets',
      path: '/home/project/data/wallets.json',
      type: 'wallets'
    },
    {
      id: '3',
      name: 'Settings',
      path: '/home/project/data/settings.json',
      type: 'settings'
    },
    {
      id: '4',
      name: 'Tracked Trades',
      path: '/home/project/data/tracked_trades.json',
      type: 'tracked_trades'
    }
  ]);

  const [newFile, setNewFile] = useState<Partial<JsonFile>>({
    type: 'other'
  });

  const handleAddFile = () => {
    if (!newFile.name || !newFile.path) return;

    const file: JsonFile = {
      id: Date.now().toString(),
      name: newFile.name,
      path: newFile.path,
      type: newFile.type as JsonFile['type']
    };

    setJsonFiles([...jsonFiles, file]);
    setNewFile({ type: 'other' });
  };

  const handleRemoveFile = (id: string) => {
    setJsonFiles(files => files.filter(f => f.id !== id));
  };

  return (
    <>
      <SettingSection title="Database Type" icon={<Database size={24} className="text-blue-400" />}>
        <div className="space-y-4">
          <ToggleField
            label="Use JSON Files (Temporary Database)"
            value={useJsonFiles}
            onChange={setUseJsonFiles}
          />
        </div>
      </SettingSection>

      {useJsonFiles ? (
        <SettingSection title="JSON File Locations" icon={<File size={24} className="text-blue-400" />}>
          <div className="space-y-6">
            {/* Existing JSON Files */}
            {jsonFiles.map((file) => (
              <div key={file.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-400">{file.name}</span>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400">
                      {file.type}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveFile(file.id)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={file.path}
                    onChange={(e) => {
                      const updatedFiles = jsonFiles.map(f =>
                        f.id === file.id ? { ...f, path: e.target.value } : f
                      );
                      setJsonFiles(updatedFiles);
                    }}
                    className="flex-1 bg-gray-800/50 border border-gray-700/50 rounded-lg py-2 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                    placeholder="Enter file path"
                  />
                  <button
                    onClick={() => {}}
                    className="p-2 bg-gray-800/50 text-gray-400 hover:text-white rounded-lg transition-colors"
                    title="Browse"
                  >
                    <FolderOpen size={16} />
                  </button>
                </div>
              </div>
            ))}

            {/* Add New JSON File */}
            <div className="pt-4 border-t border-gray-800/50">
              <h3 className="text-sm font-medium text-gray-400 mb-4">Add New JSON File</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="File Name"
                  value={newFile.name || ''}
                  onChange={(e) => setNewFile(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-gray-800/50 border border-gray-700/50 rounded-lg py-2 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                />
                <select
                  value={newFile.type || 'other'}
                  onChange={(e) => setNewFile(prev => ({ ...prev, type: e.target.value as JsonFile['type'] }))}
                  className="bg-gray-800/50 border border-gray-700/50 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="trades">Trades</option>
                  <option value="wallets">Wallets</option>
                  <option value="settings">Settings</option>
                  <option value="tracked_trades">Tracked Trades</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex items-center space-x-2 mb-4">
                <input
                  type="text"
                  placeholder="File Path"
                  value={newFile.path || ''}
                  onChange={(e) => setNewFile(prev => ({ ...prev, path: e.target.value }))}
                  className="flex-1 bg-gray-800/50 border border-gray-700/50 rounded-lg py-2 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                />
                <button
                  onClick={() => {}}
                  className="p-2 bg-gray-800/50 text-gray-400 hover:text-white rounded-lg transition-colors"
                  title="Browse"
                >
                  <FolderOpen size={16} />
                </button>
              </div>
              <button
                onClick={handleAddFile}
                disabled={!newFile.name || !newFile.path}
                className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-lg flex items-center justify-center space-x-2 transition-colors"
              >
                <Plus size={16} />
                <span>Add File</span>
              </button>
            </div>

            {/* Auto-backup Settings */}
            <div className="pt-4 border-t border-gray-800/50 space-y-4">
              <h3 className="text-sm font-medium text-gray-400">Backup Settings</h3>
              <ToggleField
                label="Enable Auto-backup"
                value={true}
                onChange={() => {}}
              />
              <InputField
                label="Backup Interval (minutes)"
                value={30}
                onChange={() => {}}
                type="number"
                min={1}
              />
              <InputField
                label="Backup Location"
                value="/home/project/backups"
                onChange={() => {}}
                placeholder="Enter backup directory path"
              />
              <ToggleField
                label="Compress Backups"
                value={true}
                onChange={() => {}}
              />
              <InputField
                label="Keep Last N Backups"
                value={10}
                onChange={() => {}}
                type="number"
                min={1}
              />
            </div>
          </div>
        </SettingSection>
      ) : (
        <>
          <SettingSection title="Database Connection" icon={<Database size={24} className="text-blue-400" />}>
            <InputField
              label="Database Host"
              value={dbHost}
              onChange={setDbHost}
              placeholder="localhost"
            />
            <InputField
              label="Database Port"
              value={dbPort}
              onChange={setDbPort}
              placeholder="5432"
            />
            <InputField
              label="Database Name"
              value={dbName}
              onChange={setDbName}
              placeholder="trading_db"
            />
          </SettingSection>

          <SettingSection title="Database Authentication" icon={<Shield size={24} className="text-blue-400" />}>
            <InputField
              label="Database User"
              value={dbUser}
              onChange={setDbUser}
              placeholder="postgres"
            />
            <InputField
              label="Database Password"
              value={dbPassword}
              onChange={setDbPassword}
              type="password"
              placeholder="Enter database password"
            />
          </SettingSection>
        </>
      )}
    </>
  );
};