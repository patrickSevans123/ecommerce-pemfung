import { OrderDocument } from '@/lib/db/models/order';
import { fetchAPI } from './fetcher';

export interface CheckoutRequest {
  userId: string;
  paymentMethod: 'balance' | 'cash_on_delivery';
  shippingAddress: string;
}

export interface CheckoutResponse {
  orderId: string;
  order: OrderDocument;
  message: string;
}

export const checkoutAPI = {
  createCheckout: (payload: CheckoutRequest): Promise<CheckoutResponse> =>
    fetchAPI<CheckoutResponse>('/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
