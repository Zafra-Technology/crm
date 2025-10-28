'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { User } from '@/types';
import AdminDashboard from '@/components/dashboards/AdminDashboard';

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push('/');
        return;
      }
      if (!isAdmin(currentUser)) {
        router.push('/dashboard');
        return;
      }
      setUser(currentUser);
      setLoading(false);
    };
    init();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <AdminDashboard user={user} />;
}