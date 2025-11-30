import { connect } from '@/lib/db/mongoose';
import { Order } from '@/lib/db/models';
import { successResponse, badRequestError, internalServerError } from '@/lib/api';
import mongoose from 'mongoose';

export async function GET(request: Request) {
  try {
    await connect();

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const sellerId = url.searchParams.get('sellerId');

    interface OrderFilter {
      user?: mongoose.Types.ObjectId;
      'items.seller'?: mongoose.Types.ObjectId;
    }

    const filter: OrderFilter = {};

    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) return badRequestError('Invalid userId');
      filter.user = new mongoose.Types.ObjectId(userId);
    }

    if (sellerId) {
      if (!mongoose.Types.ObjectId.isValid(sellerId)) return badRequestError('Invalid sellerId');
      filter['items.seller'] = new mongoose.Types.ObjectId(sellerId);
    }

    // If neither provided, return bad request
    if (!userId && !sellerId) {
      return badRequestError('Either userId or sellerId query param is required');
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('user', 'email name')
      .populate('items.product')
      .lean();

    return successResponse(orders);
  } catch (error) {
    console.error('List orders error:', error);
    return internalServerError(error instanceof Error ? error.message : 'Unknown error');
  }
}
