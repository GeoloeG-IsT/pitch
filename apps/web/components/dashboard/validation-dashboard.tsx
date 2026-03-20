"use client";

import { useEffect, useState } from "react";
import {
  type ReviewItem,
  fetchReviews,
  fetchReviewHistory,
} from "@/lib/review-api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ReviewQueue } from "@/components/dashboard/review-queue";
import { ReviewHistory } from "@/components/dashboard/review-history";
import { GoLiveButton } from "@/components/dashboard/go-live-button";
import { useLiveSession } from "@/hooks/use-live-session";

export function ValidationDashboard() {
  const liveSession = useLiveSession();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [historyReviews, setHistoryReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("pending");

  async function loadAll() {
    try {
      setLoading(true);
      setError(null);
      const [pending, history] = await Promise.all([
        fetchReviews("pending_review"),
        fetchReviewHistory(),
      ]);
      setReviews(pending);
      setHistoryReviews(history);
      if (pending.length === 0 && history.length > 0) {
        setActiveTab("history");
      } else {
        setActiveTab("pending");
      }
    } catch {
      setError("Unable to load review queue. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  if (error) {
    return (
      <div className="bg-muted min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <h1 className="text-3xl font-semibold mb-8">
            Validation Dashboard
          </h1>
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold">Validation Dashboard</h1>
          <GoLiveButton {...liveSession} />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending">
              Pending Review ({loading ? "--" : reviews.length})
            </TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            {loading ? (
              <div className="flex flex-col gap-8">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6 space-y-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-3 w-3/5" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <h2 className="text-xl font-semibold mb-2">
                    No answers awaiting review
                  </h2>
                  <p className="text-muted-foreground max-w-md">
                    All AI responses are either high confidence or already
                    reviewed. New items will appear here when low-confidence
                    answers are generated.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ReviewQueue reviews={reviews} onReviewAction={loadAll} />
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            {loading ? (
              <div className="flex flex-col gap-8">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6 space-y-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-3 w-3/5" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : historyReviews.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <h2 className="text-xl font-semibold mb-2">
                    No review history yet
                  </h2>
                  <p className="text-muted-foreground max-w-md">
                    Reviewed answers will appear here after you approve, edit,
                    or reject items from the Pending Review queue.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ReviewHistory reviews={historyReviews} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
