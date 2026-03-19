"use client";

interface MetricCardProps {
  label: string;
  value: string;
  subLabel?: string;
}

export function MetricCard({ label, value, subLabel }: MetricCardProps) {
  return (
    <div className="p-4 rounded-lg bg-muted/50">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-[32px] font-semibold leading-tight text-foreground">
        {value}
      </p>
      {subLabel && (
        <p className="text-sm text-muted-foreground mt-1">{subLabel}</p>
      )}
    </div>
  );
}
