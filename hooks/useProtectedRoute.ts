import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export function useProtectedRoute(allowedRoles?: ('buyer' | 'seller')[]) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      // Redirect to appropriate dashboard if user doesn't have permission
      router.push(`/${user.role}/dashboard`);
    }
  }, [isAuthenticated, user, allowedRoles, router]);

  return { isAuthenticated, user };
}
