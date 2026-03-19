"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { parseTableContent } from "@/lib/parse-table-content";
import { MetricCard } from "./metric-card";

interface TableSectionProps {
  content: string;
}

export function TableSection({ content }: TableSectionProps) {
  const pairs = parseTableContent(content);

  if (pairs) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pairs.map((pair, index) => (
          <MetricCard
            key={index}
            label={pair.label}
            value={pair.value}
            subLabel={pair.subLabel}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="prose prose-neutral max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
