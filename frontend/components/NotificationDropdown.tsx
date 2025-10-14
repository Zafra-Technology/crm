'use client';

import { useState, useRef, useEffect } from 'react';
import { BellIcon, CheckIcon, XIcon, ClipboardListIcon, EyeIcon, MessageCircleIcon, CheckCircleIcon } from 'lucide-react';
import { useNotificationData } from '@/lib/hooks/useNotifications';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface NotificationDropdownProps {
  user: User;
}

export default function NotificationDropdown({ user }: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, counts, markAsRead, markAllAsRead } = useNotificationData(user);

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

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <BellIcon size={20} />
        {counts.total > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs font-bold"
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
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-muted-foreground">
                  <BellIcon size={32} className="mx-auto mb-2 text-muted-foreground/50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 border-b border-border hover:bg-accent cursor-pointer ${
                      !notification.isRead ? 'bg-accent' : ''
                    }`}
                    onClick={() => {
                      if (!notification.isRead) {
                        markAsRead(notification.id);
                      }
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium ${
                            !notification.isRead ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                          )}
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
                ))
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