import { RatingStats, RatingValue } from '../domain';

const ratingValues: RatingValue[] = [1, 2, 3, 4, 5];

type RatingLike = { rating: number };

const toRatingValue = (value: number): RatingValue => {
  const clamped = Math.min(5, Math.max(1, Math.round(value)));
  return clamped as RatingValue;
};

const normalizeDistribution = (
  distribution?: Partial<Record<RatingValue, number>>
): Record<RatingValue, number> =>
  Object.fromEntries(
    ratingValues.map(key => [key, distribution?.[key] ?? 0])
  ) as Record<RatingValue, number>;

export const emptyRatingStats = (): RatingStats => ({
  count: 0,
  sum: 0,
  average: 0,
  distribution: normalizeDistribution(),
});

export const combineRatingStats = (a: RatingStats, b: RatingStats): RatingStats => {
  const count = a.count + b.count;
  const sum = a.sum + b.sum;
  const average = count === 0 ? 0 : sum / count;
  const distribution = ratingValues.reduce((acc, value) => ({
    ...acc,
    [value]: (a.distribution[value] ?? 0) + (b.distribution[value] ?? 0)
  }), {} as Record<RatingValue, number>);

  return { count, sum, average, distribution };
};

export const reviewToStats = (review: RatingLike): RatingStats => {
  const rating = toRatingValue(review.rating);
  const distribution = normalizeDistribution({ [rating]: 1 });
  return {
    count: 1,
    sum: rating,
    average: rating,
    distribution,
  };
};

export const calculateRatingStats = <T extends RatingLike>(reviews: T[]): RatingStats => {
  return reviews.reduce((acc, review) => combineRatingStats(acc, reviewToStats(review)), emptyRatingStats());
};

export const ratingMonoid = {
  empty: emptyRatingStats,
  concat: combineRatingStats,
};

export type { RatingStats };
