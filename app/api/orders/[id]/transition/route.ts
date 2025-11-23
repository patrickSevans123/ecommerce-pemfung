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
        // Debug: log incoming transition request
        try {
          console.debug('[orders/transition] incoming', { orderId: id, event });
        } catch (e) {
          // noop
        }

        // Start a session for transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
          // Fetch order
          const order = await Order.findById(id).session(session);
          try {
            console.debug('[orders/transition] fetched order', {
              id: order?._id?.toString(),
              status: order?.status,
              payment: order?.payment,
              itemsCount: order?.items?.length ?? 0,
            });
          } catch (e) {
            // noop
          }
          if (!order) {
            await session.abortTransaction();
            session.endSession();
            return notFoundError('Order not found');
          }

          // Check if transition is valid. Special-case: allow Ship from 'pending' when payment is Cash On Delivery
          if (!(event.type === 'Ship' && order.status?.status === 'pending' && order.payment?.method === 'cash_on_delivery')) {
            if (!isValidTransition(order.status, event)) {
              const allowedEvents = getAllowedEvents(order.status);
              console.warn('[orders/transition] invalid transition', {
                orderId: id,
                currentStatus: order.status,
                attemptedEvent: event,
                allowedEvents,
              });
              await session.abortTransaction();
              session.endSession();
              return badRequestError(
                `Invalid transition: Cannot apply ${event.type} to order with status ${order.status.status}`,
                { allowedEvents, currentStatus: order.status }
              );
            }
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

          // Handle seller income for Cash On Delivery when order is marked delivered
          // When buyer confirms delivery (event.type === 'Deliver') and payment method is COD
          // create BalanceEvent(s) of type 'income' for each seller involved in the order
          if (event.type === 'Deliver' && order.payment?.method === 'cash_on_delivery') {
            const sellerAmounts: Record<string, number> = {};
            for (const item of order.items) {
              const sellerId = item.seller?.toString();
              if (!sellerId) continue;
              const itemTotal = (item.price || 0) * (item.quantity || 1);
              sellerAmounts[sellerId] = (sellerAmounts[sellerId] || 0) + itemTotal;
            }

            const sellerEvents = Object.entries(sellerAmounts).map(([sellerId, amount]) => ({
              user: new mongoose.Types.ObjectId(sellerId),
              amount,
              type: 'income' as const,
              reference: `Order COD income: ${order._id}`,
            }));

            if (sellerEvents.length > 0) {
              // When creating multiple BalanceEvent documents in a session, include ordered:true
              await BalanceEvent.create(sellerEvents, { session, ordered: true });
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

          return successResponse({
            message: 'Order status updated successfully',
            order: {
              id: order._id,
              status: order.status,
              allowedEvents: getAllowedEvents(newStatus)
            }
          });
        } catch (err) {
          // Log full context to help debugging 500s
          try {
            console.error('[orders/transition] transaction failed', {
              orderId: id,
              event,
              // order may be undefined here if fetch failed earlier
              orderStatus: (err && (err as any).orderStatus) || undefined,
              error: err instanceof Error ? err.message : String(err),
              stack: err instanceof Error ? err.stack : undefined,
            });
          } catch (logErr) {
            console.error('[orders/transition] logging error', logErr);
          }
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
