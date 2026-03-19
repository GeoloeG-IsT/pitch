import { Skeleton } from "@/components/ui/skeleton";

export default function PitchLoading() {
  return (
    <div className="min-h-screen bg-muted">
      <div className="h-14 bg-card border-b" />
      <div className="max-w-5xl mx-auto py-16 px-4 space-y-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-lg p-8 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
