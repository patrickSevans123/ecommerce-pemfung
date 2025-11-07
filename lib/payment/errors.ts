// Centralized error codes for payment operations

export const PaymentErrorCodes = {
  // Cart errors
  CART_NOT_FOUND: 'CART_NOT_FOUND',
  CART_EMPTY: 'CART_EMPTY',
  CART_VALIDATION_FAILED: 'CART_VALIDATION_FAILED',

  // Product errors
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',

  // Promo code errors
  PROMO_CODE_INVALID: 'PROMO_CODE_INVALID',
  PROMO_CODE_INACTIVE: 'PROMO_CODE_INACTIVE',
  PROMO_CODE_EXPIRED: 'PROMO_CODE_EXPIRED',
  PROMO_CODE_LIMIT_REACHED: 'PROMO_CODE_LIMIT_REACHED',

  // Payment errors
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  PAYMENT_PROCESSING_FAILED: 'PAYMENT_PROCESSING_FAILED',

  // Order errors
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_CREATION_FAILED: 'ORDER_CREATION_FAILED',
  ORDER_SAVE_FAILED: 'ORDER_SAVE_FAILED',
  INVALID_ORDER_STATUS: 'INVALID_ORDER_STATUS',

  // Transaction errors
  SESSION_ERROR: 'SESSION_ERROR',
  TRANSACTION_ERROR: 'TRANSACTION_ERROR',
  COMMIT_ERROR: 'COMMIT_ERROR',
  ROLLBACK_ERROR: 'ROLLBACK_ERROR',
} as const;

export type PaymentErrorCode = typeof PaymentErrorCodes[keyof typeof PaymentErrorCodes];

export interface PaymentError {
  code: PaymentErrorCode;
  message: string;
  details?: unknown;
}

// Factory functions for common errors
export const createPaymentError = (
  code: PaymentErrorCode,
  message: string,
  details?: unknown
): PaymentError => ({
  code,
  message,
  details,
});

export const cartNotFoundError = (): PaymentError =>
  createPaymentError(PaymentErrorCodes.CART_NOT_FOUND, 'Cart not found');

export const cartEmptyError = (): PaymentError =>
  createPaymentError(PaymentErrorCodes.CART_EMPTY, 'Cart is empty');

export const insufficientStockError = (product: string, available: number, requested: number): PaymentError =>
  createPaymentError(
    PaymentErrorCodes.INSUFFICIENT_STOCK,
    `Insufficient stock for product ${product}`,
    { product, available, requested }
  );

export const insufficientBalanceError = (balance: number, required: number): PaymentError =>
  createPaymentError(
    PaymentErrorCodes.INSUFFICIENT_BALANCE,
    'Insufficient balance',
    { balance, required }
  );

export const orderNotFoundError = (): PaymentError =>
  createPaymentError(PaymentErrorCodes.ORDER_NOT_FOUND, 'Order not found');

export const invalidOrderStatusError = (status: string): PaymentError =>
  createPaymentError(
    PaymentErrorCodes.INVALID_ORDER_STATUS,
    `Cannot process payment for order with status: ${status}`
  );
