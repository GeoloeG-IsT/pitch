---
phase: 08-live-pitch-mode
verified: 2026-03-20T11:15:00Z
status: human_needed
score: 16/16 must-haves verified
re_verification: true
  previous_status: gaps_found
  previous_score: 13/16
  gaps_closed:
    - "Investor sees a LIVE banner when a session is active"
    - "Investor sees 'being reviewed by presenter' placeholder for questions during live sessions"
    - "When session ends, investor pitch viewer reverts to normal async mode"
  gaps_remaining: []
  regressions:
    - "TypeScript compilation fails: qa-panel.tsx line 112 references q.founder_answer which is absent from QueryResponse type (pre-existing issue, not introduced by fix)"
human_verification:
  - test: "End-to-end live session flow"
    expected: "Start session -> investor pitch view shows LIVE banner -> ask question -> see 'being reviewed by presenter' placeholder -> approve on presenter view -> investor receives answer in real-time -> end session -> LIVE banner disappears and subsequent questions use async flow"
    why_human: "Requires running both services simultaneously with two browser windows; automated checks cannot verify visual state or WebSocket real-time behavior"
  - test: "Presenter view /present route protection"
    expected: "Investor logging in and navigating to /present should be redirected to /pitch"
    why_human: "Middleware behavior requires real authentication flow to verify role-based redirect"
---

# Phase 8: Live Pitch Mode Verification Report

**Phase Goal:** Founders can present the pitch in real-time while investors ask questions via the Q&A interface, with the founder seeing incoming questions and AI draft answers in a presenter view
**Verified:** 2026-03-20T11:15:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (commit 363b225)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Founder can start a live session via POST /api/v1/sessions and receive a session_id | VERIFIED | sessions.py POST /sessions endpoint creates DB record, populates _active_sessions cache, returns SessionResponse |
| 2 | Founder can end a live session via DELETE /api/v1/sessions/{session_id} | VERIFIED | sessions.py DELETE /sessions/{session_id} sets ended_at, removes from cache, broadcasts session_ended |
| 3 | GET /api/v1/sessions/active returns the active session for a founder or null | VERIFIED | sessions.py GET /sessions/active checks _active_sessions cache |
| 4 | During an active live session, ALL questions route through founder regardless of confidence | VERIFIED | query.py checks _active_sessions before confidence-based routing; sets live_session_id and queues for founder |
| 5 | Founder can approve, edit, override, or dismiss live questions | VERIFIED | sessions.py PUT /sessions/{id}/questions/{id} handles all four actions with correct DB updates |
| 6 | Dismissed questions set review_status to 'dismissed' in the database | VERIFIED | sessions.py sets review_status="dismissed"; migration 00008 adds 'dismissed' to CHECK constraint |
| 7 | Approved/edited/overridden answers are broadcast to investors via WebSocket | VERIFIED | sessions.py calls broadcast_approved_answer for approve/edit/override; notifications.py broadcasts to all investor connections |
| 8 | Session events (started, ended) are broadcast to connected investors | VERIFIED | sessions.py calls broadcast_session_event; notifications.py sends to all _investor_connections |
| 9 | Founder can click 'Go Live' on dashboard to start a live session | VERIFIED | go-live-button.tsx renders Dialog with "Start Live Session" action; validation-dashboard.tsx mounts GoLiveButton with useLiveSession hook |
| 10 | Founder sees a presenter view at /present with real-time question feed | VERIFIED | app/present/page.tsx renders PresenterView; presenter-view.tsx uses usePresenterStream to populate question feed |
| 11 | Founder can approve, edit, override, or dismiss questions from the presenter view | VERIFIED | question-card.tsx calls submitLiveAction with all four actions; submitLiveAction hits PUT /api/v1/sessions/.../questions/... |
| 12 | Investor sees a LIVE banner when a session is active | VERIFIED | pitch-viewer.tsx line 14 imports LiveBanner; line 46 adds isLiveSession state; line 155 renders `<LiveBanner visible={isLiveSession} />`; QAPanel calls onLiveSessionChange on session_started/session_ended events |
| 13 | Investor sees 'being reviewed by presenter' placeholder for questions during live sessions | VERIFIED | pitch-viewer.tsx line 214 passes isLiveSession={isLiveSession} to QAPanel; QAPanel sets isLiveReviewing:isLiveSession on new messages (lines 151-158, 205-212); QAThread renders LivePlaceholder for isLiveReviewing messages |
| 14 | Investor receives approved answers in real-time via WebSocket | VERIFIED | useNotificationStream handles answer_approved; QAPanel updates message state via handleAnswerApproved; wired via shareToken param passed from pitch-viewer.tsx |
| 15 | Investor sees dismissal message for dismissed questions | VERIFIED | onQuestionDismissed sets isDismissed:true on matching message; QAThread renders LivePlaceholder status="dismissed"; onLiveSessionChange now wired so isDismissed path is reachable |
| 16 | When session ends, investor pitch viewer reverts to normal async mode | VERIFIED | pitch-viewer.tsx line 215 passes onLiveSessionChange={setIsLiveSession} to QAPanel; QAPanel calls onLiveSessionChange?.(false) in handleSessionEnded; useNotificationStream fires onSessionEnded on session_ended WS message |

**Score:** 16/16 truths verified

### Re-verification: Gaps Closed by Commit 363b225

All three gaps from the initial verification were fixed by a single 8-line change to `apps/web/components/viewer/pitch-viewer.tsx`:

1. Added `isLiveSession` state (`useState(false)`)
2. Added `shareToken` to props interface and destructuring
3. Imported `LiveBanner` from `@/components/qa/live-banner`
4. Rendered `<LiveBanner visible={isLiveSession} />` at the top of the main return
5. Passed `isLiveSession={isLiveSession}`, `onLiveSessionChange={setIsLiveSession}`, and `shareToken={shareToken}` to `QAPanel`

The fix is complete and correct. All three wiring paths are now intact:
- `useNotificationStream` session_started → `handleSessionStarted` → `onLiveSessionChange?.(true)` → `setIsLiveSession(true)` → `<LiveBanner visible={true} />`
- `isLiveSession=true` → QAPanel adds messages with `isLiveReviewing:true` → QAThread renders LivePlaceholder
- `useNotificationStream` session_ended → `handleSessionEnded` → `onLiveSessionChange?.(false)` → `setIsLiveSession(false)` → LiveBanner hides, new questions use async flow

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/00008_live_sessions.sql` | live_sessions table, queries FK, dismissed status | VERIFIED | Contains CREATE TABLE, live_session_id FK, 'dismissed' in CHECK constraint |
| `apps/api/app/models/session.py` | SessionResponse, LiveQuestionEvent, SessionAction models | VERIFIED | All three classes present with correct fields and model_validator |
| `apps/api/app/api/v1/sessions.py` | Session lifecycle endpoints and live question actions | VERIFIED | All four endpoints (POST, DELETE, GET, PUT) present with full logic |
| `apps/api/tests/test_sessions_api.py` | 7 integration tests, all passing | VERIFIED | 7 tests pass |
| `apps/web/lib/session-api.ts` | startSession, endSession, getActiveSession, submitLiveAction | VERIFIED | All four functions exported, correct fetch calls |
| `apps/web/hooks/use-live-session.ts` | useLiveSession with session lifecycle management | VERIFIED | Exposes session, isLive, startLive, endLive, loading |
| `apps/web/hooks/use-presenter-stream.ts` | WebSocket hook for incoming questions | VERIFIED | Connects to founder-notifications endpoint, handles new_live_question and investor_count |
| `apps/web/hooks/use-notification-stream.ts` | Extended with session/dismissed events | VERIFIED | Handles session_started, session_ended, question_dismissed with options object pattern; accepts shareToken |
| `apps/web/components/dashboard/go-live-button.tsx` | Go Live toggle with confirmation dialogs | VERIFIED | Dialog for start, AlertDialog for end, "Open Presenter View" link |
| `apps/web/components/dashboard/validation-dashboard.tsx` | GoLiveButton in header | VERIFIED | Imports GoLiveButton and useLiveSession, renders in header flex layout |
| `apps/web/app/present/page.tsx` | Presenter view route | VERIFIED | Renders PresenterView component |
| `apps/web/components/present/presenter-view.tsx` | Main presenter layout with question feed | VERIFIED | Mounts useLiveSession + usePresenterStream, renders LiveHeader + QuestionCard list + empty state |
| `apps/web/components/present/question-card.tsx` | Question card with 4 action modes | VERIFIED | All four actions wired to submitLiveAction, edit/override inline editors, exit animation |
| `apps/web/components/present/live-header.tsx` | Sticky header with investor count and end session | VERIFIED | Investor count dropdown, AlertDialog for end session |
| `apps/web/components/present/override-editor.tsx` | Custom answer textarea | VERIFIED | "Publish Answer" and "Keep AI Draft" buttons, disabled when empty |
| `apps/web/components/qa/live-banner.tsx` | LIVE banner for investor pitch viewer | VERIFIED | Imported and rendered in pitch-viewer.tsx; visible={isLiveSession} correctly wired |
| `apps/web/components/qa/live-placeholder.tsx` | Reviewing and dismissed placeholders | VERIFIED | Both status variants with correct copy |
| `apps/web/components/qa/qa-panel.tsx` | Extended with isLiveSession prop and live mode behavior | VERIFIED | isLiveSession prop accepted; passed from pitch-viewer.tsx; all session callbacks wired |
| `apps/web/app/globals.css` | --color-live CSS variable | VERIFIED | Line 46: `--color-live: 0 84% 60%;`, dark mode variant present |
| `apps/web/middleware.ts` | /present in FOUNDER_ONLY_PATHS | VERIFIED | `const FOUNDER_ONLY_PATHS = ["/dashboard", "/documents", "/present"]` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| apps/api/app/api/v1/query.py | apps/api/app/api/v1/sessions.py | _active_sessions check in stream_query | WIRED | query.py imports _active_sessions and iterates for live routing |
| apps/api/app/api/v1/sessions.py | apps/api/app/api/v1/notifications.py | broadcast_session_event and notify_founder calls | WIRED | sessions.py imports all three broadcast functions |
| apps/api/app/api/v1/sessions.py | apps/api/app/api/v1/notifications.py | broadcast_approved_answer for live answer publishing | WIRED | sessions.py calls broadcast_approved_answer for approve/edit/override |
| apps/web/components/dashboard/go-live-button.tsx | apps/web/lib/session-api.ts | startSession/endSession API calls | WIRED | go-live-button.tsx accepts startLive/endLive props from useLiveSession |
| apps/web/components/present/presenter-view.tsx | apps/web/hooks/use-presenter-stream.ts | WebSocket hook for incoming questions | WIRED | presenter-view.tsx imports and calls usePresenterStream |
| apps/web/components/present/question-card.tsx | apps/web/lib/session-api.ts | submitLiveAction for approve/edit/override/dismiss | WIRED | question-card.tsx imports submitLiveAction, calls it in handleAction |
| apps/web/components/viewer/pitch-viewer.tsx | apps/web/components/qa/live-banner.tsx | session_started/session_ended events trigger banner | WIRED | pitch-viewer.tsx imports LiveBanner (line 14), renders with visible={isLiveSession} (line 155); isLiveSession driven by QAPanel's onLiveSessionChange which is driven by useNotificationStream session events |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| LIVE-01 | 08-01-PLAN, 08-02-PLAN | Founder can present while investors ask questions in real-time | VERIFIED | Backend fully implemented. Founder presenter view works. Investor experience now complete: LIVE banner, live-mode Q&A placeholders, real-time answer delivery all wired through pitch-viewer.tsx |
| LIVE-02 | 08-01-PLAN, 08-02-PLAN | Founder sees presenter view with incoming questions and AI draft answers | VERIFIED | /present route shows real-time question feed with AI drafts and approve/edit/override/dismiss actions |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| apps/web/components/qa/qa-panel.tsx | 112 | `q.founder_answer` does not exist on `QueryResponse` type — TypeScript compilation error | Warning | Pre-existing issue (present before fix commit). Runtime behavior is correct (extra JSON fields are accessible at runtime); TypeScript strict compilation fails. Does not affect functionality but breaks `tsc --noEmit`. |

Note: The TypeScript error is pre-existing and unrelated to the three gaps that were fixed. The `QueryResponse` type in `query-api.ts` is missing the `founder_answer` field that the backend returns. The fix is to add `founder_answer?: string | null` to the `QueryResponse` interface.

### Human Verification Required

#### 1. End-to-end live session flow

**Test:** Start services (`pnpm dev`), log in as founder, start live session from dashboard, open pitch as investor in a separate incognito window via share link, ask a question via Q&A panel
**Expected:** LIVE banner appears at top of investor pitch view with red pulse dot and "LIVE" text; question shows "Your question is being reviewed by the presenter" placeholder; on presenter view the question appears with AI draft; approve the question; investor receives the answer in real-time replacing the placeholder; end session from presenter view; LIVE banner disappears for investor; next question from investor follows normal streaming flow
**Why human:** Requires simultaneous multi-window WebSocket interaction with two different browser sessions; cannot verify programmatically

#### 2. Presenter view route protection

**Test:** Log in as an investor (role="investor"), navigate directly to /present
**Expected:** Redirect to /pitch (investor cannot access presenter view)
**Why human:** Requires real Supabase authentication with role-specific user accounts

### TypeScript Compilation Note

One pre-existing TypeScript error exists in `apps/web/components/qa/qa-panel.tsx:112`:

```
error TS2339: Property 'founder_answer' does not exist on type 'QueryResponse'
```

This was present before the gap-fix commit and is unrelated to the wiring changes. To resolve it, add `founder_answer?: string | null` to the `QueryResponse` interface in `apps/web/lib/query-api.ts`. This is recommended but not a blocker for the phase goal — the runtime behavior is correct because JavaScript object property access works even on fields not declared in the TypeScript type.

---

_Verified: 2026-03-20T11:15:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Yes — initial gaps closed by commit 363b225_
