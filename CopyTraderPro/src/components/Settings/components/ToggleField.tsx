import React from 'react';

interface ToggleFieldProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export const ToggleField: React.FC<ToggleFieldProps> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm font-medium text-gray-400">{label}</span>
    <button
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        value ? 'bg-blue-500' : 'bg-gray-700'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);