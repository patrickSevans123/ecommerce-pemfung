/**
 * API Error Handling Module
 * 
 * Provides functional, composable error handling utilities for Next.js API routes.
 * Uses discriminated unions and pure functions for type-safe error handling.
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Standard HTTP status codes
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export type HttpStatusCode = typeof HttpStatus[keyof typeof HttpStatus];

/**
 * API Error structure
 */
export interface ApiError {
  error: string;
  details?: unknown;
  code?: string;
}

/**
 * Create a standardized error response
 * Pure function that creates NextResponse with error payload
 * 
 * @param message - Error message
 * @param status - HTTP status code
 * @param details - Optional additional error details
 * @returns NextResponse with error payload
 */
export const createErrorResponse = (
  message: string,
  status: HttpStatusCode,
  details?: unknown
): NextResponse<ApiError> => {
  const payload: ApiError = { error: message };

  if (details !== undefined) {
    payload.details = details;
  }

  return NextResponse.json(payload, { status });
};

/**
 * Common error response factories
 * These are pre-configured error responses for common scenarios
 */

export const badRequestError = (message = 'Bad request', details?: unknown) =>
  createErrorResponse(message, HttpStatus.BAD_REQUEST, details);

export const notFoundError = (resource = 'Resource', id?: string) =>
  createErrorResponse(
    id ? `${resource} with id '${id}' not found` : `${resource} not found`,
    HttpStatus.NOT_FOUND
  );

export const conflictError = (message: string, details?: unknown) =>
  createErrorResponse(message, HttpStatus.CONFLICT, details);

export const validationError = (message = 'Validation failed', details?: unknown) =>
  createErrorResponse(message, HttpStatus.BAD_REQUEST, details);

export const unauthorizedError = (message = 'Unauthorized') =>
  createErrorResponse(message, HttpStatus.UNAUTHORIZED);

export const forbiddenError = (message = 'Forbidden') =>
  createErrorResponse(message, HttpStatus.FORBIDDEN);

export const internalServerError = (message = 'Internal server error') =>
  createErrorResponse(message, HttpStatus.INTERNAL_SERVER_ERROR);

/**
 * Handle Zod validation errors
 * Transforms ZodError into a user-friendly format
 * 
 * @param error - ZodError from safeParse
 * @returns NextResponse with formatted validation errors
 */
export const handleZodError = (error: ZodError) =>
  validationError('Validation failed', error.format());

/**
 * Invalid JSON error
 * Common error when request body parsing fails
 */
export const invalidJsonError = () =>
  badRequestError('Invalid JSON in request body');

/**
 * Success response factories
 */

export const successResponse = <T>(data: T, status: HttpStatusCode = HttpStatus.OK) =>
  NextResponse.json(data, { status });

export const createdResponse = <T>(data: T) =>
  successResponse(data, HttpStatus.CREATED);

export const noContentResponse = () =>
  new NextResponse(null, { status: HttpStatus.NO_CONTENT });

/**
 * Result type for operations that can fail
 */
export type Result<T, E = ApiError> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Create a success result
 */
export const ok = <T>(data: T): Result<T> => ({
  success: true,
  data,
});

/**
 * Create a failure result
 */
export const err = <E = ApiError>(error: E): Result<never, E> => ({
  success: false,
  error,
});

/**
 * Map over a Result's success value
 */
export const mapResult = <T, U, E = ApiError>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> =>
  result.success ? { success: true, data: fn(result.data) } : result;

/**
 * Chain Result operations (flatMap/bind)
 */
export const chainResult = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> =>
  result.success ? fn(result.data) : result;

/**
 * Convert Result to NextResponse
 */
export const resultToResponse = <T>(
  result: Result<T>,
  status: HttpStatusCode = HttpStatus.OK
): NextResponse =>
  result.success
    ? successResponse(result.data, status)
    : createErrorResponse(
      result.error.error,
      HttpStatus.BAD_REQUEST,
      result.error.details
    );
