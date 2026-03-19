"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface RejectionFormProps {
  onSubmit: (replacementAnswer: string) => void;
  onCancel: () => void;
}

export function RejectionForm({ onSubmit, onCancel }: RejectionFormProps) {
  const [text, setText] = useState("");

  return (
    <div className="space-y-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a replacement answer for the investor..."
        autoFocus
        rows={3}
        className="min-h-[5rem]"
      />
      <div className="flex gap-2">
        <Button
          onClick={() => onSubmit(text)}
          disabled={!text.trim()}
        >
          Submit Replacement
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
