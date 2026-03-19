"use client";

import { ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ImageCaptionSectionProps {
  content: string;
}

export function ImageCaptionSection({ content }: ImageCaptionSectionProps) {
  return (
    <Card className="bg-muted">
      <CardContent className="p-4 flex items-start gap-2">
        <ImageIcon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-sm italic text-muted-foreground">{content}</p>
      </CardContent>
    </Card>
  );
}
