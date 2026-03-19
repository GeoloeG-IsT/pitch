export interface Citation {
  document_id: string;
  document_title: string;
  section_number: number | null;
  section_label: string | null;
  chunk_id: string;
  relevance_score: number;
}

export interface QueryResponse {
  query_id: string;
  question: string;
  answer: string | null;
  citations: Citation[];
  status: string;
  created_at: string | null;
  confidence_score: number | null;
  confidence_tier: string | null;
  review_status: string;
}

import { getAuthHeaders } from "@/lib/api";

const API_BASE = "/api/v1";

export async function createQuery(question: string): Promise<QueryResponse> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error(`Query failed: ${res.statusText}`);
  return res.json();
}
