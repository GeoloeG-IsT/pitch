-- Queries table for Q&A history
CREATE TABLE public.queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT,
  citations JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'streaming', 'complete', 'error')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for query history (Phase 7 analytics)
CREATE INDEX idx_queries_user_id ON public.queries(user_id);
CREATE INDEX idx_queries_created_at ON public.queries(created_at DESC);

-- RLS
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own queries"
  ON public.queries FOR SELECT
  USING (auth.uid() = user_id);

-- Vector similarity search RPC function
-- PostgREST does not support pgvector <=> operator, so we use an RPC function
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.0,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  section_number int,
  page_number int,
  chunk_type text,
  metadata jsonb,
  token_count int,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id,
    c.document_id,
    c.content,
    c.section_number,
    c.page_number,
    c.chunk_type,
    c.metadata,
    c.token_count,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM chunks c
  WHERE 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding ASC
  LIMIT LEAST(match_count, 200);
$$;
