'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { User } from '@/types';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/');
    } else {
      setUser(currentUser);
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-full bg-gray-50 flex overflow-hidden">
      <div className="flex-shrink-0 h-full">
        <Sidebar userRole={user.role} />
      </div>
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <div className="flex-shrink-0 relative z-30">
          <Header user={user} />
        </div>
        <main className="flex-1 overflow-y-auto min-h-0 bg-gray-50 relative">
          <div className="pt-2 px-6 pb-6">
            <div className="max-w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}