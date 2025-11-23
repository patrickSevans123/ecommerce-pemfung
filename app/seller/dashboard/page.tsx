'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { notificationsAPI } from '@/utils/api';
import { Notification } from '@/types/api';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NotificationList } from '@/components/notifications/notification-list';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { Loader } from '@/components/loader';

export default function SellerDashboard() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const { isLoading, user } = useProtectedRoute(['seller']);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.id) {
        // User ID not available
        return;
      }

      try {
        setIsLoadingNotifications(true);
        setError(null);
  // Fetching notifications for seller
        
        const response = await notificationsAPI.getForSeller(user.id, { limit: 10 });
  // Notifications response received
        
        // Handle different response formats
        const notificationsList = response.notifications || response.data || response || [];
        setNotifications(Array.isArray(notificationsList) ? notificationsList : []);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error fetching notifications:', error);
        setError(errorMessage);
        setNotifications([]); // Clear notifications on error
      } finally {
        setIsLoadingNotifications(false);
      }
    };

    if (user?.id && user?.role === 'seller') {
      fetchNotifications();
    }
  }, [user?.id, user?.role]);

  // Real-time SSE listener for new notifications
  useEffect(() => {
    if (!user?.id || user?.role !== 'seller') {
      return;
    }

  // Connecting to real-time notifications for seller
    
    const eventSource = new EventSource(
      `/api/notifications/seller/${user.id}`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
  // Received real-time notification

        // Skip 'connected' message
        if (data.type === 'connected') {
          // Connected to real-time notifications
          return;
        }

        // Add new notification to the top
        setNotifications(prev => [
          {
            _id: Date.now().toString(), // Temporary ID
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          ...prev.slice(0, 9), // Keep only 10 most recent
        ]);
      } catch (error) {
        console.error('Error parsing notification:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      eventSource.close();
    };

    // Cleanup on unmount
    return () => {
  // Disconnecting from real-time notifications
      eventSource.close();
    };
  }, [user?.id, user?.role]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

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

        {/* Notifications Section */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recent Notifications</span>
                <Badge variant="secondary">{notifications.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  Error loading notifications: {error}
                </div>
              )}
              <NotificationList
                notifications={notifications}
                isLoading={isLoadingNotifications}
                userRole="seller"
              />
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
