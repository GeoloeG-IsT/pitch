"use client";

import type { PitchDocument } from "@/lib/pitch-api";
import { SectionCard } from "./section-card";

interface DocumentGroupProps {
  document: PitchDocument;
  onSectionInView?: (id: string, inView: boolean) => void;
}

export function DocumentGroup({
  document,
  onSectionInView,
}: DocumentGroupProps) {
  return (
    <div className="mb-12">
      <h2 className="text-[32px] font-semibold leading-tight text-foreground mb-6">
        {document.title}
      </h2>
      <div className="flex flex-col gap-8">
        {document.chunks.map((chunk) => (
          <SectionCard
            key={chunk.id}
            chunk={chunk}
            onInView={onSectionInView}
          />
        ))}
      </div>
    </div>
  );
}
