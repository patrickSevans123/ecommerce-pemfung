/**
 * Cart Helper Functions
 * Pure functional utilities for cart operations
 */

import { Product } from '@/types';

export interface CartItemWithProduct {
  productId: string;
  quantity: number;
  product?: Product;
  selected: boolean;
}

/**
 * Extract product ID from cart item
 * Handles various field names and types (string, ObjectId)
 * @param item - Cart item with possible product field variations
 * @returns Product ID as string or null if not found
 */
export const extractProductId = (item: { product?: string | { toString(): string }; productId?: string | { toString(): string } }): string | null => {
  const product = item.product;
  const productId = item.productId;

  if (product) {
    return typeof product === 'string' ? product : product.toString();
  }

  if (productId) {
    return typeof productId === 'string' ? productId : productId.toString();
  }

  return null;
};

/**
 * Create a cart item with product data
 * @param productId - Product identifier
 * @param quantity - Item quantity
 * @param product - Optional product details
 * @returns Formatted cart item with product
 */
export const createCartItemWithProduct = (
  productId: string,
  quantity: number,
  product?: Product
): CartItemWithProduct => ({
  productId,
  quantity,
  product,
  selected: false,
});

/**
 * Aggregate validation errors into a record
 * @param errors - Array of validation errors
 * @returns Record mapping product IDs to error messages
 */
export const aggregateValidationErrors = (
  errors: Array<{ productId: string; message: string }>
): Record<string, string> =>
  errors.reduce(
    (acc, error) => ({ ...acc, [error.productId]: error.message }),
    {} as Record<string, string>
  );

/**
 * Calculate subtotal for selected cart items
 * Pure function that calculates total price
 * @param items - Array of cart items with products
 * @param selectedIds - Set of selected product IDs
 * @returns Total price of selected items
 */
export const calculateSubtotal = (
  items: CartItemWithProduct[],
  selectedIds: Set<string>
): number =>
  items.reduce((total, item) => {
    if (selectedIds.has(item.productId) && item.product?.price) {
      return total + item.product.price * item.quantity;
    }
    return total;
  }, 0);

/**
 * Sum quantities of all items
 * @param items - Array of cart items
 * @returns Total quantity across all items
 */
export const sumQuantities = (items: CartItemWithProduct[]): number =>
  items.reduce((sum, item) => sum + item.quantity, 0);

/**
 * Sum quantities of selected items only
 * @param items - Array of cart items
 * @param selectedIds - Set of selected product IDs
 * @returns Total quantity of selected items
 */
export const sumSelectedQuantities = (
  items: CartItemWithProduct[],
  selectedIds: Set<string>
): number =>
  items
    .filter(item => selectedIds.has(item.productId))
    .reduce((sum, item) => sum + item.quantity, 0);
