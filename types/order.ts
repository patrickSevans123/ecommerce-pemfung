export interface OrderItem {
  product: string | { _id?: string; title?: string; price?: number };
  seller: string;
  name?: string;
  price: number;
  quantity: number;
}

export interface OrderStatus {
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  paidAt?: string;
  shippedAt?: string;
  tracking?: string;
  deliveredAt?: string;
  reason?: string;
}

export interface Order {
  _id: string;
  user?: string | { _id?: string; email?: string; name?: string };
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  discount?: number;
  promoCode?: string | { code?: string; description?: string };
  promoCodeApplied?: string;
  total: number;
  status: OrderStatus;
  payment?: { method?: string } | null;
  shippingAddress?: string | null;
  createdAt?: string;
  updatedAt?: string;
}