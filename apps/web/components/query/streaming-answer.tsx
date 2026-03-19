import { Skeleton } from "@/components/ui/skeleton";
import type { QueryStatus } from "@/hooks/use-query-stream";

interface StreamingAnswerProps {
  answer: string;
  status: QueryStatus;
  error: string | null;
}

export function StreamingAnswer({ answer, status, error }: StreamingAnswerProps) {
  // Idle state with no answer
  if (status === "idle" && !answer) {
    return (
      <div className="text-muted-foreground text-center py-12">
        <h2 className="text-lg font-medium">No questions yet</h2>
        <p className="mt-2 text-sm">
          Type a question above to get AI-powered answers drawn from all
          uploaded pitch materials.
        </p>
      </div>
    );
  }

  // Retrieving state: show skeleton lines
  if (status === "retrieving") {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <p className="text-destructive">
        {error || "Something went wrong while generating the answer. Please try again."}
      </p>
    );
  }

  // Generating or done with answer text
  if ((status === "generating" || status === "done") && answer) {
    return (
      <div className="text-base leading-relaxed text-foreground whitespace-pre-wrap">
        {answer}
        {status === "generating" && (
          <span
            className="inline-block w-0.5 h-5 bg-primary ml-0.5 align-text-bottom animate-pulse"
            style={{ animationDuration: "530ms" }}
          />
        )}
      </div>
    );
  }

  return null;
}
