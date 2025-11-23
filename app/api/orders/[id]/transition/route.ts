import { connect } from '@/lib/db/mongoose';
import { Order, BalanceEvent } from '@/lib/db/models';
import { transitionOrder, isValidTransition, getAllowedEvents } from '@/lib/order/stateMachine';
import { orderTransitionSchema } from '@/lib/validation/schemas';
import { validateRequestBody, handleValidation, successResponse, notFoundError, badRequestError, internalServerError } from '@/lib/api';
import { emitEvent } from '@/lib/notifications';
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

          // Handle delivery: create income BalanceEvents for each seller
          if (event.type === 'Deliver') {
            // Group items by seller and calculate income per seller
            const sellerIncomes = new Map<string, number>();

            order.items.forEach(item => {
              const sellerId = item.seller.toString();
              const itemTotal = item.price * item.quantity;
              const currentIncome = sellerIncomes.get(sellerId) || 0;
              sellerIncomes.set(sellerId, currentIncome + itemTotal);
            });

            // Create income balance events for each seller
            const incomeEvents = Array.from(sellerIncomes.entries()).map(([sellerId, amount]) => ({
              user: new mongoose.Types.ObjectId(sellerId),
              amount,
              type: 'income' as const,
              reference: `Income from order: ${order._id}`,
            }));

            if (incomeEvents.length > 0) {
              await BalanceEvent.create(incomeEvents, { session, ordered: true });
            }
          }

          // Update order
          order.status = newStatus;
          await order.save({ session });

          // Commit transaction
          await session.commitTransaction();
          session.endSession();

          // Emit OrderShipped notification if applicable (fire-and-forget)
          if (event.type === 'Ship') {
            emitEvent({
              type: 'ORDER_SHIPPED',
              userId: order.user?.toString() || '',
              orderId: id,
              trackingNumber: event.trackingNumber,
              sellerId: order.items[0]?.seller?.toString() || '',
            }).catch(error => console.error('Failed to emit OrderShipped event:', error));
          }

          // Emit OrderDelivered notification if applicable (fire-and-forget)
          if (event.type === 'Deliver') {
            emitEvent({
              type: 'ORDER_DELIVERED',
              userId: order.user?.toString() || '',
              orderId: id,
              sellerId: order.items[0]?.seller?.toString() || '',
              data: {
                orderId: id,
                deliveredAt: newStatus.status === 'delivered' ? newStatus.deliveredAt : undefined,
              },
            }).catch(error => console.error('Failed to emit OrderDelivered event:', error));
          }

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