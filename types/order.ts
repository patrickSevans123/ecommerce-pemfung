import { Product } from "./product";
import { PromoCode } from "./promo-code";
import { User } from "./user";

export interface OrderItem {
  product: Product;
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
  user?: User;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  discount?: number;
  promoCode?: PromoCode;
  promoCodeApplied?: string;
  total: number;
  status: OrderStatus;
  payment?: { method?: string } | null;
  shippingAddress?: string | null;
  createdAt?: string;
  updatedAt?: string;
}