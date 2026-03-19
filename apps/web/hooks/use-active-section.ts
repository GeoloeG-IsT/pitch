"use client";

import { useCallback, useRef, useState } from "react";

export function useActiveSection() {
  const [activeId, setActiveId] = useState<string | null>(null);
  // Track all currently visible section IDs with their top positions
  const visibleSections = useRef<Map<string, number>>(new Map());

  const handleInView = useCallback((id: string, inView: boolean) => {
    if (inView) {
      const el = document.getElementById(`section-${id}`);
      const top = el?.getBoundingClientRect().top ?? Infinity;
      visibleSections.current.set(id, top);
    } else {
      visibleSections.current.delete(id);
    }

    // Pick the topmost visible section (closest to top of viewport)
    let bestId: string | null = null;
    let bestTop = Infinity;
    for (const [sectionId, top] of visibleSections.current) {
      if (top < bestTop) {
        bestTop = top;
        bestId = sectionId;
      }
    }
    if (bestId) setActiveId(bestId);
  }, []);

  return { activeId, handleInView };
}
