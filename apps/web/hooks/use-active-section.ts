"use client";

import { useCallback, useRef, useState } from "react";

export function useActiveSection() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const visibleIds = useRef<Set<string>>(new Set());

  const pickTopmost = useCallback(() => {
    let bestId: string | null = null;
    let bestTop = Infinity;
    for (const id of visibleIds.current) {
      const el = document.getElementById(`section-${id}`);
      if (!el) continue;
      const top = el.getBoundingClientRect().top;
      // Pick the section whose top is closest to (but not far above) the header
      // Sections above the header have negative top; prefer the one nearest 0
      if (Math.abs(top) < Math.abs(bestTop) || (bestTop < -200 && top > bestTop)) {
        bestTop = top;
        bestId = id;
      }
    }
    if (bestId) setActiveId(bestId);
  }, []);

  const handleInView = useCallback((id: string, inView: boolean) => {
    if (inView) {
      visibleIds.current.add(id);
    } else {
      visibleIds.current.delete(id);
    }
    pickTopmost();
  }, [pickTopmost]);

  return { activeId, handleInView };
}
