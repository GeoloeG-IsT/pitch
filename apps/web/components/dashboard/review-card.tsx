"use client";

import { useState } from "react";
import type { ReviewItem } from "@/lib/review-api";
import { submitReview } from "@/lib/review-api";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { InlineEditor } from "@/components/dashboard/inline-editor";
import { RejectionForm } from "@/components/dashboard/rejection-form";
import { toast } from "sonner";

function timeAgo(dateStr: string | null): string {
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

interface ReviewCardProps {
  review: ReviewItem;
  onAction: () => void;
}

export function ReviewCard({ review, onAction }: ReviewCardProps) {
  const [mode, setMode] = useState<"view" | "edit" | "reject">("view");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exiting, setExiting] = useState(false);

  function animateAndCallback() {
    setExiting(true);
    setTimeout(() => onAction(), 300);
  }

  async function handleApprove() {
    try {
      setIsSubmitting(true);
      await submitReview(review.query_id, { action: "approve" });
      toast.success("Answer approved");
      animateAndCallback();
    } catch {
      toast.error("Could not save your review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEdit(text: string) {
    try {
      setIsSubmitting(true);
      await submitReview(review.query_id, {
        action: "edit",
        edited_answer: text,
      });
      toast.success("Answer edited and approved");
      animateAndCallback();
    } catch {
      toast.error("Could not save your review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReject(text: string) {
    try {
      setIsSubmitting(true);
      await submitReview(review.query_id, {
        action: "reject",
        edited_answer: text,
      });
      toast.success("Answer replaced");
      animateAndCallback();
    } catch {
      toast.error("Could not save your review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card
      className={`transition-all duration-300 ${exiting ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
    >
      <CardHeader>
        <CardDescription className="text-sm text-muted-foreground">
          {review.section_context
            ? `Section: ${review.section_context}`
            : "General question"}
          {review.created_at && (
            <span className="ml-2">{timeAgo(review.created_at)}</span>
          )}
        </CardDescription>
        <p className="text-base font-medium">{review.question}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        <Separator />

        {/* Answer area */}
        {mode === "view" && (
          <p className="text-base leading-relaxed">{review.answer}</p>
        )}
        {mode === "edit" && (
          <InlineEditor
            initialText={review.answer ?? ""}
            onSave={handleEdit}
            onDiscard={() => setMode("view")}
          />
        )}
        {mode === "reject" && (
          <div className="space-y-3">
            <p className="text-base leading-relaxed text-muted-foreground">
              {review.answer}
            </p>
            <RejectionForm
              onSubmit={handleReject}
              onCancel={() => setMode("view")}
            />
          </div>
        )}

        {/* Confidence badge */}
        {review.confidence_tier && review.confidence_score != null && (
          <ConfidenceBadge
            tier={review.confidence_tier as "high" | "moderate" | "low"}
            score={review.confidence_score}
          />
        )}

        {/* Citations */}
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

        <Separator />

        {/* Action buttons (view mode only) */}
        {mode === "view" && (
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleApprove} disabled={isSubmitting}>
              Approve Answer
            </Button>
            <Button
              variant="outline"
              onClick={() => setMode("edit")}
              disabled={isSubmitting}
            >
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={() => setMode("reject")}
              disabled={isSubmitting}
            >
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
