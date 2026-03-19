"use client";

import { type FormEvent, type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryStream } from "@/hooks/use-query-stream";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionContextChip } from "./section-context-chip";
import { QAThread, type QAMessage } from "./qa-thread";

interface QAPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionName: string | null;
  sectionId: string | null;
  onScrollToSection: (sectionId: string) => void;
}

export function QAPanel({
  open,
  onOpenChange,
  sectionName,
  sectionId,
  onScrollToSection,
}: QAPanelProps) {
  const [messages, setMessages] = useState<QAMessage[]>([]);
  const [sectionScope, setSectionScope] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { answer, status, citations, error, askQuestion } = useQueryStream();

  // Detect mobile
  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 768);
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Initialize section scope when panel opens
  useEffect(() => {
    if (open) {
      setSectionScope(sectionName);
    }
  }, [open, sectionName]);

  // Update latest message with streaming state
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.status === "done" || lastMsg.status === "error") return;

    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      updated[updated.length - 1] = {
        ...last,
        answer,
        status,
        citations,
        error,
      };
      return updated;
    });
  }, [answer, status, citations, error, messages.length]);

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed) return;

      const newMessage: QAMessage = {
        id: crypto.randomUUID(),
        question: trimmed,
        answer: "",
        citations: [],
        status: "retrieving",
        error: null,
        sectionContext: sectionScope,
      };
      setMessages((prev) => [...prev, newMessage]);
      setInputValue("");

      // Prepend section context to help retrieval
      const queryText = sectionScope
        ? `[Context: ${sectionScope}] ${trimmed}`
        : trimmed;
      askQuestion(queryText);
    },
    [inputValue, sectionScope, askQuestion]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleCitationClick = useCallback(
    (chunkId: string) => {
      onScrollToSection(chunkId);
      if (isMobile) {
        onOpenChange(false);
      }
    },
    [onScrollToSection, isMobile, onOpenChange]
  );

  const placeholder = sectionScope
    ? `Ask about ${sectionScope}...`
    : "Ask anything about this pitch...";

  const isSubmitting = status === "retrieving" || status === "generating";

  const panelContent = (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        {isMobile && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            aria-label="Close Q&A panel"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <h2 className="text-base font-medium flex-1">Ask about this pitch</h2>
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            aria-label="Close Q&A panel"
          >
            <span className="sr-only">Close</span>
            &times;
          </Button>
        )}
      </div>

      {/* Section context chip */}
      <div className="px-4 pt-3">
        <SectionContextChip
          sectionName={sectionScope}
          onDismiss={() => setSectionScope(null)}
        />
      </div>

      {/* Thread */}
      <QAThread
        messages={messages}
        onCitationClick={handleCitationClick}
      />

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 p-4 border-t"
      >
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          className="flex-1"
        />
        <Button
          type="submit"
          size="icon"
          disabled={isSubmitting || !inputValue.trim()}
          aria-label="Send question"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </>
  );

  // Mobile: full-screen overlay
  if (isMobile) {
    return (
      <div
        className={cn(
          "fixed inset-0 z-50 bg-card flex flex-col",
          "transition-transform duration-300",
          open ? "translate-y-0" : "translate-y-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Q&A panel"
      >
        {panelContent}
      </div>
    );
  }

  // Desktop/Tablet: slide-in panel from right
  return (
    <div
      className={cn(
        "fixed top-14 right-0 bottom-0 w-[440px] bg-card border-l z-30 flex flex-col",
        "transition-transform duration-300",
        open ? "translate-x-0" : "translate-x-full pointer-events-none"
      )}
      role="dialog"
      aria-label="Q&A panel"
    >
      {panelContent}
    </div>
  );
}
