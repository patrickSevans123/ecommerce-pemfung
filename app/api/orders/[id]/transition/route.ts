import { NextResponse } from 'next/server';
import { connect } from '@/lib/db/mongoose';
import { Order } from '@/lib/db/models';
import { transitionOrder, isValidTransition, getAllowedEvents } from '@/lib/order/stateMachine';
import { orderTransitionSchema, safeJsonParse, createValidationErrorResponse } from '@/lib/validation/schemas';
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
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      );
    }

    // Safely parse JSON
    const body = await safeJsonParse(request);
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Validate request with Zod
    const parsed = orderTransitionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        createValidationErrorResponse(parsed.error),
        { status: 400 }
      );
    }

    const { event } = parsed.data;

    // Fetch order
    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if transition is valid
    if (!isValidTransition(order.status, event)) {
      const allowedEvents = getAllowedEvents(order.status);
      return NextResponse.json(
        {
          error: `Invalid transition: Cannot apply ${event.type} to order with status ${order.status.status}`,
          allowedEvents,
          currentStatus: order.status
        },
        { status: 400 }
      );
    }

    // Apply state transition
    const newStatus = transitionOrder(order.status, event);
    if (!newStatus) {
      return NextResponse.json(
        { error: 'Failed to transition order status' },
        { status: 500 }
      );
    }

    // Update order
    order.status = newStatus;
    await order.save();

    return NextResponse.json(
      {
        message: 'Order status updated successfully',
        order: {
          id: order._id,
          status: order.status,
          allowedEvents: getAllowedEvents(newStatus)
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Order transition error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
