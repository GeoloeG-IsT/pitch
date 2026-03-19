"use client";

import { type FormEvent, type KeyboardEvent, useCallback, useRef, useState } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FloatingInputProps {
  onSubmit: (question: string) => void;
  visible: boolean;
  sectionName: string | null;
  className?: string;
}

export function FloatingInput({ onSubmit, visible, sectionName, className }: FloatingInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const placeholder = sectionName
    ? `Ask about ${sectionName}...`
    : "Ask anything about this pitch...";

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      const trimmed = value.trim();
      if (!trimmed) return;
      onSubmit(trimmed);
      setValue("");
    },
    [value, onSubmit]
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

  if (!visible) return null;

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "sticky bottom-6 left-1/2 -translate-x-1/2 z-50 mx-auto",
        "w-[min(560px,calc(100%-2rem))]",
        "flex items-center gap-2 rounded-full bg-card border-2 border-black shadow-xl px-4 py-2",
        className
      )}
    >
      <Input
        ref={inputRef}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 border-0 shadow-none focus-visible:ring-0 bg-transparent"
      />
      <Button
        type="submit"
        size="icon-sm"
        variant="ghost"
        disabled={!value.trim()}
        aria-label="Send question"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
