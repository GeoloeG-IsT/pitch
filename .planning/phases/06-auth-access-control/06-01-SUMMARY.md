---
phase: 06-auth-access-control
plan: 01
subsystem: auth
tags: [jwt, supabase-ssr, pyjwt, fastapi, rls, share-tokens]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Supabase schema (users, documents, chunks tables), Next.js + FastAPI scaffolding
provides:
  - Supabase three-client SSR utilities (browser, server, middleware)
  - FastAPI JWT validation dependency (get_current_user, get_optional_user)
  - Share token validation function (validate_share_token)
  - share_tokens database table with RLS policies
  - Investor read policies for pitch documents and chunks
  - Wave 0 test stubs for auth and share modules
affects: [06-02-auth-pages, 06-03-api-migration, 06-04-access-management]

# Tech tracking
tech-stack:
  added: [pyjwt]
  patterns: [supabase-ssr-three-client, fastapi-jwt-dependency, share-token-validation]

key-files:
  created:
    - apps/web/lib/supabase/client.ts
    - apps/web/lib/supabase/server.ts
    - apps/web/lib/supabase/middleware.ts
    - apps/api/app/core/auth.py
    - supabase/migrations/00006_share_tokens.sql
    - apps/api/tests/test_auth.py
    - apps/api/tests/test_share.py
  modified:
    - apps/api/app/core/config.py
    - supabase/config.toml
    - apps/api/tests/conftest.py

key-decisions:
  - "Migration numbered 00006 (not 00003 as plan specified) because 00003-00005 already existed"
  - "PyJWT already in dependencies -- uv add was a no-op"
  - ".env is gitignored so JWT secret update tracked but not committed"

patterns-established:
  - "Three-client Supabase SSR: browser (createBrowserClient), server (createServerClient + cookies), middleware (updateSession + getUser)"
  - "FastAPI auth dependency: HTTPBearer + jwt.decode with HS256/authenticated audience"
  - "Share token validation: database lookup with expiry and revocation checks"

requirements-completed: [AUTH-01, AUTH-02]

# Metrics
duration: 3min
completed: 2026-03-19
---

# Phase 6 Plan 1: Auth Foundation Summary

**Supabase SSR three-client pattern, FastAPI JWT auth dependency with PyJWT, and share_tokens table with RLS policies**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-19T22:12:02Z
- **Completed:** 2026-03-19T22:15:18Z
- **Tasks:** 4
- **Files modified:** 10

## Accomplishments
- Three Supabase client utilities (browser, server, middleware) following official SSR pattern with getUser() validation
- FastAPI JWT auth module with get_current_user, get_optional_user, and validate_share_token functions
- share_tokens database migration with indexes, RLS policies, and investor read access for pitch content
- Wave 0 test stubs satisfying Nyquist compliance for auth and share modules

## Task Commits

Each task was committed atomically:

1. **Task 0: Create Wave 0 test stubs** - `805f9b1` (test)
2. **Task 1: Create Supabase three-client utilities** - `9bd7b5b` (feat)
3. **Task 2: Create FastAPI JWT auth dependency** - `20b1b71` (feat)
4. **Task 3: Create share_tokens migration and config** - `40f293c` (feat)

## Files Created/Modified
- `apps/web/lib/supabase/client.ts` - Browser Supabase client factory
- `apps/web/lib/supabase/server.ts` - Server Supabase client factory with cookie handling
- `apps/web/lib/supabase/middleware.ts` - Middleware session updater with getUser()
- `apps/api/app/core/auth.py` - JWT validation dependency for FastAPI endpoints
- `apps/api/app/core/config.py` - Added supabase_jwt_secret setting
- `supabase/migrations/00006_share_tokens.sql` - share_tokens table, RLS policies, investor read access
- `supabase/config.toml` - Added OAuth callback URL to redirect allowlist
- `apps/api/tests/test_auth.py` - Auth test stubs (skipped)
- `apps/api/tests/test_share.py` - Share token test stubs (skipped)
- `apps/api/tests/conftest.py` - TODO placeholder for auth_headers fixture

## Decisions Made
- Migration numbered 00006 instead of 00003 (plan was outdated -- migrations 00002-00005 already exist)
- PyJWT was already present in pyproject.toml dependencies; uv add confirmed it without changes
- .env JWT secret update not committed (file is gitignored) -- documented for manual setup

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration file number corrected from 00003 to 00006**
- **Found during:** Task 3 (share_tokens migration)
- **Issue:** Plan specified 00003_share_tokens.sql but migrations 00002-00005 already existed
- **Fix:** Created as 00006_share_tokens.sql to maintain migration ordering
- **Files modified:** supabase/migrations/00006_share_tokens.sql
- **Verification:** File exists with correct content, grep confirms 6 share_tokens references
- **Committed in:** 40f293c (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Migration renumbering necessary for correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
- Add `SUPABASE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long` to `.env` if not already present (local dev default)
- Run `pnpm db:reset` to apply the new 00006_share_tokens.sql migration

## Next Phase Readiness
- Auth utilities ready for 06-02 (auth pages: login, signup, callback)
- JWT dependency ready for 06-03 (API endpoint migration from DEMO_USER_ID)
- share_tokens table ready for 06-04 (access management UI)

## Self-Check: PASSED

All 9 created/modified files verified present. All 4 task commit hashes verified in git log.

---
*Phase: 06-auth-access-control*
*Completed: 2026-03-19*
