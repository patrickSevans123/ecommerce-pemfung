// Domain types and ADTs for the ecommerce app

// ID aliases
export type ProductId = string;
export type UserId = string;
export type OrderId = string;
export type ReviewId = string;
export type PromoCodeId = string;
export type CartId = string;
export type BalanceEventId = string;

export type RatingValue = 1 | 2 | 3 | 4 | 5;
export type RatingDistribution = Record<RatingValue, number>;

export interface RatingStats {
  count: number;
  sum: number;
  average: number;
  distribution: RatingDistribution;
}

// Discriminated unions (ADTs)
export type OrderStatus =
  | { status: 'pending' }
  | { status: 'confirmed' }
  | { status: 'paid'; paidAt?: string }
  | { status: 'shipped'; shippedAt?: string; tracking?: string }
  | { status: 'delivered'; deliveredAt?: string }
  | { status: 'cancelled'; reason?: string };

export type PaymentMethod =
  | { method: 'card'; cardLast4?: string; provider?: string }
  | { method: 'bank_transfer'; reference?: string }
  | { method: 'balance'; userId: UserId }
  | { method: 'cash_on_delivery' };

export type BalanceEventType =
  | { type: 'deposit' }
  | { type: 'withdrawn' }
  | { type: 'payment' };

// Domain entities
export interface User {
  id: UserId;
  email: string;
  name?: string;
  role: 'seller' | 'buyer';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Product {
  id: ProductId;
  title: string;
  description?: string;
  price: number;
  category?: string;
  images?: string[];
  stock?: number;
  seller: UserId;
  tags?: string[];
  avgRating?: number;
  reviewsCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Review {
  id: ReviewId;
  product: ProductId;
  user?: UserId;
  rating: RatingValue;
  title?: string;
  comment?: string;
  createdAt?: Date;
}

export interface OrderItem {
  product: ProductId;
  seller: UserId;
  name?: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: OrderId;
  user?: UserId;
  items: OrderItem[];
  subtotal: number;
  shipping?: number;
  discount?: number;
  promoCode?: PromoCodeId;
  promoCodeApplied?: string;
  total: number;
  status: OrderStatus;
  payment?: PaymentMethod;
  shippingAddress?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BalanceEvent {
  id: BalanceEventId;
  user: UserId;
  amount: number;
  type: BalanceEventType;
  reference?: string;
  createdAt?: Date;
}

export interface PromoCode {
  id: PromoCodeId;
  code: string;
  description?: string;
  discountPercent?: number; // 0-100
  discountAmount?: number; // fixed amount
  expiresAt?: Date;
  usageLimit?: number;
  usedCount?: number;
  active?: boolean;
  appliesTo?: string[];
  createdAt?: Date;
}

export interface CartItem {
  product: ProductId;
  quantity: number;
  addedAt?: Date;
}

export interface Cart {
  id: CartId;
  user: UserId;
  items: CartItem[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Generic Result type for error handling
export interface DomainError {
  code: string; // machine-readable
  message: string; // human-friendly
  data?: unknown;
}

export type ResultOk<T> = { ok: true; value: T };
export type ResultErr<E = DomainError> = { ok: false; error: E };
export type Result<T, E = DomainError> = ResultOk<T> | ResultErr<E>;

// helper constructors
export const ok = <T>(value: T): ResultOk<T> => ({ ok: true, value });
export const err = <E = DomainError>(error: E): ResultErr<E> => ({ ok: false, error });
