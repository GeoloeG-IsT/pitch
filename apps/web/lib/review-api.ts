import type { Citation } from "@/lib/query-api";

export interface ReviewItem {
  query_id: string;
  question: string;
  answer: string | null;
  citations: Citation[];
  confidence_score: number | null;
  confidence_tier: string | null;
  review_status: string;
  founder_answer: string | null;
  created_at: string | null;
  section_context: string | null;
}

export interface ReviewAction {
  action: "approve" | "edit" | "reject";
  edited_answer?: string;
}

const API_BASE = "/api/v1";

export async function fetchReviews(
  status: string = "pending_review"
): Promise<ReviewItem[]> {
  const res = await fetch(
    `${API_BASE}/reviews?status=${encodeURIComponent(status)}`
  );
  if (!res.ok) throw new Error(`Failed to fetch reviews: ${res.statusText}`);
  return res.json();
}

export async function submitReview(
  queryId: string,
  action: ReviewAction
): Promise<ReviewItem> {
  const res = await fetch(`${API_BASE}/reviews/${queryId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  });
  if (!res.ok) throw new Error(`Failed to submit review: ${res.statusText}`);
  return res.json();
}

export async function fetchPendingCount(): Promise<number> {
  const items = await fetchReviews("pending_review");
  return items.length;
}

export async function fetchReviewHistory(): Promise<ReviewItem[]> {
  const [approved, edited, rejected] = await Promise.all([
    fetchReviews("approved"),
    fetchReviews("edited"),
    fetchReviews("rejected"),
  ]);
  const all = [...approved, ...edited, ...rejected];
  all.sort((a, b) => {
    const da = a.created_at ? new Date(a.created_at).getTime() : 0;
    const db = b.created_at ? new Date(b.created_at).getTime() : 0;
    return db - da;
  });
  return all;
}
