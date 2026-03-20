-- Live session tracking
CREATE TABLE public.live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ  -- NULL means active
);

CREATE INDEX idx_live_sessions_active ON public.live_sessions(founder_id)
  WHERE ended_at IS NULL;

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage own sessions"
  ON public.live_sessions FOR ALL
  USING (auth.uid() = founder_id);

-- Add live_session_id to queries for tracking which questions came during live sessions
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS live_session_id UUID
  REFERENCES public.live_sessions(id);

-- Expand review_status CHECK to include 'dismissed'
ALTER TABLE public.queries DROP CONSTRAINT IF EXISTS queries_review_status_check;
ALTER TABLE public.queries ADD CONSTRAINT queries_review_status_check
  CHECK (review_status IN ('auto_published', 'pending_review', 'approved', 'edited', 'rejected', 'dismissed'));
