export type ProductStats = {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
};

export type PromoCodeStats = {
  code: string;
  usageCount: number;
  totalDiscount: number;
};

export type CategoryStats = {
  category: string;
  orderCount: number;
  revenue: number;
  productsSold: number;
};

export type RevenueByHour = {
  hour: number;
  revenue: number;
  orderCount: number;
};

export type SalesStatistics = {
  // Basic metrics
  totalSales: number;
  orderCount: number;
  averageOrderValue: number;
  
  // Revenue breakdown
  totalRevenue: number;
  totalSubtotal: number;
  totalShipping: number;
  totalDiscount: number;
  
  // Order status
  pendingOrders: number;
  paidOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  
  // Product metrics
  totalProductsSold: number;
  uniqueProductsSold: Set<string>;
  topProducts: ProductStats[];
  
  // Promo code effectiveness
  promoCodesUsed: number;
  totalPromoDiscount: number;
  topPromoCodes: PromoCodeStats[];
  
  // Customer insights
  uniqueCustomers: Set<string>;
  
  // Category performance
  categorySales: CategoryStats[];
  
  // Time-based (for revenue by hour)
  revenueByHour: Map<number, RevenueByHour>;
};

export type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type TimeSeriesData = {
  date: Date;
  stats: SalesStatistics;
};

export type AnalyticsData = {
  period: TimePeriod;
  stats: SalesStatistics;
  startDate: Date;
  endDate: Date;
  timeSeries?: TimeSeriesData[];
};

export type SellerAnalytics = {
  sellerId: string;
  overall: SalesStatistics;
  byPeriod?: {
    daily: TimeSeriesData[];
    weekly: TimeSeriesData[];
    monthly: TimeSeriesData[];
  };
};

export type ProductAnalytics = {
  productId: string;
  productName: string;
  category: string;
  totalSold: number;
  revenue: number;
  averagePrice: number;
  timesOrdered: number;
};

// Specialized analytics types
export type OverviewAnalytics = {
  totalSales: number;
  orderCount: number;
  averageOrderValue: number;
  totalRevenue: number;
  totalDiscount: number;
  period?: {
    start: Date;
    end: Date;
  };
};

export type ProductMetrics = {
  totalProductsSold: number;
  uniqueProductsSold: number;
  topProducts: ProductStats[];
  averageProductsPerOrder: number;
};

export type OrderMetrics = {
  totalOrders: number;
  ordersByStatus: {
    pending: number;
    paid: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  completionRate: number;
  cancellationRate: number;
};

export type CustomerMetrics = {
  uniqueCustomers: number;
  repeatCustomers: number;
  repeatCustomerRate: number;
  averageOrdersPerCustomer: number;
  customerLifetimeValue: number;
};

export type RevenueMetrics = {
  totalRevenue: number;
  totalSubtotal: number;
  totalShipping: number;
  totalDiscount: number;
  netRevenue: number;
  revenueByHour: RevenueByHour[];
  revenueGrowth?: number;
};

export type PromoCodeMetrics = {
  totalPromoCodesUsed: number;
  totalPromoDiscount: number;
  averageDiscountPerPromo: number;
  topPromoCodes: PromoCodeStats[];
  promoEffectivenessRate: number;
};

// Time-series types for charts
export type DailyDataPoint = {
  date: string; // YYYY-MM-DD format
  orderCount: number;
  revenue: number;
  averageOrderValue: number;
};

export type MonthlyDataPoint = {
  month: string; // YYYY-MM format
  orderCount: number;
  revenue: number;
  averageOrderValue: number;
};

export type TimeSeriesMetrics = {
  daily: DailyDataPoint[];
  monthly: MonthlyDataPoint[];
};

// ========================================
// Railway Oriented Programming Context Types
// ========================================

import { OrderDocument } from '@/lib/db/models/order';
import mongoose from 'mongoose';

// Stage 1: After seller validation
export interface ValidatedSellerContext {
  sellerId: string;
  sellerObjectId: mongoose.Types.ObjectId;
}

// Stage 2: After fetching orders
export interface OrdersContext extends ValidatedSellerContext {
  orders: OrderDocument[];
}

// Stage 3: After calculating statistics
export interface CalculatedStatsContext extends OrdersContext {
  stats: SalesStatistics;
}

// Stage 4: After serialization (final result)
export interface SerializedAnalyticsResult {
  // Basic metrics
  totalSales: number;
  orderCount: number;
  averageOrderValue: number;
  
  // Revenue breakdown
  totalRevenue: number;
  totalSubtotal: number;
  totalShipping: number;
  totalDiscount: number;
  
  // Order status
  orderStatus: {
    pending: number;
    paid: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  
  // Product metrics
  productMetrics: {
    totalProductsSold: number;
    uniqueProductsSold: number;
    topProducts: ProductStats[];
  };
  
  // Promo code effectiveness
  promoCodeMetrics: {
    promoCodesUsed: number;
    totalPromoDiscount: number;
    topPromoCodes: PromoCodeStats[];
  };
  
  // Customer insights
  customerMetrics: {
    uniqueCustomers: number;
    repeatCustomerRate: string;
  };
  
  // Category performance
  categorySales: CategoryStats[];
  
  // Revenue by hour
  revenueByHour: RevenueByHour[];
}

// Context for specialized analytics pipelines
export interface SpecializedAnalyticsContext extends OrdersContext {
  analyticsType: 'overview' | 'revenue' | 'products' | 'orders' | 'customers' | 'promo-codes';
}

// Results for different analytics types
export interface OverviewResult {
  data: OverviewAnalytics;
}

export interface RevenueResult {
  data: RevenueMetrics;
}

export interface ProductsResult {
  data: ProductMetrics;
}

export interface OrdersResult {
  data: OrderMetrics;
}

export interface CustomersResult {
  data: CustomerMetrics;
}

export interface PromoCodesResult {
  data: PromoCodeMetrics;
}
