---
phase: 06-auth-access-control
plan: 03
subsystem: auth, api
tags: [jwt, fastapi, supabase, share-tokens, authorization, websocket]

requires:
  - phase: 06-01
    provides: "JWT validation functions (get_current_user, validate_share_token), Supabase auth config"
  - phase: 06-02
    provides: "Auth UI with login/signup, middleware route protection"
provides:
  - "JWT-authenticated API endpoints (documents, query, reviews)"
  - "Share token CRUD endpoints (create, list, revoke, validate)"
  - "Frontend API clients with Authorization headers"
  - "WebSocket auth via access_token and share token query params"
affects: [06-04, investor-access, api-security]

tech-stack:
  added: [secrets.token_urlsafe]
  patterns: [Depends(get_current_user) for FastAPI auth, getAuthHeaders() for frontend fetch, WebSocket query param auth]

key-files:
  created:
    - apps/api/app/api/v1/auth.py
  modified:
    - apps/api/app/api/v1/documents.py
    - apps/api/app/api/v1/query.py
    - apps/api/app/api/v1/reviews.py
    - apps/api/app/main.py
    - apps/api/app/models/query.py
    - apps/web/lib/api.ts
    - apps/web/lib/query-api.ts
    - apps/web/lib/review-api.ts
    - apps/web/hooks/use-query-stream.ts

key-decisions:
  - "secrets.token_urlsafe(16) for share tokens instead of nanoid (no extra dependency)"
  - "WebSocket auth via query params (access_token for JWT, token for share tokens)"
  - "share_token_id optional field on QueryCreate for linking queries to share tokens"

patterns-established:
  - "Depends(get_current_user) pattern: all protected endpoints use FastAPI dependency injection for JWT auth"
  - "getAuthHeaders() pattern: all frontend fetch calls import shared helper for Authorization header"
  - "WebSocket query param auth: access_token or token param validated before WebSocket accept"

requirements-completed: [AUTH-02, AUTH-03, AUTH-04]

duration: 4min
completed: 2026-03-19
---

# Phase 6 Plan 3: API Auth Integration & Share Tokens Summary

**All API endpoints migrated from DEMO_USER_ID to JWT auth via Depends(get_current_user), share token CRUD at /api/v1/auth/*, and frontend clients sending Authorization Bearer headers**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-19T22:27:31Z
- **Completed:** 2026-03-19T22:31:45Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Removed all DEMO_USER_ID hardcoded auth from 3 API routers (documents, query, reviews)
- Created share token CRUD endpoints: POST create, GET list, DELETE revoke, GET validate
- All frontend API clients (api.ts, query-api.ts, review-api.ts) send Supabase JWT in Authorization header
- WebSocket stream_query authenticates via access_token or share token query parameters

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate API endpoints from DEMO_USER_ID to JWT auth and create auth router** - `6140047` (feat)
2. **Task 2: Update frontend API clients to send Authorization headers** - `5311f1c` (feat)

## Files Created/Modified
- `apps/api/app/api/v1/auth.py` - New share token CRUD and validation endpoints
- `apps/api/app/api/v1/documents.py` - Migrated from DEMO_USER_ID to Depends(get_current_user)
- `apps/api/app/api/v1/query.py` - Migrated to JWT auth, WebSocket validates token before accept
- `apps/api/app/api/v1/reviews.py` - Migrated to JWT auth, reviewed_by uses user["sub"]
- `apps/api/app/main.py` - Registered auth_router under /api/v1
- `apps/api/app/models/query.py` - Added share_token_id optional field to QueryCreate
- `apps/web/lib/api.ts` - Added getAuthHeaders helper, all fetch calls include Authorization
- `apps/web/lib/query-api.ts` - Imports getAuthHeaders, createQuery sends auth header
- `apps/web/lib/review-api.ts` - All review fetch calls include Authorization header
- `apps/web/hooks/use-query-stream.ts` - WebSocket URL includes access_token or share token

## Decisions Made
- Used secrets.token_urlsafe(16) for share token generation (no extra dependency, equivalent security)
- WebSocket authentication via query parameters (standard approach since WebSocket API doesn't support custom headers)
- Added share_token_id as optional field on QueryCreate model for future query-to-token linking

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All API endpoints now require JWT authentication
- Share token infrastructure ready for investor sharing flow in 06-04
- Frontend clients automatically attach session tokens to all API requests
- WebSocket supports both authenticated (JWT) and anonymous (share token) access

---
*Phase: 06-auth-access-control*
*Completed: 2026-03-19*
