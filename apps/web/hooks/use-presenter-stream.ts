"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAuthHeaders } from "@/lib/api";

export interface LiveQuestion {
  queryId: string;
  question: string;
  investorLabel: string;
  aiDraft: string | null;
  citations: string[];
  createdAt: string;
  status: "pending" | "ready" | "actioned";
}

export function usePresenterStream() {
  const [questions, setQuestions] = useState<LiveQuestion[]>([]);
  const [investorCount, setInvestorCount] = useState(0);
  const [investors, setInvestors] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const removeQuestion = useCallback((queryId: string) => {
    setQuestions((prev) => prev.filter((q) => q.queryId !== queryId));
  }, []);

  useEffect(() => {
    let active = true;

    async function connect() {
      const { Authorization } = getAuthHeaders() as { Authorization?: string };
      const accessToken = Authorization?.replace("Bearer ", "");
      if (!accessToken) return;

      const wsUrl =
        process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
      const ws = new WebSocket(
        `${wsUrl}/api/v1/analytics/founder-notifications?access_token=${accessToken}`
      );
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "new_live_question") {
            const lq: LiveQuestion = {
              queryId: msg.query_id,
              question: msg.question,
              investorLabel: msg.investor_label,
              aiDraft: msg.ai_draft ?? null,
              citations: msg.citations ?? [],
              createdAt: new Date().toISOString(),
              status: msg.ai_draft ? "ready" : "pending",
            };
            setQuestions((prev) =>
              prev.some((q) => q.queryId === lq.queryId)
                ? prev
                : [lq, ...prev]
            );
          } else if (msg.type === "investor_count") {
            setInvestorCount(msg.count);
            setInvestors(msg.investors ?? []);
          } else if (msg.type === "draft_ready") {
            // Update a pending question when its draft arrives
            setQuestions((prev) =>
              prev.map((q) =>
                q.queryId === msg.query_id
                  ? {
                      ...q,
                      aiDraft: msg.ai_draft,
                      citations: msg.citations ?? q.citations,
                      status: "ready" as const,
                    }
                  : q
              )
            );
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (active) {
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

  return { questions, investorCount, investors, removeQuestion };
}
