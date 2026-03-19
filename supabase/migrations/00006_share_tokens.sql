-- Share tokens for investor access links
CREATE TABLE public.share_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  founder_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  investor_email TEXT,          -- NULL for anonymous links, set for email invitations
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,       -- NULL = active, set = revoked
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_share_tokens_token ON public.share_tokens(token);
CREATE INDEX idx_share_tokens_founder ON public.share_tokens(founder_id);

ALTER TABLE public.share_tokens ENABLE ROW LEVEL SECURITY;

-- Founders can manage their own tokens
CREATE POLICY "Founders manage own tokens"
  ON public.share_tokens FOR ALL
  USING (auth.uid() = founder_id);

-- Add share_token_id to queries table for anonymous Q&A tracking
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS share_token_id UUID REFERENCES public.share_tokens(id);

-- Ensure investors with valid share tokens can read pitch documents and chunks
CREATE POLICY "Token holders can view pitch documents"
  ON public.documents FOR SELECT
  USING (
    status = 'ready' AND purpose = 'pitch'
  );

CREATE POLICY "Token holders can view pitch chunks"
  ON public.chunks FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM public.documents WHERE status = 'ready' AND purpose = 'pitch'
    )
  );

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to update own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);
