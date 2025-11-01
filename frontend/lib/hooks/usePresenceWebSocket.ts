import { useEffect, useState, useRef } from 'react';
import { getBackendOrigin } from '@/lib/api/auth';
import { authAPI } from '@/lib/api/auth';

// Global presence WebSocket connection
let globalPresenceWs: WebSocket | null = null;
let presenceListeners: Set<(onlineUsers: Set<number>) => void> = new Set();
let currentOnlineUsers: Set<number> = new Set();
let pollingInterval: NodeJS.Timeout | null = null;

function createPresenceConnection(userId: number | string | null) {
  if (globalPresenceWs && globalPresenceWs.readyState === WebSocket.OPEN) {
    return; // Already connected
  }

  if (globalPresenceWs) {
    try {
      globalPresenceWs.close();
    } catch (e) {
      // Ignore
    }
  }

  if (!userId) return;

  const origin = getBackendOrigin() || 'http://localhost:8000';
  const baseWsUrl = origin.replace('http://', 'ws://').replace('https://', 'wss://');
  // Try presence endpoint first, fallback to a presence room in chat if needed
  const wsUrl = `${baseWsUrl}/ws/presence/`;

  try {
    const ws = new WebSocket(wsUrl);
    globalPresenceWs = ws;

    ws.onopen = () => {
      console.log('Connected to presence WebSocket');
      // Send user ID on connect
      ws.send(JSON.stringify({ type: 'join', user_id: userId }));
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        
        if (payload.type === 'user_online') {
          const userId = Number(payload.user_id);
          if (userId) {
            currentOnlineUsers.add(userId);
            notifyListeners();
          }
        } else if (payload.type === 'user_offline') {
          const userId = Number(payload.user_id);
          if (userId) {
            currentOnlineUsers.delete(userId);
            notifyListeners();
          }
        } else if (payload.type === 'online_users') {
          // Initial list of online users
          currentOnlineUsers = new Set(payload.user_ids || []);
          notifyListeners();
        }
      } catch (e) {
        console.error('Error parsing presence WebSocket message:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('Presence WebSocket error:', error);
      // If presence endpoint doesn't exist, that's okay - we'll use polling
      globalPresenceWs = null;
    };

    ws.onclose = () => {
      console.log('Presence WebSocket disconnected');
      globalPresenceWs = null;
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (userId) {
          createPresenceConnection(userId);
        }
      }, 3000);
    };
  } catch (error) {
    console.error('Failed to create presence WebSocket:', error);
    globalPresenceWs = null;
  }
}

async function fetchOnlineUsers() {
  try {
    const onlineUserIds = await authAPI.getOnlineUsers();
    const newSet = new Set(onlineUserIds);
    
    // Always update and notify to ensure UI reflects changes immediately
    // Use a simple comparison - if different, update
    const hasChanged = newSet.size !== currentOnlineUsers.size || 
        !Array.from(newSet).every(id => currentOnlineUsers.has(id));
    
    if (hasChanged) {
      currentOnlineUsers = newSet;
      notifyListeners();
    }
  } catch (error) {
    console.error('Error fetching online users:', error);
  }
}

function notifyListeners() {
  // Create a fresh Set copy for each listener to ensure React detects changes
  presenceListeners.forEach(listener => {
    try {
      // Create a new Set reference for each listener so React sees it as changed
      listener(new Set(currentOnlineUsers));
    } catch (e) {
      console.error('Error in presence listener:', e);
    }
  });
}

function startPolling() {
  if (pollingInterval) return; // Already polling
  
  // Fetch immediately
  fetchOnlineUsers();
  
  // Then poll every 1 second for very fast updates
  pollingInterval = setInterval(fetchOnlineUsers, 1000);
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

export function usePresenceWebSocket(userId: number | string | null) {
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!userId) {
      setOnlineUsers(new Set());
      return;
    }

    // Try to connect via WebSocket
    createPresenceConnection(userId);

    // Always start polling as backup/primary (faster than waiting for WebSocket)
    startPolling();

    const listener = (users: Set<number>) => {
      // Always create a new Set to ensure React detects the change
      setOnlineUsers(new Set(users));
    };

    presenceListeners.add(listener);
    
    // Initialize with current data immediately
    fetchOnlineUsers().then(() => {
      // Create new Set reference to trigger re-render
      setOnlineUsers(new Set(currentOnlineUsers));
    });

    return () => {
      presenceListeners.delete(listener);
      // Don't stop polling if there are other listeners
      if (presenceListeners.size === 0) {
        stopPolling();
      }
    };
  }, [userId]);

  return onlineUsers;
}

// Export function to manually refresh online users (useful for logout)
export function refreshOnlineUsers() {
  fetchOnlineUsers();
}

export function isUserOnline(userId: number | string, onlineUsers: Set<number>): boolean {
  return onlineUsers.has(Number(userId));
}
