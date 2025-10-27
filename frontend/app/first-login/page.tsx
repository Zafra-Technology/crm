'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { User as APIUser } from '@/lib/api/auth';
import FirstLoginModal from '@/components/modals/FirstLoginModal';

export default function FirstLoginPage() {
  const [user, setUser] = useState<APIUser | null>(null);
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

      // Fetch user data from API to get is_first_login
      try {
        const apiUser = await fetch('http://localhost:8000/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }).then(res => res.json());
        
        if (apiUser.is_first_login) {
          setUser(apiUser);
        } else {
          router.push('/dashboard');
        }
      } catch (error) {
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
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

