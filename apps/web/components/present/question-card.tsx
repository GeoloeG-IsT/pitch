"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { LiveQuestion } from "@/hooks/use-presenter-stream";
import { submitLiveAction } from "@/lib/session-api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { OverrideEditor } from "./override-editor";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

interface QuestionCardProps {
  question: LiveQuestion;
  sessionId: string;
  onActioned: (queryId: string) => void;
}

export function QuestionCard({
  question,
  sessionId,
  onActioned,
}: QuestionCardProps) {
  const [mode, setMode] = useState<"view" | "edit" | "override">("view");
  const [editText, setEditText] = useState(question.aiDraft ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exiting, setExiting] = useState(false);

  const draftReady = question.status === "ready";

  function animateAndRemove() {
    setExiting(true);
    setTimeout(() => onActioned(question.queryId), 300);
  }

  async function handleAction(
    action: "approve" | "edit" | "override" | "dismiss",
    editedAnswer?: string
  ) {
    try {
      setIsSubmitting(true);
      await submitLiveAction(sessionId, question.queryId, action, editedAnswer);
      if (action === "dismiss") {
        toast("Question dismissed");
      }
      animateAndRemove();
    } catch {
      toast("Could not publish answer. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <Card
      className={`transition-all duration-300 ${
        exiting ? "opacity-0 scale-95" : "opacity-100 scale-100"
      }`}
    >
      <CardHeader>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary">{question.investorLabel}</Badge>
          <span className="text-sm text-muted-foreground">
            {timeAgo(question.createdAt)}
          </span>
        </div>
        <p className="text-base mt-2">{question.question}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        <Separator />

        {/* AI Draft section */}
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">AI Draft</span>

          {!draftReady && mode === "view" && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
              <p className="text-sm text-muted-foreground">
                Generating draft answer...
              </p>
            </div>
          )}

          {draftReady && mode === "view" && (
            <p className="text-base leading-relaxed">{question.aiDraft}</p>
          )}

          {mode === "edit" && (
            <div className="space-y-3">
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                autoFocus
                rows={3}
                className="min-h-[5rem]"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => handleAction("edit", editText)}
                  disabled={isSubmitting}
                >
                  Save &amp; Publish
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setMode("view");
                    setEditText(question.aiDraft ?? "");
                  }}
                >
                  Discard Edit
                </Button>
              </div>
            </div>
          )}

          {mode === "override" && (
            <OverrideEditor
              onSubmit={(answer) => handleAction("override", answer)}
              onCancel={() => setMode("view")}
            />
          )}
        </div>

        {/* Citations */}
        {draftReady && question.citations.length > 0 && mode === "view" && (
          <div className="flex flex-wrap gap-2">
            {question.citations.map((c, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {c}
              </Badge>
            ))}
          </div>
        )}

        <Separator />

        {/* Action buttons (view mode only) */}
        {mode === "view" && (
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => handleAction("approve")}
              disabled={!draftReady || isSubmitting}
            >
              Approve
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditText(question.aiDraft ?? "");
                setMode("edit");
              }}
              disabled={!draftReady || isSubmitting}
            >
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => setMode("override")}
              disabled={!draftReady || isSubmitting}
            >
              Override
            </Button>
            <Button
              variant="outline"
              className="text-destructive border-destructive/50 hover:bg-destructive/10"
              onClick={() => handleAction("dismiss")}
              disabled={isSubmitting}
            >
              Dismiss
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
