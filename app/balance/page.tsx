"use client";

import { useEffect, useState } from 'react';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useAuthStore } from '@/store/authStore';
import { balanceAPI } from '@/utils/api';
import { sumBalanceEvents } from '@/lib/balance';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/navbar';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader } from '@/components/loader';
import { Label } from '@/components/ui/label';

type Event = {
  _id?: string;
  amount: number;
  type: 'deposit' | 'withdrawn' | 'payment' | 'refund';
  reference?: string;
  createdAt?: string;
};

export default function BalancePage() {
  const { isLoading: authLoading, user } = useProtectedRoute(['buyer', 'seller']);
  const { logout } = useAuthStore();

  const [events, setEvents] = useState<Event[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user?.id) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const fetchData = async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const [balRes, evs] = await Promise.all([
        balanceAPI.getBalance(user.id),
        balanceAPI.listEvents(user.id),
      ]);

      setBalance(balRes.balance);
      setEvents(evs as Event[]);
    } catch (err) {
      console.error('Error fetching balance/events', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (type: 'deposit' | 'withdrawn') => {
    setErrors([]);
    if (!user?.id) return;

    const amountRaw = type === 'deposit' ? depositAmount : withdrawAmount;
    const amount = Number(amountRaw);

    const validation: string[] = [];
    if (!amountRaw || Number.isNaN(amount) || amount <= 0) {
      validation.push('Amount must be a positive number');
    }

    if (type === 'withdrawn' && typeof balance === 'number' && amount > balance) {
      validation.push('Insufficient balance for withdrawal');
    }

    if (validation.length > 0) {
      setErrors(validation);
      return;
    }

    try {
      setIsSubmitting(true);
      await balanceAPI.createEvent({ userId: user.id, amount, type });
      setDepositAmount('');
      setWithdrawAmount('');
      await fetchData();
    } catch (err: any) {
      console.error('Error creating event', err);
      setErrors([err?.response?.data?.error || err?.message || 'Failed to create event']);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) return <Loader />;

  const computedBalance = sumBalanceEvents(
    events.map((e) => ({ amount: e.amount, type: e.type }))
  );

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-6">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-bold">Balance Management</h1>
            <div className="text-right">
              <div className="text-sm text-gray-500">Account</div>
              <div className="font-medium">{user?.name || user?.email}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Balance + actions */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">Current Balance</div>
                    <div className="text-4xl font-extrabold mt-2">${typeof balance === 'number' ? balance.toFixed(2) : '0.00'}</div>
                    <div className="text-sm text-gray-400 mt-1">Events: {events.length}</div>
                  </div>
                  <div className="text-green-600 font-medium">{computedBalance >= 0 ? '+' : '-'}${Math.abs(computedBalance).toFixed(2)}</div>
                </div>
              </Card>

              <Card className="p-4">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-3 items-center">
                      <Input value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} type="number" placeholder="Amount" />
                      <Button onClick={() => handleCreate('deposit')} disabled={isSubmitting} className="whitespace-nowrap">
                        {isSubmitting ? 'Processing...' : 'Deposit'}
                      </Button>
                    </div>

                    <div className="flex gap-3 items-center">
                      <Input value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} type="number" placeholder="Amount" />
                      <Button variant="destructive" onClick={() => handleCreate('withdrawn')} disabled={isSubmitting} className="whitespace-nowrap">
                        {isSubmitting ? 'Processing...' : 'Withdraw'}
                      </Button>
                    </div>

                    {errors.length > 0 && (
                      <div className="text-sm text-red-600">
                        {errors.map((err, i) => (
                          <div key={i}>• {err}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Transaction history */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm divide-y">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-left p-3">Type</th>
                          <th className="text-right p-3">Amount</th>
                          <th className="text-left p-3">Reference</th>
                          <th className="text-left p-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {events.map((e) => {
                          const isPositive = e.type === 'deposit' || e.type === 'refund';
                          return (
                            <tr key={e._id} className={isPositive ? 'text-green-700' : 'text-red-600'}>
                              <td className="p-3">{e.type.charAt(0).toUpperCase() + e.type.slice(1)}</td>
                              <td className="p-3 text-right">${e.amount.toFixed(2)}</td>
                              <td className="p-3">{e.reference || '-'}</td>
                              <td className="p-3">{e.createdAt ? new Date(e.createdAt).toLocaleString() : '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="text-sm text-gray-500">Showing latest {events.length} events</div>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>
  </>
  );
}
