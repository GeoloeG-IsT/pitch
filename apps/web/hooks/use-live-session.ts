"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type SessionResponse,
  getActiveSession,
  startSession,
  endSession,
} from "@/lib/session-api";

export function useLiveSession() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const isLive = session?.is_active === true;

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const active = await getActiveSession();
        if (!cancelled) setSession(active);
      } catch {
        // ignore — session check is best-effort
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  const startLive = useCallback(async () => {
    try {
      setLoading(true);
      const s = await startSession();
      setSession(s);
      toast("Live session started.");
    } catch {
      toast("Could not start live session. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const endLive = useCallback(async () => {
    if (!session) return;
    try {
      setLoading(true);
      await endSession(session.session_id);
      setSession(null);
      toast("Live session ended.");
    } catch {
      toast("Could not end live session. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [session]);

  return { session, isLive, startLive, endLive, loading };
}
