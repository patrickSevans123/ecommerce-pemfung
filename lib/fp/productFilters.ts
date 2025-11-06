
// Product shape (loose) — matches the Mongoose lean() documents we return
export type ProductDoc = {
  _id?: string | { toString(): string };
  id?: string;
  title?: string;
  description?: string;
  price?: number;
  category?: string;
  images?: string[];
  stock?: number;
  seller?: string | { toString(): string };
  tags?: string[];
  avgRating?: number;
  reviewsCount?: number;
  version?: number;
  [k: string]: unknown;
};

// Filter options
export type ProductFilterOptions = {
  q?: string; // text search
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStock?: boolean;
};

// Pure predicate functions
export const byCategory = (category?: string) => (p: ProductDoc) => {
  if (!category) return true;
  return (p.category || '').toLowerCase() === category.toLowerCase();
};

export const byPriceRange = (min?: number, max?: number) => (p: ProductDoc) => {
  const price = typeof p.price === 'number' ? p.price : NaN;
  if (typeof min === 'number' && typeof max === 'number') return price >= min && price <= max;
  if (typeof min === 'number') return price >= min;
  if (typeof max === 'number') return price <= max;
  return true;
};

export const byRating = (minRating?: number) => (p: ProductDoc) => {
  if (typeof minRating !== 'number') return true;
  const r = typeof p.avgRating === 'number' ? p.avgRating : 0;
  return r >= minRating;
};

export const byInStock = (inStock?: boolean) => (p: ProductDoc) => {
  if (typeof inStock !== 'boolean') return true;
  const s = typeof p.stock === 'number' ? p.stock : 0;
  return inStock ? s > 0 : true;
};

export const byText = (q?: string) => (p: ProductDoc) => {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  const hay = `${p.title || ''} ${p.description || ''}`.toLowerCase();
  return hay.includes(needle);
};

// Compose multiple predicates using Ramda.allPass
export const composePredicates = (preds: Array<(p: ProductDoc) => boolean>) => {
  if (!preds || preds.length === 0) return () => true;
  return (product: ProductDoc) => preds.every((predicate) => predicate(product));
};

// Apply filters to an array of products (pure)
export const applyFilters = (products: ProductDoc[], opts: ProductFilterOptions) => {
  const preds: Array<(p: ProductDoc) => boolean> = [];
  preds.push(byText(opts.q));
  preds.push(byCategory(opts.category));
  preds.push(byPriceRange(opts.minPrice, opts.maxPrice));
  preds.push(byRating(opts.minRating));
  preds.push(byInStock(opts.inStock));

  const filterFn = composePredicates(preds);
  return products.filter(filterFn);
};

export const searchProducts = (products: ProductDoc[], opts: ProductFilterOptions) => applyFilters(products, opts);

const productFilterFns = {
  byCategory,
  byPriceRange,
  byRating,
  byInStock,
  byText,
  composePredicates,
  applyFilters,
  searchProducts,
};

export default productFilterFns;
