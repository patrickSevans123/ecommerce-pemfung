'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { Loader } from '@/components/loader';

export default function SellerDashboard() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const { isLoading, user } = useProtectedRoute(['seller']);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (isLoading) {
    return <Loader />;
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
          <h1 className="text-3xl font-bold mb-2">Seller Dashboard</h1>
          <p className="text-gray-600">
            Manage your products, orders, and view your sales analytics.
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
                <p className="text-sm text-gray-600">Seller ID</p>
                <p className="font-mono text-xs text-gray-500">{user.id}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sales Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Products</span>
                <span className="text-2xl font-bold">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Sales</span>
                <span className="text-2xl font-bold">$0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Orders</span>
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
                <Link href="/seller/products/add">Add Product</Link>
              </Button>
              <Button className="w-full" variant="outline" asChild>
                <Link href="/seller/products">View Products</Link>
              </Button>
              <Button className="w-full" variant="outline" disabled>
                View Analytics
              </Button>
              <Button className="w-full" variant="outline" disabled>
                Manage Orders
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <Card>
          <CardHeader>
            <CardTitle>Available Features</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              You now have access to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 mb-6">
              <li>✅ Product management (create, edit, delete)</li>
            </ul>
            <p className="text-gray-600 mb-2">
              Coming soon:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>Order management for your products</li>
              <li>Advanced sales analytics dashboard</li>
              <li>Revenue tracking and reporting</li>
              <li>Customer insights</li>
              <li>Promo code management</li>
              <li>Inventory management</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
