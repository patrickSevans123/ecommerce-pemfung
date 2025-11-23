import { fetchAPI } from './fetcher';

export interface PaymentProcessRequest {
  orderId: string;
  promoCode?: string;
}

export interface PaymentProcessResponse {
  success: boolean;
  orderId?: string;
  message?: string;
}

export const paymentAPI = {
  processPayment: (payload: PaymentProcessRequest): Promise<PaymentProcessResponse> =>
    fetchAPI<PaymentProcessResponse>('/payment/process', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
