import React from 'react';
import { NotificationToast } from './NotificationToast';
import { useNotification } from '../../contexts/NotificationContext';

export const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          {...notification}
          onClose={removeNotification}
        />
      ))}
    </div>
  );
};