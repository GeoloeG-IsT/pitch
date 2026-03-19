export interface PitchChunk {
  id: string;
  content: string;
  section_number: number | null;
  chunk_type: "text" | "table" | "heading" | "image_caption";
  metadata: Record<string, unknown>;
}

export interface PitchDocument {
  id: string;
  title: string;
  file_type: string;
  chunks: PitchChunk[];
}

export interface PitchResponse {
  documents: PitchDocument[];
  total_chunks: number;
}

const API_BASE = "/api/v1";

export async function fetchPitch(): Promise<PitchResponse> {
  const res = await fetch(`${API_BASE}/pitch`);
  if (!res.ok) throw new Error("Failed to load pitch content");
  return res.json();
}
