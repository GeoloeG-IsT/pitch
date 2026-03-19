"use client";

import { useEffect, useState } from "react";
import { fetchPendingCount } from "@/lib/review-api";
import { Badge } from "@/components/ui/badge";

export function PendingCountBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const c = await fetchPendingCount();
        if (active) setCount(c);
      } catch {
        // silently ignore
      }
    }

    load();
    const interval = setInterval(load, 30_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (count === 0) return null;

  return <Badge className="ml-1 text-xs">{count}</Badge>;
}
