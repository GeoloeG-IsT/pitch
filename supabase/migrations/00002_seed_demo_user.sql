-- Seed a demo user for pre-auth development phases.
-- The API uses DEMO_USER_ID = '00000000-0000-0000-0000-000000000000' until
-- real authentication is wired up in Phase 6.

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'demo@zeee-pitch-zooo.local',
  crypt('demo-password', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, display_name, role)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'demo@zeee-pitch-zooo.local',
  'Demo Founder',
  'founder'
) ON CONFLICT (id) DO NOTHING;
