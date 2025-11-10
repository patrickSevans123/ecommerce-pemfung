// Centralized error codes for analytics operations

export const AnalyticsErrorCodes = {
  // Validation errors
  INVALID_SELLER_ID: 'INVALID_SELLER_ID',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
  INVALID_PERIOD: 'INVALID_PERIOD',
  
  // Data errors
  NO_ORDERS_FOUND: 'NO_ORDERS_FOUND',
  NO_DATA_AVAILABLE: 'NO_DATA_AVAILABLE',
  
  // Database errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  QUERY_FAILED: 'QUERY_FAILED',
  
  // Processing errors
  CALCULATION_ERROR: 'CALCULATION_ERROR',
  AGGREGATION_ERROR: 'AGGREGATION_ERROR',
  SERIALIZATION_ERROR: 'SERIALIZATION_ERROR',
} as const;

export type AnalyticsErrorCode = typeof AnalyticsErrorCodes[keyof typeof AnalyticsErrorCodes];

export interface AnalyticsError {
  code: AnalyticsErrorCode;
  message: string;
  details?: unknown;
}

// Factory functions for common errors
export const createAnalyticsError = (
  code: AnalyticsErrorCode,
  message: string,
  details?: unknown
): AnalyticsError => ({
  code,
  message,
  details,
});

export const invalidSellerIdError = (sellerId: string): AnalyticsError =>
  createAnalyticsError(
    AnalyticsErrorCodes.INVALID_SELLER_ID,
    `Invalid seller ID: ${sellerId}`
  );

export const invalidDateRangeError = (startDate?: Date, endDate?: Date): AnalyticsError =>
  createAnalyticsError(
    AnalyticsErrorCodes.INVALID_DATE_RANGE,
    'Invalid date range',
    { startDate, endDate }
  );

export const invalidPeriodError = (period: string): AnalyticsError =>
  createAnalyticsError(
    AnalyticsErrorCodes.INVALID_PERIOD,
    `Invalid time period: ${period}`
  );

export const noOrdersFoundError = (sellerId: string): AnalyticsError =>
  createAnalyticsError(
    AnalyticsErrorCodes.NO_ORDERS_FOUND,
    `No orders found for seller: ${sellerId}`
  );

export const noDataAvailableError = (context?: string): AnalyticsError =>
  createAnalyticsError(
    AnalyticsErrorCodes.NO_DATA_AVAILABLE,
    context ? `No data available for ${context}` : 'No data available'
  );

export const databaseError = (error: unknown): AnalyticsError =>
  createAnalyticsError(
    AnalyticsErrorCodes.DATABASE_ERROR,
    'Database operation failed',
    error
  );

export const queryFailedError = (error: unknown): AnalyticsError =>
  createAnalyticsError(
    AnalyticsErrorCodes.QUERY_FAILED,
    'Query execution failed',
    error
  );

export const calculationError = (operation: string, error: unknown): AnalyticsError =>
  createAnalyticsError(
    AnalyticsErrorCodes.CALCULATION_ERROR,
    `Failed to calculate ${operation}`,
    error
  );

export const serializationError = (error: unknown): AnalyticsError =>
  createAnalyticsError(
    AnalyticsErrorCodes.SERIALIZATION_ERROR,
    'Failed to serialize analytics data',
    error
  );
