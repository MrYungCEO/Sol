import React from 'react';

interface InputFieldProps {
  label: string;
  value: string | number;
  onChange: (value: any) => void;
  type?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

export const InputField: React.FC<InputFieldProps> = ({ 
  label, 
  value, 
  onChange, 
  type = 'text', 
  placeholder, 
  ...props 
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-400 mb-2">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
      className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg py-2 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
      placeholder={placeholder}
      {...props}
    />
  </div>
);