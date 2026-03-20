"use client";

import { useEffect, useRef } from "react";
import type { Citation } from "@/lib/query-api";
import type { QueryStatus } from "@/hooks/use-query-stream";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StreamingAnswer } from "@/components/query/streaming-answer";
import { CitationList } from "@/components/query/citation-list";
import { ConfidenceBadge } from "@/components/confidence-badge";
import { VerifiedBadge } from "@/components/verified-badge";
import { VerificationPlaceholder } from "@/components/qa/verification-placeholder";
import { LivePlaceholder } from "@/components/qa/live-placeholder";

export interface QAMessage {
  id: string;
  question: string;
  answer: string;
  citations: Citation[];
  status: QueryStatus;
  error: string | null;
  sectionContext: string | null;
  confidenceScore: number | null;
  confidenceTier: string | null;
  isQueued: boolean;
  isVerified: boolean;
  queryId?: string | null;
  isLiveReviewing?: boolean;
  isDismissed?: boolean;
}

interface QAThreadProps {
  messages: QAMessage[];
  onCitationClick?: (chunkId: string) => void;
}

export function QAThread({ messages, onCitationClick }: QAThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, messages[messages.length - 1]?.answer]);

  if (messages.length === 0) {
    return (
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="flex items-center justify-center h-full p-8 text-center text-muted-foreground">
          <p className="text-sm">
            Ask a question about the pitch to get started.
          </p>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="flex-1 overflow-hidden">
      <div className="flex flex-col gap-6 p-4">
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col gap-3">
            {/* Section context */}
            {msg.sectionContext && (
              <p className="text-xs text-muted-foreground">
                Re: {msg.sectionContext}
              </p>
            )}

            {/* User question bubble */}
            <div className="bg-primary text-primary-foreground rounded-lg p-3 ml-8 text-sm self-end">
              {msg.question}
            </div>

            {/* Answer area */}
            <div className="mr-8 transition-opacity duration-300">
              {msg.isDismissed ? (
                <LivePlaceholder status="dismissed" />
              ) : msg.isLiveReviewing ? (
                <LivePlaceholder status="reviewing" />
              ) : msg.status === "retrieving" ? (
                <p className="text-sm text-muted-foreground animate-pulse">
                  Thinking...
                </p>
              ) : (
                <StreamingAnswer
                  answer={msg.answer}
                  status={msg.status}
                  error={msg.error}
                />
              )}
            </div>

            {/* Badge area */}
            <div className="mr-8">
              {msg.isVerified ? (
                <VerifiedBadge />
              ) : msg.isQueued ? (
                <VerificationPlaceholder />
              ) : msg.confidenceTier ? (
                <ConfidenceBadge
                  tier={msg.confidenceTier as "high" | "moderate" | "low"}
                  score={msg.confidenceScore || 0}
                />
              ) : null}
            </div>

            {/* Citations */}
            {msg.citations.length > 0 && (
              <div className="mr-8">
                <CitationList
                  citations={msg.citations}
                  open={false}
                  onCitationClick={onCitationClick}
                />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
