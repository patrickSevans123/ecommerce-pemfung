import { NextRequest } from 'next/server';
import { z } from 'zod';
import { connect } from '../../../../../lib/db/mongoose';
import Product from '../../../../../lib/db/models/product';
import Review from '../../../../../lib/db/models/review';
import { calculateRatingStats } from '../../../../../lib/fp/ratingStats';
import {
  validateRequestBody,
  handleValidation,
  successResponse,
  notFoundError,
  badRequestError,
} from '@/lib/api';

const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().optional(),
});

// GET /api/reviews/[productId]/[reviewId] - Get a single review
export async function GET(_request: NextRequest, context: { params: Promise<{ productId: string; reviewId: string }> }) {
  const { reviewId } = await context.params;

  await connect();

  const review = await Review.findById(reviewId).lean();

  if (!review) {
    return notFoundError('Review', reviewId);
  }

  return successResponse(review);
}

// PATCH /api/reviews/[productId]/[reviewId] - Update a review
export async function PATCH(request: NextRequest, context: { params: Promise<{ productId: string; reviewId: string }> }) {
  const { productId, reviewId } = await context.params;

  return handleValidation(
    await validateRequestBody(request, updateReviewSchema),
    async (data) => {
      await connect();

      // Check if review exists and belongs to the product
      const existingReview = await Review.findById(reviewId);
      if (!existingReview) {
        return notFoundError('Review', reviewId);
      }

      if (existingReview.product.toString() !== productId) {
        return badRequestError('Review does not belong to this product');
      }

      // Update the review
      const updated = await Review.findByIdAndUpdate(
        reviewId,
        { $set: data },
        { new: true, runValidators: true }
      ).lean();

      // Recalculate product rating if rating was changed
      if (data.rating !== undefined) {
        const allReviews = await Review.find({ product: productId }).lean();
        const stats = calculateRatingStats(allReviews.map((r) => ({ rating: r.rating })));

        await Product.findByIdAndUpdate(productId, {
          avgRating: stats.average,
          reviewsCount: stats.count,
        });
      }

      return successResponse(updated);
    }
  );
}

// DELETE /api/reviews/[productId]/[reviewId] - Delete a review
export async function DELETE(_request: NextRequest, context: { params: Promise<{ productId: string; reviewId: string }> }) {
  const { productId, reviewId } = await context.params;

  await connect();

  // Check if review exists and belongs to the product
  const existingReview = await Review.findById(reviewId);
  if (!existingReview) {
    return notFoundError('Review', reviewId);
  }

  if (existingReview.product.toString() !== productId) {
    return badRequestError('Review does not belong to this product');
  }

  // Delete the review
  await Review.findByIdAndDelete(reviewId);

  // Recalculate product rating
  const remainingReviews = await Review.find({ product: productId }).lean();
  const stats = calculateRatingStats(remainingReviews.map((r) => ({ rating: r.rating })));

  await Product.findByIdAndUpdate(productId, {
    avgRating: stats.average,
    reviewsCount: stats.count,
  });

  return successResponse({ message: 'Review deleted successfully' });
}
