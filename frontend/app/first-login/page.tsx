'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import FirstLoginModal from '@/components/modals/FirstLoginModal';

export default function FirstLoginPage() {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const currentUser = await getCurrentUser();
      
      if (!currentUser) {
        router.push('/');
        return;
      }

      // Only allow clients on first login
      if (currentUser.role !== 'client') {
        router.push('/dashboard');
        return;
      }

      if (currentUser.is_first_login) {
        setUser(currentUser);
      } else {
        router.push('/dashboard');
      }

      setLoading(false);
    };

    checkUser();
  }, [router]);

  const handleComplete = async () => {
    // Reload to get updated user
    const updatedUser = await getCurrentUser();
    if (updatedUser) {
      router.push('/dashboard');
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return <FirstLoginModal user={user} onComplete={handleComplete} />;
}

