import { connect } from '../../../../lib/db/mongoose';
import Product from '../../../../lib/db/models/product';
import { searchProducts, ProductFilterOptions } from '../../../../lib/fp/productFilters';
import type { FilterQuery } from 'mongoose';
import type { ProductDocument } from '../../../../lib/db/models/product';
import { successResponse } from '@/lib/api';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || undefined;
  const category = url.searchParams.get('category') || undefined;
  const minPrice = url.searchParams.get('minPrice') ? Number(url.searchParams.get('minPrice')) : undefined;
  const maxPrice = url.searchParams.get('maxPrice') ? Number(url.searchParams.get('maxPrice')) : undefined;
  const minRating = url.searchParams.get('minRating') ? Number(url.searchParams.get('minRating')) : undefined;
  const inStock = url.searchParams.get('inStock') ? url.searchParams.get('inStock') === 'true' : undefined;
  const limit = url.searchParams.get('limit') ? Math.min(500, Number(url.searchParams.get('limit'))) : 100;
  const skip = url.searchParams.get('skip') ? Number(url.searchParams.get('skip')) : 0;

  const opts: ProductFilterOptions = { q, category, minPrice, maxPrice, minRating, inStock };

  await connect();

  // If text query provided, use MongoDB text search (uses text index on title/description)
  const baseQuery: FilterQuery<ProductDocument> = {};
  if (q) baseQuery.$text = { $search: q };
  if (!q && category) baseQuery.category = category;
  if (!q && typeof minPrice === 'number') baseQuery.price = { ...baseQuery.price, $gte: minPrice };
  if (!q && typeof maxPrice === 'number') baseQuery.price = { ...baseQuery.price, $lte: maxPrice };
  if (inStock === true) baseQuery.stock = { $gt: 0 };

  // fetch candidates from DB
  const candidates = await Product.find(baseQuery).limit(limit).skip(skip).lean();

  // apply remaining filters (minRating, and fallback text filtering if needed)
  const results = searchProducts(candidates, opts);

  return successResponse(results);
}
