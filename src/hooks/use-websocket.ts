import { useState } from "react";
import { Notification } from "@/lib/dbService";

export const useWebSocket = (userId: string | null) => {
  // Stubbed implementation for frontend-only
  const [isConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    ));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return {
    isConnected,
    notifications,
    markAsRead,
    clearNotifications,
  };
};
