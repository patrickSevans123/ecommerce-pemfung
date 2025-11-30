import { OrderDocument } from '@/lib/db/models/order';
import { SalesStatistics, ProductStats, PromoCodeStats, RevenueByHour } from './types';
import { foldMap } from 'fp-ts/Array';
import { monoidSalesStatistics } from './monoid';
import mongoose from 'mongoose';

// Helper to determine if an order is completed/delivered
const isOrderCompleted = (order: OrderDocument) => {
  const statusValue = typeof order.status === 'object' && 'status' in order.status ? order.status.status : order.status;
  return statusValue === 'delivered';
};

/**
 * Convert a single order into SalesStatistics but scoped to a specific seller.
 * Only items that belong to the seller are counted. Shipping (delivery) fees are excluded.
 * Discounts are allocated proportionally to the seller's share of the order subtotal.
 */
export const orderToStats = (sellerObjectId: mongoose.Types.ObjectId) => (order: OrderDocument): SalesStatistics => {
  // Only include completed orders
  if (!isOrderCompleted(order)) {
    // return empty stats
    return {
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

      revenueByHour: new Map<number, RevenueByHour>(),
    };
  }

  // Compute seller-specific subtotal (sum of items belonging to seller)
  const sellerIdStr = sellerObjectId.toString();
  const sellerItems = order.items.filter(item => (item.seller ? item.seller.toString() : '') === sellerIdStr);
  const sellerSubtotal = sellerItems.reduce((acc: number, item) => acc + item.price * item.quantity, 0);

  // If seller has no items in this order, return empty stats
  if (sellerSubtotal === 0) {
    return {
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

      revenueByHour: new Map<number, RevenueByHour>(),
    };
  }

  // Calculate product metrics only for seller items
  const productMap = new Map<string, ProductStats>();
  let totalQuantity = 0;
  sellerItems.forEach(item => {
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

  // Allocate discount proportionally to seller's subtotal
  const orderSubtotal = order.subtotal || 0;
  const sellerDiscount = order.discount && orderSubtotal > 0 ? (order.discount * (sellerSubtotal / orderSubtotal)) : 0;

  // Revenue excludes shipping (delivery) fees
  const sellerTotalRevenue = sellerSubtotal - (sellerDiscount || 0);

  // Promo code stats (seller share)
  const promoStats: PromoCodeStats[] = order.promoCodeApplied && sellerDiscount ? [{
    code: order.promoCodeApplied,
    usageCount: 1,
    totalDiscount: sellerDiscount,
  }] : [];

  // Revenue by hour (use seller total revenue)
  const hour = order.createdAt ? order.createdAt.getHours() : 0;
  const revenueByHour = new Map<number, RevenueByHour>();
  revenueByHour.set(hour, {
    hour,
    revenue: sellerTotalRevenue,
    orderCount: 1,
  });

  // Customer set
  const customers = new Set<string>();
  if (order.user) {
    customers.add(order.user.toString());
  }

  // Extract order status counts (only completed counted above as delivered)
  const statusValue = typeof order.status === 'object' && 'status' in order.status ? order.status.status : order.status;

  return {
    totalSales: sellerSubtotal,
    orderCount: 1,
    averageOrderValue: sellerSubtotal,

    totalRevenue: sellerTotalRevenue,
    totalSubtotal: sellerSubtotal,
    totalShipping: 0, // exclude shipping from seller revenue
    totalDiscount: sellerDiscount,

    pendingOrders: statusValue === 'pending' ? 1 : 0,
    paidOrders: statusValue === 'paid' ? 1 : 0,
    shippedOrders: statusValue === 'shipped' ? 1 : 0,
    deliveredOrders: statusValue === 'delivered' ? 1 : 0,
    cancelledOrders: statusValue === 'cancelled' ? 1 : 0,

    totalProductsSold: totalQuantity,
    uniqueProductsSold: new Set(productMap.keys()),
    topProducts: Array.from(productMap.values()),

    promoCodesUsed: promoStats.length,
    totalPromoDiscount: sellerDiscount,
    topPromoCodes: promoStats,

    uniqueCustomers: customers,

    categorySales: [],

    revenueByHour,
  };
};

export const calculateStatistics = (orders: OrderDocument[], sellerObjectId: mongoose.Types.ObjectId): SalesStatistics =>
  foldMap(monoidSalesStatistics)(orderToStats(sellerObjectId))(orders);

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
