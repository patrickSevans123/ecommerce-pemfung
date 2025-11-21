/**
 * URL Parameter Utilities
 * Functional helpers for building search parameters
 */

export type FilterState = {
  q?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  minRating?: string;
  inStock?: boolean;
  sort: string;
};

/**
 * Build URL search parameters from filter state
 * Filters out empty, undefined, and default values
 * @param filters - Filter configuration object
 * @returns URLSearchParams ready for use in URL
 */
export const buildSearchParams = (filters: FilterState): URLSearchParams => {
  const entries = Object.entries(filters)
    .filter(([, value]) =>
      value !== undefined &&
      value !== '' &&
      value !== 'all' &&
      value !== false
    )
    .map(([key, value]) => [key, String(value)]);

  return new URLSearchParams(entries);
};
