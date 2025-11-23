"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';

export default function BuyerNavbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="bg-white border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            ECommerce
          </Link>
          <nav className="flex items-center gap-4">
            {isAuthenticated && (
              <>
                <Link href="/products" className="text-sm text-gray-600 hover:text-gray-900">
                  Products
                </Link>
                <Link href="/cart" className="text-sm text-gray-600 hover:text-gray-900">
                  Cart
                </Link>
                <Link href="/balance" className="text-sm text-gray-600 hover:text-gray-900">
                  Balance
                </Link>
              </>
            )}

            {isAuthenticated ? (
              <>
                <Button asChild>
                  <Link href={`/${user?.role}/dashboard`}>Dashboard</Link>
                </Button>
                <span className="text-sm text-gray-600">{user?.name || user?.email}</span>
                <Button variant="outline" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" asChild>
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild className="bg-black text-white">
                  <Link href="/register">Register</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
