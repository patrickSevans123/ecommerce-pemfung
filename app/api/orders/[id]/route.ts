import { connect } from '@/lib/db/mongoose';
import { Order } from '@/lib/db/models';
import { successResponse, notFoundError, badRequestError, internalServerError } from '@/lib/api';
import mongoose from 'mongoose';

export async function GET(
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

    // Fetch order
    const order = await Order.findById(id)
      .populate('user', 'email name')
      .populate('items.product', 'title price')
      .populate('promoCode', 'code description');

    if (!order) {
      return notFoundError('Order not found');
    }

    return successResponse(order);
  } catch (error) {
    console.error('Get order error:', error);
    return internalServerError(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
