"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchAnalyticsSummary,
  fetchInvestorDetail,
  type InvestorSummary,
} from "@/lib/analytics-api";
import { SectionHeatmap } from "./section-heatmap";
import { InvestorTable } from "./investor-table";
import { useFounderNotifications } from "@/hooks/use-founder-notifications";

interface SectionAggregate {
  section_id: string;
  label: string;
  total_ms: number;
}

export function AnalyticsDashboard() {
  const [investors, setInvestors] = useState<InvestorSummary[]>([]);
  const [sectionData, setSectionData] = useState<SectionAggregate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time notifications for founder
  useFounderNotifications();

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const summaryInvestors = await fetchAnalyticsSummary();
        if (!active) return;
        setInvestors(summaryInvestors);

        // Fetch investor details in parallel to aggregate section times for heatmap
        if (summaryInvestors.length > 0) {
          const details = await Promise.allSettled(
            summaryInvestors.map((inv) =>
              fetchInvestorDetail(inv.investor_key),
            ),
          );

          if (!active) return;

          const aggregateMap = new Map<
            string,
            { label: string; total_ms: number }
          >();
          for (const result of details) {
            if (result.status === "fulfilled") {
              for (const section of result.value.sections) {
                const existing = aggregateMap.get(section.section_id);
                if (existing) {
                  existing.total_ms += section.duration_ms;
                } else {
                  aggregateMap.set(section.section_id, {
                    label: section.section_id,
                    total_ms: section.duration_ms,
                  });
                }
              }
            }
          }

          setSectionData(
            Array.from(aggregateMap.entries()).map(([id, data]) => ({
              section_id: id,
              label: data.label,
              total_ms: data.total_ms,
            })),
          );
        }
      } catch {
        if (active) {
          setError(
            "Failed to load analytics. Check your connection and refresh the page.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-card rounded-lg p-6">
          <Skeleton className="h-[32px] w-full" />
        </div>
        <div className="bg-card rounded-lg p-6 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <SectionHeatmap sections={sectionData} />
      <InvestorTable investors={investors} />
    </div>
  );
}
