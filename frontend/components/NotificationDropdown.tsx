'use client';

import { useState, useRef, useEffect } from 'react';
import { BellIcon, CheckIcon, XIcon, ClipboardListIcon, EyeIcon, MessageCircleIcon, CheckCircleIcon } from 'lucide-react';
import { useNotificationData } from '@/lib/hooks/useNotifications';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

interface NotificationDropdownProps {
  user: User;
}

export default function NotificationDropdown({ user }: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pulseAnimation, setPulseAnimation] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsListRef = useRef<HTMLDivElement>(null);
  const previousCountRef = useRef<number>(0);
  const router = useRouter();
  const { notifications, counts, markAsRead, markAllAsRead, loading } = useNotificationData(user);

  // Debug logging
  useEffect(() => {
    console.log('NotificationDropdown - notifications:', notifications);
    console.log('NotificationDropdown - counts:', counts);
    console.log('NotificationDropdown - loading:', loading);
  }, [notifications, counts, loading]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pulse animation when new notifications arrive
  useEffect(() => {
    if (counts.total > previousCountRef.current && previousCountRef.current > 0) {
      setPulseAnimation(true);
      setTimeout(() => setPulseAnimation(false), 2000);
    }
    previousCountRef.current = counts.total;
  }, [counts.total]);

  // Auto-scroll to top when new notifications arrive while dropdown is open
  useEffect(() => {
    if (isOpen && notifications.length > 0 && notificationsListRef.current) {
      const firstNotification = notificationsListRef.current.querySelector('[data-new-notification]');
      if (firstNotification) {
        firstNotification.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [notifications.length, isOpen]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return <ClipboardListIcon size={16} className="text-blue-600" />;
      case 'task_review':
        return <EyeIcon size={16} className="text-yellow-600" />;
      case 'message':
        return <MessageCircleIcon size={16} className="text-green-600" />;
      case 'task_completed':
        return <CheckCircleIcon size={16} className="text-purple-600" />;
      default:
        return <BellIcon size={16} className="text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return 'text-blue-600';
      case 'task_review':
        return 'text-yellow-600';
      case 'message':
        return 'text-green-600';
      case 'task_completed':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const notificationDate = new Date(dateString);
    const diffInMs = now.getTime() - notificationDate.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${diffInDays}d ago`;
  };

  const handleNotificationClick = (notification: any) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.taskId && notification.projectId) {
      router.push(`/dashboard/project/${notification.projectId}?task=${notification.taskId}`);
      setIsOpen(false);
    } else if (notification.projectId) {
      router.push(`/dashboard/project/${notification.projectId}`);
      setIsOpen(false);
    } else if (notification.type === 'message') {
      router.push('/dashboard/messages');
      setIsOpen(false);
    }
  };

  // Check if notification is new (created in last 30 seconds)
  const isNewNotification = (createdAt: string) => {
    const now = new Date();
    const notificationDate = new Date(createdAt);
    const diffInSeconds = (now.getTime() - notificationDate.getTime()) / 1000;
    return diffInSeconds < 30;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative ${pulseAnimation ? 'animate-pulse' : ''}`}
      >
        <BellIcon size={20} className={pulseAnimation ? 'text-primary' : ''} />
        {counts.total > 0 && (
          <Badge 
            variant="destructive" 
            className={`absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs font-bold ${
              pulseAnimation ? 'animate-bounce' : ''
            }`}
          >
            {counts.total > 99 ? '99+' : counts.total}
          </Badge>
        )}
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <Card className="absolute right-0 mt-2 w-80 z-50 max-h-96 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Notifications</h3>
              {counts.total > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAllAsRead()}
                  className="text-sm text-primary hover:text-primary/80"
                >
                  Mark all read
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Notification List */}
            <div ref={notificationsListRef} className="max-h-80 overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p>Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-muted-foreground">
                  <BellIcon size={32} className="mx-auto mb-2 text-muted-foreground/50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.slice(0, 10).map((notification, index) => {
                  const isNew = isNewNotification(notification.createdAt);
                  return (
                  <div
                    key={notification.id}
                    data-new-notification={isNew && index === 0 ? 'true' : undefined}
                    className={`px-4 py-3 border-b border-border hover:bg-accent cursor-pointer transition-all duration-200 ${
                      !notification.isRead ? 'bg-accent/50' : ''
                    } ${
                      isNew && !notification.isRead ? 'border-l-4 border-l-primary' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm font-medium ${
                            !notification.isRead ? 'text-foreground font-semibold' : 'text-muted-foreground'
                          }`}>
                            {notification.title}
                          </p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {isNew && !notification.isRead && (
                              <span className="text-xs text-primary font-semibold">New</span>
                            )}
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-muted-foreground">
                            {formatTimeAgo(notification.createdAt)}
                          </p>
                          {notification.senderName && (
                            <p className="text-xs text-muted-foreground">
                              by {notification.senderName}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          </CardContent>

          {/* Footer */}
          {notifications.length > 10 && (
            <div className="px-4 py-3 border-t border-border text-center">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                View all notifications
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}