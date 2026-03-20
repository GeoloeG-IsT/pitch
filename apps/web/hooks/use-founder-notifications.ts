"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function useFounderNotifications() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    async function connect() {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) return;

      const wsUrl =
        process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
      const ws = new WebSocket(
        `${wsUrl}/api/v1/analytics/founder-notifications?access_token=${accessToken}`,
      );
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "pitch_opened" && msg.investor) {
            toast(`${msg.investor} just opened your pitch`);
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (active) {
          // Auto-reconnect after 3 seconds
          reconnectTimer.current = setTimeout(() => {
            if (active) connect();
          }, 3000);
        }
      };

      ws.onerror = () => {
        // Will trigger onclose, which handles reconnect
      };
    }

    connect();

    return () => {
      active = false;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);
}
