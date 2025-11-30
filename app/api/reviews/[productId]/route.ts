import { NextRequest } from 'next/server';
import { connect } from '../../../../lib/db/mongoose';
import Product from '../../../../lib/db/models/product';
import Review from '../../../../lib/db/models/review';
import { calculateRatingStats } from '../../../../lib/fp/ratingStats';
import { successResponse, notFoundError } from '@/lib/api';

export async function GET(_request: NextRequest, context: { params: Promise<{ productId: string }> }) {
  const { productId } = await context.params;

  await connect();

  // populate user info
  const reviews = await Review.find({ product: productId })
    .sort({ createdAt: -1 })
    .populate('user', 'name email')
    .lean();

  if (reviews.length === 0) {
    const productExists = await Product.exists({ _id: productId });
    if (!productExists) {
      return notFoundError('Product', productId);
    }
  }

  const stats = calculateRatingStats(reviews.map((r) => ({ rating: r.rating })));

  return successResponse({ productId, reviews, stats });
}
