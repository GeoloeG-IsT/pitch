"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import type { Citation } from "@/lib/query-api";

interface CitationListProps {
  citations: Citation[];
  open: boolean;
  onCitationClick?: (chunkId: string) => void;
}

export function CitationList({ citations, open: defaultOpen, onCitationClick }: CitationListProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (citations.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors cursor-pointer">
        Sources ({citations.length})
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-3 flex flex-col gap-2">
          {citations.map((citation) => (
            <Card
              key={citation.chunk_id}
              size="sm"
              className={onCitationClick ? "cursor-pointer hover:bg-accent/50 transition-colors" : ""}
              onClick={onCitationClick ? () => onCitationClick(citation.chunk_id) : undefined}
            >
              <CardContent>
                <p className="font-semibold text-sm">
                  {citation.document_title}
                </p>
                {citation.section_label && (
                  <p className="text-sm text-muted-foreground">
                    {citation.section_label}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Relevance: {Math.round(citation.relevance_score * 100)}%
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
