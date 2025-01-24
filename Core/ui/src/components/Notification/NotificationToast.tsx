import React from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface NotificationToastProps {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: React.ReactNode;
  onClose: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  id,
  type,
  message,
  onClose,
}) => {
  const icons = {
    success: <CheckCircle className="text-green-400" size={20} />,
    error: <AlertCircle className="text-red-400" size={20} />,
    info: <Info className="text-blue-400" size={20} />,
    warning: <AlertTriangle className="text-yellow-400" size={20} />,
  };

  const backgrounds = {
    success: 'bg-green-500/10',
    error: 'bg-red-500/10',
    info: 'bg-blue-500/10',
    warning: 'bg-yellow-500/10',
  };

  const borders = {
    success: 'border-green-500/20',
    error: 'border-red-500/20',
    info: 'border-blue-500/20',
    warning: 'border-yellow-500/20',
  };

  return (
    <div className={`${backgrounds[type]} backdrop-blur-xl rounded-lg border ${borders[type]} p-4 min-w-[300px] animate-slide-up`}>
      <div className="flex items-start space-x-3">
        {icons[type]}
        <div className="flex-1 text-white">{message}</div>
        <button
          onClick={() => onClose(id)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};