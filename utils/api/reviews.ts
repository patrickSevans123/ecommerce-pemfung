import { CreateReviewDto, Review, ReviewsResponse } from '@/types/review';
import { fetchAPI } from './fetcher';

export const reviewsAPI = {
  getByProduct: (productId: string): Promise<ReviewsResponse> => {
    return fetchAPI<ReviewsResponse>(`/reviews/${productId}`);
  },

  create: (data: CreateReviewDto): Promise<{ review: Review; stats: { count: number; average: number } }> => {
    return fetchAPI(`/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
