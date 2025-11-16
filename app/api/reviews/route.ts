import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connect } from '../../../lib/db/mongoose';
import Product from '../../../lib/db/models/product';
import Review from '../../../lib/db/models/review';
import { calculateRatingStats } from '../../../lib/fp/ratingStats';
import {
  validateRequestBody,
  handleValidation,
  notFoundError,
  createdResponse,
} from '@/lib/api';

const createReviewSchema = z.object({
  productId: z.string().min(1),
  userId: z.string().min(1).optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export async function POST(request: NextRequest) {
  return handleValidation(
    await validateRequestBody(request, createReviewSchema),
    async (data) => {
      const { productId, userId, rating, comment } = data;

      await connect();

      const product = await Product.findById(productId);
      if (!product) {
        return notFoundError('Product', productId);
      }

      const reviewDoc = await Review.create({
        product: productId,
        user: userId,
        rating,
        comment,
      });

      const reviews = await Review.find({ product: productId }).sort({ createdAt: -1 }).lean();
      const stats = calculateRatingStats(reviews.map((r) => ({ rating: r.rating })));

      await Product.findByIdAndUpdate(productId, {
        avgRating: stats.average,
        reviewsCount: stats.count,
      });

      // Emit ReviewAdded notification removed - no longer supported
      // Review added events are no longer emitted as notifications
      // You can implement this separately if needed

      return createdResponse({ review: reviewDoc.toObject(), stats });
    }
  );
}
