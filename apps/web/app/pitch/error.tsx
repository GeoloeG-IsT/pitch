"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PitchError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-muted flex items-center justify-center">
      <Card className="max-w-md text-center">
        <CardContent className="p-8">
          <h2 className="text-lg font-semibold text-destructive">
            Something went wrong
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Unable to load pitch content. Check that your documents have
            finished processing, then refresh the page.
          </p>
          <Button onClick={reset} className="mt-4">
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
