import { PaymentSuccess } from '@/lib/payment';

export interface CheckoutPayload {
  userId: string;
  paymentMethod: 'balance' | 'cash_on_delivery';
  shippingAddress: string;
  promoCode?: string;
  items?: string[];
  isDirectCheckout?: boolean;
}

export interface CheckoutRequest {
  userId: string;
  paymentMethod: 'balance' | 'cash_on_delivery';
  shippingAddress: string;
}

export interface CheckoutRequestWithItems extends CheckoutRequest {
  promoCode?: string;
  // optional list of selected product IDs to checkout
  items?: string[];
}

export interface CheckoutResponse {
  orders: PaymentSuccess[];
  message: string;
}