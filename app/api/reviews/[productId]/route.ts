import { NextRequest, NextResponse } from 'next/server';
import { connect } from '../../../../lib/db/mongoose';
import Product from '../../../../lib/db/models/product';
import Review from '../../../../lib/db/models/review';
import { calculateRatingStats } from '../../../../lib/fp/ratingStats';

export async function GET(_request: NextRequest, context: { params: Promise<{ productId: string }> }) {
  const { productId } = await context.params;

  await connect();

  const reviews = await Review.find({ product: productId }).sort({ createdAt: -1 }).lean();

  if (reviews.length === 0) {
    const productExists = await Product.exists({ _id: productId });
    if (!productExists) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
  }

  const stats = calculateRatingStats(reviews.map((r) => ({ rating: r.rating })));

  return NextResponse.json({ productId, reviews, stats });
}
