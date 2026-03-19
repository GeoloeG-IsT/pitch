import { Badge } from "@/components/ui/badge";

interface CitationBadgeProps {
  documentTitle: string;
  sectionLabel: string | null;
}

export function CitationBadge({ documentTitle, sectionLabel }: CitationBadgeProps) {
  const label = sectionLabel
    ? `[${documentTitle}, ${sectionLabel}]`
    : `[${documentTitle}]`;

  return (
    <Badge variant="secondary" className="text-xs cursor-default">
      {label}
    </Badge>
  );
}
