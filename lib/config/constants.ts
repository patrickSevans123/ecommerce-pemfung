// Centralized constants for the application

export const PAYMENT_CONSTANTS = {
  FIXED_SHIPPING_COST: 5,
  MAX_CART_VALUE: 100000,
} as const;

export const VALIDATION_CONSTANTS = {
  MIN_SHIPPING_ADDRESS_LENGTH: 10,
  MAX_PRODUCT_QUANTITY: 100,
  MIN_PRODUCT_QUANTITY: 1,
} as const;
