"use client";

import { useCallback, useRef, useState } from "react";
import { createQuery, type Citation } from "@/lib/query-api";
import { getAuthHeaders } from "@/lib/api";

export type QueryStatus = "idle" | "retrieving" | "generating" | "done" | "error";

export function useQueryStream(shareToken?: string) {
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<QueryStatus>("idle");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
  const [confidenceTier, setConfidenceTier] = useState<string | null>(null);
  const [isQueued, setIsQueued] = useState(false);
  const [queryId, setQueryId] = useState<string | null>(null);
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
    setConfidenceScore(null);
    setConfidenceTier(null);
    setIsQueued(false);
    setQueryId(null);

    try {
      const response = await createQuery(question);
      setQueryId(response.query_id);

      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
      let wsEndpoint = `${wsUrl}/api/v1/query/${response.query_id}/stream`;

      // Authenticate WebSocket via query params
      const { Authorization } = getAuthHeaders() as { Authorization?: string };
      const accessToken = Authorization?.replace("Bearer ", "");
      if (accessToken) {
        wsEndpoint += `?access_token=${accessToken}`;
      } else if (shareToken) {
        wsEndpoint += `?token=${shareToken}`;
      }

      const ws = new WebSocket(wsEndpoint);
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
            setConfidenceScore(msg.confidence_score ?? null);
            setConfidenceTier(msg.confidence_tier ?? null);
            break;
          case "queued":
            setIsQueued(true);
            setStatus("done");
            setConfidenceScore(msg.confidence_score ?? null);
            setConfidenceTier(msg.confidence_tier ?? null);
            break;
          case "replace_answer":
            setAnswer(msg.answer);
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

  return { answer, status, citations, error, confidenceScore, confidenceTier, isQueued, queryId, askQuestion };
}
