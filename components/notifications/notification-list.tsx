'use client';

import { useEffect, useState } from 'react';
import { Notification } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Package, CreditCard, Truck, AlertTriangle, Star } from 'lucide-react';

interface NotificationListProps {
  notifications: Notification[];
  isLoading?: boolean;
  userRole?: 'buyer' | 'seller';
}

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'ORDER_PLACED':
      return <Package className="h-4 w-4" />;
    case 'PAYMENT_SUCCESS':
    case 'PAYMENT_FAILED':
      return <CreditCard className="h-4 w-4" />;
    case 'ORDER_SHIPPED':
    case 'ORDER_DELIVERED':
      return <Truck className="h-4 w-4" />;
    case 'PRODUCT_ADDED':
    case 'PRODUCT_UPDATED':
    case 'PRODUCT_DELETED':
      return <Package className="h-4 w-4" />;
    case 'BALANCE_UPDATED':
      return <CreditCard className="h-4 w-4" />;
    case 'PROMO_CODE_USED':
      return <Star className="h-4 w-4" />;
    case 'REVIEW_ADDED':
      return <Star className="h-4 w-4" />;
    case 'STOCK_LOW':
      return <AlertTriangle className="h-4 w-4" />;
  }
};

const getNotificationColor = (type: Notification['type']) => {
  switch (type) {
    case 'ORDER_PLACED':
      return 'bg-blue-100 text-blue-800';
    case 'PAYMENT_SUCCESS':
      return 'bg-green-100 text-green-800';
    case 'PAYMENT_FAILED':
      return 'bg-red-100 text-red-800';
    case 'ORDER_SHIPPED':
    case 'ORDER_DELIVERED':
      return 'bg-purple-100 text-purple-800';
    case 'PRODUCT_ADDED':
    case 'PRODUCT_UPDATED':
    case 'PRODUCT_DELETED':
      return 'bg-indigo-100 text-indigo-800';
    case 'BALANCE_UPDATED':
      return 'bg-emerald-100 text-emerald-800';
    case 'PROMO_CODE_USED':
      return 'bg-pink-100 text-pink-800';
    case 'REVIEW_ADDED':
      return 'bg-yellow-100 text-yellow-800';
    case 'STOCK_LOW':
      return 'bg-red-100 text-red-800';
  }
};

interface NotificationItemProps {
  notification: Notification;
  userRole?: 'buyer' | 'seller';
  userId?: string;
}

const formatNotificationMessage = (notification: Notification, userRole?: 'buyer' | 'seller'): string => {
  const { type, data = {} } = notification;

  switch (type) {
    case 'ORDER_PLACED':
      if (userRole === 'seller') {
        return `📦 New order received for "${data.productName || 'your product'}" (Qty: ${data.quantity || 1})`;
      }
      return `🎉 You placed a new order for "${data.productName || 'a product'}" (Qty: ${data.quantity || 1})`;
    
    case 'PAYMENT_SUCCESS':
      if (userRole === 'seller') {
        const productInfo = data.productName ? ` for "${data.productName}"` : '';
        const quantity = data.quantity ? ` (Qty: ${data.quantity})` : '';
        const amount = data.amount || 'N/A';
        return `✅ Payment confirmed! Received $${amount}${productInfo}${quantity}`;
      }
      const productInfo = data.productName ? ` for "${data.productName}"` : '';
      const amount = data.amount || 'N/A';
      return `✅ Your payment of $${amount} has been confirmed${productInfo}. Thank you for your purchase!`;
    
    case 'PAYMENT_FAILED':
      if (userRole === 'seller') {
        return `❌ Payment failed for order. Amount: $${data.amount || 'N/A'}`;
      }
      return `❌ Payment failed for $${data.amount || 'N/A'}. Please try again.`;
    
    case 'ORDER_SHIPPED':
      if (userRole === 'seller') {
        const tracking = data.trackingNumber ? ` - Tracking: ${data.trackingNumber}` : '';
        return `� Order shipped successfully${tracking}`;
      }
      const tracking = data.trackingNumber ? ` - Tracking: ${data.trackingNumber}` : '';
      return `� Your order is on the way${tracking}`;
    
    case 'ORDER_DELIVERED':
      if (userRole === 'seller') {
        return `🎉 Order delivered successfully`;
      }
      return `🎉 Your order has been delivered! Please leave a review.`;
    
    case 'STOCK_LOW':
      return `⚠️ Low stock alert: "${data.productName || 'Product'}" has only ${data.currentStock || 0} items left`;
    
    default:
      return `🔔 ${(type as string).replace(/([A-Z])/g, ' $1').trim()}`;
  }
};

const getNotificationTitle = (type: Notification['type'], userRole?: 'buyer' | 'seller'): string => {
  switch (type) {
    case 'ORDER_PLACED':
      return userRole === 'seller' ? 'New Order' : 'Order Placed';
    case 'PAYMENT_SUCCESS':
      return 'Payment Confirmed';
    case 'PAYMENT_FAILED':
      return 'Payment Failed';
    case 'ORDER_SHIPPED':
      return 'Order Shipped';
    case 'ORDER_DELIVERED':
      return 'Order Delivered';
    case 'PRODUCT_ADDED':
      return 'Product Added';
    case 'PRODUCT_UPDATED':
      return 'Product Updated';
    case 'PRODUCT_DELETED':
      return 'Product Removed';
    case 'BALANCE_UPDATED':
      return 'Balance Updated';
    case 'PROMO_CODE_USED':
      return 'Promo Code Used';
    case 'REVIEW_ADDED':
      return 'New Review';
    case 'STOCK_LOW':
      return 'Low Stock Alert';
    default:
      return (type as string).replace(/_/g, ' ').toLowerCase();
  }
};

export function NotificationItem({ notification, userRole }: NotificationItemProps) {
  const formattedDate = new Date(notification.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card className="mb-3 hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
            {getNotificationIcon(notification.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">
                {getNotificationTitle(notification.type, userRole)}
              </h4>
              <span className="text-xs text-gray-500">{formattedDate}</span>
            </div>
            <p className="mt-1 text-sm text-gray-700">
              {formatNotificationMessage(notification, userRole)}
            </p>
            {/* Show order ID for relevant notifications */}
            {(notification.type === 'ORDER_PLACED' || notification.type === 'PAYMENT_SUCCESS' || notification.type === 'ORDER_SHIPPED' || notification.type === 'PAYMENT_FAILED' || notification.type === 'ORDER_DELIVERED') && (
              <p className="mt-2 text-xs text-gray-500">
                Order #{notification.orderId?.slice(-8) || 'N/A'}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function NotificationList({ notifications, isLoading, userRole }: NotificationListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Bell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
          <p className="text-gray-500">You don't have any notifications yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-1">
      {notifications.map((notification) => (
        <NotificationItem key={notification._id} notification={notification} userRole={userRole} />
      ))}
    </div>
  );
}