import React from 'react';

interface SettingSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

export const SettingSection: React.FC<SettingSectionProps> = ({ title, icon, children }) => (
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