'use client';

import { useEffect, useState, useMemo, ElementType } from 'react';
import type { JSX } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import Navbar from '@/components/navbar';
import { Loader } from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Order } from '@/types';
import ReviewForm from '@/components/review/ReviewForm';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  ShoppingBag,
  Star
} from 'lucide-react';

export default function BuyerOrdersPage() {
  const { isLoading, user } = useProtectedRoute(['buyer']);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [msgDialogOpen, setMsgDialogOpen] = useState(false);
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmOrderId, setConfirmOrderId] = useState<string | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewProductId, setReviewProductId] = useState<string | null>(null);

  const showMessage = (title: string, body: string) => {
    setMsgTitle(title);
    setMsgBody(body);
    setMsgDialogOpen(true);
  };

  const openReviewForProduct = (productId: string | null) => {
    if (!productId) return;
    setReviewProductId(productId);
    setReviewDialogOpen(true);
  };

  const onReviewCreated = () => {
    setReviewDialogOpen(false);
    setReviewProductId(null);
    showMessage("Thank you!", "Your review has been submitted.");
  };

  useEffect(() => {
    if (user?.id) fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const res = await fetch(`/api/orders/list?userId=${encodeURIComponent(user.id)}`);
      const payload = await res.json();
      const ordersArray = Array.isArray(payload) ? payload : payload?.data ?? [];
      setOrders(ordersArray as Order[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const markSent = (orderId: string) => {
    setConfirmOrderId(orderId);
    setConfirmDialogOpen(true);
  };

  const doMarkSent = async (orderId: string | null) => {
    if (!orderId) return;
    try {
      setActionLoading(orderId);

      const res = await fetch(`/api/orders/${orderId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: { type: 'Deliver' } }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || json?.message || 'Failed to update order');
      }

      await fetchOrders();
      showMessage('Success', 'Order marked as delivered');
    } catch (err) {
      console.error('Failed to mark order as delivered:', err);
      showMessage('Error', err instanceof Error ? err.message : 'Failed to update order status');
    } finally {
      setActionLoading(null);
      setConfirmDialogOpen(false);
      setConfirmOrderId(null);
    }
  };

  // Calculate stats for the dashboard
  const stats = useMemo(() => {
    return {
      total: orders.length,
      shipped: orders.filter(o => o.status?.status === 'shipped').length,
      delivered: orders.filter(o => o.status?.status === 'delivered').length,
    };
  }, [orders]);

  if (isLoading) return <Loader />;

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-5xl">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Order History</h1>
            <p className="text-gray-500 mt-1">Check the status of your recent orders, manage returns, and download invoices.</p>
          </div>
          <Button onClick={fetchOrders} variant="outline" className="w-full md:w-auto bg-white">
            Refresh Orders
          </Button>
        </div>

        {/* Dashboard Stats */}
        {!loadingOrders && orders.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <StatCard title="Total Orders" value={stats.total} icon={ShoppingBag} colorClass="bg-black" />
            <StatCard title="In Transit" value={stats.shipped} icon={Truck} colorClass="bg-black" />
            <StatCard title="Delivered" value={stats.delivered} icon={CheckCircle} colorClass="bg-black" />
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
                  You haven&apos;t placed any orders yet. Start browsing our catalog to find something you love.
                </p>
                <Button>Start Shopping</Button>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
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
                      <span className="block text-xs text-gray-500 uppercase font-semibold tracking-wide">Total Amount</span>
                      <span className="font-medium text-gray-900 mt-0.5 block">{formatCurrency(order.total)}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500 uppercase font-semibold tracking-wide">Ship To</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="font-medium text-gray-900 truncate max-w-[150px]" title={user?.name || user?.email}>
                          {user?.name || 'Me'}
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
                    {(order.items || []).map((item, idx) => (
                      <div key={idx} className="p-4 md:p-6 flex flex-col sm:flex-row gap-6 hover:bg-gray-50/50 transition-colors">

                        {/* Product Image */}
                        <div className="relative w-full sm:w-20 h-20 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center">
                          {item.product.images && item.product.images.length > 0 ? (
                            <Image
                              src={item.product.images[0]}
                              alt={item.product.title}
                              fill
                              objectFit="cover"
                              className="rounded-lg"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-gray-500">No Image</span>
                            </div>
                          )}
                        </div>

                        {/* Item Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col md:flex-row justify-between gap-2">
                            <div>
                              <h4 className="font-semibold text-gray-900 truncate text-base">{item.name}</h4>
                              <p className="text-sm text-gray-500 mt-1">Quantity: <span className="font-medium text-gray-900">{item.quantity}</span></p>
                            </div>
                            <p className="font-semibold text-gray-900 text-lg">{formatCurrency((item.price || 0) * (item.quantity || 1))}</p>
                          </div>

                          {/* Item Actions (Review) */}
                          {order.status?.status === 'delivered' && (
                            <div className="mt-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 pl-0 h-auto p-0 px-2 font-medium"
                                onClick={() => {
                                  const pid = item.product._id;
                                  openReviewForProduct(pid || null);
                                }}
                              >
                                <Star className="w-3.5 h-3.5 mr-1.5" />
                                Write a product review
                              </Button>
                            </div>
                          )}
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
                    {order.status?.status === 'shipped' && (
                      <Button
                        disabled={actionLoading === order._id}
                        onClick={() => markSent(order._id)}
                      >
                        {actionLoading === order._id ? 'Updating...' : 'Confirm Delivery'}
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </main>

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

      {/* Confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delivery</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm border border-blue-100 flex gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Has this package arrived safely at your location?</span>
            </div>
            <p className="text-sm text-gray-600">
              Marking this order as delivered will complete the transaction and allow you to leave reviews for the items.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDialogOpen(false)}>Not yet</Button>
            <Button
              onClick={() => doMarkSent(confirmOrderId)}
              disabled={!!actionLoading}
            >
              {actionLoading ? 'Updating...' : 'Yes, I received it'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate & Review Product</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {reviewProductId ? (
              <ReviewForm productId={reviewProductId} onCreated={onReviewCreated} />
            ) : (
              <div className="text-sm text-gray-600">No product selected</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper Components

const StatCard = ({ title, value, icon: Icon, colorClass }: { title: string; value: number; icon: ElementType; colorClass: string }) => (
  <Card className="border-none shadow-sm bg-white">
    <CardContent className="p-5 flex items-center space-x-5">
      <div className={`p-3 rounded-full ${colorClass}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{value}</h3>
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