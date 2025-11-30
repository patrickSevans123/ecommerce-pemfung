import { CheckoutRequestWithItems, CheckoutResponse } from '@/types';
import { fetchAPI } from './fetcher';

export const checkoutAPI = {
  createCheckout: (payload: CheckoutRequestWithItems): Promise<CheckoutResponse> =>
    fetchAPI<CheckoutResponse>('/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
