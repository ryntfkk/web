import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

export function useRequireAuth(requiredRole?: string) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isInitializing, user } = useAuthStore();

  useEffect(() => {
    if (isInitializing) return;

    if (!isAuthenticated) {
      // Support redirect param if needed later (F3.8)
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (requiredRole && user?.active_role !== requiredRole) {
      router.push('/');
    }
  }, [isAuthenticated, isInitializing, user, requiredRole, router, pathname]);

  return {
    isInitializing,
    isAuthenticated,
    user,
    isLoading: isInitializing,
    isAuthorized: isAuthenticated && (!requiredRole || user?.active_role === requiredRole)
  };
}
