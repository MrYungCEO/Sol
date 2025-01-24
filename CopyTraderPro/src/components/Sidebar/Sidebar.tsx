import React from 'react';
import { BarChart3 } from 'lucide-react';
import { NavItem } from './NavItem';
import { navItems } from '../../data/mockData';
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
  currentPath: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPath }) => {
  const navigate = useNavigate();

  return (
    <div className="w-64 bg-gray-900/50 backdrop-blur-xl p-4 border-r border-gray-800/50">
      <div className="flex items-center space-x-3 px-4 mb-8">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <BarChart3 className="text-blue-400" size={24} />
        </div>
        <span className="text-xl font-bold text-white tracking-tight">CopyTrade Pro</span>
      </div>
      <nav className="space-y-2">
        {navItems.map((item, index) => (
          <NavItem 
            key={index} 
            {...item} 
            active={item.path === currentPath}
            onClick={() => navigate(item.path)}
            style={{ animationDelay: `${index * 100}ms` }}
          />
        ))}
      </nav>
    </div>
  );
};