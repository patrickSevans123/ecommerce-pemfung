import { OrderDocument } from '@/lib/db/models/order';
import { SalesStatistics, ProductStats, PromoCodeStats, CategoryStats, RevenueByHour } from './types';
import { foldMap } from 'fp-ts/Array';
import { monoidSalesStatistics } from './monoid';

export const orderToStats = (order: OrderDocument): SalesStatistics => {
  const totalSales = order.items.reduce((acc: number, item) => acc + item.price * item.quantity, 0);
  
  // Extract order status
  const statusValue = typeof order.status === 'object' && 'status' in order.status 
    ? order.status.status 
    : 'pending';
  
  // Calculate product metrics
  const productMap = new Map<string, ProductStats>();
  let totalQuantity = 0;
  
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
  
  // Promo code stats
  const promoStats: PromoCodeStats[] = order.promoCodeApplied && order.discount ? [{
    code: order.promoCodeApplied,
    usageCount: 1,
    totalDiscount: order.discount,
  }] : [];
  
  // Revenue by hour
  const hour = order.createdAt ? order.createdAt.getHours() : 0;
  const revenueByHour = new Map<number, RevenueByHour>();
  revenueByHour.set(hour, {
    hour,
    revenue: order.total,
    orderCount: 1,
  });
  
  // Customer set
  const customers = new Set<string>();
  if (order.user) {
    customers.add(order.user.toString());
  }
  
  return {
    // Basic metrics
    totalSales,
    orderCount: 1,
    averageOrderValue: totalSales,
    
    // Revenue breakdown
    totalRevenue: order.total,
    totalSubtotal: order.subtotal,
    totalShipping: order.shipping || 0,
    totalDiscount: order.discount || 0,
    
    // Order status
    pendingOrders: statusValue === 'pending' ? 1 : 0,
    paidOrders: statusValue === 'paid' ? 1 : 0,
    shippedOrders: statusValue === 'shipped' ? 1 : 0,
    deliveredOrders: statusValue === 'delivered' ? 1 : 0,
    cancelledOrders: statusValue === 'cancelled' ? 1 : 0,
    
    // Product metrics
    totalProductsSold: totalQuantity,
    uniqueProductsSold: new Set(productMap.keys()),
    topProducts: Array.from(productMap.values()),
    
    // Promo code effectiveness
    promoCodesUsed: promoStats.length,
    totalPromoDiscount: order.discount || 0,
    topPromoCodes: promoStats,
    
    // Customer insights
    uniqueCustomers: customers,
    
    // Category performance (empty for now, needs Product lookup)
    categorySales: [],
    
    // Time-based
    revenueByHour,
  };
};

export const calculateStatistics = (orders: OrderDocument[]): SalesStatistics =>
  foldMap(monoidSalesStatistics)(orderToStats)(orders);

// Helper to serialize SalesStatistics for JSON response
export const serializeStats = (stats: SalesStatistics) => ({
  // Basic metrics
  totalSales: stats.totalSales,
  orderCount: stats.orderCount,
  averageOrderValue: stats.averageOrderValue,
  
  // Revenue breakdown
  totalRevenue: stats.totalRevenue,
  totalSubtotal: stats.totalSubtotal,
  totalShipping: stats.totalShipping,
  totalDiscount: stats.totalDiscount,
  
  // Order status
  orderStatus: {
    pending: stats.pendingOrders,
    paid: stats.paidOrders,
    shipped: stats.shippedOrders,
    delivered: stats.deliveredOrders,
    cancelled: stats.cancelledOrders,
  },
  
  // Product metrics
  productMetrics: {
    totalProductsSold: stats.totalProductsSold,
    uniqueProductsSold: stats.uniqueProductsSold.size,
    topProducts: stats.topProducts.slice(0, 10),
  },
  
  // Promo code effectiveness
  promoCodeMetrics: {
    promoCodesUsed: stats.promoCodesUsed,
    totalPromoDiscount: stats.totalPromoDiscount,
    topPromoCodes: stats.topPromoCodes.slice(0, 10),
  },
  
  // Customer insights
  customerMetrics: {
    uniqueCustomers: stats.uniqueCustomers.size,
    repeatCustomerRate: stats.uniqueCustomers.size > 0 
      ? ((stats.orderCount - stats.uniqueCustomers.size) / stats.uniqueCustomers.size * 100).toFixed(2) + '%'
      : '0%',
  },
  
  // Category performance
  categorySales: stats.categorySales.slice(0, 10),
  
  // Revenue by hour
  revenueByHour: Array.from(stats.revenueByHour.values())
    .sort((a, b) => a.hour - b.hour),
});
