import { Monoid } from 'fp-ts/lib/Monoid';
import { Semigroup } from 'fp-ts/lib/Semigroup';
import { SalesStatistics, ProductStats, PromoCodeStats, CategoryStats, RevenueByHour } from './types';

// Helper to merge top products
const mergeTopProducts = (a: ProductStats[], b: ProductStats[]): ProductStats[] => {
  const productMap = new Map<string, ProductStats>();
  
  [...a, ...b].forEach(p => {
    const existing = productMap.get(p.productId);
    if (existing) {
      productMap.set(p.productId, {
        productId: p.productId,
        productName: p.productName,
        quantitySold: existing.quantitySold + p.quantitySold,
        revenue: existing.revenue + p.revenue,
      });
    } else {
      productMap.set(p.productId, p);
    }
  });
  
  return Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
};

// Helper to merge promo codes
const mergePromoCodes = (a: PromoCodeStats[], b: PromoCodeStats[]): PromoCodeStats[] => {
  const promoMap = new Map<string, PromoCodeStats>();
  
  [...a, ...b].forEach(p => {
    const existing = promoMap.get(p.code);
    if (existing) {
      promoMap.set(p.code, {
        code: p.code,
        usageCount: existing.usageCount + p.usageCount,
        totalDiscount: existing.totalDiscount + p.totalDiscount,
      });
    } else {
      promoMap.set(p.code, p);
    }
  });
  
  return Array.from(promoMap.values())
    .sort((a, b) => b.totalDiscount - a.totalDiscount)
    .slice(0, 10);
};

// Helper to merge category sales
const mergeCategorySales = (a: CategoryStats[], b: CategoryStats[]): CategoryStats[] => {
  const categoryMap = new Map<string, CategoryStats>();
  
  [...a, ...b].forEach(c => {
    const existing = categoryMap.get(c.category);
    if (existing) {
      categoryMap.set(c.category, {
        category: c.category,
        orderCount: existing.orderCount + c.orderCount,
        revenue: existing.revenue + c.revenue,
        productsSold: existing.productsSold + c.productsSold,
      });
    } else {
      categoryMap.set(c.category, c);
    }
  });
  
  return Array.from(categoryMap.values())
    .sort((a, b) => b.revenue - a.revenue);
};

// Helper to merge revenue by hour
const mergeRevenueByHour = (a: Map<number, RevenueByHour>, b: Map<number, RevenueByHour>): Map<number, RevenueByHour> => {
  const merged = new Map<number, RevenueByHour>();
  
  // Merge from a
  a.forEach((value, hour) => {
    merged.set(hour, { ...value });
  });
  
  // Merge from b
  b.forEach((value, hour) => {
    const existing = merged.get(hour);
    if (existing) {
      merged.set(hour, {
        hour,
        revenue: existing.revenue + value.revenue,
        orderCount: existing.orderCount + value.orderCount,
      });
    } else {
      merged.set(hour, { ...value });
    }
  });
  
  return merged;
};

const semigroupSalesStatistics: Semigroup<SalesStatistics> = {
  concat: (x, y) => ({
    // Basic metrics
    totalSales: x.totalSales + y.totalSales,
    orderCount: x.orderCount + y.orderCount,
    averageOrderValue: (x.totalSales + y.totalSales) / (x.orderCount + y.orderCount) || 0,
    
    // Revenue breakdown
    totalRevenue: x.totalRevenue + y.totalRevenue,
    totalSubtotal: x.totalSubtotal + y.totalSubtotal,
    totalShipping: x.totalShipping + y.totalShipping,
    totalDiscount: x.totalDiscount + y.totalDiscount,
    
    // Order status
    pendingOrders: x.pendingOrders + y.pendingOrders,
    paidOrders: x.paidOrders + y.paidOrders,
    shippedOrders: x.shippedOrders + y.shippedOrders,
    deliveredOrders: x.deliveredOrders + y.deliveredOrders,
    cancelledOrders: x.cancelledOrders + y.cancelledOrders,
    
    // Product metrics
    totalProductsSold: x.totalProductsSold + y.totalProductsSold,
    uniqueProductsSold: new Set([...x.uniqueProductsSold, ...y.uniqueProductsSold]),
    topProducts: mergeTopProducts(x.topProducts, y.topProducts),
    
    // Promo code effectiveness
    promoCodesUsed: x.promoCodesUsed + y.promoCodesUsed,
    totalPromoDiscount: x.totalPromoDiscount + y.totalPromoDiscount,
    topPromoCodes: mergePromoCodes(x.topPromoCodes, y.topPromoCodes),
    
    // Customer insights
    uniqueCustomers: new Set([...x.uniqueCustomers, ...y.uniqueCustomers]),
    
    // Category performance
    categorySales: mergeCategorySales(x.categorySales, y.categorySales),
    
    // Time-based
    revenueByHour: mergeRevenueByHour(x.revenueByHour, y.revenueByHour),
  }),
};

export const monoidSalesStatistics: Monoid<SalesStatistics> = {
  ...semigroupSalesStatistics,
  empty: {
    totalSales: 0,
    orderCount: 0,
    averageOrderValue: 0,
    totalRevenue: 0,
    totalSubtotal: 0,
    totalShipping: 0,
    totalDiscount: 0,
    pendingOrders: 0,
    paidOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    totalProductsSold: 0,
    uniqueProductsSold: new Set(),
    topProducts: [],
    promoCodesUsed: 0,
    totalPromoDiscount: 0,
    topPromoCodes: [],
    uniqueCustomers: new Set(),
    categorySales: [],
    revenueByHour: new Map(),
  },
};
