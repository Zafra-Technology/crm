'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDownIcon, LogOutIcon, UserIcon } from 'lucide-react';
import { User } from '@/types';
import { logout } from '@/lib/auth';

interface HeaderProps {
  user: User;
}

export default function Header({ user }: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 flex-shrink-0 main-header-height relative z-30">
      <div className="flex items-center justify-between h-full">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-black">Dashboard</h2>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <UserIcon size={16} className="text-gray-600" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-black">{user.name}</div>
                <div className="text-xs text-gray-500 capitalize">
                  {user.role.replace('_', ' ')}
                </div>
              </div>
              <ChevronDownIcon size={16} className="text-gray-400" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    router.push('/dashboard/profile');
                  }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <UserIcon size={16} />
                  <span>Profile</span>
                </button>
                <hr className="my-1 border-gray-200" />
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                >
                  <LogOutIcon size={16} />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}