---
phase: 08-live-pitch-mode
plan: 02
subsystem: ui
tags: [react, nextjs, websocket, live-sessions, shadcn, tailwind, presenter-view]

requires:
  - phase: 08-live-pitch-mode
    provides: sessions API, live-mode query routing, WebSocket notifications, live_sessions table
  - phase: 05-confidence
    provides: confidence scoring, review workflow, pending_review status
  - phase: 06-auth
    provides: JWT auth, middleware route protection, role-based access
provides:
  - "Go Live button on dashboard with confirmation dialogs"
  - "Presenter view at /present with real-time question feed"
  - "QuestionCard with approve/edit/override/dismiss actions"
  - "Investor LIVE banner and live-mode Q&A placeholders"
  - "Session API client and WebSocket hooks for presenter stream"
  - "Server-side /api/me route for WSL2-compatible role fetch"
affects: []

tech-stack:
  added: []
  patterns:
    - "useLiveSession hook for session lifecycle state management"
    - "usePresenterStream WebSocket hook for founder question feed"
    - "Extended useNotificationStream with options object pattern"
    - "isLiveReviewing/isDismissed fields on QAMessage for live mode rendering"
    - "Server-side /api/me route to avoid WSL2 Supabase direct-call hanging"

key-files:
  created:
    - apps/web/lib/session-api.ts
    - apps/web/hooks/use-live-session.ts
    - apps/web/hooks/use-presenter-stream.ts
    - apps/web/components/dashboard/go-live-button.tsx
    - apps/web/app/present/page.tsx
    - apps/web/components/present/presenter-view.tsx
    - apps/web/components/present/question-card.tsx
    - apps/web/components/present/live-header.tsx
    - apps/web/components/present/override-editor.tsx
    - apps/web/components/qa/live-banner.tsx
    - apps/web/components/qa/live-placeholder.tsx
    - apps/web/app/api/me/route.ts
  modified:
    - apps/web/hooks/use-notification-stream.ts
    - apps/web/components/dashboard/validation-dashboard.tsx
    - apps/web/components/qa/qa-panel.tsx
    - apps/web/components/qa/qa-thread.tsx
    - apps/web/app/globals.css
    - apps/web/middleware.ts
    - apps/web/hooks/use-auth.ts
    - apps/web/components/auth/user-avatar-menu.tsx
    - apps/api/app/api/v1/notifications.py
    - apps/api/app/api/v1/query.py

key-decisions:
  - "useNotificationStream refactored from single callback to options object for extensibility"
  - "Live-mode questions set isLiveReviewing flag and status=done to skip streaming sync"
  - "GoLiveButton uses Dialog for start and AlertDialog for end (different confirmation severity)"
  - "Server-side /api/me route added to work around WSL2 Supabase direct-call hanging"
  - "Cookie-based getAuthHeaders for presenter WebSocket on WSL2"

patterns-established:
  - "Options object pattern for hooks with multiple callbacks (useNotificationStream)"
  - "isLiveReviewing/isDismissed message flags for conditional rendering in QAThread"
  - "Server-side API proxy pattern: /api/me route wraps Supabase getUser for WSL2 compatibility"

requirements-completed: [LIVE-01, LIVE-02]

duration: 20min
completed: 2026-03-20
---

# Phase 8 Plan 2: Live Pitch Mode Frontend Summary

**Go Live button, /present route with real-time question feed (approve/edit/override/dismiss), investor LIVE banner, and live-mode Q&A placeholders via WebSocket**

## Performance

- **Duration:** ~20 min (across implementation + verification sessions)
- **Started:** 2026-03-20T08:21:34Z
- **Completed:** 2026-03-20T09:30:00Z
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 24

## Accomplishments
- Session API client with startSession/endSession/getActiveSession/submitLiveAction
- Complete presenter view at /present: LiveHeader with investor count dropdown, QuestionCard with four action modes, OverrideEditor for custom answers
- Go Live button on ValidationDashboard header with Dialog (start) and AlertDialog (end) confirmation flows
- Investor live experience: LIVE banner with pulsing red dot, LivePlaceholder for reviewing/dismissed states
- Extended notification stream and QA panel for live session events (session_started, session_ended, question_dismissed)
- Seven bugs found and fixed during end-to-end verification

## Task Commits

Each task was committed atomically:

1. **Task 1: Session API client, hooks, middleware, and Go Live button** - `c6469d9` (feat)
2. **Task 2: Presenter view page, question cards, and investor live experience** - `a66971a` (feat)
3. **Task 3: Verify complete live pitch mode end-to-end** - human-verify checkpoint (approved)

Bug fix commits during Task 3 verification:
- `0af2d89` fix: default role label to Founder when role is null
- `f9be6e5` fix: fetch user role via server-side API route (WSL2 workaround)
- `c75f761` fix: deduplicate live questions in presenter stream
- `b466282` fix: render citation objects as document titles in question card
- `f34a172` fix: presenter WebSocket auth and investor identity tracking
- `00b8a7b` fix: count anonymous investor connections in presenter view
- `c2e243d` fix: resolve logged-in investor email for live question label

**Plan metadata:** (this commit) (docs: complete plan)

## Files Created/Modified
- `apps/web/lib/session-api.ts` - API client for session REST endpoints
- `apps/web/hooks/use-live-session.ts` - Hook managing live session lifecycle with toasts
- `apps/web/hooks/use-presenter-stream.ts` - WebSocket hook for real-time question feed
- `apps/web/hooks/use-notification-stream.ts` - Extended with session/dismissed event handlers
- `apps/web/components/dashboard/go-live-button.tsx` - Go Live toggle with confirmation dialogs
- `apps/web/components/dashboard/validation-dashboard.tsx` - Added GoLiveButton to header
- `apps/web/app/present/page.tsx` - Presenter view route
- `apps/web/components/present/presenter-view.tsx` - Main presenter layout with question feed
- `apps/web/components/present/question-card.tsx` - Question card with approve/edit/override/dismiss
- `apps/web/components/present/live-header.tsx` - Sticky header with investor count and end session
- `apps/web/components/present/override-editor.tsx` - Custom answer textarea
- `apps/web/components/qa/live-banner.tsx` - LIVE banner for investor pitch viewer
- `apps/web/components/qa/live-placeholder.tsx` - Reviewing and dismissed placeholders
- `apps/web/components/qa/qa-panel.tsx` - Extended with isLiveSession prop and live mode behavior
- `apps/web/components/qa/qa-thread.tsx` - Extended QAMessage with isLiveReviewing/isDismissed
- `apps/web/app/globals.css` - Added --color-live CSS variable
- `apps/web/middleware.ts` - Added /present to FOUNDER_ONLY_PATHS
- `apps/web/app/api/me/route.ts` - Server-side user role fetch (WSL2 fix)
- `apps/web/hooks/use-auth.ts` - Updated to use /api/me route
- `apps/web/components/auth/user-avatar-menu.tsx` - Role display fix
- `apps/api/app/api/v1/notifications.py` - Anonymous investor counting
- `apps/api/app/api/v1/query.py` - Investor email lookup for question labels

## Decisions Made
- Refactored useNotificationStream from single callback to options object for clean extensibility
- Live-mode questions set isLiveReviewing=true and status="done" to prevent streaming sync from overwriting placeholder state
- GoLiveButton uses standard Dialog for starting (informational) and AlertDialog for ending (destructive action)
- Server-side /api/me route added for WSL2 compatibility (direct Supabase calls hang)
- Cookie-based getAuthHeaders for presenter WebSocket to work on WSL2

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated qa-panel.tsx call to match new useNotificationStream signature**
- **Found during:** Task 1
- **Issue:** Changing useNotificationStream to options object broke existing caller
- **Fix:** Updated call to use options object pattern
- **Files modified:** apps/web/components/qa/qa-panel.tsx
- **Committed in:** c6469d9 (Task 1 commit)

**2. [Rule 1 - Bug] Role label defaulting to "Investor" when null**
- **Found during:** Task 3 (verification)
- **Issue:** Inverted null check caused role to default to "Investor" instead of "Founder"
- **Fix:** Fixed the conditional check
- **Files modified:** apps/web/components/auth/user-avatar-menu.tsx
- **Committed in:** `0af2d89`

**3. [Rule 1 - Bug] Role fetch hanging on WSL2**
- **Found during:** Task 3 (verification)
- **Issue:** Direct Supabase calls hang on WSL2 (known project constraint)
- **Fix:** Added /api/me server-side route to proxy user role fetch
- **Files modified:** apps/web/app/api/me/route.ts, apps/web/hooks/use-auth.ts
- **Committed in:** `f9be6e5`

**4. [Rule 1 - Bug] Duplicate keys in presenter question list**
- **Found during:** Task 3 (verification)
- **Issue:** Same queryId appeared multiple times causing React key warnings
- **Fix:** Deduplicate by queryId in usePresenterStream
- **Files modified:** apps/web/hooks/use-presenter-stream.ts
- **Committed in:** `c75f761`

**5. [Rule 1 - Bug] Citations rendering as [object Object]**
- **Found during:** Task 3 (verification)
- **Issue:** Citation objects need document_title extraction, not string coercion
- **Fix:** Extract document_title from citation objects
- **Files modified:** apps/web/components/present/question-card.tsx
- **Committed in:** `b466282`

**6. [Rule 1 - Bug] Presenter WebSocket not connecting on WSL2**
- **Found during:** Task 3 (verification)
- **Issue:** Token-based auth failed; needed cookie-based getAuthHeaders
- **Fix:** Use cookie-based auth for presenter WebSocket connection
- **Files modified:** apps/web/hooks/use-presenter-stream.ts
- **Committed in:** `f34a172`

**7. [Rule 1 - Bug] Anonymous investors not counted**
- **Found during:** Task 3 (verification)
- **Issue:** Only authenticated investors were tracked in connection count
- **Fix:** Track all WebSocket connections regardless of auth status
- **Files modified:** apps/api/app/api/v1/notifications.py
- **Committed in:** `00b8a7b`

**8. [Rule 1 - Bug] Logged-in investor questions showing as "Anonymous"**
- **Found during:** Task 3 (verification)
- **Issue:** Investor email not looked up from users table for question labels
- **Fix:** Lookup user email from users table when investor is authenticated
- **Files modified:** apps/api/app/api/v1/query.py
- **Committed in:** `c2e243d`

---

**Total deviations:** 8 auto-fixed (1 blocking, 7 bugs found during verification)
**Impact on plan:** All fixes necessary for correct end-to-end functionality. No scope creep.

## Issues Encountered
- WSL2 environment required two workarounds: server-side /api/me route for role fetch, and cookie-based auth for presenter WebSocket. Both are documented as known WSL2 constraints.
- Pre-existing TypeScript error in qa-panel.tsx (line 109: `founder_answer` property not on `QueryResponse` type) -- out of scope, existed before this plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 8 phases complete. The PoC is fully functional with:
  - Document ingestion (PDF, Excel, Markdown)
  - RAG query engine with streaming answers and citations
  - Smart document viewer with inline Q&A
  - Trust/HITL validation with confidence scoring
  - Auth and access control with shareable links
  - Analytics dashboard with engagement tracking
  - Live pitch mode with presenter view
- This is the final plan of the final phase.

## Self-Check: PASSED

All created files verified present. All task commits and bug fix commits found in git log.

---
*Phase: 08-live-pitch-mode*
*Completed: 2026-03-20*
