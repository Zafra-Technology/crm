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
  XIcon 
} from 'lucide-react';

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

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md border border-gray-200"
      >
        {isMobileOpen ? <XIcon size={20} /> : <MenuIcon size={20} />}
      </button>

      {/* Sidebar - Always visible on desktop (md and up) */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-40 w-64 h-screen bg-white border-r border-gray-200 
        transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo */}
          <div className="flex items-center justify-center border-b border-gray-200 bg-white sidebar-header-height relative z-30">
            <h1 className="text-xl font-bold text-black">ProjectHub</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-item ${item.active ? 'active' : ''}`}
                  onClick={() => setIsMobileOpen(false)} // Close mobile menu on click
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User role indicator */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 uppercase tracking-wide">
              {userRole.replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}