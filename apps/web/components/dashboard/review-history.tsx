"use client";

import type { ReviewItem } from "@/lib/review-api";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ConfidenceBadge } from "@/components/confidence-badge";

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  approved: {
    label: "Approved",
    className: "bg-[hsl(142,71%,45%)] text-white hover:bg-[hsl(142,71%,40%)]",
  },
  edited: {
    label: "Edited",
    className: "bg-[hsl(210,100%,50%)] text-white hover:bg-[hsl(210,100%,45%)]",
  },
  rejected: {
    label: "Replaced",
    className: "bg-[hsl(38,92%,50%)] text-white hover:bg-[hsl(38,92%,45%)]",
  },
};

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export function ReviewHistory({ reviews }: { reviews: ReviewItem[] }) {
  return (
    <ScrollArea className="max-h-[calc(100vh-16rem)]">
      <div className="flex flex-col gap-8">
        {reviews.map((review) => {
          const status = statusConfig[review.review_status] ?? {
            label: review.review_status,
            className: "",
          };
          const displayAnswer =
            review.review_status === "edited" ||
            review.review_status === "rejected"
              ? review.founder_answer ?? review.answer
              : review.answer;

          return (
            <Card key={review.query_id} className="opacity-80">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardDescription className="text-sm text-muted-foreground">
                    {review.section_context
                      ? `Section: ${review.section_context}`
                      : "General question"}
                    {review.created_at && (
                      <span className="ml-2">
                        {formatTimeAgo(review.created_at)}
                      </span>
                    )}
                  </CardDescription>
                  <Badge className={status.className}>{status.label}</Badge>
                </div>
                <CardTitle className="text-base">{review.question}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <Separator />
                <p className="text-base leading-relaxed">{displayAnswer}</p>

                {review.confidence_tier && review.confidence_score != null && (
                  <ConfidenceBadge
                    tier={
                      review.confidence_tier as "high" | "moderate" | "low"
                    }
                    score={review.confidence_score}
                  />
                )}

                {review.citations.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {review.citations.map((c, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {c.document_title}
                        {c.section_label ? ` > ${c.section_label}` : ""}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}
