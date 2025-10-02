'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { User } from '@/types';

export interface Notification {
  id: string;
  type: 'task_assigned' | 'task_review' | 'message' | 'task_completed';
  title: string;
  message: string;
  userId: string;
  projectId?: string;
  taskId?: string;
  senderId?: string;
  senderName?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationCounts {
  total: number;
  taskAssigned: number;
  taskReview: number;
  messages: number;
  taskCompleted: number;
}

interface NotificationContextType {
  notifications: Notification[];
  counts: NotificationCounts;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => void;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const useNotificationData = (user: User | null) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadNotifications();
      
      // Poll for new notifications every 5 seconds for real-time updates
      const interval = setInterval(loadNotifications, 5000);
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  const loadNotifications = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/notifications?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        const newNotifications = data.notifications || [];
        
        // Only update state if notifications actually changed
        setNotifications(prevNotifications => {
          const hasChanges = JSON.stringify(prevNotifications) !== JSON.stringify(newNotifications);
          return hasChanges ? newNotifications : prevNotifications;
        });
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true })
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch(`/api/notifications/mark-all-read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id })
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `temp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      isRead: false
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const getCounts = (): NotificationCounts => {
    const unread = notifications.filter(n => !n.isRead);
    return {
      total: unread.length,
      taskAssigned: unread.filter(n => n.type === 'task_assigned').length,
      taskReview: unread.filter(n => n.type === 'task_review').length,
      messages: unread.filter(n => n.type === 'message').length,
      taskCompleted: unread.filter(n => n.type === 'task_completed').length,
    };
  };

  // Create a global notification refresh function
  const refreshNotificationsImmediately = () => {
    loadNotifications();
  };

  // Listen for storage events (for cross-tab notifications) and custom events (for same-tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'notification-refresh' && e.newValue) {
        loadNotifications();
      }
    };

    const handleCustomRefresh = () => {
      loadNotifications();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('refresh-notifications', handleCustomRefresh);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('refresh-notifications', handleCustomRefresh);
    };
  }, []);

  return {
    notifications,
    counts: getCounts(),
    markAsRead,
    markAllAsRead,
    addNotification,
    refreshNotifications: loadNotifications,
    refreshNotificationsImmediately,
    loading
  };
};