'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import Navbar from '@/components/navbar';
import { Loader } from '@/components/loader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function SellerOrdersPage() {
  const { isLoading, user } = useProtectedRoute(['seller']);
  const [orders, setOrders] = useState<any[]>([]);
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
    // Frontend validation: tracking number must be provided
    if (!trackingValue || trackingValue.trim() === '') {
      showMessage('Validation error', 'Tracking number is required');
      return;
    }

    try {
      setActionLoading(orderId);
      const res = await fetch(`/api/orders/${orderId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: { type: 'Ship', trackingNumber: trackingValue } }),
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

  if (isLoading) return <Loader />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Seller Orders</h1>
          <div className="text-sm text-gray-600">Orders: <span className="font-medium">{orders.length}</span></div>
        </div>

        {loadingOrders ? (
          <Card>
            <CardContent>Loading orders...</CardContent>
          </Card>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="text-center text-gray-600">No orders for your products yet.</CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead>Order</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order._id}>
                      <TableCell className="font-mono text-xs">#{order._id}</TableCell>
                      <TableCell>{order.user?.name || order.user?.email || '—'}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {((order.items || [])
                            // show only items that belong to this seller if user.id is available
                            .filter((it: any) => {
                              try {
                                return user?.id ? (it.seller?.toString?.() === user.id) : true;
                              } catch {
                                return true;
                              }
                            })
                            .map((it: any, idx: number) => (
                              <div key={idx} className="text-sm text-gray-700">
                                <span className="font-medium">{it.name}</span>
                                <span className="ml-2 text-xs text-gray-500">x{it.quantity}</span>
                                <span className="ml-2 text-sm">{formatCurrency((it.price || 0) * (it.quantity || 1))}</span>
                              </div>
                            )))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          try {
                            const sellerId = user?.id;
                            if (!sellerId) return formatCurrency(order.total);
                            const itemsForSeller = (order.items || []).filter((it: any) => {
                              try {
                                return it.seller?.toString?.() === sellerId;
                              } catch {
                                return false;
                              }
                            });
                            const totalForSeller = itemsForSeller.reduce((sum: number, it: any) => sum + ((it.price || 0) * (it.quantity || 1)), 0);
                            return formatCurrency(totalForSeller);
                          } catch {
                            return formatCurrency(order.total);
                          }
                        })()}
                      </TableCell>
                      <TableCell>{renderStatusBadge(order.status?.status)}</TableCell>
                      <TableCell className="text-right">
                        {(order.status?.status === 'paid' || (order.status?.status === 'pending' && order.payment?.method === 'cash_on_delivery')) ? (
                          <Button size="sm" disabled={actionLoading === order._id} onClick={() => markSending(order._id)}>
                            {actionLoading === order._id ? 'Updating...' : 'Mark Sending'}
                          </Button>
                        ) : (
                          <span className="text-sm text-gray-500">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter tracking number</DialogTitle>
          </DialogHeader>

          <div className="py-2">
            <Input
              value={trackingValue}
              onChange={(e) => setTrackingValue((e.target as HTMLInputElement).value)}
              placeholder="Tracking number"
              required
              aria-required
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="mr-2">
              Cancel
            </Button>
            <Button onClick={confirmTracking} disabled={actionLoading === selectedOrderId}>
              {actionLoading === selectedOrderId ? 'Updating...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={msgDialogOpen} onOpenChange={setMsgDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{msgTitle}</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-gray-700">{msgBody}</div>
          <DialogFooter>
            <Button onClick={() => setMsgDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatCurrency(value: number) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
  } catch {
    return `$ ${value}`;
  }
}

function renderStatusBadge(status?: string | null) {
  const s = status || 'pending';
  switch (s) {
    case 'pending':
      return <Badge variant="outline">Pending</Badge>;
    case 'paid':
      return <Badge variant="default">Paid</Badge>;
    case 'shipped':
      return <Badge variant="secondary">Shipped</Badge>;
    case 'delivered':
      return <Badge>Delivered</Badge>;
    case 'cancelled':
      return <Badge variant="destructive">Cancelled</Badge>;
    case 'refunded':
      return <Badge variant="destructive">Refunded</Badge>;
    default:
      return <Badge variant="outline">{s}</Badge>;
  }
}
