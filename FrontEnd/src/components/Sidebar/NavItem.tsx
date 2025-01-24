import React from 'react';
import type { NavItem } from '../../types';

interface NavItemProps extends NavItem {
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, active, onClick, style }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 animate-slide-up ${
        active 
          ? 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]' 
          : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
      }`}
      style={style}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );
};