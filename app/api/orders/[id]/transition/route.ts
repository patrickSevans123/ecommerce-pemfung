import { connect } from '@/lib/db/mongoose';
import { Order } from '@/lib/db/models';
import { transitionOrder, isValidTransition, getAllowedEvents } from '@/lib/order/stateMachine';
import { orderTransitionSchema } from '@/lib/validation/schemas';
import { validateRequestBody, handleValidation, successResponse, notFoundError, badRequestError, internalServerError } from '@/lib/api';
import mongoose from 'mongoose';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connect();

    const { id } = await params;

    // Validate order ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return badRequestError('Invalid order ID');
    }

    // Use our new validation utility
    return await handleValidation(
      await validateRequestBody(request, orderTransitionSchema),
      async (data) => {
        const { event } = data;

        // Fetch order
        const order = await Order.findById(id);
        if (!order) {
          return notFoundError('Order not found');
        }

        // Check if transition is valid
        if (!isValidTransition(order.status, event)) {
          const allowedEvents = getAllowedEvents(order.status);
          return badRequestError(
            `Invalid transition: Cannot apply ${event.type} to order with status ${order.status.status}`,
            { allowedEvents, currentStatus: order.status }
          );
        }

        // Apply state transition
        const newStatus = transitionOrder(order.status, event);
        if (!newStatus) {
          return internalServerError('Failed to transition order status');
        }

        // Update order
        order.status = newStatus;
        await order.save();

        return successResponse({
          message: 'Order status updated successfully',
          order: {
            id: order._id,
            status: order.status,
            allowedEvents: getAllowedEvents(newStatus)
          }
        });
      }
    );
  } catch (error) {
    console.error('Order transition error:', error);
    return internalServerError(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
