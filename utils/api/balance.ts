import { fetchAPI } from './fetcher';

export interface BalanceResponse {
  userId: string;
  balance: number;
  eventCount: number;
}

export interface BalanceEventRecord {
  _id?: string;
  amount: number;
  type: 'deposit' | 'withdrawn' | 'payment' | 'refund' | 'income';
  reference?: string;
  createdAt?: string;
}

export const balanceAPI = {
  getBalance: (userId: string): Promise<BalanceResponse> =>
    fetchAPI<BalanceResponse>(`/users/${userId}/balance`),

  listEvents: (userId: string): Promise<BalanceEventRecord[]> =>
    fetchAPI<BalanceEventRecord[]>(`/balance-events?userId=${encodeURIComponent(userId)}`),

  createEvent: (payload: { userId: string; amount: number; type: 'deposit' | 'withdrawn' | 'payment' | 'refund' | 'income'; reference?: string }) =>
    fetchAPI('/balance-events', { method: 'POST', body: JSON.stringify(payload) }),
};
