export interface ApiError {
  error: string;
  details?: unknown;
}

// Notification types
export interface Notification {
  _id: string;
  type: 'ORDER_PLACED' | 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED' | 'ORDER_SHIPPED' | 'ORDER_DELIVERED' | 'PRODUCT_ADDED' | 'PRODUCT_UPDATED' | 'PRODUCT_DELETED' | 'STOCK_LOW' | 'BALANCE_UPDATED' | 'PROMO_CODE_USED' | 'REVIEW_ADDED' | 'CART_UPDATED';
  userId?: string;
  sellerId?: string;
  productId?: string;
  orderId?: string;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationsResponse {
  data: Notification[];
  notifications: Notification[];
  total: number;
  limit: number;
  offset: number;
}