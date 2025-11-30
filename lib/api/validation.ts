/**
 * API Validation Module
 * 
 * Provides functional validation utilities for API request handling.
 * Composable validation functions following functional programming principles.
 */

import { NextResponse } from 'next/server';
import { ZodType } from 'zod';
import { validationError, invalidJsonError, handleZodError } from './errors';

/**
 * Validation result discriminated union
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; response: NextResponse };

/**
 * Parse JSON body from request
 * Safe wrapper around request.json() that handles errors
 * 
 * @param request - Next.js Request object
 * @returns Parsed JSON or null if parsing fails
 */
export const parseJsonBody = async (request: Request): Promise<unknown | null> =>
  request.json().catch((err) => {
    // Log parsing errors to aid debugging invalid JSON requests
    console.error('parseJsonBody: failed to parse JSON body', err);
    return null;
  });

/**
 * Validate JSON body with Zod schema
 * Pure function that validates data against schema
 * 
 * @param schema - Zod schema for validation
 * @param body - Data to validate
 * @returns ValidationResult with data or error response
 */
export const validateSchema = <T>(
  schema: ZodType<T>,
  body: unknown
): ValidationResult<T> => {
  if (body === null || body === undefined) {
    return {
      success: false,
      response: invalidJsonError(),
    };
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    // Log Zod validation details for debugging (will still return sanitized response)
    try {
      console.error('validateSchema: Zod validation failed', parsed.error.format());
    } catch (formatErr) {
      console.error('validateSchema: Zod validation failed (could not format)', parsed.error, formatErr);
    }

    return {
      success: false,
      response: handleZodError(parsed.error),
    };
  }

  return {
    success: true,
    data: parsed.data,
  };
};

/**
 * Validate request body (parse + validate)
 * Combines JSON parsing and schema validation
 * 
 * @param request - Next.js Request object
 * @param schema - Zod schema for validation
 * @returns ValidationResult with validated data or error response
 */
export const validateRequestBody = async <T>(
  request: Request,
  schema: ZodType<T>
): Promise<ValidationResult<T>> => {
  const body = await parseJsonBody(request);
  return validateSchema(schema, body);
};

/**
 * Execute validation and handle result
 * Helper for early return pattern in API routes
 * 
 * @param validation - ValidationResult from validation
 * @param onSuccess - Callback to execute on success
 * @returns NextResponse from success callback or error response
 * 
 * @example
 * export async function POST(request: Request) {
 *   return handleValidation(
 *     await validateRequestBody(request, createUserSchema),
 *     async (data) => {
 *       const user = await createUser(data);
 *       return createdResponse(user);
 *     }
 *   );
 * }
 */
export const handleValidation = async <T>(
  validation: ValidationResult<T>,
  onSuccess: (data: T) => Promise<NextResponse> | NextResponse
): Promise<NextResponse> => {
  if (!validation.success) {
    return validation.response;
  }

  return await onSuccess(validation.data);
};

/**
 * Validate multiple conditions
 * Combines multiple validation predicates with AND logic
 * 
 * @param predicates - Array of validation functions
 * @returns Combined validation function
 */
export const validateAll = <T>(
  ...predicates: Array<(data: T) => boolean>
): ((data: T) => boolean) =>
  (data: T) => predicates.every((predicate) => predicate(data));

/**
 * Validate at least one condition
 * Combines multiple validation predicates with OR logic
 * 
 * @param predicates - Array of validation functions
 * @returns Combined validation function
 */
export const validateAny = <T>(
  ...predicates: Array<(data: T) => boolean>
): ((data: T) => boolean) =>
  (data: T) => predicates.some((predicate) => predicate(data));

/**
 * Create a validation predicate from a condition
 * Utility for creating reusable validation functions
 * 
 * @param condition - Validation condition
 * @param errorMessage - Error message if validation fails
 * @returns Validation function that returns ValidationResult
 */
export const createValidator = <T>(
  condition: (data: T) => boolean,
  errorMessage: string
) =>
  (data: T): ValidationResult<T> =>
    condition(data)
      ? { success: true, data }
      : { success: false, response: validationError(errorMessage) };
