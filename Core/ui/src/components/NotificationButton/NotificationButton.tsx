import React, { useState } from 'react';
import { Bell, ArrowUpRight, ArrowDownRight, ExternalLink } from 'lucide-react';

export const NotificationButton: React.FC = () => {
  const [hasUnread, setHasUnread] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const notifications = [
    {
      id: 1,
      title: "Successful Buy",
      type: "BUY",
      token: "BONK",
      amount: "8,333.33",
      price: "0.00000012",
      profit: null,
      message: "Successfully bought BONK tokens",
      time: "2 minutes ago",
      txHash: "2MvTB5aFh6JPYTC9dQVaZ1ir4s7jxhTxKKAyfVMe2KDes6rsYjjFSnvUfr8yX5bKcy9KVF1SRu9oNUKj57C1m8u3",
      unread: true
    },
    {
      id: 2,
      title: "Successful Sell",
      type: "SELL",
      token: "JUP",
      amount: "1.37931",
      price: "0.725",
      profit: "+10.5%",
      message: "Successfully sold JUP tokens",
      time: "15 minutes ago",
      txHash: "9pgsUfkhvEeQoJkDVK58oVj6otH4vA5H4SQHFcnqf51j4x1GPen6XBEZJ27Q9JzoEjz3sEQ6VhU9wkKrvX99wYg",
      unread: true
    },
    {
      id: 3,
      title: "Trade Executed",
      type: "BUY",
      token: "SOL",
      amount: "0.968523",
      price: "103.25",
      profit: null,
      message: "Successfully bought SOL",
      time: "1 hour ago",
      txHash: "9oNWdyaxa3hogMQX8zuBXQ8Vu4f3Rt5W1cYJFfdY9QUJosLPeNyokioeyhPnJszCBjb9btQwGnD3xo5TMvMtbDp",
      unread: false
    }
  ];

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (hasUnread) {
      setHasUnread(false);
    }
  };

  const openTransaction = (txHash: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://solscan.io/tx/${txHash}`, '_blank');
  };

  return (
    <div className="fixed top-4 right-4" style={{ zIndex: 9999 }}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
      >
        <Bell size={20} className="text-gray-400" />
        {hasUnread && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={() => setIsOpen(false)}
          />
          <div 
            className="absolute right-0 mt-2 w-96 rounded-xl bg-gray-900/95 backdrop-blur-xl border border-gray-800/50 shadow-lg animate-slide-up"
            style={{ zIndex: 9999 }}
          >
            <div className="p-4 border-b border-gray-800/50">
              <h3 className="text-lg font-semibold text-white">Notifications</h3>
            </div>
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-800/50 last:border-0 hover:bg-gray-800/50 transition-colors ${
                    notification.unread ? 'bg-gray-800/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-white flex items-center">
                          {notification.title}
                          {notification.unread && (
                            <span className="ml-2 inline-block w-2 h-2 bg-blue-500 rounded-full" />
                          )}
                        </h4>
                        <span className="text-xs text-gray-500">
                          {notification.time}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">Token:</span>
                          <span className="text-sm text-white font-medium">{notification.token}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">Amount:</span>
                          <span className="text-sm text-white">{notification.amount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">Price:</span>
                          <span className="text-sm text-white">{notification.price}</span>
                        </div>
                        {notification.profit && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Profit:</span>
                            <span className="text-sm text-green-400">{notification.profit}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">Type:</span>
                          <span className={`text-sm flex items-center ${
                            notification.type === 'BUY' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {notification.type === 'BUY' ? (
                              <ArrowUpRight size={14} className="mr-1" />
                            ) : (
                              <ArrowDownRight size={14} className="mr-1" />
                            )}
                            {notification.type}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => openTransaction(notification.txHash, e)}
                        className="mt-3 w-full flex items-center justify-center space-x-2 px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-sm hover:bg-blue-500/20 transition-colors"
                      >
                        <ExternalLink size={14} />
                        <span>View Transaction</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-800/50">
              <button 
                className="w-full py-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Mark all as read
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};