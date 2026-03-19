"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface TextSectionProps {
  content: string;
}

export function TextSection({ content }: TextSectionProps) {
  return (
    <div className="prose prose-neutral max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
