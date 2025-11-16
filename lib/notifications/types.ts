import { SystemEvent, UserId, ProductId, OrderId, ReviewId } from '@/lib/domain/types';

// Notification data types for persistence
export interface NotificationData {
  type: SystemEvent['type'];
  userId?: UserId;
  sellerId?: UserId;
  productId?: ProductId;
  orderId?: OrderId;
  data: Record<string, any>;
  createdAt: Date;
}

// Subscription types
export interface NotificationSubscription {
  unsubscribe: () => void;
}

// Analytics data types
export interface RealtimeAnalyticsData {
  events: SystemEvent[];
  timestamp: Date;
  summary: {
    totalEvents: number;
    eventsByType: Record<SystemEvent['type'], number>;
    topProducts: Array<{ productId: ProductId; eventCount: number }>;
  };
}