---
phase: 05-trust-hitl-validation
plan: 02
subsystem: ui
tags: [confidence-badge, verified-badge, websocket, react, tailwind]

# Dependency graph
requires:
  - phase: 05-trust-hitl-validation-01
    provides: "Backend confidence scoring, review API, notification WebSocket"
  - phase: 04-smart-viewer
    provides: "QA panel, QA thread, useQueryStream hook"
provides:
  - "ConfidenceBadge component with tier colors and score tooltip"
  - "VerifiedBadge component with ShieldCheck icon"
  - "VerificationPlaceholder for queued low-confidence answers"
  - "Extended useQueryStream with confidence/queued/replace_answer handling"
  - "useNotificationStream hook for real-time approved answer push"
  - "QAThread rendering confidence badges, verification placeholders, verified badges"
affects: [05-03-founder-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [confidence-tier-badge, verification-placeholder, notification-websocket, answer-approval-push]

key-files:
  created:
    - apps/web/components/confidence-badge.tsx
    - apps/web/components/verified-badge.tsx
    - apps/web/components/qa/verification-placeholder.tsx
    - apps/web/hooks/use-notification-stream.ts
  modified:
    - apps/web/app/globals.css
    - apps/web/hooks/use-query-stream.ts
    - apps/web/components/qa/qa-thread.tsx
    - apps/web/components/qa/qa-panel.tsx
    - apps/web/lib/query-api.ts

key-decisions:
  - "Inline HSL values in badge classNames for direct color control (matching UI-SPEC)"
  - "callbackRef pattern in useNotificationStream to avoid WebSocket reconnects on callback changes"
  - "queryId field added to QAMessage for notification-to-message matching"

patterns-established:
  - "Confidence tier badge: colored Badge with Tooltip for numeric score"
  - "Notification WebSocket: persistent connection with 3s auto-reconnect"
  - "Answer approval flow: queued placeholder replaced in-place via WebSocket push"

requirements-completed: [TRUST-01, TRUST-02]

# Metrics
duration: 3min
completed: 2026-03-19
---

# Phase 5 Plan 02: Investor-Facing Confidence Badges Summary

**Confidence tier badges (green/yellow/red) with score tooltips, verification placeholders for queued answers, and real-time WebSocket push for founder-approved answers**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-19T20:34:26Z
- **Completed:** 2026-03-19T20:37:54Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Three confidence badge components (ConfidenceBadge, VerifiedBadge, VerificationPlaceholder) with correct tier colors per UI-SPEC
- Extended useQueryStream hook handles confidence scores, queued status, and replace_answer cleanup
- New useNotificationStream hook provides persistent WebSocket for real-time approved answer delivery
- QA thread renders appropriate badges based on message state with fade transitions

## Task Commits

Each task was committed atomically:

1. **Task 1: Confidence badge components and CSS variables** - `ebc6415` (feat)
2. **Task 2: Extend hooks for confidence/queued handling and integrate into QA thread** - `574ff24` (feat)

## Files Created/Modified
- `apps/web/app/globals.css` - Added confidence tier and verified CSS variables (light + dark)
- `apps/web/components/confidence-badge.tsx` - Reusable confidence tier badge with tooltip showing numeric score
- `apps/web/components/verified-badge.tsx` - Green badge with ShieldCheck icon for founder-reviewed answers
- `apps/web/components/qa/verification-placeholder.tsx` - Muted placeholder for queued answers with pulsing indicator
- `apps/web/hooks/use-query-stream.ts` - Extended with confidenceScore, confidenceTier, isQueued, queryId state
- `apps/web/hooks/use-notification-stream.ts` - Persistent WebSocket for answer_approved push notifications
- `apps/web/components/qa/qa-thread.tsx` - Renders ConfidenceBadge, VerifiedBadge, VerificationPlaceholder based on message state
- `apps/web/components/qa/qa-panel.tsx` - Integrates useNotificationStream for real-time answer updates
- `apps/web/lib/query-api.ts` - Added confidence_score, confidence_tier, review_status to QueryResponse

## Decisions Made
- Used inline HSL values in badge classNames for direct color control (matching UI-SPEC precisely)
- Used callbackRef pattern in useNotificationStream to avoid WebSocket reconnects when callback reference changes
- Added queryId field to QAMessage interface to enable notification-to-message matching

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Investor-facing confidence badges ready for all AI answers
- Verification placeholder ready for low-confidence queued answers
- Real-time push channel ready for founder-approved answer delivery
- Founder dashboard (Plan 03) can build on review API from Plan 01

---
*Phase: 05-trust-hitl-validation*
*Completed: 2026-03-19*

## Self-Check: PASSED

All 8 created/modified files verified. Both task commits (ebc6415, 574ff24) confirmed.
