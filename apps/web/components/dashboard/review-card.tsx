"use client";

import type { ReviewItem } from "@/lib/review-api";

interface ReviewCardProps {
  review: ReviewItem;
  onAction: () => void;
}

export function ReviewCard({ review, onAction }: ReviewCardProps) {
  // Stub implementation - will be replaced in Task 2
  return (
    <div>
      <p>{review.question}</p>
      <button onClick={onAction}>Approve Answer</button>
    </div>
  );
}
