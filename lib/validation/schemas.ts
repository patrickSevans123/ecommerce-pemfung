// Centralized Zod validation schemas for API routes
import { z } from 'zod';

// Checkout validation schema
export const checkoutSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  paymentMethod: z.enum(['balance', 'cash_on_delivery'], {
    message: 'Payment method must be "balance" or "cash_on_delivery"'
  }),
  shippingAddress: z.string().min(10, 'Shipping address must be at least 10 characters'),
  promoCode: z.string().optional(),
  items: z.array(z.string()).optional(),  // Optional list of selected product IDs to checkout (filters cart items)
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

// Payment processing validation schema
export const paymentProcessSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  promoCode: z.string().optional(),
});

export type PaymentProcessInput = z.infer<typeof paymentProcessSchema>;

// Order transition validation schema
export const orderTransitionSchema = z.object({
  event: z.discriminatedUnion('type', [
    z.object({ type: z.literal('ConfirmPayment') }),
    z.object({
      type: z.literal('Ship'),
      trackingNumber: z.string().min(1, 'Tracking number is required')
    }),
    z.object({ type: z.literal('Deliver') }),
    z.object({
      type: z.literal('Cancel'),
      reason: z.string().min(1, 'Cancellation reason is required')
    }),
    z.object({
      type: z.literal('Refund'),
      reason: z.string().min(1, 'Refund reason is required')
    }),
  ]),
});

export type OrderTransitionInput = z.infer<typeof orderTransitionSchema>;

// Helper function to safely parse JSON
export const safeJsonParse = async (request: Request): Promise<unknown | null> => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

// Helper function to create validation error response
export const createValidationErrorResponse = (errors: z.ZodError) => {
  return {
    error: 'Validation failed',
    details: errors.format(),
  };
};
