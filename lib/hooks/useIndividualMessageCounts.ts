'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';

interface MessageCount {
  userId: string;
  unreadCount: number;
  lastMessageTimestamp: string;
}

export const useIndividualMessageCounts = (currentUser: User | null) => {
  const [messageCounts, setMessageCounts] = useState<MessageCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      loadMessageCounts();
      
      // Poll for message count updates every 5 seconds
      const interval = setInterval(loadMessageCounts, 5000);
      return () => clearInterval(interval);
    }
  }, [currentUser?.id]);

  const loadMessageCounts = async () => {
    if (!currentUser) return;
    
    try {
      const response = await fetch(`/api/messages/individual/counts?userId=${currentUser.id}`);
      if (response.ok) {
        const data = await response.json();
        setMessageCounts(data.counts || []);
      }
    } catch (error) {
      console.error('Error loading message counts:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async (userId: string) => {
    if (!currentUser) return;
    
    try {
      const response = await fetch(`/api/messages/individual/mark-read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentUserId: currentUser.id,
          otherUserId: userId 
        })
      });

      if (response.ok) {
        // Update local state to remove unread count for this user
        setMessageCounts(prev => 
          prev.map(count => 
            count.userId === userId 
              ? { ...count, unreadCount: 0 }
              : count
          )
        );
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const getUnreadCount = (userId: string): number => {
    const userCount = messageCounts.find(count => count.userId === userId);
    return userCount?.unreadCount || 0;
  };

  const getTotalUnreadCount = (): number => {
    return messageCounts.reduce((total, count) => total + count.unreadCount, 0);
  };

  // Listen for message updates
  useEffect(() => {
    const handleMessageUpdate = () => {
      loadMessageCounts();
    };

    window.addEventListener('refresh-message-counts', handleMessageUpdate);
    window.addEventListener('refresh-notifications', handleMessageUpdate);
    
    return () => {
      window.removeEventListener('refresh-message-counts', handleMessageUpdate);
      window.removeEventListener('refresh-notifications', handleMessageUpdate);
    };
  }, []);

  return {
    messageCounts,
    getUnreadCount,
    getTotalUnreadCount,
    markMessagesAsRead,
    refreshCounts: loadMessageCounts,
    loading
  };
};