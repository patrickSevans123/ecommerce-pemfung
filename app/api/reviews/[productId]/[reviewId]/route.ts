import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connect } from '../../../../../lib/db/mongoose';
import Product from '../../../../../lib/db/models/product';
import Review from '../../../../../lib/db/models/review';
import { calculateRatingStats } from '../../../../../lib/fp/ratingStats';

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
    return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  }

  return NextResponse.json(review);
}

// PATCH /api/reviews/[productId]/[reviewId] - Update a review
export async function PATCH(request: NextRequest, context: { params: Promise<{ productId: string; reviewId: string }> }) {
  const { productId, reviewId } = await context.params;
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
  }

  await connect();

  // Check if review exists and belongs to the product
  const existingReview = await Review.findById(reviewId);
  if (!existingReview) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  }

  if (existingReview.product.toString() !== productId) {
    return NextResponse.json({ error: 'Review does not belong to this product' }, { status: 400 });
  }

  // Update the review
  const updated = await Review.findByIdAndUpdate(
    reviewId,
    { $set: parsed.data },
    { new: true, runValidators: true }
  ).lean();

  // Recalculate product rating if rating was changed
  if (parsed.data.rating !== undefined) {
    const allReviews = await Review.find({ product: productId }).lean();
    const stats = calculateRatingStats(allReviews.map((r) => ({ rating: r.rating })));

    await Product.findByIdAndUpdate(productId, {
      avgRating: stats.average,
      reviewsCount: stats.count,
    });
  }

  return NextResponse.json(updated);
}

// DELETE /api/reviews/[productId]/[reviewId] - Delete a review
export async function DELETE(_request: NextRequest, context: { params: Promise<{ productId: string; reviewId: string }> }) {
  const { productId, reviewId } = await context.params;

  await connect();

  // Check if review exists and belongs to the product
  const existingReview = await Review.findById(reviewId);
  if (!existingReview) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  }

  if (existingReview.product.toString() !== productId) {
    return NextResponse.json({ error: 'Review does not belong to this product' }, { status: 400 });
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

  return NextResponse.json({ message: 'Review deleted successfully' });
}
