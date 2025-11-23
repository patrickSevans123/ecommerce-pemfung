import { match } from 'ts-pattern';
import { OrderStatus, OrderEvent } from '@/lib/domain/types';

// State transition function using pattern matching
export const transitionOrder = (
  currentStatus: OrderStatus,
  event: OrderEvent
): OrderStatus | null => {
  return match([currentStatus, event])
    // Pending → Paid (via ConfirmPayment)
    .with(
      [{ status: 'pending' }, { type: 'ConfirmPayment' }],
      () => ({ status: 'paid' as const, paidAt: new Date().toISOString() })
    )
    // Pending → Cancelled
    .with(
      [{ status: 'pending' }, { type: 'Cancel' }],
      ([, e]) => ({ status: 'cancelled' as const, reason: e.reason })
    )
    // Pending → Shipped (allow sellers to ship COD orders directly from pending)
    .with(
      [{ status: 'pending' }, { type: 'Ship' }],
      ([, e]) => ({
        status: 'shipped' as const,
        shippedAt: new Date().toISOString(),
        tracking: e.trackingNumber,
      })
    )
    // Paid → Shipped
    .with(
      [{ status: 'paid' }, { type: 'Ship' }],
      ([, e]) => ({
        status: 'shipped' as const,
        shippedAt: new Date().toISOString(),
        tracking: e.trackingNumber,
      })
    )
    // Paid → Refunded (when cancelling a paid order)
    .with(
      [{ status: 'paid' }, { type: 'Refund' }],
      ([, e]) => ({
        status: 'refunded' as const,
        refundedAt: new Date().toISOString(),
        reason: e.reason
      })
    )
    // Shipped → Delivered
    .with(
      [{ status: 'shipped' }, { type: 'Deliver' }],
      () => ({ status: 'delivered' as const, deliveredAt: new Date().toISOString() })
    )
    // Invalid transitions
    .otherwise(() => null);
};

// Get allowed events for current status
export const getAllowedEvents = (status: OrderStatus): OrderEvent['type'][] => {
  return match(status)
    .with({ status: 'pending' }, () => ['ConfirmPayment', 'Cancel'] as OrderEvent['type'][])
    .with({ status: 'paid' }, () => ['Ship', 'Refund'] as OrderEvent['type'][])
    .with({ status: 'shipped' }, () => ['Deliver'] as OrderEvent['type'][])
    .with({ status: 'delivered' }, () => [] as OrderEvent['type'][])
    .with({ status: 'cancelled' }, () => [] as OrderEvent['type'][])
    .with({ status: 'refunded' }, () => [] as OrderEvent['type'][])
    .exhaustive();
};

// Check if a transition is valid
export const isValidTransition = (
  currentStatus: OrderStatus,
  event: OrderEvent
): boolean => {
  const allowedEvents = getAllowedEvents(currentStatus);
  return allowedEvents.includes(event.type);
};

// Get human-readable status name
export const getStatusName = (status: OrderStatus): string => {
  return match(status)
    .with({ status: 'pending' }, () => 'Pending')
    .with({ status: 'paid' }, () => 'Paid')
    .with({ status: 'shipped' }, () => 'Shipped')
    .with({ status: 'delivered' }, () => 'Delivered')
    .with({ status: 'cancelled' }, () => 'Cancelled')
    .with({ status: 'refunded' }, () => 'Refunded')
    .exhaustive();
};

// Validate event data
export const validateEvent = (event: OrderEvent): { valid: boolean; error?: string } => {
  return match(event)
    .with({ type: 'Ship' }, (e) => {
      if (!e.trackingNumber || e.trackingNumber.trim() === '') {
        return { valid: false, error: 'Tracking number is required for Ship event' };
      }
      return { valid: true };
    })
    .with({ type: 'Cancel' }, (e) => {
      if (!e.reason || e.reason.trim() === '') {
        return { valid: false, error: 'Reason is required for Cancel event' };
      }
      return { valid: true };
    })
    .with({ type: 'Refund' }, (e) => {
      if (!e.reason || e.reason.trim() === '') {
        return { valid: false, error: 'Reason is required for Refund event' };
      }
      return { valid: true };
    })
    .with({ type: 'ConfirmPayment' }, () => ({ valid: true }))
    .with({ type: 'Deliver' }, () => ({ valid: true }))
    .exhaustive();
};
