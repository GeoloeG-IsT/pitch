-- Add purpose column to distinguish pitch documents from RAG-only documents.
-- Existing documents default to 'pitch' (the viewer route).
ALTER TABLE public.documents
  ADD COLUMN purpose TEXT NOT NULL DEFAULT 'pitch'
  CHECK (purpose IN ('pitch', 'rag'));
