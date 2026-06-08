'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const { isLoggedIn, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
    setLoading(false);
  }, [initialize]);

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push('/login');
    }
  }, [loading, isLoggedIn, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return fallback || null;
  }

  return <>{children}</>;
}