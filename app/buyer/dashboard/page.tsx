'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { notificationsAPI, cartAPI } from '@/utils/api';
import { Notification } from '@/types/api';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NotificationList } from '@/components/notifications/notification-list';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { Loader } from '@/components/loader';

export default function BuyerDashboard() {
  const { isLoading, user } = useProtectedRoute(['buyer']);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [activeOrders, setActiveOrders] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (user?.id) {
        try {
          setIsLoadingNotifications(true);
          const response = await notificationsAPI.getForUser(user.id, { limit: 10 });
          setNotifications(response.notifications);
        } catch (error) {
          console.error('Error fetching notifications:', error);
        } finally {
          setIsLoadingNotifications(false);
        }
      }
    };

    const fetchCartCount = async () => {
      if (user?.id) {
        try {
          const response = await cartAPI.getCart(user.id);
          const totalItems = response.cart.items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0);
          setCartItemsCount(totalItems);
        } catch (error) {
          console.error('Error fetching cart:', error);
        }
      }
    };

    const fetchOrdersCount = async () => {
      if (!user?.id) return;
      try {
        const res = await fetch(`/api/orders/list?userId=${encodeURIComponent(user.id)}`);
        const payload = await res.json();
        const ordersArray = Array.isArray(payload) ? payload : payload?.data ?? [];

        setTotalOrders(ordersArray.length);
        // active = not delivered / cancelled / refunded
        const active = ordersArray.filter((o: any) => {
          const s = o?.status?.status || 'pending';
          return !['delivered', 'cancelled', 'refunded'].includes(s);
        }).length;
        setActiveOrders(active);
      } catch (err) {
        console.error('Error fetching orders for stats:', err);
        setTotalOrders(0);
        setActiveOrders(0);
      }
    };

    if (user?.id && user?.role === 'buyer') {
      fetchNotifications();
      fetchCartCount();
      fetchOrdersCount();
    }
  }, [user]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

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
                <span className="text-2xl font-bold">{totalOrders}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Active Orders</span>
                <span className="text-2xl font-bold">{activeOrders}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Cart Items</span>
                <span className="text-2xl font-bold">{cartItemsCount}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline" asChild>
                <Link href="/products">Browse Products</Link>
              </Button>
              <Button className="w-full" variant="outline" asChild>
                <Link href="/cart">View Cart</Link>
              </Button>
              <Button className="w-full" variant="outline" asChild>
                <Link href="/buyer/orders">View Orders</Link>
              </Button>
              <Button className="w-full" variant="outline" asChild>
                <Link href="/cart">Shopping Cart</Link>
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
              <NotificationList
                notifications={notifications}
                isLoading={isLoadingNotifications}
                userRole="buyer"
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
