import { Cart, CartItem, CartValidationResult } from '@/types';
import { fetchAPI } from './fetcher';

export const cartAPI = {
  getCart: (userId: string): Promise<{ cart: Cart }> => {
    return fetchAPI<{ cart: Cart }>(`/cart/${userId}`);
  },

  addToCart: (
    userId: string,
    productId: string,
    quantity: number
  ): Promise<Cart> => {
    return fetchAPI<Cart>('/cart/add', {
      method: 'POST',
      body: JSON.stringify({ userId, productId, quantity }),
    });
  },

  updateQuantity: (
    userId: string,
    productId: string,
    quantity: number
  ): Promise<Cart> => {
    return fetchAPI<Cart>('/cart/update', {
      method: 'PATCH',
      body: JSON.stringify({ userId, productId, quantity }),
    });
  },

  removeItem: (userId: string, productId: string): Promise<Cart> => {
    return fetchAPI<Cart>('/cart/remove', {
      method: 'POST',
      body: JSON.stringify({ userId, productId }),
    });
  },

  validateCart: (
    userId: string,
    items: CartItem[]
  ): Promise<CartValidationResult> => {
    return fetchAPI<CartValidationResult>('/cart/validate', {
      method: 'POST',
      body: JSON.stringify({ userId, items }),
    });
  },
};
