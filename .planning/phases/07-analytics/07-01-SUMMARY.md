---
phase: 07-analytics
plan: 01
subsystem: api
tags: [analytics, websocket, sendbeacon, engagement-scoring, supabase, fastapi]

# Dependency graph
requires:
  - phase: 06-auth
    provides: JWT auth, share_tokens table, get_current_user dependency
provides:
  - analytics_events table with indexes and RLS
  - Event ingestion endpoint (POST /analytics/events, 204, no auth)
  - Analytics summary aggregation with engagement tiers
  - Investor detail endpoint with per-section times and question log
  - New-view-count endpoint for badge updates
  - Founder notification WebSocket channel
  - First-view detection triggering pitch_opened notification
affects: [07-02-tracking-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [sendBeacon ingestion via raw body parsing, engagement scoring (hot/active/viewed), founder WebSocket registry]

key-files:
  created:
    - supabase/migrations/00007_analytics_events.sql
    - apps/api/app/models/analytics.py
    - apps/api/app/api/v1/analytics.py
    - apps/api/tests/test_analytics_api.py
  modified:
    - apps/api/app/api/v1/notifications.py
    - apps/api/app/main.py

key-decisions:
  - "sendBeacon payload parsed via request.body() + model_validate_json (handles text/plain Content-Type)"
  - "Engagement tiers: hot (financials>=5min OR questions>=3 OR sessions>=2 OR scroll>=100%), active (viewed within 7d), viewed"
  - "Founder WebSocket registry uses list[WebSocket] per founder_id to support multiple tabs"
  - "First-view detection queries page_open count after insert (count<=1 means first view)"

patterns-established:
  - "Analytics event ingestion: no auth required (sendBeacon), service-role client for writes"
  - "Founder notification pattern: register_founder/unregister_founder/notify_founder in notifications.py"
  - "Chainable mock pattern with table_calls tracking for verifying Supabase insert payloads"

requirements-completed: [ANLYT-01, ANLYT-02, ANLYT-03, ANLYT-04, ANLYT-05]

# Metrics
duration: 7min
completed: 2026-03-20
---

# Phase 7 Plan 01: Analytics Backend Summary

**Analytics event ingestion via sendBeacon, investor engagement scoring (hot/active/viewed), per-section time aggregation, and founder real-time notification WebSocket**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-20T00:56:11Z
- **Completed:** 2026-03-20T01:03:48Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- analytics_events table migration with 5 indexes, RLS policy, and identity constraint
- Complete analytics API: event ingestion (204 POST), summary aggregation, investor detail, new-view-count
- Founder notification WebSocket with first-view detection triggering pitch_opened alerts
- 7 passing tests covering ingestion, aggregation, section times, question log, engagement scoring, and first-view notification

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration and Pydantic models** - `452611e` (feat)
2. **Task 2: Analytics API endpoints, founder notification WebSocket, and tests** - `c04fee7` (feat)

## Files Created/Modified
- `supabase/migrations/00007_analytics_events.sql` - Analytics events table with indexes and RLS
- `apps/api/app/models/analytics.py` - BeaconPayload, InvestorSummary, InvestorDetail, response models
- `apps/api/app/api/v1/analytics.py` - 5 endpoints: events ingestion, summary, investor detail, new-view-count, founder WebSocket
- `apps/api/app/api/v1/notifications.py` - Added founder connection registry (register/unregister/notify)
- `apps/api/app/main.py` - Registered analytics_router
- `apps/api/tests/test_analytics_api.py` - 7 tests for analytics endpoints

## Decisions Made
- sendBeacon payload parsed via request.body() + model_validate_json to handle text/plain Content-Type
- Engagement tiers: hot if ANY of financials>=5min, questions>=3, sessions>=2, scroll>=100%; active if viewed within 7 days; otherwise viewed
- Founder WebSocket registry uses list[WebSocket] per founder_id to support multiple browser tabs
- First-view detection queries page_open count after insert (count<=1 means first view)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Analytics data foundation complete, ready for Plan 02 (tracking hook + dashboard UI)
- All endpoints tested and functional
- Pre-existing test failures in test_documents_api.py, test_query_api.py, test_reviews_api.py (auth-related, not caused by this plan)

---
*Phase: 07-analytics*
*Completed: 2026-03-20*
