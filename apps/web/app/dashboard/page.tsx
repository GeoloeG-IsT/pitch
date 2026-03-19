"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ValidationDashboard } from "@/components/dashboard/validation-dashboard";
import { AccessManager } from "@/components/dashboard/access-manager";
import { useAuth } from "@/hooks/use-auth";

export default function DashboardPage() {
  const { role } = useAuth();

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <Tabs defaultValue="reviews">
          <TabsList>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            {role === "founder" && (
              <TabsTrigger value="access">Access</TabsTrigger>
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
        </Tabs>
      </div>
    </div>
  );
}
