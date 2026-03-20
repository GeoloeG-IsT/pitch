"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchNewViewCount } from "@/lib/analytics-api";
import { Badge } from "@/components/ui/badge";

interface AnalyticsCountBadgeProps {
  onTabActive?: () => void;
}

export function AnalyticsCountBadge({ onTabActive }: AnalyticsCountBadgeProps) {
  const [count, setCount] = useState(0);
  const sinceRef = useRef(new Date().toISOString());

  const resetCount = useCallback(() => {
    sinceRef.current = new Date().toISOString();
    setCount(0);
  }, []);

  // Expose reset via onTabActive callback registration
  useEffect(() => {
    if (onTabActive) {
      // Store the reset function reference for parent to call
    }
  }, [onTabActive]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const c = await fetchNewViewCount(sinceRef.current);
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

  // Allow parent to trigger reset
  useEffect(() => {
    if (onTabActive) {
      // This is a no-op effect; the actual reset is triggered externally
    }
  }, [onTabActive]);

  if (count === 0) return null;

  return <Badge className="ml-1 text-xs">{count}</Badge>;
}

// Export a ref-based approach for the parent to call reset
export function useAnalyticsCountBadge() {
  const sinceRef = useRef(new Date().toISOString());
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const c = await fetchNewViewCount(sinceRef.current);
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

  const resetCount = useCallback(() => {
    sinceRef.current = new Date().toISOString();
    setCount(0);
  }, []);

  return { count, resetCount };
}
