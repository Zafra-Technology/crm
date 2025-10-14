'use client';

import { useRouter } from 'next/navigation';
import { LogOutIcon, UserIcon } from 'lucide-react';
import { User } from '@/types';
import { logout } from '@/lib/auth';
import NotificationDropdown from './NotificationDropdown';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  user: User;
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleProfile = () => {
    router.push('/dashboard/profile');
  };

  return (
    <header className="bg-background border-b border-l-0 px-6 flex-shrink-0 main-header-height relative z-30">
      <div className="flex items-center justify-between h-full">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold">Dashboard</h2>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notifications */}
          {(user.role === 'designer' || user.role === 'project_manager') && (
            <NotificationDropdown user={user} />
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 px-3 py-2">
                <Avatar className="w-8 h-8">
                  <AvatarFallback>
                    <UserIcon size={16} />
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <div className="text-sm font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {user.role.replace('_', ' ')}
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleProfile}>
                <UserIcon size={16} className="mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOutIcon size={16} className="mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}