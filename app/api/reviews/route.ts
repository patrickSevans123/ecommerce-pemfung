import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connect } from '../../../lib/db/mongoose';
import Product from '../../../lib/db/models/product';
import Review from '../../../lib/db/models/review';
import { calculateRatingStats } from '../../../lib/fp/ratingStats';

const createReviewSchema = z.object({
  productId: z.string().min(1),
  userId: z.string().min(1).optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().optional(),
  comment: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const parsed = createReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
  }

  const { productId, userId, rating, title, comment } = parsed.data;

  await connect();

  const product = await Product.findById(productId);
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const reviewDoc = await Review.create({
    product: productId,
    user: userId,
    rating,
    title,
    comment,
  });

  const reviews = await Review.find({ product: productId }).sort({ createdAt: -1 }).lean();
  const stats = calculateRatingStats(reviews.map((r) => ({ rating: r.rating })));

  await Product.findByIdAndUpdate(productId, {
    avgRating: stats.average,
    reviewsCount: stats.count,
  });

  return NextResponse.json({ review: reviewDoc.toObject(), stats }, { status: 201 });
}
