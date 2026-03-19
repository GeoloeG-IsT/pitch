"use client";

import { useCallback, useRef, useState } from "react";
import { createQuery, type Citation } from "@/lib/query-api";

export type QueryStatus = "idle" | "retrieving" | "generating" | "done" | "error";

export function useQueryStream() {
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<QueryStatus>("idle");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const askQuestion = useCallback(async (question: string) => {
    // Clean up previous WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Reset state
    setAnswer("");
    setStatus("retrieving");
    setCitations([]);
    setError(null);

    try {
      const { query_id } = await createQuery(question);

      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
      const ws = new WebSocket(`${wsUrl}/api/v1/query/${query_id}/stream`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case "status":
            setStatus(msg.status as QueryStatus);
            break;
          case "token":
            setAnswer((prev) => prev + msg.content);
            break;
          case "citations":
            setCitations(msg.citations as Citation[]);
            break;
          case "done":
            setStatus("done");
            break;
          case "error":
            setStatus("error");
            setError(msg.message);
            break;
        }
      };

      ws.onerror = () => {
        setStatus("error");
        setError("Connection failed");
      };

      ws.onclose = () => {
        // Only set error if we haven't already reached a terminal state
        setStatus((prev) => {
          if (prev !== "done" && prev !== "error") {
            setError("Connection closed unexpectedly");
            return "error";
          }
          return prev;
        });
      };
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to create query");
    }
  }, []);

  return { answer, status, citations, error, askQuestion };
}
