"use client";

import { useCallback, useRef, useState } from "react";

export function useActiveSection() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const visibleIds = useRef<Set<string>>(new Set());
  // When user clicks a TOC item, lock the active section briefly
  // so the observer doesn't override it during scroll animation
  const lockUntil = useRef<number>(0);
  const lockedId = useRef<string | null>(null);

  const pickTopmost = useCallback(() => {
    // Respect lock from user click
    if (Date.now() < lockUntil.current && lockedId.current) {
      setActiveId(lockedId.current);
      return;
    }

    let bestId: string | null = null;
    let bestTop = Infinity;
    for (const id of visibleIds.current) {
      const el = document.getElementById(`section-${id}`);
      if (!el) continue;
      const top = el.getBoundingClientRect().top;
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

  const forceActive = useCallback((id: string) => {
    lockedId.current = id;
    lockUntil.current = Date.now() + 1200; // lock for duration of smooth scroll
    setActiveId(id);
  }, []);

  return { activeId, handleInView, forceActive };
}
