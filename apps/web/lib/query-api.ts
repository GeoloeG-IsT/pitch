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
}

const API_BASE = "/api/v1";

export async function createQuery(question: string): Promise<QueryResponse> {
  const res = await fetch(`${API_BASE}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error(`Query failed: ${res.statusText}`);
  return res.json();
}
