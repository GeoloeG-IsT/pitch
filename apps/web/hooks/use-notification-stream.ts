"use client";

import { useEffect, useRef, useState } from "react";
import { getAuthHeaders } from "@/lib/api";

interface NotificationStreamOptions {
  onAnswerApproved: (queryId: string, answer: string, tier: string) => void;
  onSessionStarted?: () => void;
  onSessionEnded?: () => void;
  onQuestionDismissed?: (queryId: string) => void;
}

export function useNotificationStream(options: NotificationStreamOptions & { shareToken?: string }) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(options);

  // Keep callback ref current without triggering reconnects
  callbackRef.current = options;

  useEffect(() => {
    function connect() {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
      let endpoint = `${wsUrl}/api/v1/notifications/stream`;

      // Pass identity so server can track investor count
      const { Authorization } = getAuthHeaders() as { Authorization?: string };
      const accessToken = Authorization?.replace("Bearer ", "");
      if (accessToken) {
        endpoint += `?access_token=${accessToken}`;
      } else if (callbackRef.current.shareToken) {
        endpoint += `?token=${callbackRef.current.shareToken}`;
      }

      const ws = new WebSocket(endpoint);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "answer_approved") {
          callbackRef.current.onAnswerApproved(
            msg.query_id,
            msg.answer,
            msg.confidence_tier
          );
        } else if (msg.type === "session_started") {
          callbackRef.current.onSessionStarted?.();
        } else if (msg.type === "session_ended") {
          callbackRef.current.onSessionEnded?.();
        } else if (msg.type === "question_dismissed") {
          callbackRef.current.onQuestionDismissed?.(msg.query_id);
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
