import React from 'react';
import { Sliders, Shield, Zap, Clock } from 'lucide-react';
import { SettingSection } from './SettingSection';
import { InputField } from './InputField';
import { ToggleField } from './ToggleField';

interface TradingSettingsProps {
  slippage: number;
  setSlippage: (value: number) => void;
  maxTradeSize: number;
  setMaxTradeSize: (value: number) => void;
  copyAmount: number;
  setCopyAmount: (value: number) => void;
  maxConcurrentTrades: number;
  setMaxConcurrentTrades: (value: number) => void;
  minProfit: number;
  setMinProfit: (value: number) => void;
  maxLoss: number;
  setMaxLoss: (value: number) => void;
  tradeDelay: number;
  setTradeDelay: (value: number) => void;
  autoSell: boolean;
  setAutoSell: (value: boolean) => void;
  takeProfitEnabled: boolean;
  setTakeProfitEnabled: (value: boolean) => void;
  stopLossEnabled: boolean;
  setStopLossEnabled: (value: boolean) => void;
  takeProfitPercentage: number;
  setTakeProfitPercentage: (value: number) => void;
  stopLossPercentage: number;
  setStopLossPercentage: (value: number) => void;
  trailingStopEnabled: boolean;
  setTrailingStopEnabled: (value: boolean) => void;
  trailingStopDistance: number;
  setTrailingStopDistance: (value: number) => void;
}

export const TradingSettings: React.FC<TradingSettingsProps> = ({
  slippage,
  setSlippage,
  maxTradeSize,
  setMaxTradeSize,
  copyAmount,
  setCopyAmount,
  maxConcurrentTrades,
  setMaxConcurrentTrades,
  minProfit,
  setMinProfit,
  maxLoss,
  setMaxLoss,
  tradeDelay,
  setTradeDelay,
  autoSell,
  setAutoSell,
  takeProfitEnabled,
  setTakeProfitEnabled,
  stopLossEnabled,
  setStopLossEnabled,
  takeProfitPercentage,
  setTakeProfitPercentage,
  stopLossPercentage,
  setStopLossPercentage,
  trailingStopEnabled,
  setTrailingStopEnabled,
  trailingStopDistance,
  setTrailingStopDistance,
}) => {
  return (
    <>
      <SettingSection title="Trading Parameters" icon={<Sliders size={24} className="text-blue-400" />}>
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
          label="Copy Trade Amount (SOL)"
          value={copyAmount}
          onChange={setCopyAmount}
          type="number"
          min={0.001}
          step={0.001}
        />
        <InputField
          label="Maximum Concurrent Trades"
          value={maxConcurrentTrades}
          onChange={setMaxConcurrentTrades}
          type="number"
          min={1}
          max={10}
        />
        <InputField
          label="Trade Execution Delay (ms)"
          value={tradeDelay}
          onChange={setTradeDelay}
          type="number"
          min={0}
          step={100}
        />
      </SettingSection>

      <SettingSection title="Risk Management" icon={<Shield size={24} className="text-blue-400" />}>
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
        <div className="space-y-4 pt-4 border-t border-gray-800/50">
          <ToggleField
            label="Enable Auto-Sell"
            value={autoSell}
            onChange={setAutoSell}
          />
          {autoSell && (
            <>
              <div className="pl-4 space-y-4">
                <ToggleField
                  label="Take Profit"
                  value={takeProfitEnabled}
                  onChange={setTakeProfitEnabled}
                />
                {takeProfitEnabled && (
                  <InputField
                    label="Take Profit Percentage (%)"
                    value={takeProfitPercentage}
                    onChange={setTakeProfitPercentage}
                    type="number"
                    min={0.1}
                    step={0.1}
                  />
                )}
                <ToggleField
                  label="Stop Loss"
                  value={stopLossEnabled}
                  onChange={setStopLossEnabled}
                />
                {stopLossEnabled && (
                  <InputField
                    label="Stop Loss Percentage (%)"
                    value={stopLossPercentage}
                    onChange={setStopLossPercentage}
                    type="number"
                    min={0.1}
                    step={0.1}
                  />
                )}
                <ToggleField
                  label="Trailing Stop"
                  value={trailingStopEnabled}
                  onChange={setTrailingStopEnabled}
                />
                {trailingStopEnabled && (
                  <InputField
                    label="Trailing Stop Distance (%)"
                    value={trailingStopDistance}
                    onChange={setTrailingStopDistance}
                    type="number"
                    min={0.1}
                    step={0.1}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </SettingSection>

      <SettingSection title="Advanced Trading" icon={<Zap size={24} className="text-blue-400" />}>
        <div className="space-y-4">
          <ToggleField
            label="Anti-Rug Protection"
            value={true}
            onChange={() => {}}
          />
          <ToggleField
            label="Frontrun Protection"
            value={true}
            onChange={() => {}}
          />
          <ToggleField
            label="MEV Protection"
            value={true}
            onChange={() => {}}
          />
          <ToggleField
            label="Auto Gas Adjustment"
            value={true}
            onChange={() => {}}
          />
        </div>
      </SettingSection>

      <SettingSection title="Trading Schedule" icon={<Clock size={24} className="text-blue-400" />}>
        <div className="space-y-4">
          <ToggleField
            label="24/7 Trading"
            value={true}
            onChange={() => {}}
          />
          <ToggleField
            label="Smart Entry/Exit"
            value={true}
            onChange={() => {}}
          />
          <ToggleField
            label="Volume-based Trading"
            value={true}
            onChange={() => {}}
          />
          <ToggleField
            label="Volatility-based Trading"
            value={true}
            onChange={() => {}}
          />
        </div>
      </SettingSection>
    </>
  );
};