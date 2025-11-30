'use client';

import React from 'react';
import { Review } from '@/types/review';
import { Star } from 'lucide-react';

interface Props {
  reviews: Review[];
  stats?: { count: number; average: number } | null;
}

const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-gray-200 text-gray-200'
            }`}
        />
      ))}
    </div>
  );
};

export default function ReviewList({ reviews, stats }: Props) {
  const [sortBy, setSortBy] = React.useState('recent');

  return (
    <div className="space-y-6">
      {/* Compact Header */}
      <div className="flex items-center justify-between pb-4 border-b-2 border-gray-900">
        <div className="flex items-center gap-4">
          <div className="text-3xl font-bold text-gray-900">
            {stats?.average.toFixed(1) || '0.0'}
          </div>
          <div>
            <StarRating rating={Math.round(stats?.average || 0)} />
            <p className="text-sm text-gray-600 mt-1">
              {stats?.count || 0} review{stats?.count !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-1.5 border-b-2 border-gray-900 text-sm font-medium bg-transparent focus:outline-none cursor-pointer"
        >
          <option value="recent">Most Recent</option>
          <option value="helpful">Most Helpful</option>
          <option value="highest">Highest Rating</option>
          <option value="lowest">Lowest Rating</option>
        </select>
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-600">Be the first to review this product.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div
              key={review._id}
              className="border-b border-gray-200 pb-6 last:border-0"
            >
              <div className="flex items-center justify-between mb-2">
                <StarRating rating={review.rating} />
                <span className="text-xs text-gray-500">
                  {review.createdAt
                    ? new Date(review.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                    : ''}
                </span>
              </div>
              {review.comment && (
                <p className="text-gray-800 mb-2 leading-relaxed">
                  {review.comment}
                </p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">
                  {/* support populated user object or string id */}
                  {typeof review.user === 'string'
                    ? 'Anonymous'
                    : review.user?.name || 'Anonymous'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}