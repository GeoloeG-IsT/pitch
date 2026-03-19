"use client";

import { Separator } from "@/components/ui/separator";

interface HeadingSectionProps {
  content: string;
  id: string;
}

export function HeadingSection({ content, id }: HeadingSectionProps) {
  return (
    <div id={`section-${id}`} className="mt-12 mb-4">
      <h2 className="text-2xl font-semibold leading-tight text-foreground">
        {content}
      </h2>
      <Separator className="mt-3" />
    </div>
  );
}
