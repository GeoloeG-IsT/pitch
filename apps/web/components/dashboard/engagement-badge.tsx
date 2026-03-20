"use client";

import { Badge } from "@/components/ui/badge";
import { Flame } from "lucide-react";

interface EngagementBadgeProps {
  engagement: "hot" | "active" | "viewed";
}

export function EngagementBadge({ engagement }: EngagementBadgeProps) {
  switch (engagement) {
    case "hot":
      return (
        <Badge className="bg-[hsl(12,76%,61%)] text-white hover:bg-[hsl(12,76%,61%)]">
          <Flame className="h-3 w-3 mr-1" />
          Hot
        </Badge>
      );
    case "active":
      return <Badge variant="secondary">Active</Badge>;
    case "viewed":
      return <Badge variant="outline">Viewed</Badge>;
  }
}
