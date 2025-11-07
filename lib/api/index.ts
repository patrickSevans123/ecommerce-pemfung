/**
 * API Utilities Module
 * 
 * Centralized exports for all API-related utilities
 */

// Error handling
export {
  HttpStatus,
  createErrorResponse,
  badRequestError,
  notFoundError,
  conflictError,
  validationError,
  unauthorizedError,
  forbiddenError,
  internalServerError,
  handleZodError,
  invalidJsonError,
  successResponse,
  createdResponse,
  noContentResponse,
  ok,
  err,
  mapResult,
  chainResult,
  resultToResponse,
  type HttpStatusCode,
  type ApiError,
  type Result,
} from './errors';

// Validation
export {
  parseJsonBody,
  validateSchema,
  validateRequestBody,
  handleValidation,
  validateAll,
  validateAny,
  createValidator,
  type ValidationResult,
} from './validation';
