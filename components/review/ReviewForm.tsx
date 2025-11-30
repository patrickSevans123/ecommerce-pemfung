'use client';

import React, { useState } from 'react';
import { CreateReviewDto, Review } from '@/types/review';
import { reviewsAPI } from '@/utils/api/reviews';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { Star } from 'lucide-react';

interface Props {
  productId: string;
  onCreated?: (review: Review) => void;
}

export default function ReviewForm({ productId, onCreated }: Props) {
  const { user, isAuthenticated } = useAuthStore();

  const [rating, setRating] = useState<number>(5);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!isAuthenticated) {
      toast.error('Please log in to submit a review');
      return;
    }

    if (rating < 1 || rating > 5) {
      toast.error('Rating must be between 1 and 5');
      return;
    }

    const payload: CreateReviewDto = {
      productId,
      rating,
      comment: comment || undefined,
      userId: user?.id,
    };

    try {
      setIsSubmitting(true);
      const res = await reviewsAPI.create(payload);
      const created = res.review;
      toast.success('Review submitted');
      setComment('');
      setRating(5);
      if (onCreated) onCreated(created);
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Failed to submit review';
      console.error('Create review error:', err);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label className="text-sm font-medium text-gray-900 mb-2 block">
          Your Rating
        </Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`w-8 h-8 cursor-pointer ${
                  star <= (hoveredRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-gray-200 text-gray-200'
                }`}
              />
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-1">
          {rating === 5 && 'Excellent'}
          {rating === 4 && 'Good'}
          {rating === 3 && 'Fair'}
          {rating === 2 && 'Poor'}
          {rating === 1 && 'Terrible'}
        </p>
      </div>

      <div>
        <Label htmlFor="comment" className="text-sm font-medium text-gray-900">
          Your Review <span className="text-gray-500 font-normal">(optional)</span>
        </Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your thoughts about this product..."
          className="mt-1.5 min-h-[100px] resize-none"
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-gray-900 hover:bg-gray-800 text-white"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Review'}
      </Button>
    </form>
  );
}