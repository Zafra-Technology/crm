'use client';

import { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import { User } from '@/types';
import { useNotificationWebSocket } from './useNotificationWebSocket';

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousCountRef = useRef<number>(0);

  // Initialize audio for notification sound
  useEffect(() => {
    // Create a simple notification sound using Web Audio API
    // This creates a pleasant notification sound without needing an audio file
    if (typeof window !== 'undefined' && !audioRef.current) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioRef.current = {
          play: () => {
            try {
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              oscillator.frequency.value = 800;
              oscillator.type = 'sine';
              
              gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
              
              oscillator.start(audioContext.currentTime);
              oscillator.stop(audioContext.currentTime + 0.3);
            } catch (error) {
              console.error('Error playing notification sound:', error);
            }
          }
        } as any;
      } catch (error) {
        console.error('Error initializing audio context:', error);
      }
    }
  }, []);

  // Play notification sound
  const playNotificationSound = () => {
    try {
      if (audioRef.current) {
        audioRef.current.play();
      }
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  // Define loadNotifications before using it
  const loadNotifications = useCallback(async () => {
    if (!user) {
      console.log('loadNotifications: No user provided');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const token = typeof window !== 'undefined' ? document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1] : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      console.log('Loading notifications for user:', user.id);
      const response = await fetch(`${API_BASE_URL}/notifications/?userId=${user.id}`, {
        headers,
        credentials: 'include'
      });
      
      console.log('Notifications API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Notifications API response data:', data);
        console.log('Number of notifications:', Array.isArray(data) ? data.length : 'Not an array');
        
        if (Array.isArray(data)) {
          const mappedNotifications = data.map((n: any) => ({
            id: String(n.id),
            type: n.type,
            title: n.title,
            message: n.message,
            userId: String(n.userId),
            projectId: n.projectId ? String(n.projectId) : undefined,
            taskId: n.taskId,
            senderId: n.senderId ? String(n.senderId) : undefined,
            senderName: n.senderName,
            isRead: n.isRead,
            createdAt: n.createdAt
          }));
          console.log('Mapped notifications:', mappedNotifications);
          setNotifications(mappedNotifications);
        } else {
          console.error('Notifications API did not return an array:', data);
          setNotifications([]);
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to load notifications:', response.status, errorText);
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load initial notifications
  useEffect(() => {
    if (user) {
      console.log('useNotifications: Loading notifications for user:', user.id);
      loadNotifications();
    } else {
      console.log('useNotifications: No user provided');
      setLoading(false);
    }
  }, [user?.id, loadNotifications]);

  // Set up WebSocket connection for real-time notifications
  // Use useCallback to prevent recreation on every render
  const handleNewNotification = useCallback((notificationData: any) => {
    // Convert backend notification format to frontend format
    const newNotification: Notification = {
      id: notificationData.id || `temp-${Date.now()}`,
      type: notificationData.type || 'message',
      title: notificationData.title || 'New Notification',
      message: notificationData.message || '',
      userId: String(notificationData.user_id || notificationData.userId || user?.id || ''),
      projectId: notificationData.project_id || notificationData.projectId,
      taskId: notificationData.task_id || notificationData.taskId,
      senderId: notificationData.sender_id || notificationData.senderId,
      senderName: notificationData.sender_name || notificationData.senderName,
      isRead: false,
      createdAt: notificationData.created_at || notificationData.createdAt || new Date().toISOString(),
    };

    // Add notification to the list
    setNotifications(prev => {
      // Check if notification already exists (avoid duplicates)
      const exists = prev.some(n => n.id === newNotification.id);
      if (exists) {
        return prev;
      }
      
      // Play sound for new notification
      playNotificationSound();
      
      return [newNotification, ...prev];
    });
  }, [user?.id]);

  // Connect to WebSocket for real-time notifications
  useNotificationWebSocket(user?.id || null, handleNewNotification);

  const markAsRead = async (notificationId: string) => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const token = typeof window !== 'undefined' ? document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1] : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
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
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const token = typeof window !== 'undefined' ? document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1] : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const response = await fetch(`${API_BASE_URL}/notifications/mark-all-read/?userId=${user?.id}`, {
        method: 'PUT',
        headers,
        credentials: 'include'
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

  // Track notification count changes for sound
  useEffect(() => {
    const total = notifications.filter(n => !n.isRead).length;
    if (total > previousCountRef.current && previousCountRef.current > 0) {
      // Sound is already played in handleNewNotification, so we don't need to play it here
      // This effect is just for tracking
    }
    previousCountRef.current = total;
  }, [notifications]);

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

  return {
    notifications,
    counts: getCounts(),
    markAsRead,
    markAllAsRead,
    addNotification,
    refreshNotifications: loadNotifications,
    loading
  };
};