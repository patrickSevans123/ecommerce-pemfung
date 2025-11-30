'use client';

import { useEffect, useState, useMemo, ElementType } from 'react';
import type { JSX } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import Navbar from '@/components/navbar';
import { Loader } from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  ShoppingBag,
  DollarSign,
  User
} from 'lucide-react';
import { Order, OrderItem } from '@/types';

export default function SellerOrdersPage() {
  const { isLoading, user } = useProtectedRoute(['seller']);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [trackingValue, setTrackingValue] = useState('');
  const [msgDialogOpen, setMsgDialogOpen] = useState(false);
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');

  const showMessage = (title: string, body: string) => {
    setMsgTitle(title);
    setMsgBody(body);
    setMsgDialogOpen(true);
  };

  useEffect(() => {
    if (user?.id) fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const res = await fetch(`/api/orders/list?sellerId=${encodeURIComponent(user.id)}`);
      const payload = await res.json();
      const ordersArray = Array.isArray(payload) ? payload : payload?.data ?? [];
      setOrders(ordersArray);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const markSending = (orderId: string) => {
    setSelectedOrderId(orderId);
    setTrackingValue('');
    setDialogOpen(true);
  };

  const confirmTracking = async () => {
    if (!selectedOrderId) return;
    const orderId = selectedOrderId;
    try {
      setActionLoading(orderId);
      const res = await fetch(`/api/orders/${orderId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: { type: 'Ship', trackingNumber: trackingValue || '' } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || json?.message || 'Failed');
      setDialogOpen(false);
      setSelectedOrderId(null);
      await fetchOrders();
      showMessage('Success', 'Order updated to Shipped');
    } catch (err) {
      console.error(err);
      showMessage('Error', 'Failed to update order status');
    } finally {
      setActionLoading(null);
    }
  };

  // Calculate stats for the dashboard
  const stats = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter(o => o.status?.status === 'paid' || (o.status?.status === 'pending' && o.payment?.method === 'cash_on_delivery')).length,
      shipped: orders.filter(o => o.status?.status === 'shipped').length,
    };
  }, [orders]);

  // Calculate total revenue
  const totalRevenue = useMemo(() => {
    return orders.reduce((sum, order) => {
      try {
        const sellerId = user?.id;
        if (!sellerId) return sum + order.total;
        const itemsForSeller = (order.items || []).filter((it: OrderItem) => {
          try {
            return it.seller?.toString?.() === sellerId;
          } catch {
            return false;
          }
        });
        const totalForSeller = itemsForSeller.reduce((itemSum: number, it: OrderItem) => 
          itemSum + ((it.price || 0) * (it.quantity || 1)), 0
        );
        return sum + totalForSeller;
      } catch {
        return sum + order.total;
      }
    }, 0);
  }, [orders, user?.id]);

  if (isLoading) return <Loader />;

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-5xl">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Orders Management</h1>
            <p className="text-gray-500 mt-1">Manage and fulfill orders for your products.</p>
          </div>
          <Button onClick={fetchOrders} variant="outline" className="w-full md:w-auto bg-white">
            Refresh Orders
          </Button>
        </div>

        {/* Dashboard Stats */}
        {!loadingOrders && orders.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <StatCard title="Total Orders" value={stats.total} icon={ShoppingBag} colorClass="bg-black" />
            <StatCard title="Awaiting Shipment" value={stats.pending} icon={Clock} colorClass="bg-black" />
            <StatCard title="Shipped" value={stats.shipped} icon={Truck} colorClass="bg-black" />
            <StatCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={DollarSign} colorClass="bg-black" isRevenue />
          </div>
        )}

        {/* Orders List */}
        <div className="space-y-6">
          {loadingOrders ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader />
              <p className="text-gray-500 font-medium">Retrieving your orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <Card className="border-dashed border-2 bg-transparent shadow-none">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <div className="bg-gray-100 p-4 rounded-full mb-4">
                  <ShoppingBag className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">No orders yet</h3>
                <p className="text-gray-500 max-w-sm mt-2 mb-6">
                  No orders for your products yet. Keep promoting your products to get more sales!
                </p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => {
              // Filter items for this seller
              const sellerItems = (order.items || []).filter((it: OrderItem) => {
                try {
                  return user?.id ? (it.seller?.toString?.() === user.id) : true;
                } catch {
                  return true;
                }
              });

              // Calculate total for seller's items
              const sellerTotal = sellerItems.reduce((sum: number, it: OrderItem) => 
                sum + ((it.price || 0) * (it.quantity || 1)), 0
              );

              return (
                <Card key={order._id} className="overflow-hidden transition-all duration-200 hover:shadow-md border-gray-200 bg-white">

                  {/* Order Header */}
                  <div className="bg-gray-50/50 p-4 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100">
                    <div className="flex flex-col md:flex-row gap-4 md:gap-10 text-sm">
                      <div>
                        <span className="block text-xs text-gray-500 uppercase font-semibold tracking-wide">Order Placed</span>
                        <span className="font-medium text-gray-900 mt-0.5 block">
                          {new Date(order.createdAt || Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs text-gray-500 uppercase font-semibold tracking-wide">Your Total</span>
                        <span className="font-medium text-gray-900 mt-0.5 block">{formatCurrency(sellerTotal)}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-gray-500 uppercase font-semibold tracking-wide">Buyer</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-medium text-gray-900 truncate max-w-[150px]" title={order.user?.name || order.user?.email}>
                            {order.user?.name || order.user?.email || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 justify-between md:justify-end">
                      <div className="text-right md:text-left">
                        <span className="block text-xs text-gray-500 uppercase font-semibold md:hidden mb-1">Status</span>
                        <StatusBadge status={order.status?.status} />
                      </div>
                      <div className="hidden md:block h-8 w-px bg-gray-200 mx-2"></div>
                      <div className="text-xs text-gray-400 font-mono">#{order._id.slice(-8)}</div>
                    </div>
                  </div>

                  {/* Order Body */}
                  <CardContent className="p-0">
                    <div className="divide-y divide-gray-100">
                      {sellerItems.map((item: OrderItem, idx: number) => (
                        <div key={idx} className="p-4 md:p-6 flex flex-col sm:flex-row gap-6 hover:bg-gray-50/50 transition-colors">

                          {/* Product Image */}
                          <div className="relative w-full sm:w-20 h-20 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center">
                            {item.product?.images && item.product.images.length > 0 ? (
                              <Image
                                src={item.product.images[0]}
                                alt={item.product.title}
                                fill
                                className="object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ShoppingBag className="w-8 h-8 text-gray-300" />
                              </div>
                            )}
                          </div>

                          {/* Item Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col md:flex-row justify-between gap-2">
                              <div>
                                <h4 className="font-semibold text-gray-900 truncate text-base">{item.name}</h4>
                                <p className="text-sm text-gray-500 mt-1">
                                  Quantity: <span className="font-medium text-gray-900">{item.quantity}</span>
                                  <span className="mx-2">•</span>
                                  Unit Price: <span className="font-medium text-gray-900">{formatCurrency(item.price || 0)}</span>
                                </p>
                              </div>
                              <p className="font-semibold text-gray-900 text-lg">{formatCurrency((item.price || 0) * (item.quantity || 1))}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>

                  {/* Order Footer / Actions */}
                  <CardFooter className="bg-gray-50/30 p-4 md:px-6 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      <span className="font-medium text-gray-900">Payment Method:</span>
                      <span className="capitalize bg-gray-100 px-2 py-0.5 rounded text-xs font-medium text-gray-700">
                        {(order.payment?.method === 'cash_on_delivery') ? 'Cash On Delivery' : (order.payment?.method || 'Standard')}
                      </span>
                    </div>

                    <div className="flex w-full sm:w-auto gap-3">
                      {(order.status?.status === 'paid' || (order.status?.status === 'pending' && order.payment?.method === 'cash_on_delivery')) && (
                        <Button
                          disabled={actionLoading === order._id}
                          onClick={() => markSending(order._id)}
                        >
                          <Truck className="w-4 h-4 mr-2" />
                          {actionLoading === order._id ? 'Updating...' : 'Mark as Shipped'}
                        </Button>
                      )}
                      
                      {order.status?.status === 'shipped' && order.status?.tracking && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">Tracking:</span>
                          <span className="font-mono font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                            {order.status.tracking}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              );
            })
          )}
        </div>
      </main>

      {/* Tracking Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ship Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm border border-blue-100 flex gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Add a tracking number to help the buyer track their package.</span>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Tracking Number (Optional)
              </label>
              <Input
                value={trackingValue}
                onChange={(e) => setTrackingValue(e.target.value)}
                placeholder="e.g., 1Z999AA10123456784"
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmTracking}
              disabled={actionLoading === selectedOrderId}
            >
              {actionLoading === selectedOrderId ? 'Updating...' : 'Confirm Shipment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={msgDialogOpen} onOpenChange={setMsgDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{msgTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">{msgBody}</p>
          <DialogFooter>
            <Button onClick={() => setMsgDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper Components

const StatCard = ({ title, value, icon: Icon, colorClass, isRevenue = false }: { 
  title: string; 
  value: number | string; 
  icon: ElementType; 
  colorClass: string;
  isRevenue?: boolean;
}) => (
  <Card className="border-none shadow-sm bg-white">
    <CardContent className="p-5 flex items-center space-x-5">
      <div className={`p-3 rounded-full ${colorClass}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
          {isRevenue ? value : value}
        </h3>
      </div>
    </CardContent>
  </Card>
);

const StatusBadge = ({ status }: { status?: string | null }) => {
  const s = status || 'pending';

  const styles: Record<string, string> = {
    pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
    paid: "bg-blue-50 text-blue-700 border-blue-200",
    shipped: "bg-purple-50 text-purple-700 border-purple-200",
    delivered: "bg-green-50 text-green-700 border-green-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
    refunded: "bg-gray-50 text-gray-700 border-gray-200",
  };

  const icons: Record<string, JSX.Element> = {
    pending: <Clock className="w-3.5 h-3.5 mr-1.5" />,
    paid: <CheckCircle className="w-3.5 h-3.5 mr-1.5" />,
    shipped: <Truck className="w-3.5 h-3.5 mr-1.5" />,
    delivered: <Package className="w-3.5 h-3.5 mr-1.5" />,
    cancelled: <AlertCircle className="w-3.5 h-3.5 mr-1.5" />,
    refunded: <AlertCircle className="w-3.5 h-3.5 mr-1.5" />,
  };

  const key = s.toLowerCase();
  const styleClass = styles[key] || styles.pending;
  const icon = icons[key] || icons.pending;

  return (
    <div className={`px-2.5 py-0.5 rounded-full border text-xs font-medium flex items-center w-fit ${styleClass}`}>
      {icon}
      <span className="capitalize">{s}</span>
    </div>
  );
};

function formatCurrency(value: number) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
  } catch {
    return `$ ${value}`;
  }
}