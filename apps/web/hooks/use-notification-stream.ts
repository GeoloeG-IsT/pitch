"use client";

import { useEffect, useRef, useState } from "react";

export function useNotificationStream(
  onAnswerApproved: (queryId: string, answer: string, tier: string) => void
) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(onAnswerApproved);

  // Keep callback ref current without triggering reconnects
  callbackRef.current = onAnswerApproved;

  useEffect(() => {
    function connect() {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
      const ws = new WebSocket(`${wsUrl}/api/v1/notifications/stream`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "answer_approved") {
          callbackRef.current(msg.query_id, msg.answer, msg.confidence_tier);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        // Auto-reconnect after 3 seconds
        reconnectRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return { connected };
}
