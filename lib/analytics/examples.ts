/**
 * Example Usage of Analytics ROP Pipelines
 * 
 * This file demonstrates how to use the Railway Oriented Programming
 * implementation for analytics features.
 */

import {
  analyticsPipeline,
  overviewAnalyticsPipeline,
  revenueAnalyticsPipeline,
  productAnalyticsPipeline,
  orderAnalyticsPipeline,
  customerAnalyticsPipeline,
  promoCodeAnalyticsPipeline,
} from '@/lib/analytics';

// ========================================
// Example 1: Basic Analytics Pipeline
// ========================================

export async function getFullAnalytics(sellerId: string) {
  const result = await analyticsPipeline(sellerId);

  return result.match(
    (analytics) => {
      // Success case - analytics data is available
      console.log('Total Sales:', analytics.totalSales);
      console.log('Order Count:', analytics.orderCount);
      console.log('Top Products:', analytics.productMetrics.topProducts);
      return { success: true, data: analytics };
    },
    (error) => {
      // Error case - handle different error types
      console.error('Analytics Error:', error.message);
      
      switch (error.code) {
        case 'INVALID_SELLER_ID':
          return { success: false, message: 'Please provide a valid seller ID' };
        case 'NO_ORDERS_FOUND':
          return { success: false, message: 'No orders found for this seller' };
        default:
          return { success: false, message: 'An error occurred while fetching analytics' };
      }
    }
  );
}

// ========================================
// Example 2: Overview Analytics
// ========================================

export async function getOverview(sellerId: string) {
  const result = await overviewAnalyticsPipeline(sellerId);

  return result.match(
    (overview) => ({
      totalSales: overview.totalSales,
      orderCount: overview.orderCount,
      averageOrderValue: overview.averageOrderValue,
      totalRevenue: overview.totalRevenue,
      totalDiscount: overview.totalDiscount,
    }),
    (error) => ({
      error: error.message,
      code: error.code,
    })
  );
}

// ========================================
// Example 3: Multiple Analytics in Parallel
// ========================================

export async function getDashboardData(sellerId: string) {
  // Execute multiple pipelines in parallel
  const [overviewResult, revenueResult, productResult] = await Promise.all([
    overviewAnalyticsPipeline(sellerId),
    revenueAnalyticsPipeline(sellerId),
    productAnalyticsPipeline(sellerId),
  ]);

  // Check if all succeeded
  if (overviewResult.isOk() && revenueResult.isOk() && productResult.isOk()) {
    return {
      success: true,
      dashboard: {
        overview: overviewResult.value,
        revenue: revenueResult.value,
        products: productResult.value,
      },
    };
  }

  // Handle partial failures
  return {
    success: false,
    errors: [
      overviewResult.isErr() ? overviewResult.error : null,
      revenueResult.isErr() ? revenueResult.error : null,
      productResult.isErr() ? productResult.error : null,
    ].filter(Boolean),
  };
}

// ========================================
// Example 4: Error Handling with Fallbacks
// ========================================

export async function getAnalyticsWithFallback(sellerId: string) {
  const result = await analyticsPipeline(sellerId);

  return result.match(
    (data) => data,
    (error) => {
      // Log error for monitoring
      console.error('[Analytics Error]', {
        code: error.code,
        message: error.message,
        sellerId,
        timestamp: new Date().toISOString(),
      });

      // Return fallback data
      return {
        totalSales: 0,
        orderCount: 0,
        averageOrderValue: 0,
        totalRevenue: 0,
        totalSubtotal: 0,
        totalShipping: 0,
        totalDiscount: 0,
        orderStatus: { pending: 0, paid: 0, shipped: 0, delivered: 0, cancelled: 0 },
        productMetrics: { totalProductsSold: 0, uniqueProductsSold: 0, topProducts: [] },
        promoCodeMetrics: { promoCodesUsed: 0, totalPromoDiscount: 0, topPromoCodes: [] },
        customerMetrics: { uniqueCustomers: 0, repeatCustomerRate: '0%' },
        categorySales: [],
        revenueByHour: [],
      };
    }
  );
}

// ========================================
// Example 5: Chaining with Additional Logic
// ========================================

export async function getAnalyticsWithProcessing(sellerId: string) {
  const result = await analyticsPipeline(sellerId);

  return result
    .map((analytics) => {
      // Transform or enrich the data
      return {
        ...analytics,
        // Add computed fields
        profitMargin: analytics.totalRevenue > 0
          ? ((analytics.totalRevenue - analytics.totalDiscount) / analytics.totalRevenue) * 100
          : 0,
        // Add growth indicators
        isGrowing: analytics.orderCount > 10,
        // Add risk indicators
        cancellationRate: analytics.orderCount > 0
          ? (analytics.orderStatus.cancelled / analytics.orderCount) * 100
          : 0,
      };
    })
    .match(
      (enrichedData) => ({ success: true, data: enrichedData }),
      (error) => ({ success: false, error: error.message })
    );
}

// ========================================
// Example 6: Conditional Pipeline Execution
// ========================================

export async function getRelevantAnalytics(
  sellerId: string,
  analyticsType: 'overview' | 'revenue' | 'products' | 'orders' | 'customers' | 'promo-codes'
) {
  let result;

  switch (analyticsType) {
    case 'overview':
      result = await overviewAnalyticsPipeline(sellerId);
      break;
    case 'revenue':
      result = await revenueAnalyticsPipeline(sellerId);
      break;
    case 'products':
      result = await productAnalyticsPipeline(sellerId);
      break;
    case 'orders':
      result = await orderAnalyticsPipeline(sellerId);
      break;
    case 'customers':
      result = await customerAnalyticsPipeline(sellerId);
      break;
    case 'promo-codes':
      result = await promoCodeAnalyticsPipeline(sellerId);
      break;
    default:
      throw new Error('Invalid analytics type');
  }

  return result.match(
    (data) => ({ success: true, type: analyticsType, data }),
    (error) => ({ success: false, type: analyticsType, error: error.message })
  );
}

// ========================================
// Example 7: Type-Safe Error Handling
// ========================================

export async function getAnalyticsWithTypedErrors(sellerId: string) {
  const result = await analyticsPipeline(sellerId);

  if (result.isErr()) {
    const error = result.error;

    // TypeScript knows the error structure
    switch (error.code) {
      case 'INVALID_SELLER_ID':
        return { status: 400, message: 'Invalid seller ID format' };
      case 'NO_ORDERS_FOUND':
        return { status: 404, message: 'No orders found for this seller' };
      case 'DATABASE_ERROR':
      case 'QUERY_FAILED':
        return { status: 500, message: 'Database error occurred' };
      case 'CALCULATION_ERROR':
        return { status: 500, message: 'Error calculating analytics' };
      case 'SERIALIZATION_ERROR':
        return { status: 500, message: 'Error formatting response' };
      default:
        return { status: 500, message: 'Unknown error occurred' };
    }
  }

  // Success case
  return { status: 200, data: result.value };
}

// ========================================
// Example 8: Integration with Express/Next.js Route
// ========================================

export async function analyticsRouteHandler(sellerId: string) {
  const result = await analyticsPipeline(sellerId);

  // Map to HTTP response format
  return result.match(
    (data) => ({
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
    (error) => {
      const statusCode =
        error.code === 'INVALID_SELLER_ID' ? 400 :
        error.code === 'NO_ORDERS_FOUND' ? 404 :
        500;

      return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error.message,
          code: error.code,
        }),
      };
    }
  );
}
