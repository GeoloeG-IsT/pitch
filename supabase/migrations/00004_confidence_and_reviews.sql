-- Confidence scoring columns
ALTER TABLE public.queries ADD COLUMN confidence_score FLOAT;
ALTER TABLE public.queries ADD COLUMN confidence_tier TEXT
  CHECK (confidence_tier IN ('high', 'moderate', 'low'));

-- Review workflow columns
ALTER TABLE public.queries ADD COLUMN review_status TEXT NOT NULL DEFAULT 'auto_published'
  CHECK (review_status IN ('auto_published', 'pending_review', 'approved', 'edited', 'rejected'));
ALTER TABLE public.queries ADD COLUMN reviewed_by UUID REFERENCES public.users(id);
ALTER TABLE public.queries ADD COLUMN reviewed_at TIMESTAMPTZ;
ALTER TABLE public.queries ADD COLUMN founder_answer TEXT;

-- Update status CHECK to include 'queued' for low-confidence answers awaiting review
ALTER TABLE public.queries DROP CONSTRAINT queries_status_check;
ALTER TABLE public.queries ADD CONSTRAINT queries_status_check
  CHECK (status IN ('pending', 'streaming', 'complete', 'error', 'queued'));

-- Index for dashboard queries (pending reviews)
CREATE INDEX idx_queries_review_status ON public.queries(review_status)
  WHERE review_status = 'pending_review';

-- Index for review history
CREATE INDEX idx_queries_reviewed_at ON public.queries(reviewed_at DESC)
  WHERE reviewed_at IS NOT NULL;
