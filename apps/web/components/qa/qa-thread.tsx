"use client";

import { useEffect, useRef } from "react";
import type { Citation } from "@/lib/query-api";
import type { QueryStatus } from "@/hooks/use-query-stream";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StreamingAnswer } from "@/components/query/streaming-answer";
import { CitationList } from "@/components/query/citation-list";

export interface QAMessage {
  id: string;
  question: string;
  answer: string;
  citations: Citation[];
  status: QueryStatus;
  error: string | null;
  sectionContext: string | null;
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
      <ScrollArea className="flex-1">
        <div className="flex items-center justify-center h-full p-8 text-center text-muted-foreground">
          <p className="text-sm">
            Ask a question about the pitch to get started.
          </p>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="flex-1">
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
            <div className="mr-8">
              {msg.status === "retrieving" ? (
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

            {/* Citations */}
            {msg.citations.length > 0 && (
              <div className="mr-8">
                <CitationList
                  citations={msg.citations.map((c) =>
                    onCitationClick
                      ? { ...c, _onClick: () => onCitationClick(c.chunk_id) }
                      : c
                  )}
                  open={false}
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
