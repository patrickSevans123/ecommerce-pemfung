/**
 * Error Parsing Utilities
 * Functional error handling for API responses
 */

export type ErrorResponse = {
  title: string;
  description: string;
};

export type ValidationError = {
  code: string;
  message?: string;
  details?: {
    items?: Array<{ available: number; requested: number }>;
    totalQuantity?: number;
  };
};

/**
 * Extract validation errors from API error response
 * @param error - Unknown error object from catch block
 * @returns Array of validation errors or null
 */
export const extractValidationErrors = (error: unknown): ValidationError[] | null => {
  const errorObj = error as { response?: { data?: { details?: unknown } } };
  const details = errorObj?.response?.data?.details;
  return Array.isArray(details) ? details : null;
};

/**
 * Format stock availability error message
 * @param error - Validation error with stock details
 * @returns Formatted error response
 */
export const formatStockError = (error: ValidationError): ErrorResponse => {
  const item = error.details?.items?.[0];
  return {
    title: 'Insufficient stock',
    description: item
      ? `Only ${item.available} item(s) available, but you requested ${item.requested}`
      : 'The requested quantity exceeds available stock',
  };
};

/**
 * Format cart size limit error message
 * @param error - Validation error with cart size details
 * @returns Formatted error response
 */
export const formatCartSizeError = (error: ValidationError): ErrorResponse => ({
  title: 'Cart is full',
  description: error.details?.totalQuantity
    ? `Cart cannot exceed ${error.details.totalQuantity} items`
    : 'Your cart has reached the maximum limit',
});

/**
 * Map of error codes to formatting functions
 */
export const errorMessageMap: Record<string, (error: ValidationError) => ErrorResponse> = {
  'OUT_OF_STOCK': formatStockError,
  'PRODUCT_NOT_FOUND': () => ({
    title: 'Product not found',
    description: 'This product is no longer available',
  }),
  'CART_TOO_LARGE': formatCartSizeError,
  'INVALID_QUANTITY': () => ({
    title: 'Invalid quantity',
    description: 'Please enter a valid quantity',
  }),
};

/**
 * Map validation error code to user-friendly message
 * @param error - Validation error object
 * @returns Formatted error response
 */
export const mapErrorCodeToMessage = (error: ValidationError): ErrorResponse => {
  const mapper = errorMessageMap[error.code];
  return mapper
    ? mapper(error)
    : { title: 'Error', description: error.message || 'Please try again later' };
};

/**
 * Parse API validation error into user-friendly format
 * Main entry point for error parsing
 * @param error - Unknown error from API call
 * @returns Formatted error with title and description
 */
export const parseValidationError = (error: unknown): ErrorResponse => {
  const errors = extractValidationErrors(error);
  return errors && errors.length > 0
    ? mapErrorCodeToMessage(errors[0])
    : { title: 'Failed to add to cart', description: 'Please try again later' };
};
