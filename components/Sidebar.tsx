'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  FolderIcon, 
  MessageSquareIcon, 
  UserIcon, 
  SettingsIcon,
  UsersIcon,
  BuildingIcon,
  CheckSquareIcon,
  MenuIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface SidebarProps {
  userRole: string;
}

export default function Sidebar({ userRole }: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  // Define menu items based on user role
  const allMenuItems = [
    { 
      icon: FolderIcon, 
      label: 'Projects', 
      href: '/dashboard',
      active: pathname === '/dashboard',
      roles: ['client', 'project_manager', 'designer']
    },
    { 
      icon: CheckSquareIcon, 
      label: 'Tasks', 
      href: '/dashboard/tasks',
      active: pathname === '/dashboard/tasks',
      roles: ['project_manager', 'designer']
    },
    { 
      icon: BuildingIcon, 
      label: 'Clients', 
      href: '/dashboard/clients',
      active: pathname === '/dashboard/clients',
      roles: ['project_manager']
    },
    { 
      icon: UsersIcon, 
      label: 'Designers', 
      href: '/dashboard/designers',
      active: pathname === '/dashboard/designers',
      roles: ['project_manager']
    },
    { 
      icon: MessageSquareIcon, 
      label: 'Messages', 
      href: '/dashboard/messages',
      active: pathname === '/dashboard/messages',
      roles: ['project_manager', 'designer']
    },
    { 
      icon: UserIcon, 
      label: 'Profile', 
      href: '/dashboard/profile',
      active: pathname === '/dashboard/profile',
      roles: ['client', 'project_manager', 'designer']
    },
    { 
      icon: SettingsIcon, 
      label: 'Settings', 
      href: '/dashboard/settings',
      active: pathname === '/dashboard/settings',
      roles: ['client', 'project_manager']
    },
  ];

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-6 border-b bg-background shrink-0">
        <h1 className="text-xl font-bold text-foreground">ProjectHub</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full",
                item.active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              onClick={() => setIsMobileOpen(false)}
            >
              <Icon size={18} className="shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User role indicator */}
      <div className="p-4 border-t bg-muted/30 shrink-0">
        <div className="flex items-center justify-center">
          <Badge variant="secondary" className="text-xs capitalize">
            {userRole.replace('_', ' ')}
          </Badge>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Sheet */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="md:hidden fixed top-4 left-4 z-50"
          >
            <MenuIcon size={20} />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 h-screen bg-background border-r flex-col">
        <SidebarContent />
      </div>
    </>
  );
}