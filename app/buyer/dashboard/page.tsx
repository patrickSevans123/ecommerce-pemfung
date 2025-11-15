'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function BuyerDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (user?.role !== 'buyer') {
      router.push('/seller/dashboard');
    }
  }, [isAuthenticated, user, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!isAuthenticated || user?.role !== 'buyer') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              ECommerce
            </Link>
            <nav className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {user.name || user.email}
              </span>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Buyer Dashboard</h1>
          <p className="text-gray-600">
            Welcome back! Manage your orders and shopping preferences.
          </p>
        </div>

        {/* User Info Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium">{user.name || 'Not set'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Role</p>
                <Badge variant="default">{user.role}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">Account ID</p>
                <p className="font-mono text-xs text-gray-500">{user.id}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Orders</span>
                <span className="text-2xl font-bold">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Active Orders</span>
                <span className="text-2xl font-bold">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Cart Items</span>
                <span className="text-2xl font-bold">0</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline" asChild>
                <Link href="/">Browse Products</Link>
              </Button>
              <Button className="w-full" variant="outline" disabled>
                View Orders
              </Button>
              <Button className="w-full" variant="outline" disabled>
                Shopping Cart
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Coming Soon Section */}
        <Card>
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              More features will be added soon, including:
            </p>
            <ul className="list-disc list-inside mt-4 space-y-2 text-gray-600">
              <li>Order history and tracking</li>
              <li>Shopping cart management</li>
              <li>Wishlist</li>
              <li>Saved addresses</li>
              <li>Balance management</li>
              <li>Purchase history analytics</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
