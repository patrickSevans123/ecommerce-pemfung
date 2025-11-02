import { Cart, CartItem, Product } from '../domain';

export type DiscountStrategy = (context: PromoCalculationContext) => number;

export type DiscountDefinition =
  | { kind: 'percentage'; percent: number }
  | { kind: 'fixed'; amount: number }
  | { kind: 'free_shipping' }
  | { kind: 'buy_x_get_y'; buyQuantity: number; getQuantity: number; productId?: string };

export type ConditionDefinition =
  | { kind: 'min_purchase_amount'; amount: number }
  | { kind: 'category_includes'; categories: string[] }
  | { kind: 'product_includes'; productIds: string[] };

export type PromoCodeDefinition = {
  id: string;
  code: string;
  description?: string;
  discount: DiscountDefinition;
  conditions: ConditionDefinition[];
  expiresAt?: Date | null;
  usageLimit?: number;
  usedCount?: number;
  active?: boolean;
  freeShippingAmount?: number;
};

export type EnrichedCartItem = CartItem & {
  productData?: Product | null;
  price: number;
  category?: string;
};

export type PromoCart = Cart & {
  items: EnrichedCartItem[];
  subtotal: number;
  shipping?: number;
};

export type PromoCalculationContext = {
  code: PromoCodeDefinition;
  cart: PromoCart;
  items: EnrichedCartItem[];
  subtotal: number;
  shipping: number;
};

export type PromoCondition = (ctx: PromoCalculationContext) => PromoConditionResult;

export type PromoConditionResult = { valid: true } | { valid: false; error: PromoConditionError };

export type PromoConditionError = {
  code: 'PROMO_CONDITION_FAILED';
  message: string;
};

export type PromoValidationErrorCode =
  | 'PROMO_NOT_FOUND'
  | 'PROMO_INACTIVE'
  | 'PROMO_EXPIRED'
  | 'PROMO_USAGE_LIMIT'
  | 'PROMO_CONDITION_FAILED'
  | 'PROMO_INVALID_CART'
  | 'PROMO_NO_DISCOUNT';

export type PromoError = {
  code: PromoValidationErrorCode;
  message: string;
};

export type PromoApplySuccess = {
  code: string;
  discount: number;
  subtotal: number;
  total: number;
};
