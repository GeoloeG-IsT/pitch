"use client";

import { useCallback, useEffect, useRef } from "react";

interface TrackingConfig {
  founderId: string;
  userId?: string;
  shareTokenId?: string;
  enabled: boolean; // false for founders viewing own pitch
}

export function useTracking(config: TrackingConfig) {
  const sessionId = useRef(crypto.randomUUID());
  const sessionStart = useRef(Date.now());
  const sectionTimes = useRef<Map<string, number>>(new Map());
  const visibleSince = useRef<Map<string, number>>(new Map());
  const scrollDepth = useRef(0);
  const flushedRef = useRef(false);

  const flush = useCallback(() => {
    if (!config.enabled) return;
    if (flushedRef.current) return;
    if (sectionTimes.current.size === 0 && scrollDepth.current === 0) return;

    // Finalize any currently visible sections
    const now = Date.now();
    for (const [id, start] of visibleSince.current) {
      const elapsed = now - start;
      sectionTimes.current.set(
        id,
        (sectionTimes.current.get(id) || 0) + elapsed,
      );
    }
    visibleSince.current.clear();

    const payload = {
      session_id: sessionId.current,
      user_id: config.userId || null,
      share_token_id: config.shareTokenId || null,
      founder_id: config.founderId,
      events: Array.from(sectionTimes.current.entries()).map(
        ([sectionId, ms]) => ({
          section_id: sectionId,
          duration_ms: ms,
        }),
      ),
      scroll_depth: scrollDepth.current || null,
      session_start: sessionStart.current,
      session_end: now,
    };

    const blob = new Blob([JSON.stringify(payload)], {
      type: "application/json",
    });
    navigator.sendBeacon("/api/v1/analytics/events", blob);
    flushedRef.current = true;
  }, [config]);

  // visibilitychange listener -- pause timers on tab hidden, flush
  useEffect(() => {
    if (!config.enabled) return;

    const onVisChange = () => {
      if (document.visibilityState === "hidden") {
        flush();
      } else if (document.visibilityState === "visible") {
        // Reset flushed flag so future flush works, start new session segment
        flushedRef.current = false;
      }
    };
    document.addEventListener("visibilitychange", onVisChange);

    // Periodic flush every 5 minutes to prevent data loss
    const interval = setInterval(() => {
      if (sectionTimes.current.size > 0) {
        // Partial flush: send current data, reset for continued tracking
        const now = Date.now();
        for (const [id, start] of visibleSince.current) {
          sectionTimes.current.set(
            id,
            (sectionTimes.current.get(id) || 0) + (now - start),
          );
          visibleSince.current.set(id, now); // reset start time
        }
        const payload = {
          session_id: sessionId.current,
          user_id: config.userId || null,
          share_token_id: config.shareTokenId || null,
          founder_id: config.founderId,
          events: Array.from(sectionTimes.current.entries()).map(
            ([sectionId, ms]) => ({
              section_id: sectionId,
              duration_ms: ms,
            }),
          ),
          scroll_depth: scrollDepth.current || null,
          session_start: sessionStart.current,
          session_end: now,
        };
        const blob = new Blob([JSON.stringify(payload)], {
          type: "application/json",
        });
        navigator.sendBeacon("/api/v1/analytics/events", blob);
        sectionTimes.current.clear();
      }
    }, 5 * 60 * 1000);

    return () => {
      document.removeEventListener("visibilitychange", onVisChange);
      clearInterval(interval);
      flush(); // flush on unmount
    };
  }, [config.enabled, flush]);

  // Scroll depth tracking
  useEffect(() => {
    if (!config.enabled) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const percent = Math.round((scrollTop / docHeight) * 100);
      // Snap to thresholds: 25, 50, 75, 100
      let threshold = 0;
      if (percent >= 100) threshold = 100;
      else if (percent >= 75) threshold = 75;
      else if (percent >= 50) threshold = 50;
      else if (percent >= 25) threshold = 25;
      if (threshold > scrollDepth.current) scrollDepth.current = threshold;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [config.enabled]);

  const trackSectionVisibility = useCallback(
    (sectionId: string, isVisible: boolean) => {
      if (!config.enabled) return;
      if (document.visibilityState === "hidden") return; // don't track when tab is hidden

      if (isVisible) {
        visibleSince.current.set(sectionId, Date.now());
      } else {
        const start = visibleSince.current.get(sectionId);
        if (start) {
          const elapsed = Date.now() - start;
          sectionTimes.current.set(
            sectionId,
            (sectionTimes.current.get(sectionId) || 0) + elapsed,
          );
          visibleSince.current.delete(sectionId);
        }
      }
    },
    [config.enabled],
  );

  return { trackSectionVisibility };
}
