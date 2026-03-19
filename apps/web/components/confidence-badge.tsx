"use client"

import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const tierConfig = {
  high: {
    label: "High confidence",
    className: "bg-[hsl(142,71%,45%)] text-white hover:bg-[hsl(142,71%,40%)]",
  },
  moderate: {
    label: "Moderate confidence",
    className: "bg-[hsl(38,92%,50%)] text-white hover:bg-[hsl(38,92%,45%)]",
  },
  low: {
    label: "Low confidence",
    className:
      "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  },
} as const

interface ConfidenceBadgeProps {
  tier: "high" | "moderate" | "low"
  score: number
}

export function ConfidenceBadge({ tier, score }: ConfidenceBadgeProps) {
  const config = tierConfig[tier]

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge className={config.className}>{config.label}</Badge>
        </TooltipTrigger>
        <TooltipContent>Score: {score}%</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
