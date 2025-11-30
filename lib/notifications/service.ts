import { Observable, filter } from 'rxjs';
import { SystemEvent } from '@/lib/domain/types';
import { NotificationSubscription, NotificationData } from './types';
import { Notification } from '@/lib/db/models';
import { UserId } from '@/lib/domain/types';
import { ReplaySubject } from 'rxjs';

// Central event bus - using ReplaySubject to keep last 100 events for late subscribers
const eventBus$ = new ReplaySubject<SystemEvent>(100);

// Derived streams

// Buyer notifications - filter by userId
export const buyerNotifications$ = (userId: UserId): Observable<SystemEvent> =>
  eventBus$.pipe(
    filter(event =>
      (event.type === 'ORDER_PLACED' && event.userId === userId) ||
      (event.type === 'PAYMENT_SUCCESS' && event.userId === userId) ||
      (event.type === 'PAYMENT_FAILED' && event.userId === userId) ||
      (event.type === 'ORDER_SHIPPED' && event.userId === userId) ||
      (event.type === 'ORDER_DELIVERED' && event.userId === userId) ||
      (event.type === 'BALANCE_UPDATED' && event.userId === userId)
    )
  );

// Type guard untuk seller events
function isSellerEvent(event: SystemEvent): event is SystemEvent & { sellerId: string } {
  return 'sellerId' in event;
}

// Type guard untuk user events
function isUserEvent(event: SystemEvent): event is SystemEvent & { userId: string } {
  return 'userId' in event;
}

// Seller notifications - filter by sellerId  
export const sellerNotifications$ = (sellerId: UserId): Observable<SystemEvent> => {
  return eventBus$.pipe(
    filter((event): event is SystemEvent => {
      const hasSellerField = isSellerEvent(event);
      if (!hasSellerField) {
        return false;
      }

      const sellerMatches = event.sellerId === sellerId;
      const isRelevantType =
        event.type === 'ORDER_PLACED' ||
        event.type === 'PAYMENT_SUCCESS' ||
        event.type === 'PAYMENT_FAILED' ||
        event.type === 'ORDER_SHIPPED' ||
        event.type === 'ORDER_DELIVERED';
      
      return sellerMatches && isRelevantType;
    })
  );
};

// Helper to subscribe to notifications with cleanup
export const subscribeToNotifications = <T>(
  observable: Observable<T>,
  callback: (value: T) => void
): NotificationSubscription => {
  const subscription = observable.subscribe(callback);

  return {
    unsubscribe: () => subscription.unsubscribe(),
  };
};

// Extract common fields from SystemEvent
function extractEventFields(event: SystemEvent): {
  userId?: string;
  sellerId?: string;
  orderId?: string;
  productId?: string;
  data?: NotificationData;
} {
  const fields: {
    userId?: string;
    sellerId?: string;
    orderId?: string;
    productId?: string;
    data?: NotificationData;
  } = {};

  if (isUserEvent(event)) {
    fields.userId = event.userId;
  }
  if (isSellerEvent(event)) {
    fields.sellerId = event.sellerId;
  }
  if ('orderId' in event) {
    fields.orderId = event.orderId as string;
  }
  if ('productId' in event) {
    fields.productId = event.productId as string;
  }
  if ('data' in event) {
    // Try to shape the event payload into our deterministic NotificationData
    const d = event.data as Record<string, unknown>;
    fields.data = {
      productName: typeof d.productName === 'string' ? String(d.productName) : undefined,
      quantity: typeof d.quantity === 'number' ? d.quantity : undefined,
      amount: typeof d.amount === 'number' ? d.amount : undefined,
      trackingNumber: typeof d.trackingNumber === 'string' ? String(d.trackingNumber) : undefined,
      currentStock: typeof d.currentStock === 'number' ? d.currentStock : undefined,
      orderId: typeof d.orderId === 'string' ? String(d.orderId) : undefined,
      reason: typeof d.reason === 'string' ? String(d.reason) : undefined,
    };
  }

  return fields;
}

// Helper to emit events and save to database
export const emitEvent = async (event: SystemEvent): Promise<void> => {
  try {
    const eventFields = extractEventFields(event);
    
    // Emit to RxJS stream
    eventBus$.next(event);

    // Save to database with proper typing
    const notificationData = {
      type: event.type,
      userId: eventFields.userId,
      sellerId: eventFields.sellerId,
      productId: eventFields.productId,
      orderId: eventFields.orderId,
      data: eventFields.data || {},
    };

    await Notification.create(notificationData);
  } catch (error) {
    console.error('Failed to emit event:', error);
    // Continue with RxJS emission even if DB save fails
    eventBus$.next(event);
  }
};

// Get notifications from database (for historical data)
export const getNotificationsForUser = async (userId: UserId, limit = 50) => {
  return Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

export const getNotificationsForSeller = async (sellerId: UserId, limit = 50) => {
  return Notification.find({ sellerId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};