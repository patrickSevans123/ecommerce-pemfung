'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import Navbar from '@/components/navbar';
import { Loader } from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Order, OrderItem } from '@/types';

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
      const res = await fetch(`/api/orders/list?userId=${encodeURIComponent(user.id)}`);
      const payload = await res.json();
      // API may return either an envelope { success, data } or the raw array
      const ordersArray = Array.isArray(payload) ? payload : payload?.data ?? [];
      setOrders(ordersArray as Order[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // open confirmation dialog (instead of window.confirm)
  const markSent = (orderId: string) => {
    setConfirmOrderId(orderId);
    setConfirmDialogOpen(true);
  };

  // perform the actual transition after confirmation
  const doMarkSent = async (orderId: string | null) => {
    if (!orderId) return;
    try {
      setActionLoading(orderId);
      
      // Call the transition API to mark as delivered
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

  if (isLoading) return <Loader />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">My Orders</h1>
          <div className="text-sm text-gray-600">Total orders: <span className="font-medium">{orders.length}</span></div>
        </div>

        {loadingOrders ? (
          <Card>
            <CardContent>Loading orders...</CardContent>
          </Card>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="text-center text-gray-600">No orders found — start shopping!</CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead>Order</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {orders.map((order: Order) => (
                    <TableRow key={order._id}>
                      <TableCell className="font-mono text-xs">#{order._id}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {(order.items || []).map((it: OrderItem, idx: number) => (
                            <div key={idx} className="text-sm text-gray-700">
                              <span className="font-medium">{it.name}</span>
                              <span className="ml-2 text-xs text-gray-500">x{it.quantity}</span>
                              <span className="ml-2 text-sm">{formatCurrency((it.price || 0) * (it.quantity || 1))}</span>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(order.total)}</TableCell>
                      <TableCell className="capitalize">{(order.payment?.method === 'cash_on_delivery') ? 'Cash On Delivery' : (order.payment?.method || '—')}</TableCell>
                      <TableCell>
                        {renderStatusBadge(order.status?.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        {order.status?.status === 'shipped' ? (
                          <Button size="sm" disabled={actionLoading === order._id} onClick={() => markSent(order._id)}>
                            {actionLoading === order._id ? 'Updating...' : 'Mark Received'}
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
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm receipt</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-gray-700">Mark this order as received/sent?</div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => doMarkSent(confirmOrderId)} disabled={!!actionLoading}>{actionLoading ? 'Updating...' : 'Confirm'}</Button>
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
