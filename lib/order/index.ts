// Export order-related types and utilities
export {
  transitionOrder,
  getAllowedEvents,
  isValidTransition,
  validateEvent,
  getStatusName
} from './stateMachine';

// Re-export domain types for convenience
export type { OrderStatus, OrderEvent } from '@/lib/domain/types';
