import type { QueryStatus } from "@/hooks/use-query-stream";

interface QueryStatusProps {
  status: QueryStatus;
}

export function QueryStatusIndicator({ status }: QueryStatusProps) {
  if (status === "retrieving") {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        Searching documents
        <span className="inline-block animate-pulse">...</span>
      </p>
    );
  }

  if (status === "generating") {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        Generating answer
        <span className="inline-block animate-pulse">...</span>
      </p>
    );
  }

  return null;
}
