export interface Review {
  _id: string;
  product: string;
  // user may be an ObjectId string or a populated user object from the API
  user?: string | { _id?: string; name?: string; email?: string };
  rating: number;
  comment?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateReviewDto {
  productId: string;
  rating: number;
  comment?: string;
  userId?: string;
}

export interface ReviewsResponse {
  productId: string;
  reviews: Review[];
  stats: {
    count: number;
    average: number;
    distribution?: Record<string, number>;
  };
}
