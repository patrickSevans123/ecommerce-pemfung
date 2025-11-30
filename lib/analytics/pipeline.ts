// Railway Oriented Programming pipelines for analytics
import { ResultAsync, okAsync } from 'neverthrow';
import mongoose from 'mongoose';
import Order from '@/lib/db/models/order';
import { OrderDocument } from '@/lib/db/models/order';
import {
  AnalyticsError,
  invalidSellerIdError,
  noOrdersFoundError,
  queryFailedError,
  calculationError,
  serializationError,
} from './errors';
import {
  ValidatedSellerContext,
  OrdersContext,
  CalculatedStatsContext,
  SerializedAnalyticsResult,
  SalesStatistics,
  OverviewAnalytics,
  RevenueMetrics,
  ProductMetrics,
  OrderMetrics,
  CustomerMetrics,
  PromoCodeMetrics,
} from './types';
import { calculateStatistics, serializeStats } from './service';
import {
  calculateOverviewAnalytics,
  calculateRevenueMetrics,
  calculateProductMetrics,
  calculateOrderMetrics,
  calculateCustomerMetrics,
  calculatePromoCodeMetrics,
} from './specialized';

// ========================================
// Core Pipeline Steps
// ========================================

/**
 * Step 1: Validate seller ID
 * Ensures the seller ID is a valid MongoDB ObjectId
 */
export const validateSellerId = (
  sellerId: string
): ResultAsync<ValidatedSellerContext, AnalyticsError> => {
  return ResultAsync.fromPromise(
    (async () => {
      if (!mongoose.Types.ObjectId.isValid(sellerId)) {
        throw invalidSellerIdError(sellerId);
      }

      return {
        sellerId,
        sellerObjectId: new mongoose.Types.ObjectId(sellerId),
      };
    })(),
    (error: unknown) => error as AnalyticsError
  );
};

/**
 * Step 2: Fetch orders for seller
 * Retrieves all orders containing products from the specified seller
 */
export const fetchOrdersForSeller = (
  context: ValidatedSellerContext
): ResultAsync<OrdersContext, AnalyticsError> => {
  return ResultAsync.fromPromise(
    (async () => {
      const orders = await Order.find({ 'items.seller': context.sellerObjectId });

      if (!orders || orders.length === 0) {
        throw noOrdersFoundError(context.sellerId);
      }

      return {
        ...context,
        orders,
      };
    })(),
    (error: unknown) => {
      // If it's already an AnalyticsError, return it
      if (error && typeof error === 'object' && 'code' in error) {
        return error as AnalyticsError;
      }
      // Otherwise, wrap it as a query error
      return queryFailedError(error);
    }
  );
};

/**
 * Step 3: Calculate statistics
 * Computes comprehensive analytics from the orders
 */
export const calculateAnalytics = (
  context: OrdersContext
): ResultAsync<CalculatedStatsContext, AnalyticsError> => {
  return ResultAsync.fromPromise(
    (async () => {
      const stats = calculateStatistics(context.orders, context.sellerObjectId);

      return {
        ...context,
        stats,
      };
    })(),
    (error) => calculationError('statistics', error)
  );
};

/**
 * Step 4: Serialize statistics for API response
 * Converts internal stats format to JSON-friendly format
 */
export const serializeAnalytics = (
  context: CalculatedStatsContext
): ResultAsync<SerializedAnalyticsResult, AnalyticsError> => {
  return ResultAsync.fromPromise(
    (async () => {
      const serialized = serializeStats(context.stats);
      return serialized;
    })(),
    (error) => serializationError(error)
  );
};

// ========================================
// Main Analytics Pipeline
// ========================================

/**
 * Complete analytics pipeline for a seller
 * Validates seller -> Fetches orders -> Calculates stats -> Serializes result
 * 
 * @example
 * ```typescript
 * const result = await analyticsPipeline('seller-id-123');
 * result.match(
 *   (data) => NextResponse.json(data),
 *   (error) => NextResponse.json({ error: error.message }, { status: 400 })
 * );
 * ```
 */
export const analyticsPipeline = (
  sellerId: string
): ResultAsync<SerializedAnalyticsResult, AnalyticsError> => {
  return validateSellerId(sellerId)
    .andThen(fetchOrdersForSeller)
    .andThen(calculateAnalytics)
    .andThen(serializeAnalytics);
};

// ========================================
// Specialized Analytics Pipelines
// ========================================

/**
 * Overview analytics pipeline
 * Returns high-level metrics: total sales, order count, average order value
 */
export const overviewAnalyticsPipeline = (
  sellerId: string
): ResultAsync<OverviewAnalytics, AnalyticsError> => {
  return validateSellerId(sellerId)
    .andThen(fetchOrdersForSeller)
    .map((context) => calculateOverviewAnalytics(context.orders, context.sellerObjectId))
    .mapErr((error) => {
      if (error.code === 'CALCULATION_ERROR') return error;
      return error;
    });
};

/**
 * Revenue analytics pipeline
 * Returns detailed revenue breakdown and trends
 */
export const revenueAnalyticsPipeline = (
  sellerId: string
): ResultAsync<RevenueMetrics, AnalyticsError> => {
  return validateSellerId(sellerId)
    .andThen(fetchOrdersForSeller)
    .map((context) => calculateRevenueMetrics(context.orders, context.sellerObjectId))
    .mapErr((error) => {
      if (error.code === 'CALCULATION_ERROR') return error;
      return error;
    });
};

/**
 * Product analytics pipeline
 * Returns product performance metrics and top sellers
 */
export const productAnalyticsPipeline = (
  sellerId: string
): ResultAsync<ProductMetrics, AnalyticsError> => {
  return validateSellerId(sellerId)
    .andThen(fetchOrdersForSeller)
    .map((context) => calculateProductMetrics(context.orders, context.sellerObjectId))
    .mapErr((error) => {
      if (error.code === 'CALCULATION_ERROR') return error;
      return error;
    });
};

/**
 * Order analytics pipeline
 * Returns order status breakdown and completion rates
 */
export const orderAnalyticsPipeline = (
  sellerId: string
): ResultAsync<OrderMetrics, AnalyticsError> => {
  return validateSellerId(sellerId)
    .andThen(fetchOrdersForSeller)
    .map((context) => calculateOrderMetrics(context.orders, context.sellerObjectId))
    .mapErr((error) => {
      if (error.code === 'CALCULATION_ERROR') return error;
      return error;
    });
};

/**
 * Customer analytics pipeline
 * Returns customer insights: unique customers, repeat rate, lifetime value
 */
export const customerAnalyticsPipeline = (
  sellerId: string
): ResultAsync<CustomerMetrics, AnalyticsError> => {
  return validateSellerId(sellerId)
    .andThen(fetchOrdersForSeller)
    .map((context) => calculateCustomerMetrics(context.orders, context.sellerObjectId))
    .mapErr((error) => {
      if (error.code === 'CALCULATION_ERROR') return error;
      return error;
    });
};

/**
 * Promo code analytics pipeline
 * Returns promo code effectiveness and top performers
 */
export const promoCodeAnalyticsPipeline = (
  sellerId: string
): ResultAsync<PromoCodeMetrics, AnalyticsError> => {
  return validateSellerId(sellerId)
    .andThen(fetchOrdersForSeller)
    .map((context) => calculatePromoCodeMetrics(context.orders, context.sellerObjectId))
    .mapErr((error) => {
      if (error.code === 'CALCULATION_ERROR') return error;
      return error;
    });
};

// ========================================
// Utility Functions
// ========================================

/**
 * Helper to execute a pipeline and handle errors consistently
 * Maps errors to appropriate HTTP status codes
 */
export const executePipeline = async <T>(
  pipeline: ResultAsync<T, AnalyticsError>
): Promise<{ success: true; data: T } | { success: false; error: AnalyticsError; status: number }> => {
  const result = await pipeline;

  return result.match(
    (data) => ({ success: true as const, data }),
    (error) => {
      let status = 500;
      
      switch (error.code) {
        case 'INVALID_SELLER_ID':
        case 'INVALID_DATE_RANGE':
        case 'INVALID_PERIOD':
          status = 400;
          break;
        case 'NO_ORDERS_FOUND':
        case 'NO_DATA_AVAILABLE':
          status = 404;
          break;
        case 'DATABASE_ERROR':
        case 'QUERY_FAILED':
        case 'CALCULATION_ERROR':
        case 'SERIALIZATION_ERROR':
          status = 500;
          break;
      }

      return { success: false as const, error, status };
    }
  );
};
