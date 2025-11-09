import { connect } from '@/lib/db/mongoose';
import { Order, BalanceEvent } from '@/lib/db/models';
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

        // Start a session for transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
          // Fetch order
          const order = await Order.findById(id).session(session);
          if (!order) {
            await session.abortTransaction();
            session.endSession();
            return notFoundError('Order not found');
          }

          // Check if transition is valid
          if (!isValidTransition(order.status, event)) {
            await session.abortTransaction();
            session.endSession();
            const allowedEvents = getAllowedEvents(order.status);
            return badRequestError(
              `Invalid transition: Cannot apply ${event.type} to order with status ${order.status.status}`,
              { allowedEvents, currentStatus: order.status }
            );
          }

          // Apply state transition
          const newStatus = transitionOrder(order.status, event);
          if (!newStatus) {
            await session.abortTransaction();
            session.endSession();
            return internalServerError('Failed to transition order status');
          }

          // Handle refund: create BalanceEvent if payment was made with balance
          if (event.type === 'Refund' && order.payment?.method === 'balance') {
            await BalanceEvent.create([{
              user: order.user,
              amount: order.total,
              type: 'refund',
              reference: `Order refund: ${order._id}`,
            }], { session });
          }

          // Update order
          order.status = newStatus;
          await order.save({ session });

          // Commit transaction
          await session.commitTransaction();
          session.endSession();

          return successResponse({
            message: 'Order status updated successfully',
            order: {
              id: order._id,
              status: order.status,
              allowedEvents: getAllowedEvents(newStatus)
            }
          });
        } catch (err) {
          await session.abortTransaction();
          session.endSession();
          throw err;
        }
      }
    );
  } catch (error) {
    console.error('Order transition error:', error);
    return internalServerError(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
