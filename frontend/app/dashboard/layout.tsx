'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { User } from '@/types';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Toaster } from '@/components/ui/toaster';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push('/');
      } else {
        setUser(currentUser);
      }
      setLoading(false);
    };
    loadUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-full bg-background flex overflow-hidden">
      <div className="flex-shrink-0 h-full">
        <Sidebar userRole={user.role} />
      </div>
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden border-l-0">
        <div className="flex-shrink-0 relative z-30">
          <Header user={user} />
        </div>
        <main className="flex-1 overflow-y-auto min-h-0 bg-background relative">
          <div className="pt-2 px-6 pb-6">
            <div className="max-w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}