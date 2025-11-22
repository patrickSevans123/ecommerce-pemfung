/**
 * Product Validation Helpers
 * Pure functional utilities for product operations
 */

/**
 * Clamp a value between min and max bounds
 * Higher-order function for value constraints
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Function that clamps input value
 */
export const clamp = (min: number, max: number) => (value: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * Validate and constrain product quantity
 * Ensures quantity is between 1 and available stock
 * @param value - Requested quantity
 * @param stock - Available stock
 * @returns Valid quantity within bounds
 */
export const validateQuantity = (value: number, stock: number): number =>
  clamp(1, stock)(value);
