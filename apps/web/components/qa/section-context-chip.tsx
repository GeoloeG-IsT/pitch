"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SectionContextChipProps {
  sectionName: string | null;
  onDismiss: () => void;
}

export function SectionContextChip({
  sectionName,
  onDismiss,
}: SectionContextChipProps) {
  if (sectionName === null) {
    return <Badge variant="default">Asking about: Entire pitch</Badge>;
  }

  return (
    <Badge variant="default" className="gap-1.5">
      Asking about: {sectionName}
      <Button
        variant="ghost"
        size="icon-xs"
        className="h-4 w-4 p-0 text-primary-foreground hover:text-primary-foreground/80 hover:bg-transparent"
        onClick={onDismiss}
        aria-label="Remove section filter"
      >
        <X className="h-3 w-3" />
      </Button>
    </Badge>
  );
}
