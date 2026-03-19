"use client";

import { type FormEvent, type KeyboardEvent, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface QueryInputProps {
  onSubmit: (question: string) => void;
  disabled: boolean;
}

export function QueryInput({ onSubmit, disabled }: QueryInputProps) {
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const trimmed = value.trim();
      if (!trimmed || disabled) return;
      onSubmit(trimmed);
      setValue("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Textarea
        placeholder="Ask anything about the pitch materials..."
        rows={2}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="resize-none"
      />
      <Button
        type="submit"
        variant="default"
        disabled={disabled || !value.trim()}
        className="self-end"
      >
        Ask Question
      </Button>
    </form>
  );
}
