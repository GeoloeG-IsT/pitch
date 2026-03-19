"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface InlineEditorProps {
  initialText: string;
  onSave: (text: string) => void;
  onDiscard: () => void;
}

export function InlineEditor({
  initialText,
  onSave,
  onDiscard,
}: InlineEditorProps) {
  const [text, setText] = useState(initialText);

  return (
    <div className="space-y-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
        rows={3}
        className="min-h-[5rem]"
      />
      <div className="flex gap-2">
        <Button onClick={() => onSave(text)}>Save &amp; Approve</Button>
        <Button variant="ghost" onClick={onDiscard}>
          Discard Edit
        </Button>
      </div>
    </div>
  );
}
