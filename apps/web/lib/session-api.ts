import { getAuthHeaders } from "@/lib/api";

export interface SessionResponse {
  session_id: string;
  founder_id: string;
  started_at: string;
  ended_at: string | null;
  is_active: boolean;
}

export async function startSession(): Promise<SessionResponse> {
  const res = await fetch("/api/v1/sessions", {
    method: "POST",
    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function endSession(
  sessionId: string
): Promise<SessionResponse> {
  const res = await fetch(`/api/v1/sessions/${sessionId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getActiveSession(): Promise<SessionResponse | null> {
  const res = await fetch("/api/v1/sessions/active", {
    headers: getAuthHeaders(),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.session ?? (data.session_id ? data : null);
}

export async function submitLiveAction(
  sessionId: string,
  queryId: string,
  action: "approve" | "edit" | "override" | "dismiss",
  editedAnswer?: string
): Promise<void> {
  const res = await fetch(
    `/api/v1/sessions/${sessionId}/questions/${queryId}`,
    {
      method: "PUT",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ action, edited_answer: editedAnswer }),
    }
  );
  if (!res.ok) throw new Error(await res.text());
}
