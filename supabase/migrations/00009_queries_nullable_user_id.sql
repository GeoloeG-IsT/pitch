-- Allow queries from share token users who have no user account
ALTER TABLE public.queries ALTER COLUMN user_id DROP NOT NULL;

-- Ensure at least one identity is present
ALTER TABLE public.queries ADD CONSTRAINT queries_identity_required
  CHECK (user_id IS NOT NULL OR share_token_id IS NOT NULL);
