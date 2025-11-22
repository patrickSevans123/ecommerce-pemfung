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
  const sort = url.searchParams.get('sort') || 'newest';
  const limit = url.searchParams.get('limit') ? Math.min(500, Number(url.searchParams.get('limit'))) : 100;
  const skip = url.searchParams.get('skip') ? Number(url.searchParams.get('skip')) : 0;

  const opts: ProductFilterOptions = { q, category, minPrice, maxPrice, minRating, inStock };

  await connect();

  // Build query with support for partial text search
  const baseQuery: FilterQuery<ProductDocument> = {};

  // Use regex for partial matching instead of text search for better UX
  if (q) {
    const searchRegex = new RegExp(q, 'i'); // case-insensitive regex
    baseQuery.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { tags: { $in: [searchRegex] } }
    ];
  }

  if (category) baseQuery.category = category;
  if (typeof minPrice === 'number') baseQuery.price = { ...baseQuery.price, $gte: minPrice };
  if (typeof maxPrice === 'number') baseQuery.price = { ...baseQuery.price, $lte: maxPrice };
  if (inStock === true) baseQuery.stock = { $gt: 0 };

  // Determine sort order
  let sortOrder: Record<string, 1 | -1> = {};
  switch (sort) {
    case 'price-asc':
      sortOrder = { price: 1 };
      break;
    case 'price-desc':
      sortOrder = { price: -1 };
      break;
    case 'rating-desc':
      sortOrder = { avgRating: -1 };
      break;
    case 'newest':
    default:
      sortOrder = { createdAt: -1 };
      break;
  }

  // fetch candidates from DB with sorting
  const candidates = await Product.find(baseQuery).sort(sortOrder).limit(limit).skip(skip).lean();

  // apply remaining filters (minRating, and fallback text filtering if needed)
  const results = searchProducts(candidates, opts);

  return successResponse(results);
}
