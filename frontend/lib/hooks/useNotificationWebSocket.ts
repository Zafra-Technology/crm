'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getBackendOrigin } from '@/lib/api/auth';

type NotificationHandler = (notification: any) => void;

export function useNotificationWebSocket(userId: string | number | null, onNotification?: NotificationHandler) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const onNotificationRef = useRef(onNotification);

  // Keep the callback ref updated without causing re-renders
  useEffect(() => {
    onNotificationRef.current = onNotification;
  }, [onNotification]);

  const connect = useCallback(() => {
    if (!userId) {
      setIsConnected(false);
      return;
    }

    // Close existing connection if any
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (_) {}
    }

    const origin = getBackendOrigin() || 'http://localhost:8000';
    const wsUrl = origin.replace('http://', 'ws://').replace('https://', 'wss://') + `/ws/notifications/${userId}/`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        console.log('Notification WebSocket connected for user:', userId);
      };
      
      ws.onclose = (event) => {
        setIsConnected(false);
        console.log('Notification WebSocket disconnected:', event.code, event.reason);
        
        // Only attempt to reconnect if it wasn't a manual close (code 1000)
        // and if we haven't exceeded max attempts
        if (event.code !== 1000 && reconnectAttemptsRef.current < 5) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000); // Exponential backoff, max 30s
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
      
      ws.onerror = (error) => {
        console.error('Notification WebSocket error:', error);
        setIsConnected(false);
      };
      
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          // Handle connection confirmation
          if (payload.type === 'connection_established') {
            console.log('Notification WebSocket:', payload.message);
            return;
          }
          
          // Handle new notifications
          if (payload.type === 'new_notification' && payload.notification) {
            if (onNotificationRef.current) {
              onNotificationRef.current(payload.notification);
            }
          }
        } catch (error) {
          console.error('Error parsing notification message:', error);
        }
      };
    } catch (error) {
      setIsConnected(false);
      console.error('Failed to create notification WebSocket:', error);
    }
  }, [userId]);

  useEffect(() => {
    connect();

    return () => {
      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Close WebSocket connection
      if (wsRef.current) {
        try {
          wsRef.current.close(1000, 'Component unmounting'); // Normal closure
        } catch (_) {}
        wsRef.current = null;
      }
      setIsConnected(false);
      reconnectAttemptsRef.current = 0;
    };
  }, [connect]);

  return { isConnected };
}

