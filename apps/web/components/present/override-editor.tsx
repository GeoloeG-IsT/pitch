"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface OverrideEditorProps {
  onSubmit: (answer: string) => void;
  onCancel: () => void;
}

export function OverrideEditor({ onSubmit, onCancel }: OverrideEditorProps) {
  const [text, setText] = useState("");

  return (
    <div className="space-y-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your answer..."
        autoFocus
        rows={3}
        className="min-h-[5rem]"
      />
      <div className="flex gap-2">
        <Button onClick={() => onSubmit(text)} disabled={!text.trim()}>
          Publish Answer
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Keep AI Draft
        </Button>
      </div>
    </div>
  );
}
