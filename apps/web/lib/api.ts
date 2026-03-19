export function getAuthHeaders(): HeadersInit {
  // Read access token directly from cookie to avoid Supabase client calls
  // that hang on WSL2. Cookie name format: sb-<project>-auth-token
  // Value format: base64-<base64-encoded JSON> (chunked across .0, .1, etc.)
  const cookies = document.cookie.split(";");
  const tokenCookies: Record<string, string> = {};

  for (const cookie of cookies) {
    const [name, ...rest] = cookie.trim().split("=");
    if (name.startsWith("sb-") && name.includes("-auth-token")) {
      tokenCookies[name] = rest.join("=");
    }
  }

  // Find the base cookie name (without chunk suffix)
  const baseNames = Object.keys(tokenCookies).filter(
    (n) => !n.match(/\.\d+$/)
  );

  for (const baseName of baseNames) {
    try {
      // Reassemble chunked cookies if present
      let value = tokenCookies[baseName] || "";
      let i = 0;
      while (tokenCookies[`${baseName}.${i}`]) {
        value += tokenCookies[`${baseName}.${i}`];
        i++;
      }

      value = decodeURIComponent(value);

      // Strip "base64-" prefix if present
      if (value.startsWith("base64-")) {
        const b64 = value.slice(7);
        // Handle URL-safe base64 (replace - with + and _ with /)
        const standard = b64.replace(/-/g, "+").replace(/_/g, "/");
        value = atob(standard);
      }

      const parsed = JSON.parse(value);
      if (parsed?.access_token) {
        return { Authorization: `Bearer ${parsed.access_token}` };
      }
    } catch {
      // Cookie parse failed — try next
    }
  }

  return {};
}

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
  const authHeaders = getAuthHeaders();
  const res = await fetch(`${API_BASE}/documents`, { method: "POST", body: formData, headers: authHeaders });
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  return res.json();
}

export async function listDocuments(): Promise<DocumentListResponse> {
  const res = await fetch(`${API_BASE}/documents`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to load documents`);
  return res.json();
}

export async function getDocument(id: string): Promise<Document> {
  const res = await fetch(`${API_BASE}/documents/${id}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Document not found`);
  return res.json();
}

export async function updateDocumentPurpose(id: string, purpose: "pitch" | "rag"): Promise<Document> {
  const authHeaders = getAuthHeaders();
  const res = await fetch(`${API_BASE}/documents/${id}/purpose`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify({ purpose }),
  });
  if (!res.ok) throw new Error(`Failed to update purpose`);
  return res.json();
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/documents/${id}`, { method: "DELETE", headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Delete failed`);
}

export async function replaceDocument(id: string, file: File): Promise<Document> {
  const formData = new FormData();
  formData.append("file", file);
  const authHeaders = getAuthHeaders();
  const res = await fetch(`${API_BASE}/documents/${id}`, { method: "PUT", body: formData, headers: authHeaders });
  if (!res.ok) throw new Error(`Replace failed`);
  return res.json();
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
