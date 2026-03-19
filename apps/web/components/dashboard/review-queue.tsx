"use client";

import type { ReviewItem } from "@/lib/review-api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ReviewCard } from "@/components/dashboard/review-card";

interface ReviewQueueProps {
  reviews: ReviewItem[];
  onReviewAction: () => void;
}

export function ReviewQueue({ reviews, onReviewAction }: ReviewQueueProps) {
  return (
    <ScrollArea className="max-h-[calc(100vh-16rem)]">
      <div className="flex flex-col gap-8">
        {reviews.map((review) => (
          <ReviewCard
            key={review.query_id}
            review={review}
            onAction={onReviewAction}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
