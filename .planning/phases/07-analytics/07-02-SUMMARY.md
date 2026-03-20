---
phase: 07-analytics
plan: 02
subsystem: ui
tags: [analytics, tracking, sendbeacon, websocket, heatmap, dashboard, sonner, intersection-observer]

# Dependency graph
requires:
  - phase: 07-analytics-01
    provides: "Analytics API endpoints (events, summary, investor detail, new-view-count, founder-notifications WS)"
  - phase: 06-auth
    provides: "Auth system (JWT, share tokens, roles)"
provides:
  - "useTracking hook for section visibility + scroll depth tracking via sendBeacon"
  - "Analytics API client (fetchAnalyticsSummary, fetchInvestorDetail, fetchNewViewCount)"
  - "Analytics dashboard tab with section heatmap and investor engagement table"
  - "Real-time founder notification via WebSocket + Sonner toast"
  - "AnalyticsCountBadge polling new view count on Analytics tab"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "sendBeacon flush pattern with visibilitychange + periodic interval"
    - "Collapsible accordion table rows with render prop on base-ui"
    - "useAnalyticsCountBadge hook for count state + reset callback"
    - "WebSocket auto-reconnect with 3s delay for founder notifications"

key-files:
  created:
    - apps/web/hooks/use-tracking.ts
    - apps/web/lib/analytics-api.ts
    - apps/web/components/dashboard/analytics-dashboard.tsx
    - apps/web/components/dashboard/section-heatmap.tsx
    - apps/web/components/dashboard/investor-table.tsx
    - apps/web/components/dashboard/investor-detail-row.tsx
    - apps/web/components/dashboard/engagement-badge.tsx
    - apps/web/components/dashboard/analytics-count-badge.tsx
    - apps/web/hooks/use-founder-notifications.ts
  modified:
    - apps/web/app/pitch/page.tsx
    - apps/web/components/viewer/pitch-viewer.tsx
    - apps/web/app/dashboard/page.tsx

key-decisions:
  - "useAnalyticsCountBadge exported as hook for parent to control reset (not callback prop)"
  - "Heatmap section data aggregated by fetching all investor details in parallel on dashboard mount"
  - "Combined handleSectionInView callback in PitchViewer piggybacking on existing IntersectionObserver"
  - "Collapsible render prop with TableRow/tr elements for table-compatible accordion"

patterns-established:
  - "sendBeacon flush: visibilitychange hidden -> flush, visible -> reset flushed flag"
  - "Scroll depth tracking with 25/50/75/100% thresholds via passive scroll listener"
  - "Analytics tab with count badge pattern (useAnalyticsCountBadge + onValueChange reset)"

requirements-completed: [ANLYT-01, ANLYT-02, ANLYT-03, ANLYT-04, ANLYT-05]

# Metrics
duration: 4min
completed: 2026-03-20
---

# Phase 7 Plan 02: Tracking & Dashboard Summary

**Client-side section visibility tracking with sendBeacon flush, analytics dashboard with section heatmap, investor engagement table with expandable detail rows, engagement badges, and real-time founder WebSocket notifications via Sonner toast**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-20T01:06:27Z
- **Completed:** 2026-03-20T01:10:56Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- useTracking hook captures section visibility times via IntersectionObserver, scroll depth at 25/50/75/100% thresholds, flushes via sendBeacon on visibilitychange/unmount/5min interval
- Analytics dashboard tab with section attention heatmap (5-stop color scale), investor engagement table (Collapsible accordion rows), and expandable per-section detail with question log
- Real-time founder notifications via WebSocket with Sonner toast on first investor view
- Tracking disabled for founders viewing their own pitch, enabled only for investor/token access

## Task Commits

Each task was committed atomically:

1. **Task 1: Tracking hook, analytics API client, and pitch viewer integration** - `8ca279c` (feat)
2. **Task 2: Analytics dashboard UI with heatmap, investor table, notifications, and badge** - `742a1c0` (feat)

## Files Created/Modified
- `apps/web/hooks/use-tracking.ts` - Section visibility + scroll depth tracking hook with sendBeacon flush
- `apps/web/lib/analytics-api.ts` - Typed API client for analytics endpoints (summary, investor detail, view count)
- `apps/web/app/pitch/page.tsx` - Modified to pass tracking config based on auth context
- `apps/web/components/viewer/pitch-viewer.tsx` - Modified to integrate trackSectionVisibility into IntersectionObserver flow
- `apps/web/components/dashboard/engagement-badge.tsx` - Hot/Active/Viewed badge with Flame icon
- `apps/web/components/dashboard/analytics-count-badge.tsx` - Polling badge + useAnalyticsCountBadge hook
- `apps/web/components/dashboard/section-heatmap.tsx` - Horizontal bar chart with proportional segments
- `apps/web/components/dashboard/investor-table.tsx` - Sortable table with Collapsible accordion rows
- `apps/web/components/dashboard/investor-detail-row.tsx` - Per-section time bars and question log
- `apps/web/components/dashboard/analytics-dashboard.tsx` - Container component aggregating data
- `apps/web/hooks/use-founder-notifications.ts` - WebSocket hook with Sonner toast for pitch_opened events
- `apps/web/app/dashboard/page.tsx` - Modified to add Analytics tab with count badge

## Decisions Made
- Exported useAnalyticsCountBadge as a hook (rather than AnalyticsCountBadge component with callback prop) for cleaner parent control of count reset on tab switch
- Heatmap section data aggregated client-side by fetching all investor details in parallel on dashboard mount (acceptable for PoC with small investor counts)
- Combined handleSectionInView callback in PitchViewer to piggyback tracking on existing IntersectionObserver rather than adding a second observer
- Used Collapsible render prop with TableRow/tr elements for table-compatible accordion behavior

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Analytics feature is complete end-to-end: investor viewing -> event tracking -> dashboard display -> founder notification
- All Phase 7 plans complete, ready for Phase 8

---
*Phase: 07-analytics*
*Completed: 2026-03-20*
