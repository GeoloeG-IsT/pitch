'use client';

import { useQueryStream } from "@/hooks/use-query-stream";
import { QueryInput } from "@/components/query/query-input";
import { QueryStatusIndicator } from "@/components/query/query-status";
import { StreamingAnswer } from "@/components/query/streaming-answer";
import { CitationList } from "@/components/query/citation-list";
import { Separator } from "@/components/ui/separator";

export default function QueryPage() {
  const { answer, status, citations, error, askQuestion } = useQueryStream();
  const isProcessing = status === "retrieving" || status === "generating";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto pt-12 pb-16 px-4">
        <h1 className="text-[28px] font-semibold leading-[1.2] text-primary">
          Ask a Question
        </h1>

        <div className="mt-8">
          <QueryInput onSubmit={askQuestion} disabled={isProcessing} />
        </div>

        <QueryStatusIndicator status={status} />

        <div className="mt-8">
          <StreamingAnswer answer={answer} status={status} error={error} />
        </div>

        {status === "done" && citations.length > 0 && (
          <>
            <Separator className="my-6" />
            <CitationList citations={citations} open={true} />
          </>
        )}
      </div>
    </div>
  );
}
