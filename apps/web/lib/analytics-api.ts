import { getAuthHeaders } from "@/lib/api";

const API_BASE = "/api/v1";

export interface InvestorSummary {
  investor_key: string;
  investor_label: string;
  last_viewed: string | null;
  total_time_ms: number;
  question_count: number;
  session_count: number;
  max_scroll_depth: number;
  financials_time_ms: number;
  engagement: "hot" | "active" | "viewed";
}

export interface SectionTime {
  section_id: string;
  duration_ms: number;
}

export interface QuestionEntry {
  question: string;
  created_at: string;
}

export interface InvestorDetail {
  investor_key: string;
  sections: SectionTime[];
  questions: QuestionEntry[];
}

export async function fetchAnalyticsSummary(): Promise<InvestorSummary[]> {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE}/analytics/summary`, { headers });
  if (!res.ok) throw new Error(`Analytics fetch failed: ${res.statusText}`);
  const data = await res.json();
  return data.investors;
}

export async function fetchInvestorDetail(
  investorKey: string,
): Promise<InvestorDetail> {
  const headers = getAuthHeaders();
  const res = await fetch(
    `${API_BASE}/analytics/investor/${encodeURIComponent(investorKey)}`,
    { headers },
  );
  if (!res.ok)
    throw new Error(`Investor detail fetch failed: ${res.statusText}`);
  return res.json();
}

export async function fetchNewViewCount(since: string): Promise<number> {
  const headers = getAuthHeaders();
  const res = await fetch(
    `${API_BASE}/analytics/new-view-count?since=${encodeURIComponent(since)}`,
    { headers },
  );
  if (!res.ok) throw new Error(`View count fetch failed: ${res.statusText}`);
  const data = await res.json();
  return data.count;
}
