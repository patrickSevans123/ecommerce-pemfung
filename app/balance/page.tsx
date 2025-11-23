"use client";

import { useEffect, useState } from 'react';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useAuthStore } from '@/store/authStore';
import { balanceAPI } from '@/utils/api/balance';
import { sumBalanceEvents } from '@/lib/balance';
import { Button } from '@/components/ui/button';
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
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Balance Management</h1>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600">{user?.name || user?.email}</div>
          <Button variant="outline" onClick={() => { logout(); window.location.href = '/'; }}>
            Logout
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              ${typeof balance === 'number' ? balance.toFixed(2) : '0.00'}
            </div>
            <p className="text-sm text-gray-500 mt-2">Events: {events.length}</p>
            <div className="mt-4 text-sm text-gray-700">
              <div className="font-medium">Pure calculation (fold):</div>
              <div className="mt-2">
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  {events.slice(0, 10).map((e, idx) => {
                    const signed = (e.type === 'deposit' || e.type === 'refund') ? e.amount : -e.amount;
                    return (
                      <li key={e._id || idx}>
                        {e.type} {e.amount}{' -> '}{signed >= 0 ? '+' : ''}{signed}
                      </li>
                    );
                  })}
                </ol>
                <div className="mt-2">Computed total: <strong>${computedBalance.toFixed(2)}</strong></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deposit</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <div className="w-40">
                <Label>Amount</Label>
                <Input value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} type="number" />
              </div>
              <div>
                <Button onClick={() => handleCreate('deposit')} disabled={isSubmitting}>
                  {isSubmitting ? 'Processing...' : 'Deposit'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Withdraw</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <div className="w-40">
                <Label>Amount</Label>
                <Input value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} type="number" />
              </div>
              <div>
                <Button variant="destructive" onClick={() => handleCreate('withdrawn')} disabled={isSubmitting}>
                  {isSubmitting ? 'Processing...' : 'Withdraw'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {errors.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent>
                <ul className="text-sm text-red-600 list-disc list-inside">
                  {errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left p-2">Type</th>
                      <th className="text-right p-2">Amount</th>
                      <th className="text-left p-2">Reference / Order</th>
                      <th className="text-left p-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e) => {
                      const isPositive = e.type === 'deposit' || e.type === 'refund';
                      return (
                        <tr key={e._id} className={isPositive ? 'text-green-700' : 'text-red-600'}>
                          <td className="p-2">{e.type}</td>
                          <td className="p-2 text-right">${e.amount.toFixed(2)}</td>
                          <td className="p-2">{e.reference || '-'}</td>
                          <td className="p-2">{e.createdAt ? new Date(e.createdAt).toLocaleString() : '-'}</td>
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
  );
}
