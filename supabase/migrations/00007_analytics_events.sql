-- Analytics events table for tracking investor engagement
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  share_token_id UUID REFERENCES public.share_tokens(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('page_open', 'page_close', 'section_time', 'scroll_depth')),
  section_id TEXT,
  duration_ms INTEGER,
  scroll_depth INTEGER CHECK (scroll_depth IS NULL OR scroll_depth IN (25, 50, 75, 100)),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT identity_required CHECK (user_id IS NOT NULL OR share_token_id IS NOT NULL)
);

CREATE INDEX idx_analytics_founder ON analytics_events(founder_id);
CREATE INDEX idx_analytics_session ON analytics_events(session_id);
CREATE INDEX idx_analytics_user ON analytics_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_analytics_token ON analytics_events(share_token_id) WHERE share_token_id IS NOT NULL;
CREATE INDEX idx_analytics_created ON analytics_events(created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders read own analytics"
  ON public.analytics_events FOR SELECT
  USING (auth.uid() = founder_id);
