# Phase 6: Auth + Access Control - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Users have secure accounts with role-based permissions (founder vs investor), and founders control investor access through shareable links they can revoke. Covers: authentication (signup/login), RBAC, shareable token links, email invitations, access revocation, route protection, and API auth migration from DEMO_USER_ID to real Supabase JWT.

</domain>

<decisions>
## Implementation Decisions

### Login experience
- Email + password as primary authentication method
- OAuth support for Google, GitHub, and LinkedIn as alternative login options
- Separate /login and /signup pages (not a single page with toggle)
- After login, founders land on /dashboard

### Shareable link mechanics
- Two sharing methods: quick anonymous token URLs AND formal email invitations
- Token links have a default expiry period (e.g., 7 or 30 days)
- Shared links managed in a new "Access" section on the existing /dashboard
- Revoked/expired links show a generic "access expired" page (neutral, doesn't reveal revocation vs expiry)

### Route protection & role gates
- Next.js middleware.ts at app root for centralized auth checking
- Public pages (no auth required): /, /login, /signup, /pitch (with valid share token)
- All other pages require authentication
- Middleware also checks user role: investors hitting /dashboard or /documents get redirected to /pitch
- SiteNav becomes role-aware: founders see full nav (Dashboard, Documents, Pitch, Query), investors see only Pitch, logout always visible

### Investor onboarding
- Token link = zero friction, no account needed. Immediate read-only access to pitch viewer
- Email invite = link pre-fills investor's email on signup page, they set a password, land on pitch
- Anonymous token-link investors get full Q&A access (questions tracked by token for analytics)

### API authentication
- Replace DEMO_USER_ID hardcoded UUID with real Supabase JWT validation on all backend endpoints
- API validates JWT from Authorization header
- Token-link requests get a special service-level token for anonymous access

### Claude's Discretion
- Default token link expiry duration (7 vs 14 vs 30 days)
- Token generation strategy (UUID, nanoid, etc.)
- Password reset flow implementation details
- OAuth redirect URI configuration details
- Session refresh/token rotation handling
- Exact middleware matcher patterns
- Email invitation template and delivery mechanism

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database schema
- `supabase/migrations/00001_init.sql` -- Existing users table with role column (founder/investor/admin), RLS policies for own-data access
- `supabase/migrations/00002_seed_demo_user.sql` -- Demo user seed that will be superseded by real auth; shows DEMO_USER_ID pattern

### Supabase auth config
- `supabase/config.toml` -- Auth settings: JWT expiry 3600s, signup enabled, email confirmations disabled, refresh token reuse interval 10s

### API endpoints using DEMO_USER_ID (must migrate)
- `apps/api/app/api/v1/documents.py` -- DEMO_USER_ID on lines 18, 89, 118
- `apps/api/app/api/v1/query.py` -- DEMO_USER_ID on lines 17, 26
- `apps/api/app/api/v1/reviews.py` -- DEMO_USER_ID on lines 19, 78

### Frontend integration points
- `apps/web/app/layout.tsx` -- Root layout with SiteNav (needs auth context provider)
- `apps/web/components/dashboard/site-nav.tsx` -- Navigation component (needs role-aware rendering)
- `apps/web/package.json` -- @supabase/ssr and @supabase/supabase-js already installed but unused

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `@supabase/ssr` and `@supabase/supabase-js` already in web dependencies -- ready to create client utilities
- `public.users` table with role column (`founder`/`investor`/`admin`) and RLS policies already exist
- shadcn/ui components (Card, Button, Input, Tabs, Dialog) available for auth forms
- Sonner toast system for auth feedback notifications
- SiteNav component exists and can be extended with role-awareness

### Established Patterns
- Next.js App Router with server/client component split (layout.tsx is server, SiteNav is client)
- API proxy: Next.js rewrites `/api/v1/*` to FastAPI backend (same-origin calls)
- WebSocket direct connection to FastAPI for streaming (use-query-stream.ts)
- shadcn New York style with CSS variables for theming

### Integration Points
- Root layout.tsx -- needs Supabase auth session provider wrapping children
- SiteNav -- needs user session + role for conditional nav items + logout button
- FastAPI middleware -- needs JWT validation dependency for all protected endpoints
- Existing RLS policies -- currently owner-only; need new policies for investor access via share tokens
- /pitch page -- needs to accept ?token= parameter for anonymous access

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 06-auth-access-control*
*Context gathered: 2026-03-19*
