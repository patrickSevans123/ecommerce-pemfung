// Distinct types for each stage of the payment pipeline
import { UserId, PaymentMethod, OrderId } from '@/lib/domain/types';
import { CartDocument } from '@/lib/db/models/cart';
import { ProductDocument } from '@/lib/db/models/product';
import { PromoCodeDocument } from '@/lib/db/models/promoCode';
import { OrderDocument } from '@/lib/db/models/order';

// Stage 1: After cart validation
export interface ValidatedCartContext {
  userId: UserId;
  cart: CartDocument;
  products: Map<string, ProductDocument>;
  paymentMethod: PaymentMethod;
  shippingAddress: string;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
}

// Stage 2: After promo code application (optional)
export interface PromoAppliedContext extends ValidatedCartContext {
  promoCode?: PromoCodeDocument;
}

// Stage 3: After payment processing (for checkout pipeline)
export type PaymentProcessedContext = PromoAppliedContext;

// Context for payment pipeline (when order already exists)
export interface OrderPaymentContext {
  orderId: OrderId;
  order: OrderDocument;
  userId: UserId;
  paymentMethod: PaymentMethod;
  shippingAddress: string;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  promoCode?: PromoCodeDocument;
}

// Payment Success Result
export interface PaymentSuccess {
  orderId: OrderId;
  order: OrderDocument;
  message: string;
}
