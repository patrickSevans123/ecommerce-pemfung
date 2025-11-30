import { SystemEvent, ProductId } from '@/lib/domain/types';

// Deterministic notification payload shape used by the notifications system
export interface NotificationData {
  productName?: string;
  quantity?: number;
  amount?: number;
  trackingNumber?: string;
  currentStock?: number;
  orderId?: string;
  reason?: string;
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