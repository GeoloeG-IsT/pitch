---
phase: 06-auth-access-control
verified: 2026-03-19T23:00:00Z
status: passed
score: 22/22 must-haves verified
gaps: []
human_verification:
  - test: "Login flow end-to-end"
    expected: "User submits email+password on /login, gets redirected to /dashboard with active session"
    why_human: "Requires live Supabase instance; signInWithPassword result depends on database state"
  - test: "OAuth provider redirect"
    expected: "Clicking Google/GitHub/LinkedIn triggers Supabase OAuth redirect; /auth/callback exchanges code for session"
    why_human: "OAuth providers require Supabase dashboard configuration (client IDs); cannot verify programmatically"
  - test: "Investor role-based redirect"
    expected: "Authenticated investor visiting /dashboard is immediately redirected to /pitch"
    why_human: "Requires live session + database row with role='investor'"
  - test: "Share token anonymous pitch access"
    expected: "/pitch?token=VALID shows PitchViewer; /pitch?token=INVALID redirects to /access-expired"
    why_human: "Requires live Supabase share_tokens table and valid token; migration applied on db:reset"
  - test: "Revoke share token via AlertDialog"
    expected: "Clicking Revoke in access table opens dialog, confirming calls API, badge updates to Revoked"
    why_human: "UI interaction flow with clipboard and live API; cannot verify programmatically"
---

# Phase 6: Auth & Access Control Verification Report

**Phase Goal:** Implement authentication, authorization, and access control — Supabase Auth integration, role-based access (founder/investor), share token system for pitch access, route protection.
**Verified:** 2026-03-19T23:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Supabase browser client can be created from client components | VERIFIED | `apps/web/lib/supabase/client.ts` exports `createClient()` using `createBrowserClient` |
| 2  | Supabase server client can be created from server components and route handlers | VERIFIED | `apps/web/lib/supabase/server.ts` exports async `createClient()` using `createServerClient` + `cookies()` |
| 3  | Middleware session updater refreshes JWT cookies on every navigation | VERIFIED | `apps/web/lib/supabase/middleware.ts` exports `updateSession()` using `getUser()` not `getSession()` |
| 4  | FastAPI can validate Supabase JWTs and extract user claims | VERIFIED | `apps/api/app/core/auth.py` exports `get_current_user` using `jwt.decode` with `HS256`/`authenticated` audience |
| 5  | share_tokens table exists with token, founder_id, expires_at, revoked_at columns | VERIFIED | `supabase/migrations/00006_share_tokens.sql` creates table with all required columns + indexes + RLS |
| 6  | Pytest test stubs exist for auth and share token modules | VERIFIED | `apps/api/tests/test_auth.py` and `apps/api/tests/test_share.py` contain skipped placeholder tests |
| 7  | Users can sign up with email and password on /signup page | VERIFIED | `apps/web/app/signup/page.tsx` + `actions.ts` calling `supabase.auth.signUp` with profile insert |
| 8  | Users can sign in with email and password on /login page | VERIFIED | `apps/web/app/login/page.tsx` + `actions.ts` calling `supabase.auth.signInWithPassword` |
| 9  | Signup form pre-fills email from ?email= URL parameter (read-only when pre-filled) | VERIFIED | `signup-form.tsx` uses `useSearchParams()`, sets `defaultValue={emailParam}` and `readOnly={!!emailParam}` |
| 10 | OAuth buttons for Google, GitHub, LinkedIn are present on auth pages | VERIFIED | `oauth-buttons.tsx` calls `signInWithOAuth` for `google`, `github`, `linkedin_oidc` |
| 11 | OAuth callback at /auth/callback exchanges code for session | VERIFIED | `apps/web/app/auth/callback/route.ts` calls `exchangeCodeForSession(code)` |
| 12 | Unauthenticated users are redirected to /login from protected routes | VERIFIED | `apps/web/middleware.ts` checks `!user` and redirects with `?redirect=` param |
| 13 | Investors hitting /dashboard or /documents are redirected to /pitch | VERIFIED | `middleware.ts` fetches `public.users.role` and redirects if `profile?.role === 'investor'` |
| 14 | Founders see full nav, investors see only Pitch | VERIFIED | `site-nav.tsx` conditionally renders Documents/Dashboard links only when `role === 'founder'` |
| 15 | User can sign out via avatar dropdown menu | VERIFIED | `user-avatar-menu.tsx` calls `supabase.auth.signOut()` with `toast("Signed out")` |
| 16 | All API endpoints validate JWT instead of using DEMO_USER_ID | VERIFIED | Zero `DEMO_USER_ID` references in source; all endpoints use `Depends(get_current_user)` and `user["sub"]` |
| 17 | Share token CRUD endpoints exist at /api/v1/auth/* | VERIFIED | `apps/api/app/api/v1/auth.py` implements POST/GET/DELETE share-tokens + GET validate-token; registered in main.py |
| 18 | Frontend API clients send Authorization header with Supabase session token | VERIFIED | `api.ts` exports `getAuthHeaders()`; imported and used in `query-api.ts`, `review-api.ts` |
| 19 | WebSocket accepts token query parameter for share-token-based anonymous access | VERIFIED | `use-query-stream.ts` appends `?access_token=` or `?token=` to WebSocket URL |
| 20 | Founder can generate a share link and email invite with configurable expiry | VERIFIED | `share-link-generator.tsx` creates tokens with 7/14/30 day expiry; `email-invite-form.tsx` builds `/signup?email=...&invite=...` |
| 21 | /pitch page accepts ?token= parameter and validates it | VERIFIED | `apps/web/app/pitch/page.tsx` reads `searchParams.get("token")`, calls `validateShareToken`, redirects to `/access-expired` on failure |
| 22 | Invalid/expired tokens redirect to access-expired page | VERIFIED | `pitch/page.tsx` calls `router.replace("/access-expired")` on validation failure; `access-expired/page.tsx` shows neutral message |

**Score:** 22/22 truths verified

### Required Artifacts

| Artifact | Provides | Status | Evidence |
|----------|----------|--------|---------|
| `apps/web/lib/supabase/client.ts` | Browser Supabase client factory | VERIFIED | Exports `createClient()` with `createBrowserClient` |
| `apps/web/lib/supabase/server.ts` | Server Supabase client factory | VERIFIED | Exports async `createClient()` with cookie handling |
| `apps/web/lib/supabase/middleware.ts` | Middleware session updater | VERIFIED | Exports `updateSession()`, uses `getUser()` |
| `apps/api/app/core/auth.py` | FastAPI JWT validation dependency | VERIFIED | `get_current_user`, `get_optional_user`, `validate_share_token` |
| `supabase/migrations/00006_share_tokens.sql` | share_tokens table with RLS | VERIFIED | Table, indexes, RLS policies, investor read policies |
| `apps/api/tests/test_auth.py` | Auth test stubs | VERIFIED | Skipped placeholder tests for AUTH-01, AUTH-02 |
| `apps/api/tests/test_share.py` | Share token test stubs | VERIFIED | Skipped placeholder tests for AUTH-03, AUTH-04 |
| `apps/web/middleware.ts` | Route protection with role-based redirects | VERIFIED | Protects routes, redirects investors from founder-only paths |
| `apps/web/app/login/page.tsx` | Login page | VERIFIED | Renders `LoginForm` inside `AuthLayout` |
| `apps/web/app/signup/page.tsx` | Signup page | VERIFIED | Renders `SignupForm` inside `Suspense` + `AuthLayout` |
| `apps/web/app/auth/callback/route.ts` | OAuth callback handler | VERIFIED | Exports `GET`, calls `exchangeCodeForSession` |
| `apps/web/components/dashboard/site-nav.tsx` | Role-aware navigation | VERIFIED | Conditionally renders nav items per role, hides on auth pages |
| `apps/api/app/api/v1/auth.py` | Share token CRUD endpoints | VERIFIED | create/list/revoke/validate all implemented |
| `apps/api/app/api/v1/documents.py` | JWT-authenticated document endpoints | VERIFIED | All endpoints use `Depends(get_current_user)`, no DEMO_USER_ID |
| `apps/api/app/api/v1/query.py` | JWT-authenticated query endpoints | VERIFIED | `create_query` uses JWT; WebSocket validates token |
| `apps/web/lib/api.ts` | getAuthHeaders helper + auth'd fetch calls | VERIFIED | `getAuthHeaders()` exported; all fetch calls include auth headers |
| `apps/web/lib/share-api.ts` | Share token API client | VERIFIED | Exports `createShareToken`, `listShareTokens`, `revokeShareToken`, `validateShareToken` |
| `apps/web/components/dashboard/access-manager.tsx` | Access management container | VERIFIED | Fetches tokens, manages state, wires sub-components |
| `apps/web/components/dashboard/access-table.tsx` | Table with revoke actions | VERIFIED | AlertDialog revoke confirmation, status badges, empty state |
| `apps/web/app/dashboard/page.tsx` | Tabbed dashboard | VERIFIED | Reviews + founder-gated Access tabs |
| `apps/web/app/pitch/page.tsx` | Token-validated pitch page | VERIFIED | Validates `?token=`, redirects to `/access-expired` on failure |

### Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|---------|
| `apps/web/lib/supabase/client.ts` | `NEXT_PUBLIC_SUPABASE_URL` env var | `createBrowserClient` | WIRED | Uses env var directly in `createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, ...)` |
| `apps/api/app/core/auth.py` | `apps/api/app/core/config.py` | `settings.supabase_jwt_secret` | WIRED | `jwt.decode(..., settings.supabase_jwt_secret, algorithms=["HS256"], audience="authenticated")` |
| `apps/web/middleware.ts` | `apps/web/lib/supabase/middleware.ts` | `updateSession` import | WIRED | `import { updateSession } from "@/lib/supabase/middleware"` — used in every code path |
| `apps/web/app/login/actions.ts` | `apps/web/lib/supabase/server.ts` | `createClient` for server action | WIRED | `import { createClient } from "@/lib/supabase/server"`, called immediately in action |
| `apps/web/components/auth/oauth-buttons.tsx` | `apps/web/lib/supabase/client.ts` | `signInWithOAuth` | WIRED | `createClient()` then `supabase.auth.signInWithOAuth(...)` |
| `apps/web/components/auth/signup-form.tsx` | `useSearchParams` | `?email=` param pre-fill | WIRED | `useSearchParams()`, `searchParams.get("email")`, `readOnly={!!emailParam}` |
| `apps/api/app/api/v1/documents.py` | `apps/api/app/core/auth.py` | `Depends(get_current_user)` | WIRED | All endpoints inject `user: dict = Depends(get_current_user)` |
| `apps/web/lib/api.ts` | `apps/web/lib/supabase/client.ts` | `getAuthHeaders` helper | WIRED | `import { createClient }`, `supabase.auth.getSession()`, returns `Authorization: Bearer ...` |
| `apps/web/lib/share-api.ts` | `/api/v1/auth/share-tokens` | `fetch` with auth headers | WIRED | All four functions fetch `${API_BASE}/auth/share-tokens` or `/auth/validate-token` |
| `apps/web/components/dashboard/access-table.tsx` | `apps/web/lib/share-api.ts` | `revokeShareToken` call | WIRED | `onRevoke(token.id)` → `handleRevoke` → `revokeShareToken(id)` in access-manager.tsx |
| `apps/web/components/dashboard/email-invite-form.tsx` | `/signup?email=...&invite=...` | builds invite URL | WIRED | `${window.location.origin}/signup?email=${encodeURIComponent(email)}&invite=${token.token}` |
| `apps/web/app/pitch/page.tsx` | `/api/v1/auth/validate-token` | `validateShareToken` on mount | WIRED | `import { validateShareToken }`, called in `useEffect` on `token` change |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|------------|-------------|-------------|--------|---------|
| AUTH-01 | 06-01, 06-02 | Users can create accounts and log in | SATISFIED | signup/login pages, server actions calling supabase.auth.signUp/signInWithPassword, OAuth buttons |
| AUTH-02 | 06-01, 06-02, 06-03 | Role-based access control (founder vs investor) | SATISFIED | middleware redirects investors from founder-only routes, SiteNav gates nav items by role, API endpoints require JWT |
| AUTH-03 | 06-03, 06-04 | Founder can generate secure shareable links for investor access | SATISFIED | Share token CRUD endpoints, share-link-generator.tsx with configurable expiry, pitch page validates tokens |
| AUTH-04 | 06-03, 06-04 | Founder can revoke investor access | SATISFIED | DELETE /api/v1/auth/share-tokens/{id} with soft-delete revoked_at, access-table.tsx with AlertDialog confirmation |

All four requirements fully satisfied with no orphaned requirements.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `apps/api/tests/test_auth.py` | All tests skipped with `pytest.mark.skip` | INFO | By design — Wave 0 stubs per plan. Real assertions deferred. Not a blocker for phase goal. |
| `apps/api/tests/test_share.py` | All tests skipped with `pytest.mark.skip` | INFO | By design — Wave 0 stubs per plan. Not a blocker. |
| `apps/api/app/api/v1/AGENTS.md` | References outdated `DEMO_USER_ID` constant | INFO | Documentation artifact, not source code. No functional impact. |

No blocking anti-patterns found. Test stubs are intentional and documented in plans.

### Human Verification Required

#### 1. Login and Signup Flow

**Test:** Start Supabase (`pnpm db:start`) and Next.js dev server (`pnpm dev`). Navigate to `/login`, submit valid credentials. Then test `/signup` with a new email.
**Expected:** Login redirects to `/dashboard` with active Supabase session; Signup creates a `public.users` row with `role: 'founder'` and redirects to `/dashboard`.
**Why human:** Requires live Supabase instance and database state; signInWithPassword outcome depends on whether user exists.

#### 2. OAuth Provider Redirect

**Test:** Click Google/GitHub/LinkedIn buttons on `/login` or `/signup`.
**Expected:** Browser redirects to provider authorization page; after auth, `/auth/callback` exchanges code for session and redirects to `/dashboard`.
**Why human:** OAuth providers must be configured in Supabase dashboard with client IDs and redirect URIs; cannot verify without live credentials.

#### 3. Investor Role-Based Redirect

**Test:** Sign up a user, manually set their role to `investor` in the `public.users` table, then log in and navigate to `/dashboard`.
**Expected:** Middleware immediately redirects the investor to `/pitch`; Documents link is absent from SiteNav.
**Why human:** Requires database manipulation and live session to test middleware role lookup.

#### 4. Share Token Anonymous Pitch Access

**Test:** Log in as founder, generate a share link from the dashboard Access tab, copy the URL, sign out, paste the URL in the browser.
**Expected:** `/pitch?token=TOKEN` shows the PitchViewer without requiring login. Modifying the token in the URL should redirect to `/access-expired`.
**Why human:** Requires live share_tokens table (db:reset to apply migration) and token generation through the UI.

#### 5. Revoke Share Token Flow

**Test:** Generate a share link from the Access tab, click the Revoke button, confirm in the AlertDialog, then try to access the revoked link.
**Expected:** Badge updates to "Revoked" immediately in the table; the revoked URL redirects to `/access-expired`.
**Why human:** End-to-end UI interaction with clipboard, API call, and live token state changes.

### Gaps Summary

No gaps found. All 22 observable truths are verified against the codebase:

- **Auth foundation (Plan 01):** Supabase three-client SSR pattern, FastAPI JWT dependency, share_tokens migration — all implemented and wired correctly. Migration correctly numbered 00006 (not 00003 as plan specified, auto-corrected during execution).
- **Auth UI and route protection (Plan 02):** Login, signup, OAuth callback, middleware, role-aware SiteNav, UserAvatarMenu — all implemented with correct wiring. Server actions use `createClient` from server utilities, OAuth uses browser client.
- **API authentication migration (Plan 03):** All three API routers (documents, query, reviews) migrated from DEMO_USER_ID to `Depends(get_current_user)`. Share token CRUD router created and registered. Frontend clients send `Authorization: Bearer` headers. WebSocket supports both JWT and share token auth.
- **Access management UI (Plan 04):** Share token API client, access management components (generator, invite form, table with AlertDialog), tabbed dashboard, token-validated pitch page — all implemented with correct wiring to backend endpoints and to each other.

---

_Verified: 2026-03-19T23:00:00Z_
_Verifier: Claude (gsd-verifier)_
