"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SectionData {
  section_id: string;
  label: string;
  total_ms: number;
}

interface SectionHeatmapProps {
  sections: SectionData[];
}

function getHeatmapColor(value: number, max: number): string {
  if (max === 0) return "var(--color-muted)";
  const ratio = value / max;

  // 5 discrete steps: muted -> chart-4 -> chart-1
  if (ratio < 0.2) return "var(--color-muted)";
  if (ratio < 0.4) return "color-mix(in srgb, var(--color-muted) 50%, var(--color-chart-4) 50%)";
  if (ratio < 0.6) return "var(--color-chart-4)";
  if (ratio < 0.8) return "color-mix(in srgb, var(--color-chart-4) 50%, var(--color-chart-1) 50%)";
  return "var(--color-chart-1)";
}

function formatMinutes(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "<1m";
  return `${minutes}m`;
}

export function SectionHeatmap({ sections }: SectionHeatmapProps) {
  if (sections.length === 0) return null;

  const totalMs = sections.reduce((sum, s) => sum + s.total_ms, 0);
  const maxMs = Math.max(...sections.map((s) => s.total_ms));

  if (totalMs === 0) return null;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Section Attention</CardTitle>
      </CardHeader>
      <CardContent>
        <div role="img" aria-label="Section attention heatmap">
          <div className="flex h-8 rounded-sm overflow-hidden">
            {sections.map((section) => {
              const widthPercent = (section.total_ms / totalMs) * 100;
              if (widthPercent < 1) return null;
              return (
                <div
                  key={section.section_id}
                  className="cursor-pointer"
                  style={{
                    width: `${widthPercent}%`,
                    backgroundColor: getHeatmapColor(section.total_ms, maxMs),
                  }}
                  title={`${section.label}: ${formatMinutes(section.total_ms)} across all investors`}
                />
              );
            })}
          </div>
          <div className="flex mt-1">
            {sections.map((section) => {
              const widthPercent = (section.total_ms / totalMs) * 100;
              if (widthPercent < 1) return null;
              return (
                <div
                  key={section.section_id}
                  className="text-xs text-muted-foreground text-center overflow-hidden text-ellipsis whitespace-nowrap"
                  style={{ width: `${widthPercent}%` }}
                >
                  {section.label}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
