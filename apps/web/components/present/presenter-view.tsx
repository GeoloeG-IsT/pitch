"use client";

import Link from "next/link";
import { useLiveSession } from "@/hooks/use-live-session";
import { usePresenterStream } from "@/hooks/use-presenter-stream";
import { LiveHeader } from "./live-header";
import { QuestionCard } from "./question-card";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export function PresenterView() {
  const { session, isLive, endLive, loading: sessionLoading } =
    useLiveSession();
  const { questions, investorCount, investors, removeQuestion } =
    usePresenterStream();

  // Not live and done loading -- show "no active session"
  if (!sessionLoading && !isLive) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <Card className="max-w-md text-center">
          <CardContent className="p-8">
            <h2 className="text-lg font-semibold">No active session</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Start a live session from the dashboard to use the presenter view.
            </p>
            <Link href="/dashboard">
              <Button className="mt-4">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Still loading session state
  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-muted">
        <div className="sticky top-0 z-40 h-14 bg-card border-b" />
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      <LiveHeader
        investorCount={investorCount}
        investors={investors}
        onEndSession={endLive}
      />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {questions.length === 0 ? (
          <Card className="max-w-md mx-auto text-center mt-16">
            <CardContent className="p-8">
              <h2 className="text-lg font-semibold">Waiting for questions</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Investor questions will appear here in real-time as they are
                asked.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {questions.map((q) => (
              <QuestionCard
                key={q.queryId}
                question={q}
                sessionId={session!.session_id}
                onActioned={removeQuestion}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
