---
phase: 06-auth-access-control
plan: 02
subsystem: auth
tags: [supabase-auth, nextjs-middleware, oauth, role-based-access, useSearchParams]

requires:
  - phase: 06-01
    provides: Supabase SSR clients (browser, server, middleware), users table, share_tokens table
provides:
  - Login page with email+password and OAuth (Google, GitHub, LinkedIn)
  - Signup page with email pre-fill from invite links
  - OAuth callback route for code-to-session exchange
  - Middleware route protection with role-based redirects
  - Role-aware SiteNav (founder full nav, investor pitch-only, anonymous minimal)
  - UserAvatarMenu with sign out functionality
  - useAuth hook for client-side auth state
  - Access expired page for invalid/revoked tokens
affects: [06-03, 06-04]

tech-stack:
  added: [shadcn-label, shadcn-alert-dialog, shadcn-table]
  patterns: [useActionState for server action forms, useSearchParams for invite pre-fill, middleware role-based redirects]

key-files:
  created:
    - apps/web/components/auth/auth-layout.tsx
    - apps/web/components/auth/login-form.tsx
    - apps/web/components/auth/signup-form.tsx
    - apps/web/components/auth/oauth-buttons.tsx
    - apps/web/components/auth/user-avatar-menu.tsx
    - apps/web/app/login/page.tsx
    - apps/web/app/login/actions.ts
    - apps/web/app/signup/page.tsx
    - apps/web/app/signup/actions.ts
    - apps/web/app/auth/callback/route.ts
    - apps/web/app/access-expired/page.tsx
    - apps/web/middleware.ts
    - apps/web/hooks/use-auth.ts
  modified:
    - apps/web/components/dashboard/site-nav.tsx

key-decisions:
  - "useActionState (React 19) for login/signup form state instead of useState+fetch"
  - "base-ui render prop for DropdownMenuTrigger (not asChild) per shadcn base-nova pattern"
  - "Role fetched from public.users table in middleware (not JWT custom claims) for PoC simplicity"

patterns-established:
  - "AuthLayout: centered card on bg-muted for all auth pages"
  - "Server action pattern: 'use server' + createClient from supabase/server + redirect on success"
  - "Signup invite flow: ?email= pre-fills readOnly field, ?invite= hidden field sets investor role"
  - "SiteNav visibility: returns null on auth pages, role-conditional nav items via useAuth hook"

requirements-completed: [AUTH-01, AUTH-02]

duration: 6min
completed: 2026-03-19
---

# Phase 6 Plan 2: Auth UI & Route Protection Summary

**Login/signup pages with OAuth, middleware route protection with role-based redirects, and role-aware SiteNav with avatar menu**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-19T22:18:18Z
- **Completed:** 2026-03-19T22:24:32Z
- **Tasks:** 4
- **Files modified:** 16

## Accomplishments
- Login and signup pages with email+password forms, inline error display, and OAuth buttons (Google, GitHub, LinkedIn)
- Signup form pre-fills email from ?email= URL parameter and assigns investor role when invite token present
- Middleware protects all routes, redirects unauthenticated users to /login, and redirects investors from /dashboard and /documents to /pitch
- SiteNav conditionally renders navigation items based on user role with UserAvatarMenu for sign out

## Task Commits

Each task was committed atomically:

1. **Task 1a: Create shared auth components** - `e71a32a` (feat)
2. **Task 1b: Create auth pages, server actions, OAuth callback** - `a45156c` (feat)
3. **Task 2: Create middleware and useAuth hook** - `b46831e` (feat)
4. **Task 3: Make SiteNav role-aware with avatar menu** - `7c99d3f` (feat)

## Files Created/Modified
- `apps/web/components/auth/auth-layout.tsx` - Centered card layout wrapper for auth pages
- `apps/web/components/auth/login-form.tsx` - Login form with email+password, OAuth, error display
- `apps/web/components/auth/signup-form.tsx` - Signup form with email pre-fill from URL params
- `apps/web/components/auth/oauth-buttons.tsx` - Google, GitHub, LinkedIn OAuth buttons
- `apps/web/components/auth/user-avatar-menu.tsx` - Avatar with dropdown: email, role badge, sign out
- `apps/web/app/login/page.tsx` - Login page route
- `apps/web/app/login/actions.ts` - Server action: signInWithPassword
- `apps/web/app/signup/page.tsx` - Signup page route with Suspense
- `apps/web/app/signup/actions.ts` - Server action: signUp + create users profile
- `apps/web/app/auth/callback/route.ts` - OAuth code-to-session exchange
- `apps/web/app/access-expired/page.tsx` - Expired/invalid token landing page
- `apps/web/middleware.ts` - Route protection with role-based redirects
- `apps/web/hooks/use-auth.ts` - Client-side auth state + role hook
- `apps/web/components/dashboard/site-nav.tsx` - Rewritten to be role-aware
- `apps/web/components/ui/label.tsx` - shadcn Label component (installed)
- `apps/web/components/ui/alert-dialog.tsx` - shadcn AlertDialog component (installed)
- `apps/web/components/ui/table.tsx` - shadcn Table component (installed)

## Decisions Made
- Used React 19 useActionState for form submission state management instead of useState+fetch pattern
- Used base-ui render prop for DropdownMenuTrigger avatar button (base-nova shadcn does not support asChild)
- Role fetched from public.users table in middleware rather than JWT custom claims (PoC appropriate)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Auth UI complete, ready for Plan 03 (share token generation and access management)
- OAuth providers require Supabase dashboard configuration (Google, GitHub, LinkedIn client IDs) for production use
- Middleware and useAuth hook provide the auth infrastructure that Plan 03 and 04 will build upon

---
*Phase: 06-auth-access-control*
*Completed: 2026-03-19*
