/**
 * Balance Operations Module
 * 
 * This module provides pure functional operations for balance calculations.
 * It follows functional programming principles:
 * - Pure functions (no side effects)
 * - Immutable data
 * - Composition over imperative logic
 */

export type BalanceEventType = 'deposit' | 'payment' | 'withdrawn' | 'refund' | 'income';

export interface BalanceEventRecord {
  amount: number;
  type: BalanceEventType;
}

/**
 * Event type multiplier map
 * Maps each event type to its multiplier for balance calculation
 * - deposit: +1 (adds to balance)
 * - payment: -1 (deducts from balance)
 * - withdrawn: -1 (deducts from balance)
 * - refund: +1 (adds to balance)
 */
export const eventTypeMultiplier: Record<BalanceEventType, number> = {
  deposit: 1,
  payment: -1,
  withdrawn: -1,
  refund: 1,
  income: 1,
} as const;

/**
 * Calculate the signed value of a balance event
 * Pure function that converts an event to its signed monetary value
 * 
 * @param event - The balance event record
 * @returns The signed monetary value (positive for deposits, negative for deductions)
 * 
 * @example
 * calculateEventValue({ amount: 100, type: 'deposit' }) // => 100
 * calculateEventValue({ amount: 50, type: 'payment' }) // => -50
 */
export const calculateEventValue = (event: BalanceEventRecord): number => {
  const multiplier = eventTypeMultiplier[event.type] ?? 0;
  return multiplier * event.amount;
};

/**
 * Sum all balance events to calculate total balance
 * Pure function using reduce to aggregate event values
 * 
 * @param events - Array of balance event records
 * @returns The total balance calculated from all events
 * 
 * @example
 * sumBalanceEvents([
 *   { amount: 100, type: 'deposit' },
 *   { amount: 30, type: 'payment' }
 * ]) // => 70
 */
export const sumBalanceEvents = (events: BalanceEventRecord[]): number =>
  events.reduce((total, event) => total + calculateEventValue(event), 0);

/**
 * Filter events by type
 * Higher-order function for filtering events
 * 
 * @param type - The event type to filter by
 * @returns A filter function for the specified event type
 * 
 * @example
 * const deposits = events.filter(filterByEventType('deposit'));
 */
export const filterByEventType = (type: BalanceEventType) =>
  (event: BalanceEventRecord): boolean => event.type === type;

/**
 * Calculate total for a specific event type
 * Composition of filter and sum operations
 * 
 * @param events - Array of balance event records
 * @param type - The event type to sum
 * @returns The total amount for the specified event type
 * 
 * @example
 * sumEventsByType(events, 'deposit') // => total deposits
 */
export const sumEventsByType = (
  events: BalanceEventRecord[],
  type: BalanceEventType
): number => {
  const filteredEvents = events.filter(filterByEventType(type));
  return filteredEvents.reduce((sum, event) => sum + event.amount, 0);
};

/**
 * Get balance statistics
 * Provides detailed breakdown of balance composition
 * 
 * @param events - Array of balance event records
 * @returns Object containing total balance and breakdown by event type
 * 
 * @example
 * getBalanceStats(events)
 * // => { balance: 70, deposits: 100, payments: 20, withdrawals: 10, refunds: 0 }
 */
export const getBalanceStats = (events: BalanceEventRecord[]) => ({
  balance: sumBalanceEvents(events),
  deposits: sumEventsByType(events, 'deposit'),
  payments: sumEventsByType(events, 'payment'),
  withdrawals: sumEventsByType(events, 'withdrawn'),
  refunds: sumEventsByType(events, 'refund'),
  incomes: sumEventsByType(events, 'income'),
  eventCount: events.length,
});
