import { useEffect, useState } from 'react';
import { authAPI } from '@/lib/api/auth';
import { usePresenceWebSocket, isUserOnline } from './usePresenceWebSocket';

interface UseUserOnlineStatusProps {
  userId: string | number;
  currentUserId: string | number;
}

export function useUserOnlineStatus({ userId, currentUserId }: UseUserOnlineStatusProps) {
  const [isOnline, setIsOnline] = useState(false);
  const onlineUsers = usePresenceWebSocket(currentUserId);

  useEffect(() => {
    if (!userId || !currentUserId || String(userId) === String(currentUserId)) {
      setIsOnline(false);
      return;
    }

    // Use WebSocket presence data for real-time updates - update immediately when Set changes
    const online = isUserOnline(userId, onlineUsers);
    setIsOnline(online);
  }, [userId, currentUserId, onlineUsers]);

  // Separate effect for polling backup (less frequent)
  useEffect(() => {
    if (!userId || !currentUserId || String(userId) === String(currentUserId)) {
      return;
    }

    const checkOnlineStatus = async () => {
      try {
        const onlineUserIds = await authAPI.getOnlineUsers();
        const isUserOnlineFromAPI = onlineUserIds.includes(Number(userId));
        setIsOnline(isUserOnlineFromAPI);
      } catch (error) {
        // If API fails, use WebSocket data
        setIsOnline(isUserOnline(userId, onlineUsers));
      }
    };

    // Poll every 3 seconds as backup (presence hook polls every 2 seconds)
    const interval = setInterval(checkOnlineStatus, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [userId, currentUserId, onlineUsers]);

  return isOnline;
}

// Hook to track multiple users' online status
export function useMultipleUsersOnlineStatus(
  userIds: Array<string | number>,
  currentUserId: string | number
): Record<string, boolean> {
  const onlineUsers = usePresenceWebSocket(currentUserId);
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!userIds.length || !currentUserId) {
      setOnlineStatus({});
      return;
    }

    // Use WebSocket presence data for real-time updates
    const statusMap: Record<string, boolean> = {};
    userIds.forEach(userId => {
      const userIdKey = String(userId);
      if (String(userId) !== String(currentUserId)) {
        statusMap[userIdKey] = isUserOnline(userId, onlineUsers);
      }
    });
    setOnlineStatus(statusMap);

    // Fallback: Also poll periodically to ensure accuracy (every 5 seconds as backup)
    const checkOnlineStatus = async () => {
      try {
        const onlineUserIds = await authAPI.getOnlineUsers();
        const statusMapFromAPI: Record<string, boolean> = {};
        
        userIds.forEach(userId => {
          const userIdKey = String(userId);
          if (String(userId) !== String(currentUserId)) {
            statusMapFromAPI[userIdKey] = onlineUserIds.includes(Number(userId));
          }
        });
        
        setOnlineStatus(statusMapFromAPI);
      } catch (error) {
        // If API fails, use WebSocket data
        const statusMapFromWS: Record<string, boolean> = {};
        userIds.forEach(userId => {
          const userIdKey = String(userId);
          if (String(userId) !== String(currentUserId)) {
            statusMapFromWS[userIdKey] = isUserOnline(userId, onlineUsers);
          }
        });
        setOnlineStatus(statusMapFromWS);
      }
    };

    // Poll every 5 seconds as backup (presence hook polls every 2 seconds)
    const interval = setInterval(checkOnlineStatus, 5000);

    return () => {
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userIds.join(','), currentUserId, onlineUsers]);

  return onlineStatus;
}

