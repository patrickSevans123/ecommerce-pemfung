import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { User } from '@/types/user';

export function useProtectedRoute(allowedRoles?: ('buyer' | 'seller')[]) {
  const router = useRouter();
  const { isAuthenticated, user, isHydrated } = useAuthStore();

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      // Redirect to appropriate dashboard if user doesn't have permission
      router.push(`/${user.role}/dashboard`);
      return;
    }
  }, [isAuthenticated, user, allowedRoles, router, isHydrated]);

  const isLoading = !isHydrated || !isAuthenticated || (allowedRoles ? !user || !allowedRoles.includes(user.role) : false);

  return { isLoading, user: user as User };
}
