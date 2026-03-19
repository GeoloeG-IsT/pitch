"use client";

import { useCallback, useState } from "react";

export function useActiveSection() {
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleInView = useCallback((id: string, inView: boolean) => {
    if (inView) setActiveId(id);
  }, []);

  return { activeId, handleInView };
}
