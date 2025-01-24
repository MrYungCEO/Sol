import React from 'react';
import { Wallet, Shield, Eye, EyeOff } from 'lucide-react';
import { SettingSection } from './SettingSection';
import { InputField } from './InputField';
import { ToggleField } from './ToggleField';

interface WalletSettingsProps {
  walletAddress: string;
  setWalletAddress: (value: string) => void;
  privateKey: string;
  setPrivateKey: (value: string) => void;
  showPrivateKey: boolean;
  setShowPrivateKey: (value: boolean) => void;
  autoConnect: boolean;
  setAutoConnect: (value: boolean) => void;
  confirmTrades: boolean;
  setConfirmTrades: (value: boolean) => void;
  maxGasPrice: number;
  setMaxGasPrice: (value: number) => void;
  priorityFee: number;
  setPriorityFee: (value: number) => void;
}

export const WalletSettings: React.FC<WalletSettingsProps> = ({
  walletAddress,
  setWalletAddress,
  privateKey,
  setPrivateKey,
  showPrivateKey,
  setShowPrivateKey,
  autoConnect,
  setAutoConnect,
  confirmTrades,
  setConfirmTrades,
  maxGasPrice,
  setMaxGasPrice,
  priorityFee,
  setPriorityFee,
}) => {
  return (
    <>
      <SettingSection title="Wallet Configuration" icon={<Wallet size={24} className="text-blue-400" />}>
        <InputField
          label="Wallet Address"
          value={walletAddress}
          onChange={setWalletAddress}
          placeholder="Enter your wallet address"
        />
        <div className="relative">
          <InputField
            label="Private Key"
            value={privateKey}
            onChange={setPrivateKey}
            type={showPrivateKey ? 'text' : 'password'}
            placeholder="Enter your private key"
          />
          <button
            onClick={() => setShowPrivateKey(!showPrivateKey)}
            className="absolute right-3 top-9 text-gray-400 hover:text-white transition-colors"
          >
            {showPrivateKey ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <div className="space-y-4">
          <ToggleField
            label="Auto-connect on startup"
            value={autoConnect}
            onChange={setAutoConnect}
          />
          <ToggleField
            label="Confirm trades before execution"
            value={confirmTrades}
            onChange={setConfirmTrades}
          />
        </div>
      </SettingSection>

      <SettingSection title="Transaction Settings" icon={<Shield size={24} className="text-blue-400" />}>
        <InputField
          label="Maximum Gas Price (SOL)"
          value={maxGasPrice}
          onChange={setMaxGasPrice}
          type="number"
          min={0}
          step={0.000001}
        />
        <InputField
          label="Priority Fee (SOL)"
          value={priorityFee}
          onChange={setPriorityFee}
          type="number"
          min={0}
          step={0.000001}
        />
      </SettingSection>
    </>
  );
};