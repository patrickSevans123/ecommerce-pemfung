// Export types
export type {
  SystemEvent,
} from '@/lib/domain/types';

export type {
  NotificationData,
  NotificationSubscription,
} from './types';

// Export services
export {
  buyerNotifications$,
  sellerNotifications$,
  subscribeToNotifications,
  emitEvent,
  getNotificationsForUser,
  getNotificationsForSeller,
} from './service';