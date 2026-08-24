import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "./AuthContext";
import {
  notificationService,
  type CareerNotification,
  type NotificationType,
} from "@/services/notificationService";

interface NotificationContextType {
  notifications: CareerNotification[];
  unreadCount: number;
  addNotification: (
    type: NotificationType,
    title: string,
    message: string,
    actionHref?: string,
    actionText?: string
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;

  const [notifications, setNotifications] = useState<CareerNotification[]>(() =>
    notificationService.getNotifications(userId)
  );

  useEffect(() => {
    if (userId) {
      notificationService.fetchNotifications(userId).then(setNotifications);
    } else {
      setNotifications([]);
    }
  }, [userId]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const addNotification = useCallback(
    (
      type: NotificationType,
      title: string,
      message: string,
      actionHref?: string,
      actionText?: string
    ) => {
      const item = notificationService.addNotification(type, title, message, actionHref, actionText, userId);
      setNotifications((prev) => [item, ...prev].slice(0, 30));
    },
    [userId]
  );

  const markAsRead = useCallback((id: string) => {
    notificationService.markAsRead(id, userId);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }, [userId]);

  const markAllAsRead = useCallback(() => {
    notificationService.markAllAsRead(userId);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, [userId]);

  const clearAll = useCallback(() => {
    notificationService.clearAll(userId);
    setNotifications([]);
  }, [userId]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearAll,
    }),
    [notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearAll]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
