"use client";

import { useEffect, useState } from "react";
import { fetchInvestorDetail, type InvestorDetail } from "@/lib/analytics-api";
import { Skeleton } from "@/components/ui/skeleton";

interface InvestorDetailRowProps {
  investorKey: string;
}

function formatDuration(ms: number): string {
  if (ms < 60000) {
    const s = Math.round(ms / 1000);
    return `${s}s`;
  }
  if (ms < 3600000) {
    const m = Math.floor(ms / 60000);
    const s = Math.round((ms % 60000) / 1000);
    return `${m}m ${s}s`;
  }
  const h = Math.floor(ms / 3600000);
  const m = Math.round((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffMin = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);

  if (diffMin < 60) return `Asked ${diffMin}m ago`;
  if (diffHours < 24) return `Asked ${diffHours}h ago`;
  return `Asked ${new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

export function InvestorDetailRow({ investorKey }: InvestorDetailRowProps) {
  const [detail, setDetail] = useState<InvestorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetchInvestorDetail(investorKey)
      .then((data) => {
        if (active) setDetail(data);
      })
      .catch(() => {
        if (active) setError("Failed to load investor details");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [investorKey]);

  if (loading) {
    return (
      <div className="space-y-3 py-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <p className="text-sm text-muted-foreground py-2">{error || "No data available"}</p>
    );
  }

  const maxSectionMs = Math.max(...detail.sections.map((s) => s.duration_ms), 1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <h4 className="text-sm font-semibold mb-3">Time by Section</h4>
        <div className="space-y-2">
          {detail.sections.map((section) => (
            <div key={section.section_id} className="flex items-center gap-2">
              <span className="text-sm font-medium w-28 truncate">{section.section_id}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{
                    width: `${(section.duration_ms / maxSectionMs) * 100}%`,
                  }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-16 text-right">
                {formatDuration(section.duration_ms)}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-sm font-semibold mb-3">Questions Asked</h4>
        {detail.questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No questions asked yet</p>
        ) : (
          <div className="space-y-3">
            {detail.questions.map((q, i) => (
              <div key={i}>
                <p className="text-sm">{q.question}</p>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(q.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
