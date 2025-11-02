import Product from '../db/models/product';
import { CartInput, CartItemInput, CartValidationError } from './types';
import { Validation, success, failure, map, sequence } from '../fp/validation';

export type CartValidationContext = {
  productsMap: Map<string, ProductRecord>;
  totalQuantity: number;
};

const MAX_CART_ITEMS = 50;

const successCart = (cart: CartInput): Validation<CartValidationError, CartInput> => success(cart);
const failureCart = (error: CartValidationError): Validation<CartValidationError, CartInput> => failure(error);

type ProductRecord = { _id: string; stock?: number } & Record<string, unknown>;

const buildProductsMap = async (items: CartItemInput[]): Promise<Map<string, ProductRecord>> => {
  const ids = [...new Set(items.map((item) => item.productId))];
  if (ids.length === 0) return new Map();
  const docs = await Product.find({ _id: { $in: ids } }).lean<ProductRecord[]>();
  return new Map(
    docs
      .filter((doc): doc is ProductRecord => typeof doc?._id?.toString === 'function')
      .map((doc) => [doc._id.toString(), doc])
  );
};

export const validateCartNotEmpty = (cart: CartInput) =>
  cart.items.length > 0
    ? successCart(cart)
    : failureCart({ code: 'EMPTY_CART', message: 'Cart must contain at least one item.' });

export const validateQuantities = (cart: CartInput) => {
  const invalid = cart.items.filter((item) => item.quantity <= 0);
  if (invalid.length === 0) return successCart(cart);
  return failureCart({
    code: 'INVALID_QUANTITY',
    message: 'All items must have a positive quantity.',
    details: { items: invalid.map((item) => ({ productId: item.productId, quantity: item.quantity })) },
  });
};

export const validateCartSize = (cart: CartInput, context: CartValidationContext) => {
  if (context.totalQuantity <= MAX_CART_ITEMS) return successCart(cart);
  return failureCart({
    code: 'CART_TOO_LARGE',
    message: `Cart cannot exceed ${MAX_CART_ITEMS} total items.`,
    details: { totalQuantity: context.totalQuantity },
  });
};

export const validateProductsExist = (cart: CartInput, context: CartValidationContext) => {
  const missing = cart.items.filter((item) => !context.productsMap.has(item.productId));
  if (missing.length === 0) return successCart(cart);
  return failureCart({
    code: 'PRODUCT_NOT_FOUND',
    message: 'Some products were not found.',
    details: { missingProductIds: missing.map((item) => item.productId) },
  });
};

export const validateStockAvailability = (cart: CartInput, context: CartValidationContext) => {
  const insufficient = cart.items
    .map((item) => {
      const product = context.productsMap.get(item.productId);
      if (!product) return null;
      const available = typeof product.stock === 'number' ? product.stock : 0;
      return item.quantity > available ? { productId: item.productId, requested: item.quantity, available } : null;
    })
    .filter(Boolean);

  if (insufficient.length === 0) return successCart(cart);
  return failureCart({
    code: 'OUT_OF_STOCK',
    message: 'Some items exceed available stock.',
    details: { items: insufficient },
  });
};

export type ValidateCartOptions = {
  allowEmpty?: boolean;
};

export const validateCart = async (
  cart: CartInput,
  options: ValidateCartOptions = {}
): Promise<Validation<CartValidationError, CartInput>> => {
  const totalQuantity = cart.items.reduce((sum, item) => sum + Math.max(0, item.quantity), 0);
  const productsMap = await buildProductsMap(cart.items);
  const context: CartValidationContext = { productsMap, totalQuantity };

  const validations: Validation<CartValidationError, CartInput>[] = [
    validateQuantities(cart),
    validateCartSize(cart, context),
    validateProductsExist(cart, context),
    validateStockAvailability(cart, context),
  ];

  if (!options.allowEmpty) {
    validations.unshift(validateCartNotEmpty(cart));
  }

  return map(sequence(validations), () => cart);
};
