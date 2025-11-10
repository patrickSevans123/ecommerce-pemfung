import { OrderDocument } from '@/lib/db/models/order';
import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Array';
import * as O from 'fp-ts/Option';
import * as Ord from 'fp-ts/Ord';
import * as N from 'fp-ts/number';
import * as S from 'fp-ts/string';
import { format, startOfDay, startOfMonth } from 'date-fns';
import { 
  OverviewAnalytics, 
  ProductMetrics, 
  OrderMetrics, 
  CustomerMetrics, 
  RevenueMetrics, 
  PromoCodeMetrics,
  ProductStats,
  PromoCodeStats,
  RevenueByHour,
  TimeSeriesMetrics,
  DailyDataPoint,
  MonthlyDataPoint
} from './types';

// Ord instances for sorting
const byRevenueDesc: Ord.Ord<ProductStats> = pipe(
  N.Ord,
  Ord.contramap((p: ProductStats) => p.revenue),
  Ord.reverse
);

const byHourAsc: Ord.Ord<RevenueByHour> = pipe(
  N.Ord,
  Ord.contramap((r: RevenueByHour) => r.hour)
);

const byDiscountDesc: Ord.Ord<PromoCodeStats> = pipe(
  N.Ord,
  Ord.contramap((p: PromoCodeStats) => p.totalDiscount),
  Ord.reverse
);

// Pure function to extract order status
const getOrderStatus = (order: OrderDocument): string =>
  typeof order.status === 'object' && 'status' in order.status 
    ? order.status.status 
    : 'pending';

// Pure function to calculate order total
const getOrderTotal = (order: OrderDocument): number =>
  order.items.reduce((acc: number, item) => acc + item.price * item.quantity, 0);

// === OVERVIEW ANALYTICS ===
export const calculateOverviewAnalytics = (orders: OrderDocument[]): OverviewAnalytics => {
  const totalSales = pipe(
    orders,
    A.map(getOrderTotal),
    A.reduce(0, (acc, val) => acc + val)
  );
  
  const orderCount = orders.length;
  
  const totalRevenue = pipe(
    orders,
    A.map(order => order.total),
    A.reduce(0, (acc, val) => acc + val)
  );
  
  const totalDiscount = pipe(
    orders,
    A.map(order => order.discount || 0),
    A.reduce(0, (acc, val) => acc + val)
  );
  
  return {
    totalSales,
    orderCount,
    averageOrderValue: orderCount > 0 ? totalSales / orderCount : 0,
    totalRevenue,
    totalDiscount,
  };
};

// === PRODUCT ANALYTICS ===
export const calculateProductMetrics = (orders: OrderDocument[]): ProductMetrics => {
  const productMap = new Map<string, ProductStats>();
  let totalQuantity = 0;
  
  orders.forEach(order => {
    order.items.forEach(item => {
      totalQuantity += item.quantity;
      const productId = item.product.toString();
      const existing = productMap.get(productId);
      
      if (existing) {
        productMap.set(productId, {
          ...existing,
          quantitySold: existing.quantitySold + item.quantity,
          revenue: existing.revenue + (item.price * item.quantity),
        });
      } else {
        productMap.set(productId, {
          productId,
          productName: item.name || 'Unknown',
          quantitySold: item.quantity,
          revenue: item.price * item.quantity,
        });
      }
    });
  });
  
  const topProducts = pipe(
    Array.from(productMap.values()),
    A.sort(byRevenueDesc),
    A.takeLeft(10)
  );
  
  return {
    totalProductsSold: totalQuantity,
    uniqueProductsSold: productMap.size,
    topProducts,
    averageProductsPerOrder: orders.length > 0 ? totalQuantity / orders.length : 0,
  };
};

// === ORDER ANALYTICS ===
export const calculateOrderMetrics = (orders: OrderDocument[]): OrderMetrics => {
  const statusCounts = pipe(
    orders,
    A.map(getOrderStatus),
    A.reduce({ pending: 0, paid: 0, shipped: 0, delivered: 0, cancelled: 0 }, (acc, status) => ({
      ...acc,
      [status]: (acc[status as keyof typeof acc] || 0) + 1,
    }))
  );
  
  const totalOrders = orders.length;
  const completedOrders = statusCounts.delivered + statusCounts.paid;
  const cancelledOrders = statusCounts.cancelled;
  
  return {
    totalOrders,
    ordersByStatus: statusCounts,
    completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
    cancellationRate: totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0,
  };
};

// === CUSTOMER ANALYTICS ===
export const calculateCustomerMetrics = (orders: OrderDocument[]): CustomerMetrics => {
  const customerOrders = new Map<string, number>();
  
  orders.forEach(order => {
    if (order.user) {
      const userId = order.user.toString();
      customerOrders.set(userId, (customerOrders.get(userId) || 0) + 1);
    }
  });
  
  const uniqueCustomers = customerOrders.size;
  const repeatCustomers = pipe(
    Array.from(customerOrders.values()),
    A.filter(count => count > 1),
    arr => arr.length
  );
  
  const totalRevenue = pipe(
    orders,
    A.map(order => order.total),
    A.reduce(0, (acc, val) => acc + val)
  );
  
  return {
    uniqueCustomers,
    repeatCustomers,
    repeatCustomerRate: uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0,
    averageOrdersPerCustomer: uniqueCustomers > 0 ? orders.length / uniqueCustomers : 0,
    customerLifetimeValue: uniqueCustomers > 0 ? totalRevenue / uniqueCustomers : 0,
  };
};

// === REVENUE ANALYTICS ===
export const calculateRevenueMetrics = (orders: OrderDocument[]): RevenueMetrics => {
  const revenueByHourMap = new Map<number, { revenue: number; count: number }>();
  
  let totalRevenue = 0;
  let totalSubtotal = 0;
  let totalShipping = 0;
  let totalDiscount = 0;
  
  orders.forEach(order => {
    totalRevenue += order.total;
    totalSubtotal += order.subtotal;
    totalShipping += order.shipping || 0;
    totalDiscount += order.discount || 0;
    
    const hour = order.createdAt ? order.createdAt.getHours() : 0;
    const existing = revenueByHourMap.get(hour);
    
    if (existing) {
      revenueByHourMap.set(hour, {
        revenue: existing.revenue + order.total,
        count: existing.count + 1,
      });
    } else {
      revenueByHourMap.set(hour, {
        revenue: order.total,
        count: 1,
      });
    }
  });
  
  const revenueByHour = pipe(
    Array.from(revenueByHourMap.entries()),
    A.map(([hour, data]) => ({
      hour,
      revenue: data.revenue,
      orderCount: data.count,
    })),
    A.sort(byHourAsc)
  );
  
  return {
    totalRevenue,
    totalSubtotal,
    totalShipping,
    totalDiscount,
    netRevenue: totalRevenue - totalDiscount,
    revenueByHour,
  };
};

// === PROMO CODE ANALYTICS ===
export const calculatePromoCodeMetrics = (orders: OrderDocument[]): PromoCodeMetrics => {
  const promoMap = new Map<string, { count: number; discount: number }>();
  
  orders.forEach(order => {
    if (order.promoCodeApplied && order.discount) {
      const existing = promoMap.get(order.promoCodeApplied);
      
      if (existing) {
        promoMap.set(order.promoCodeApplied, {
          count: existing.count + 1,
          discount: existing.discount + order.discount,
        });
      } else {
        promoMap.set(order.promoCodeApplied, {
          count: 1,
          discount: order.discount,
        });
      }
    }
  });
  
  const totalPromoCodesUsed = promoMap.size;
  const totalPromoDiscount = pipe(
    Array.from(promoMap.values()),
    A.map(p => p.discount),
    A.reduce(0, (acc, val) => acc + val)
  );
  
  const topPromoCodes = pipe(
    Array.from(promoMap.entries()),
    A.map(([code, data]) => ({
      code,
      usageCount: data.count,
      totalDiscount: data.discount,
    })),
    A.sort(byDiscountDesc),
    A.takeLeft(10)
  );
  
  const ordersWithPromo = orders.filter(o => o.promoCodeApplied).length;
  
  return {
    totalPromoCodesUsed,
    totalPromoDiscount,
    averageDiscountPerPromo: totalPromoCodesUsed > 0 ? totalPromoDiscount / totalPromoCodesUsed : 0,
    topPromoCodes,
    promoEffectivenessRate: orders.length > 0 ? (ordersWithPromo / orders.length) * 100 : 0,
  };
};

// Ord instances for sorting time-series data
const byDateAsc: Ord.Ord<string> = S.Ord;

// Helper to group orders by date key
const groupOrdersByDateKey = (orders: OrderDocument[], keyFn: (date: Date) => string) => 
  pipe(
    orders,
    A.reduce({} as Record<string, OrderDocument[]>, (acc, order) => {
      const key = keyFn(new Date(order.createdAt || new Date()));
      return {
        ...acc,
        [key]: [...(acc[key] || []), order]
      };
    })
  );

// Calculate daily metrics from grouped orders
const calculateDailyMetrics = (dateKey: string, orders: OrderDocument[]): DailyDataPoint => {
  const revenue = orders.reduce((sum, o) => sum + o.total, 0);
  const orderCount = orders.length;
  
  return {
    date: dateKey,
    orderCount,
    revenue,
    averageOrderValue: orderCount > 0 ? revenue / orderCount : 0
  };
};

// Calculate monthly metrics from grouped orders
const calculateMonthlyMetrics = (monthKey: string, orders: OrderDocument[]): MonthlyDataPoint => {
  const revenue = orders.reduce((sum, o) => sum + o.total, 0);
  const orderCount = orders.length;
  
  return {
    month: monthKey,
    orderCount,
    revenue,
    averageOrderValue: orderCount > 0 ? revenue / orderCount : 0
  };
};

/**
 * Calculate time-series metrics for line charts
 * Pure function using fp-ts for data aggregation by time periods
 */
export const calculateTimeSeriesMetrics = (orders: OrderDocument[]): TimeSeriesMetrics => {
  // Group by day (YYYY-MM-DD)
  const ordersByDay = groupOrdersByDateKey(orders, (date) => 
    format(startOfDay(date), 'yyyy-MM-dd')
  );
  
  // Group by month (YYYY-MM)
  const ordersByMonth = groupOrdersByDateKey(orders, (date) => 
    format(startOfMonth(date), 'yyyy-MM')
  );
  
  // Convert to daily data points
  const daily = pipe(
    Object.entries(ordersByDay),
    A.map(([dateKey, ordersInDay]) => calculateDailyMetrics(dateKey, ordersInDay)),
    A.sort(pipe(
      byDateAsc,
      Ord.contramap((point: DailyDataPoint) => point.date)
    ))
  );
  
  // Convert to monthly data points
  const monthly = pipe(
    Object.entries(ordersByMonth),
    A.map(([monthKey, ordersInMonth]) => calculateMonthlyMetrics(monthKey, ordersInMonth)),
    A.sort(pipe(
      byDateAsc,
      Ord.contramap((point: MonthlyDataPoint) => point.month)
    ))
  );
  
  return {
    daily,
    monthly
  };
};
