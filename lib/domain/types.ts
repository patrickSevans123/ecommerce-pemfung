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
  | { status: 'paid'; paidAt?: string }
  | { status: 'shipped'; shippedAt?: string; tracking?: string }
  | { status: 'delivered'; deliveredAt?: string }
  | { status: 'cancelled'; reason?: string }
  | { status: 'refunded'; refundedAt?: string; reason?: string };

export type OrderEvent =
  | { type: 'ConfirmPayment' }
  | { type: 'Ship'; trackingNumber: string }
  | { type: 'Deliver' }
  | { type: 'Cancel'; reason: string }
  | { type: 'Refund'; reason: string }

// Event data interfaces for explicit typing
// Note: Canonical definitions are in lib/db/models/notification.ts
// These are re-exported here for domain layer consistency

export interface OrderPlacedData {
  productName: string;
  quantity: number;
  totalAmount: number;
}

export interface PaymentSuccessData {
  orderId: string;
  amount: number;
  productName?: string;
  quantity?: number;
}

export interface OrderShippedData {
  orderId: string;
  trackingNumber: string;
}

export interface CartUpdatedData {
  productName: string;
  action: 'added' | 'removed' | 'updated';
}

export interface PaymentFailedData {
  orderId: string;
  amount: number;
  reason?: string;
}

export interface OrderDeliveredData {
  orderId: string;
  deliveredAt?: string;
}

export interface BalanceUpdatedData {
  reason?: string;
  amount?: number;
}

// SystemEvent discriminated union for notifications
export type SystemEvent =
  | { type: 'ORDER_PLACED'; userId: UserId; orderId: OrderId; total: number; sellerId: UserId; data?: OrderPlacedData }
  | { type: 'PAYMENT_SUCCESS'; userId: UserId; orderId: OrderId; amount: number; sellerId: UserId; data?: PaymentSuccessData }
  | { type: 'PAYMENT_FAILED'; userId: UserId; orderId: OrderId; amount: number; sellerId: UserId; data?: PaymentFailedData }
  | { type: 'ORDER_SHIPPED'; userId: UserId; orderId: OrderId; trackingNumber?: string; sellerId: UserId; data?: OrderShippedData }
  | { type: 'ORDER_DELIVERED'; userId: UserId; orderId: OrderId; sellerId: UserId; data?: OrderDeliveredData }
  | { type: 'BALANCE_UPDATED'; userId: UserId; changeType: 'credit' | 'debit'; amount: number; data?: BalanceUpdatedData };

export type PaymentMethod =
  | { method: 'balance'; userId: UserId }
  | { method: 'cash_on_delivery' };

export type BalanceEventType =
  | { type: 'deposit' }
  | { type: 'withdrawn' }
  | { type: 'payment' }
  | { type: 'refund' }
  | { type: 'income' };

// New event type: income - used to represent seller income from sales


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
