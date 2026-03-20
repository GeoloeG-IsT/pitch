"use client";

import { useCallback, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ValidationDashboard } from "@/components/dashboard/validation-dashboard";
import { AccessManager } from "@/components/dashboard/access-manager";
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";
import { useAnalyticsCountBadge } from "@/components/dashboard/analytics-count-badge";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

export default function DashboardPage() {
  const { role } = useAuth();
  const { count: analyticsCount, resetCount: resetAnalyticsCount } =
    useAnalyticsCountBadge();
  const [activeTab, setActiveTab] = useState("reviews");

  const handleTabChange = useCallback(
    (value: string) => {
      setActiveTab(value);
      if (value === "analytics") {
        resetAnalyticsCount();
      }
    },
    [resetAnalyticsCount],
  );

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            {role === "founder" && (
              <TabsTrigger value="access">Access</TabsTrigger>
            )}
            {role === "founder" && (
              <TabsTrigger value="analytics">
                Analytics
                {analyticsCount > 0 && (
                  <Badge className="ml-1 text-xs">{analyticsCount}</Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="reviews" className="mt-6">
            <ValidationDashboard />
          </TabsContent>
          {role === "founder" && (
            <TabsContent value="access" className="mt-6">
              <AccessManager />
            </TabsContent>
          )}
          {role === "founder" && (
            <TabsContent value="analytics" className="mt-6">
              <AnalyticsDashboard />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
