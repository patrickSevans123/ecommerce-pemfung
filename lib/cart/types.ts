import { Cart } from '../domain';

export type CartItemInput = {
  productId: string;
  quantity: number;
};

export type CartInput = {
  userId: string;
  items: CartItemInput[];
};

export type CartValidationErrorCode =
  | 'EMPTY_CART'
  | 'INVALID_QUANTITY'
  | 'PRODUCT_NOT_FOUND'
  | 'OUT_OF_STOCK'
  | 'CART_TOO_LARGE';

export type CartValidationError = {
  code: CartValidationErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

export type CartValidationResult = {
  valid: boolean;
  errors: CartValidationError[];
};

export type CartWithProducts = Cart & {
  items: Array<{
    product: string;
    quantity: number;
    addedAt?: Date;
  }>;
};
