"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { EngagementBadge } from "./engagement-badge";
import { InvestorDetailRow } from "./investor-detail-row";
import type { InvestorSummary } from "@/lib/analytics-api";

interface InvestorTableProps {
  investors: InvestorSummary[];
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function InvestorTable({ investors }: InvestorTableProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  if (investors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Investor Engagement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold">No views yet</h3>
            <p className="text-muted-foreground mt-1">
              Once investors open your shared links, engagement data will appear
              here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Investor Engagement</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs text-muted-foreground w-8" />
              <TableHead className="text-xs text-muted-foreground">
                Investor
              </TableHead>
              <TableHead className="text-xs text-muted-foreground">
                Last Viewed
              </TableHead>
              <TableHead className="text-xs text-muted-foreground">
                Time Spent
              </TableHead>
              <TableHead className="text-xs text-muted-foreground">
                Questions
              </TableHead>
              <TableHead className="text-xs text-muted-foreground">
                Engagement
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {investors.map((investor) => {
              const isOpen = openKey === investor.investor_key;
              return (
                <Collapsible
                  key={investor.investor_key}
                  open={isOpen}
                  onOpenChange={(open) =>
                    setOpenKey(open ? investor.investor_key : null)
                  }
                >
                  <CollapsibleTrigger
                    render={
                      <TableRow className="cursor-pointer hover:bg-muted/50" />
                    }
                  >
                    <TableCell className="w-8">
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          isOpen && "rotate-90",
                        )}
                      />
                    </TableCell>
                    <TableCell className="text-sm">
                      {investor.investor_label}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {investor.last_viewed
                        ? formatDate(investor.last_viewed)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDuration(investor.total_time_ms)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {investor.question_count}
                    </TableCell>
                    <TableCell>
                      <EngagementBadge engagement={investor.engagement} />
                    </TableCell>
                  </CollapsibleTrigger>
                  <CollapsibleContent
                    render={<tr />}
                  >
                    <td colSpan={6} className="bg-muted/50 px-6 py-4">
                      <InvestorDetailRow investorKey={investor.investor_key} />
                    </td>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
