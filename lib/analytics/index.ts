// Analytics module exports
// Railway Oriented Programming implementation for analytics features

// Export pipeline functions
export {
  analyticsPipeline,
  overviewAnalyticsPipeline,
  revenueAnalyticsPipeline,
  productAnalyticsPipeline,
  orderAnalyticsPipeline,
  customerAnalyticsPipeline,
  promoCodeAnalyticsPipeline,
  executePipeline,
  validateSellerId,
  fetchOrdersForSeller,
  calculateAnalytics,
  serializeAnalytics,
} from './pipeline';

// Export error types and factories
export {
  AnalyticsErrorCodes,
  createAnalyticsError,
  invalidSellerIdError,
  invalidDateRangeError,
  invalidPeriodError,
  noOrdersFoundError,
  noDataAvailableError,
  databaseError,
  queryFailedError,
  calculationError,
  serializationError,
} from './errors';

export type {
  AnalyticsError,
  AnalyticsErrorCode,
} from './errors';

// Export context types
export type {
  ValidatedSellerContext,
  OrdersContext,
  CalculatedStatsContext,
  SerializedAnalyticsResult,
  SpecializedAnalyticsContext,
  OverviewResult,
  RevenueResult,
  ProductsResult,
  OrdersResult,
  CustomersResult,
  PromoCodesResult,
} from './types';

// Export analytics types
export type {
  SalesStatistics,
  OverviewAnalytics,
  RevenueMetrics,
  ProductMetrics,
  OrderMetrics,
  CustomerMetrics,
  PromoCodeMetrics,
  ProductStats,
  PromoCodeStats,
  CategoryStats,
  RevenueByHour,
  TimePeriod,
  TimeSeriesData,
  AnalyticsData,
  SellerAnalytics,
  ProductAnalytics,
  DailyDataPoint,
  MonthlyDataPoint,
  TimeSeriesMetrics,
} from './types';

// Export service functions (for backward compatibility)
export {
  orderToStats,
  calculateStatistics,
  serializeStats,
} from './service';

// Export specialized analytics functions (for backward compatibility)
export {
  calculateOverviewAnalytics,
  calculateRevenueMetrics,
  calculateProductMetrics,
  calculateOrderMetrics,
  calculateCustomerMetrics,
  calculatePromoCodeMetrics,
  calculateTimeSeriesMetrics,
} from './specialized';

// Export monoid for advanced usage
export {
  monoidSalesStatistics,
} from './monoid';
