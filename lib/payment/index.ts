// Export payment-related services and types
export {
  checkoutPipeline,
  paymentPipeline,
  validateCart,
  applyPromoCode,
  processPayment,
  createOrder,
  FIXED_SHIPPING_COST
} from './service';

export type {
  PaymentContext,
  PaymentSuccess,
  PaymentError
} from './service';

// Export new types
export type {
  ValidatedCartContext,
  PromoAppliedContext,
  OrderPaymentContext,
} from './types';

// Export error codes and factories
export {
  PaymentErrorCodes,
  createPaymentError,
  cartNotFoundError,
  cartEmptyError,
  insufficientStockError,
  insufficientBalanceError,
  orderNotFoundError,
  invalidOrderStatusError,
} from './errors';

