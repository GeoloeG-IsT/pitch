"use client";

import { useInView } from "react-intersection-observer";
import type { PitchChunk } from "@/lib/pitch-api";
import { Card, CardContent } from "@/components/ui/card";
import { TextSection } from "./text-section";
import { TableSection } from "./table-section";
import { HeadingSection } from "./heading-section";
import { ImageCaptionSection } from "./image-caption-section";

interface SectionCardProps {
  chunk: PitchChunk;
  onInView?: (id: string, inView: boolean) => void;
}

export function SectionCard({ chunk, onInView }: SectionCardProps) {
  const { ref } = useInView({
    threshold: 0,
    rootMargin: "-56px 0px 0px 0px", // offset for sticky header (h-14 = 56px)
    onChange: (inView) => onInView?.(chunk.id, inView),
  });

  if (chunk.chunk_type === "heading") {
    return (
      <div ref={ref}>
        <HeadingSection content={chunk.content} id={chunk.id} />
      </div>
    );
  }

  if (chunk.chunk_type === "image_caption") {
    return (
      <div ref={ref} id={`section-${chunk.id}`}>
        <ImageCaptionSection content={chunk.content} />
      </div>
    );
  }

  if (chunk.chunk_type === "table") {
    return (
      <Card ref={ref} id={`section-${chunk.id}`} className="bg-card">
        <CardContent className="p-6 lg:p-8">
          <TableSection content={chunk.content} />
        </CardContent>
      </Card>
    );
  }

  // Default: text
  return (
    <Card ref={ref} id={`section-${chunk.id}`} className="bg-card">
      <CardContent className="p-6 lg:p-8">
        <TextSection content={chunk.content} />
      </CardContent>
    </Card>
  );
}
