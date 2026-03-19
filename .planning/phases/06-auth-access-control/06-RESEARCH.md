# Phase 6: Auth + Access Control - Research

**Researched:** 2026-03-19
**Domain:** Supabase Auth + Next.js SSR + FastAPI JWT + RBAC + Shareable Token Links
**Confidence:** HIGH

## Summary

This phase wires real authentication into an existing Supabase + Next.js 15 + FastAPI stack. The key packages (`@supabase/ssr` 0.9.0 and `@supabase/supabase-js` 2.99.2) are already installed in the web app but unused. The `public.users` table with a `role` column (founder/investor/admin) and RLS policies already exist from Phase 1. Three API files (documents.py, query.py, reviews.py) use a hardcoded `DEMO_USER_ID` that must be replaced with real JWT-based user extraction.

The architecture follows the official Supabase SSR pattern: three client utilities (browser, server, middleware), a `middleware.ts` for session refresh + route protection, and an `/auth/callback` route for OAuth. On the FastAPI side, JWT validation uses PyJWT with the Supabase JWT secret (HS256) or JWKS endpoint. Share tokens are stored in a new `share_tokens` database table with expiry/revocation, validated via a dedicated API endpoint.

**Primary recommendation:** Use the official Supabase SSR three-client pattern (browser/server/middleware) with `getClaims()` in middleware for fast JWT validation. Generate share tokens with `nanoid` (21-char URL-safe), store them in a `share_tokens` table with RLS, and validate them server-side before granting anonymous pitch access.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Email + password as primary authentication method
- OAuth support for Google, GitHub, and LinkedIn as alternative login options
- Separate /login and /signup pages (not a single page with toggle)
- After login, founders land on /dashboard
- Two sharing methods: quick anonymous token URLs AND formal email invitations
- Token links have a default expiry period (e.g., 7 or 30 days)
- Shared links managed in a new "Access" section on the existing /dashboard
- Revoked/expired links show a generic "access expired" page (neutral, doesn't reveal revocation vs expiry)
- Next.js middleware.ts at app root for centralized auth checking
- Public pages (no auth required): /, /login, /signup, /pitch (with valid share token)
- All other pages require authentication
- Middleware also checks user role: investors hitting /dashboard or /documents get redirected to /pitch
- SiteNav becomes role-aware: founders see full nav (Dashboard, Documents, Pitch, Query), investors see only Pitch, logout always visible
- Token link = zero friction, no account needed. Immediate read-only access to pitch viewer
- Email invite = link pre-fills investor's email on signup page, they set a password, land on pitch
- Anonymous token-link investors get full Q&A access (questions tracked by token for analytics)
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

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | Users can create accounts and log in | Supabase Auth email+password + OAuth (Google/GitHub/LinkedIn), `@supabase/ssr` browser/server client utilities, /login and /signup pages, /auth/callback route |
| AUTH-02 | Role-based access control (founder vs investor roles with different permissions) | Existing `public.users.role` column, middleware.ts role-checking with getClaims(), RoleAwareSiteNav component, route redirection logic |
| AUTH-03 | Founder can generate secure shareable links for investor access | New `share_tokens` table, nanoid token generation, token validation endpoint, /pitch?token= parameter handling, anonymous Q&A access |
| AUTH-04 | Founder can revoke investor access | Revocation endpoint updates share_tokens.revoked_at, middleware token validation checks revocation status, immediate effect |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/ssr | 0.9.0 | Cookie-based SSR auth client for Next.js | Already installed; official Supabase SSR package replacing deprecated auth-helpers |
| @supabase/supabase-js | 2.99.2 | Supabase client (auth, DB, realtime) | Already installed; core Supabase SDK |
| PyJWT | 2.10.x | FastAPI JWT token validation | Standard Python JWT library; lighter than python-jose, actively maintained |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nanoid | 5.1.7 | URL-safe token generation for share links | Generate 21-char tokens for shareable URLs (collision-resistant, URL-safe) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| nanoid | crypto.randomUUID() | UUID is longer (36 chars) and less URL-friendly; nanoid is shorter, URL-safe by default |
| PyJWT | python-jose | python-jose is heavier, less maintained; PyJWT is the standard for simple JWT validation |
| Supabase Auth | NextAuth.js | Would add complexity; Supabase Auth is already integrated in the stack |

**Installation:**
```bash
# Frontend (nanoid for share token generation on the server side)
cd apps/web && pnpm add nanoid

# Backend (PyJWT for JWT validation)
cd apps/api && uv add pyjwt
```

**Note:** `@supabase/ssr` and `@supabase/supabase-js` are already installed. No shadcn components need installing -- Label, Table, AlertDialog should be added via `pnpm dlx shadcn@latest add label table alert-dialog`.

## Architecture Patterns

### Recommended Project Structure
```
apps/web/
├── lib/
│   └── supabase/
│       ├── client.ts          # Browser client (createBrowserClient)
│       ├── server.ts          # Server client (createServerClient + cookies)
│       └── middleware.ts      # updateSession() for middleware.ts
├── middleware.ts               # Root middleware (auth + role + token checks)
├── app/
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts       # OAuth callback handler
│   ├── login/
│   │   └── page.tsx           # Login page
│   ├── signup/
│   │   └── page.tsx           # Signup page
│   └── pitch/
│       └── page.tsx           # Modified to accept ?token= param
├── components/
│   └── auth/
│       ├── login-form.tsx     # Email+password login form
│       ├── signup-form.tsx    # Registration form
│       ├── oauth-buttons.tsx  # Google/GitHub/LinkedIn buttons
│       ├── auth-layout.tsx    # Centered card layout wrapper
│       └── user-avatar-menu.tsx # Avatar dropdown with logout
│   └── dashboard/
│       ├── site-nav.tsx       # Modified: role-aware navigation
│       ├── access-manager.tsx # Share link + invite management
│       ├── share-link-generator.tsx
│       ├── email-invite-form.tsx
│       └── access-table.tsx   # Active/revoked links table
└── hooks/
    └── use-auth.ts            # Auth state hook (session + role)

apps/api/
├── app/
│   ├── core/
│   │   └── auth.py            # JWT validation dependency + get_current_user
│   └── api/v1/
│       ├── auth.py            # Token validation endpoint for share links
│       ├── documents.py       # Modified: use get_current_user dependency
│       ├── query.py           # Modified: use get_current_user dependency
│       └── reviews.py         # Modified: use get_current_user dependency

supabase/
└── migrations/
    └── 00003_share_tokens.sql # New share_tokens table + RLS policies
```

### Pattern 1: Three-Client Supabase SSR Pattern
**What:** Separate client utilities for browser, server components, and middleware contexts
**When to use:** Every Supabase interaction in Next.js App Router
**Example:**
```typescript
// Source: Official Supabase examples (github.com/supabase/supabase/examples/auth/nextjs)

// lib/supabase/client.ts -- Browser client
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// lib/supabase/server.ts -- Server client
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component -- middleware handles refresh
          }
        },
      },
    }
  )
}

// lib/supabase/middleware.ts -- Middleware session updater
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data } = await supabase.auth.getClaims()
  return { user: data?.claims, supabaseResponse }
}
```

### Pattern 2: FastAPI JWT Dependency Injection
**What:** A reusable `Depends(get_current_user)` that extracts and validates the user from Authorization header
**When to use:** Every protected API endpoint (replaces DEMO_USER_ID)
**Example:**
```python
# Source: Standard FastAPI + PyJWT pattern for Supabase

# app/core/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt

from app.core.config import settings

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Validate JWT and return user claims."""
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

### Pattern 3: Share Token Database Schema
**What:** Database table for shareable access tokens with expiry and revocation
**When to use:** Founder generating investor access links
**Example:**
```sql
-- supabase/migrations/00003_share_tokens.sql
CREATE TABLE public.share_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  founder_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  investor_email TEXT,          -- NULL for anonymous links
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,       -- NULL = active
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_share_tokens_token ON public.share_tokens(token);
CREATE INDEX idx_share_tokens_founder ON public.share_tokens(founder_id);

ALTER TABLE public.share_tokens ENABLE ROW LEVEL SECURITY;

-- Founders can manage their own tokens
CREATE POLICY "Founders can manage own tokens"
  ON public.share_tokens FOR ALL
  USING (auth.uid() = founder_id);

-- Service role can validate any token (for anonymous access)
-- (service role bypasses RLS automatically)
```

### Pattern 4: Middleware Route Protection with Role Gates
**What:** Centralized auth + role checking in Next.js middleware
**When to use:** Every page navigation
**Example:**
```typescript
// middleware.ts
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PUBLIC_PATHS = ['/', '/login', '/signup']
const FOUNDER_ONLY_PATHS = ['/dashboard', '/documents']

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Allow static assets and API routes through
  // (handled by matcher config)

  // Check for share token on /pitch
  if (pathname === '/pitch' && searchParams.has('token')) {
    // Token-based access -- validate token server-side
    // Pass through to page which validates token
    const { supabaseResponse } = await updateSession(request)
    return supabaseResponse
  }

  // Public paths -- no auth required
  if (PUBLIC_PATHS.includes(pathname)) {
    const { supabaseResponse } = await updateSession(request)
    return supabaseResponse
  }

  // All other paths require auth
  const { user, supabaseResponse } = await updateSession(request)

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Role-based redirects: investors can only access /pitch
  if (FOUNDER_ONLY_PATHS.some(p => pathname.startsWith(p))) {
    // Need to check role from public.users table or JWT custom claims
    // For now, getClaims() gives us the JWT sub -- we need to fetch role
    // Option: store role in JWT custom claims via Supabase hook
    // Or: fetch from public.users on each protected route
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Anti-Patterns to Avoid
- **Using `getSession()` in server code:** Never trust `getSession()` server-side; it does not revalidate the JWT. Use `getClaims()` (fast, local validation) or `getUser()` (network call to auth server).
- **Storing tokens in localStorage:** Supabase SSR uses HTTP-only cookies automatically. Do not manually manage tokens.
- **Creating global Supabase clients:** Always create a new client per request, especially in middleware. Do not cache/reuse clients across requests.
- **Sharing the service role key with the frontend:** The `SUPABASE_SERVICE_ROLE_KEY` must never be exposed. Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` for frontend clients.
- **Mixing auth-helpers and ssr packages:** The project must use only `@supabase/ssr`, not the deprecated `@supabase/auth-helpers-nextjs`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session management | Custom cookie/token storage | Supabase SSR cookie handling | Handles refresh rotation, secure httpOnly cookies, cross-tab sync |
| JWT validation (Python) | Manual base64 decode + verify | PyJWT `jwt.decode()` | Handles algorithm verification, exp/aud claims, key rotation edge cases |
| OAuth flows | Custom redirect/callback logic | `supabase.auth.signInWithOAuth()` | Provider-specific quirks, PKCE, state parameter, token exchange |
| Password hashing | bcrypt/argon2 in app code | Supabase Auth handles it | Supabase manages salt, rounds, secure storage |
| Token generation | Math.random or custom scheme | nanoid (URL-safe, 21-char default) | Cryptographically strong, collision-resistant, URL-safe alphabet |
| Rate limiting on auth | Custom counter logic | Supabase Auth built-in rate limits | Prevents brute force on login/signup endpoints |

**Key insight:** Supabase Auth already handles the hardest parts (session lifecycle, token refresh, OAuth state management, password hashing). The implementation work is primarily plumbing -- connecting Supabase Auth to the existing UI components and API endpoints.

## Common Pitfalls

### Pitfall 1: Middleware Cookie Forwarding
**What goes wrong:** User gets randomly logged out after a few minutes
**Why it happens:** Middleware creates a new response without copying cookies from the supabaseResponse. The browser and server go out of sync.
**How to avoid:** Always return the `supabaseResponse` from `updateSession()`. If creating a custom response (e.g., redirect), copy all cookies: `newResponse.cookies.setAll(supabaseResponse.cookies.getAll())`
**Warning signs:** Users report intermittent logouts, especially after token refresh (every ~3600s with current config)

### Pitfall 2: Server Component Cookie Write Failure
**What goes wrong:** `setAll` throws in Server Components because they are read-only
**Why it happens:** Server Components cannot write cookies; only middleware and Route Handlers can
**How to avoid:** Wrap `setAll` in try/catch in the server client (the official pattern). The middleware handles the actual cookie writes.
**Warning signs:** Console errors about cookies in Server Components

### Pitfall 3: Incorrect Environment Variable Names
**What goes wrong:** Auth silently fails or returns null sessions
**Why it happens:** The existing `.env` uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` but the official Supabase example now uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Either works, but must be consistent.
**How to avoid:** Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` since it already exists in the project `.env`. Map it in the client utilities.
**Warning signs:** 401 errors from Supabase, empty session objects

### Pitfall 4: OAuth Redirect URL Mismatch
**What goes wrong:** OAuth login redirects to wrong URL or fails with "redirect_uri mismatch"
**Why it happens:** Supabase config.toml `site_url` and `additional_redirect_urls` don't include the callback path, or the provider console has wrong URLs
**How to avoid:** Add `http://127.0.0.1:3000/auth/callback` to `additional_redirect_urls` in config.toml. Register the same URL in each OAuth provider's console. Use `http://127.0.0.1` not `http://localhost` for consistency.
**Warning signs:** Redirect errors, blank pages after OAuth provider login

### Pitfall 5: DEMO_USER_ID Migration Breaking Existing Data
**What goes wrong:** After switching to real auth, existing documents/queries become inaccessible
**Why it happens:** Existing records reference the demo user UUID. New authenticated users have different UUIDs.
**How to avoid:** Keep the demo seed migration for development. In production, this is a fresh start anyway. For dev, the demo user can still log in with `demo@zeee-pitch-zooo.local` / `demo-password`.
**Warning signs:** Empty document list after implementing auth, 404s on previously accessible content

### Pitfall 6: Share Token Validation on WebSocket
**What goes wrong:** Anonymous users with share tokens can't use Q&A streaming
**Why it happens:** WebSocket connections bypass the standard HTTP middleware auth flow. The FastAPI WebSocket endpoint uses DEMO_USER_ID.
**How to avoid:** Accept token as a query parameter on the WebSocket URL. Validate the share token in the WebSocket handler before accepting the connection. Track queries by token ID for analytics.
**Warning signs:** WebSocket connection refused for anonymous users, Q&A not working with share links

### Pitfall 7: Role Check Requires Database Lookup
**What goes wrong:** Middleware can't check user role because it's not in the JWT claims
**Why it happens:** By default, Supabase JWT contains `sub` (user ID), `email`, `role` (always "authenticated"), but NOT the custom `public.users.role` column.
**How to avoid:** Either (a) use a Supabase database webhook/trigger to add custom claims to JWT via `auth.users.raw_app_meta_data`, or (b) fetch the role from `public.users` table in middleware using the server client. Option (b) is simpler for a PoC -- one extra DB query per protected page load.
**Warning signs:** All users treated as the same role, middleware role checks always passing

## Code Examples

### OAuth Callback Route Handler
```typescript
// Source: Official Supabase pattern for Next.js App Router
// app/auth/callback/route.ts

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
```

### Login with Email/Password (Server Action)
```typescript
// Source: Supabase Auth signInWithPassword pattern
// app/login/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}
```

### OAuth Sign-In
```typescript
// Source: Supabase signInWithOAuth pattern
// components/auth/oauth-buttons.tsx (client component)
'use client'

import { createClient } from '@/lib/supabase/client'

export function signInWithProvider(provider: 'google' | 'github' | 'linkedin_oidc') {
  const supabase = createClient()
  supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
}
```

### FastAPI User Dependency Usage
```python
# Replacing DEMO_USER_ID in existing endpoints
# app/api/v1/documents.py (modified)

from app.core.auth import get_current_user

@router.post("/documents", status_code=201)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(None),
    purpose: str = Form("pitch"),
    user: dict = Depends(get_current_user),  # NEW
):
    user_id = user["sub"]  # Supabase JWT 'sub' claim = user UUID
    # ... use user_id instead of DEMO_USER_ID
```

### Share Token Validation
```python
# app/api/v1/auth.py
from app.core.supabase import get_service_client

@router.get("/auth/validate-token")
async def validate_share_token(token: str):
    """Validate a share token and return access status."""
    client = get_service_client()
    result = (
        client.table("share_tokens")
        .select("*")
        .eq("token", token)
        .is_("revoked_at", "null")
        .single()
        .execute()
    )
    if not result.data:
        return {"valid": False}

    from datetime import datetime, timezone
    expires_at = datetime.fromisoformat(result.data["expires_at"])
    if expires_at < datetime.now(timezone.utc):
        return {"valid": False}

    return {"valid": True, "token_id": result.data["id"]}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2024 | auth-helpers is deprecated; ssr is the only supported package |
| `getSession()` for auth checks | `getClaims()` for fast validation | Late 2024 / 2025 | getClaims validates JWT locally (no network round-trip), much faster |
| `getUser()` in middleware | `getClaims()` in middleware | 2025 | getClaims uses JWKS for local JWT verification; getUser hits auth server every time |
| HS256 JWT signing (symmetric) | ES256 JWT signing (asymmetric) | Supabase CLI v2.71.1 | New projects default to ES256; existing projects may still use HS256. Check config. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 2025 | Renamed in official docs but both work; use existing project convention |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Replaced by `@supabase/ssr`. Do not install.
- `supabase.auth.getSession()` server-side: Not safe; does not revalidate JWT.

## Discretion Recommendations

Based on research, here are recommendations for areas left to Claude's discretion:

| Area | Recommendation | Rationale |
|------|----------------|-----------|
| Token expiry default | 14 days | Balances security with usability; matches UI-SPEC dropdown default |
| Token generation | nanoid (21-char, URL-safe) | Shorter than UUID, cryptographically strong, no encoding needed in URLs |
| Password reset | Server action calling `supabase.auth.resetPasswordForEmail()` + /reset-password page | Built into Supabase Auth; just needs a form and redirect handler |
| OAuth redirect URIs | `http://127.0.0.1:3000/auth/callback` in config.toml, same in provider consoles | Must use 127.0.0.1 (not localhost) for Google OAuth compatibility |
| Session refresh | Handled automatically by middleware `updateSession()` calling `getClaims()` | Supabase SSR manages refresh token rotation; JWT expires every 3600s per config.toml |
| Middleware matcher | `/((?!_next/static\|_next/image\|favicon.ico\|.*\\.(?:svg\|png\|jpg\|jpeg\|gif\|webp)$).*)` | Official Supabase pattern; excludes static assets |
| Email invitations | Store invite in `share_tokens` table with `investor_email` set, generate signup link with `?email=` prefilled | No email delivery service needed for PoC; founder copies the invite link manually |

## Open Questions

1. **JWT Algorithm (HS256 vs ES256)**
   - What we know: Supabase CLI v2.71.1+ defaults to ES256 (asymmetric). The project was created earlier and likely uses HS256.
   - What's unclear: Which algorithm the local Supabase instance is using. This affects whether PyJWT uses `jwt_secret` (HS256) or JWKS endpoint (ES256).
   - Recommendation: Check `supabase status` output for the JWT secret. If HS256, add `SUPABASE_JWT_SECRET` to `.env` and Settings. If ES256, use the JWKS endpoint (`{SUPABASE_URL}/auth/v1/.well-known/jwks.json`). HS256 is simpler for PoC.

2. **Role in JWT Custom Claims vs Database Lookup**
   - What we know: Supabase JWT `role` claim is always "authenticated" (auth role, not app role). The app role is in `public.users.role`.
   - What's unclear: Whether adding custom claims via `raw_app_meta_data` is worth the complexity vs. a simple DB lookup in middleware.
   - Recommendation: For PoC, fetch role from `public.users` table in middleware. One extra query per navigation is acceptable at this scale. Add a `user_role` cookie/header for client-side use to avoid refetching.

3. **Anonymous Q&A Tracking by Token**
   - What we know: Anonymous token users should get Q&A access with questions tracked by token for analytics (Phase 7).
   - What's unclear: How to associate queries with a share token when there's no user session.
   - Recommendation: Add `share_token_id` column to `queries` table. Pass token ID through the query creation flow. The FastAPI token validation endpoint returns the token_id which the frontend includes in query requests.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (Python API), no frontend test framework yet |
| Config file | apps/api/pyproject.toml (implicit pytest config) |
| Quick run command | `cd apps/api && uv run pytest tests/ -x -q` |
| Full suite command | `cd apps/api && uv run pytest tests/ -x` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Login returns JWT, signup creates user | integration | `cd apps/api && uv run pytest tests/test_auth_api.py -x` | No -- Wave 0 |
| AUTH-02 | Role-based endpoint access | integration | `cd apps/api && uv run pytest tests/test_auth_api.py::test_role_access -x` | No -- Wave 0 |
| AUTH-03 | Share token creation and validation | unit | `cd apps/api && uv run pytest tests/test_share_tokens.py -x` | No -- Wave 0 |
| AUTH-04 | Token revocation prevents access | unit | `cd apps/api && uv run pytest tests/test_share_tokens.py::test_revocation -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/api && uv run pytest tests/ -x -q`
- **Per wave merge:** `cd apps/api && uv run pytest tests/ -x`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/api/tests/test_auth_api.py` -- covers AUTH-01, AUTH-02 (JWT validation, role checking)
- [ ] `apps/api/tests/test_share_tokens.py` -- covers AUTH-03, AUTH-04 (token creation, validation, revocation)
- [ ] PyJWT dependency: `cd apps/api && uv add pyjwt` -- required for JWT validation

## Sources

### Primary (HIGH confidence)
- [Supabase official Next.js auth example](https://github.com/supabase/supabase/tree/master/examples/auth/nextjs) -- client.ts, server.ts, proxy.ts (middleware) code verified via GitHub API raw download
- [Supabase SSR docs](https://supabase.com/docs/guides/auth/server-side/nextjs) -- three-client pattern, middleware setup, cookie handling
- [Supabase SSR client creation docs](https://supabase.com/docs/guides/auth/server-side/creating-a-client) -- createBrowserClient, createServerClient configuration
- Existing project codebase -- verified installed packages, database schema, API endpoint patterns, config.toml settings

### Secondary (MEDIUM confidence)
- [Supabase getClaims vs getUser discussion](https://github.com/supabase/supabase/issues/39947) -- getClaims() recommended over getUser() in middleware for performance
- [Supabase OAuth redirect URLs docs](https://supabase.com/docs/guides/auth/redirect-urls) -- configuration for local dev
- [Supabase JWT signing keys docs](https://supabase.com/docs/guides/auth/signing-keys) -- HS256 vs ES256 migration path
- [FastAPI + Supabase JWT validation (DEV Community)](https://dev.to/zwx00/validating-a-supabase-jwt-locally-with-python-and-fastapi-59jf) -- PyJWT pattern with audience="authenticated"

### Tertiary (LOW confidence)
- LinkedIn OAuth provider name: assumed `linkedin_oidc` based on Supabase provider naming convention -- needs verification in Supabase Auth docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- packages already installed, official examples verified from GitHub source
- Architecture: HIGH -- follows official Supabase SSR three-client pattern, well-documented
- Pitfalls: HIGH -- documented from official Supabase issues and community patterns
- Share token design: MEDIUM -- custom table design based on standard patterns, not Supabase-specific feature
- OAuth providers (LinkedIn): LOW -- provider name needs verification

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable APIs, no major version changes expected)
