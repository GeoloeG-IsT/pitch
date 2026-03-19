export interface Document {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number | null;
  status: "pending" | "processing" | "ready" | "error";
  purpose: "pitch" | "rag";
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  chunk_count?: number | null;
}

export interface DocumentListResponse {
  documents: Document[];
  total: number;
}

const API_BASE = "/api/v1";

export async function uploadDocument(file: File, title?: string, purpose: "pitch" | "rag" = "pitch"): Promise<Document> {
  const formData = new FormData();
  formData.append("file", file);
  if (title) formData.append("title", title);
  formData.append("purpose", purpose);
  const res = await fetch(`${API_BASE}/documents`, { method: "POST", body: formData });
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  return res.json();
}

export async function listDocuments(): Promise<DocumentListResponse> {
  const res = await fetch(`${API_BASE}/documents`);
  if (!res.ok) throw new Error(`Failed to load documents`);
  return res.json();
}

export async function getDocument(id: string): Promise<Document> {
  const res = await fetch(`${API_BASE}/documents/${id}`);
  if (!res.ok) throw new Error(`Document not found`);
  return res.json();
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/documents/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Delete failed`);
}

export async function replaceDocument(id: string, file: File): Promise<Document> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/documents/${id}`, { method: "PUT", body: formData });
  if (!res.ok) throw new Error(`Replace failed`);
  return res.json();
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
