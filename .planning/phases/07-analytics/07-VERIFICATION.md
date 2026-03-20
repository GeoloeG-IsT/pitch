---
phase: 07-analytics
verified: 2026-03-20T02:00:00Z
status: passed
score: 17/17 must-haves verified
re_verification: false
human_verification:
  - test: "Open pitch via share token link, then visit dashboard Analytics tab"
    expected: "Founder receives Sonner toast 'investor@example.com just opened your pitch' within seconds; Analytics tab shows notification badge with count > 0"
    why_human: "Requires live WebSocket connection and real Supabase data flow; not verifiable with static analysis"
  - test: "Scroll pitch page to bottom as investor"
    expected: "Scroll depth captured at 25/50/75/100% thresholds and included in beacon payload on page leave"
    why_human: "sendBeacon fires on page unload; requires browser environment to observe"
  - test: "Expand an investor row in the Analytics investor table"
    expected: "Per-section time bars and question log render inline without page reload; only one row open at a time (accordion)"
    why_human: "Requires rendered UI interaction to verify Collapsible accordion behavior"
  - test: "Section heatmap renders proportional colored segments"
    expected: "Horizontal bar with color gradient from muted (low attention) to chart-1 (high), labels below segments"
    why_human: "Visual rendering of CSS color-mix() and proportional widths requires browser"
---

# Phase 7: Analytics Verification Report

**Phase Goal:** Track investor engagement (section views, scroll depth, Q&A interactions) and display analytics dashboard for pitch founders.
**Verified:** 2026-03-20T02:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth                                                                              | Status     | Evidence                                                                          |
|----|------------------------------------------------------------------------------------|------------|-----------------------------------------------------------------------------------|
| 1  | Analytics events ingested via POST endpoint without auth headers, returns 204      | VERIFIED   | `analytics.py:27-118` — no auth dep, returns `Response(status_code=204)`         |
| 2  | Analytics aggregation returns investor list with view timestamps and time totals   | VERIFIED   | `analytics.py:121-307` — aggregates section_time events, sorts by engagement tier|
| 3  | Per-section time aggregation returns correct per-investor durations                | VERIFIED   | `analytics.py:310-363`, test `test_section_times` verifies sec-1=8000ms           |
| 4  | Question log groups queries by investor identity (user_id or share_token_id)       | VERIFIED   | `analytics.py:347-357`, test `test_question_log` verifies 2 questions returned    |
| 5  | Engagement scoring flags investors meeting any of 4 behavioral signals as hot      | VERIFIED   | `analytics.py:283-289`, test `test_engagement_scoring` verifies financials>=5min  |
| 6  | First-view detection identifies genuinely new viewers vs return visits             | VERIFIED   | `analytics.py:82-116`, test `test_first_view_notification` confirms count<=1 logic|
| 7  | Founder notification WebSocket pushes pitch_opened events to connected founder     | VERIFIED   | `notifications.py:20-57` — register/unregister/notify_founder; WS in analytics.py|
| 8  | Investor pitch views generate section visibility events flushed via sendBeacon     | VERIFIED   | `use-tracking.ts:55,103` — `navigator.sendBeacon("/api/v1/analytics/events", ...)`|
| 9  | Founder sees Analytics tab on dashboard with investor engagement table             | VERIFIED   | `dashboard/page.tsx:37-58` — Analytics TabsTrigger+TabsContent, founder-only guard|
| 10 | Founder sees section attention heatmap                                             | VERIFIED   | `section-heatmap.tsx` — proportional segments, role="img", Section Attention title|
| 11 | Founder can expand investor row to see per-section times and question log          | VERIFIED   | `investor-table.tsx:104-148` — Collapsible wrapping InvestorDetailRow             |
| 12 | High-engagement investors show Hot badge and sort to top                           | VERIFIED   | `engagement-badge.tsx` — Flame icon + hsl color; backend sorts hot first          |
| 13 | Founder receives Sonner toast when investor opens pitch for first time             | VERIFIED   | `use-founder-notifications.ts:31` — `toast(\`${msg.investor} just opened...\`)`  |
| 14 | Analytics tab shows notification badge with new view count                         | VERIFIED   | `analytics-count-badge.tsx` — useAnalyticsCountBadge polls fetchNewViewCount      |
| 15 | Anonymous token-only investors appear as 'Anonymous (...last4)'                    | VERIFIED   | `analytics.py:268-269` — `f"Anonymous (...{token_val[-4:]})"`                     |
| 16 | Scroll depth tracked at 25/50/75/100% thresholds                                  | VERIFIED   | `use-tracking.ts:125-131` — threshold snap logic; test_ingest_events_with_scroll  |
| 17 | Tracking only fires for investor-role or token-access viewers, not founders        | VERIFIED   | `pitch/page.tsx:70-72` — `trackingEnabled = isShareTokenAccess ? true : role==="investor"` |

**Score:** 17/17 truths verified

---

### Required Artifacts

**Plan 01 Artifacts**

| Artifact                                          | Provides                                | Status     | Details                                                              |
|---------------------------------------------------|-----------------------------------------|------------|----------------------------------------------------------------------|
| `supabase/migrations/00007_analytics_events.sql`  | analytics_events table with indexes+RLS | VERIFIED   | TABLE def, identity_required CHECK, 5 indexes, RLS policy — 28 lines |
| `apps/api/app/models/analytics.py`                | BeaconPayload, InvestorSummary, etc.    | VERIFIED   | All 7 classes present (BeaconPayload, SectionTimeEvent, InvestorSummary, SectionTime, QuestionEntry, InvestorDetail, response wrappers) |
| `apps/api/app/api/v1/analytics.py`                | 5 endpoints including WebSocket         | VERIFIED   | POST /events, GET /summary, GET /investor/{key}, GET /new-view-count, WS /founder-notifications |
| `apps/api/tests/test_analytics_api.py`            | 7 passing tests                         | VERIFIED   | All 7 tests pass: ingest_events, ingest_with_scroll, investor_list, section_times, question_log, engagement_scoring, first_view_notification |

**Plan 02 Artifacts**

| Artifact                                                   | Provides                               | Status     | Details                                            |
|------------------------------------------------------------|----------------------------------------|------------|---------------------------------------------------|
| `apps/web/hooks/use-tracking.ts`                           | Section visibility + scroll depth hook | VERIFIED   | sendBeacon flush, visibilitychange, scroll thresholds |
| `apps/web/lib/analytics-api.ts`                            | Typed API client                       | VERIFIED   | fetchAnalyticsSummary, fetchInvestorDetail, fetchNewViewCount exported |
| `apps/web/components/dashboard/analytics-dashboard.tsx`    | Container with heatmap + table         | VERIFIED   | Fetches summary+details in parallel, error state, loading skeletons |
| `apps/web/components/dashboard/section-heatmap.tsx`        | Horizontal bar heatmap                 | VERIFIED   | role="img", Section Attention title, color interpolation, returns null if empty |
| `apps/web/components/dashboard/investor-table.tsx`         | Sortable table with Collapsible rows   | VERIFIED   | Investor Engagement heading, ChevronRight, No views yet empty state |
| `apps/web/components/dashboard/investor-detail-row.tsx`    | Per-section breakdown + question log   | VERIFIED   | Time by Section, Questions Asked, formatDuration/formatRelativeTime |
| `apps/web/components/dashboard/engagement-badge.tsx`       | Hot/Active/Viewed badge                | VERIFIED   | Flame icon, hsl(12,76%,61%) Hot badge, Active/Viewed variants |
| `apps/web/components/dashboard/analytics-count-badge.tsx`  | New view count badge                   | VERIFIED   | useAnalyticsCountBadge hook, setInterval 30s, fetchNewViewCount |
| `apps/web/hooks/use-founder-notifications.ts`              | WebSocket + Sonner toast               | VERIFIED   | founder-notifications URL, toast() on pitch_opened, 3s auto-reconnect |

---

### Key Link Verification

**Plan 01 Key Links**

| From                                | To                          | Via                                    | Status   | Evidence                                          |
|-------------------------------------|-----------------------------|----------------------------------------|----------|---------------------------------------------------|
| `apps/api/app/api/v1/analytics.py`  | analytics_events table      | `get_service_client().table('analytics_events')` | WIRED | Lines 79, 86, 131, 331, 376 confirmed              |
| `apps/api/app/api/v1/analytics.py`  | notifications.py            | `notify_founder` import + call          | WIRED    | Line 111-116 — lazy import + `await notify_founder(...)` |
| `apps/api/app/main.py`              | analytics.py                | `app.include_router(analytics_router)` | WIRED    | `main.py:6,34` — imported and registered          |

**Plan 02 Key Links**

| From                                              | To                                | Via                              | Status   | Evidence                                                |
|---------------------------------------------------|-----------------------------------|----------------------------------|----------|---------------------------------------------------------|
| `apps/web/hooks/use-tracking.ts`                  | `/api/v1/analytics/events`        | `navigator.sendBeacon` with Blob  | WIRED    | Lines 55 and 103 — `sendBeacon("/api/v1/analytics/events", blob)` |
| `apps/web/components/viewer/pitch-viewer.tsx`     | `apps/web/hooks/use-tracking.ts`  | `useTracking` hook invocation     | WIRED    | Lines 15, 34, 48 — imported, instantiated, called      |
| `apps/web/lib/analytics-api.ts`                   | `/api/v1/analytics/summary`       | fetch with auth headers           | WIRED    | Line 35 — `fetch(\`${API_BASE}/analytics/summary\`, ...)`|
| `apps/web/components/dashboard/analytics-dashboard.tsx` | analytics-api.ts           | `fetchAnalyticsSummary`           | WIRED    | Lines 6, 37 — imported and called                       |
| `apps/web/app/dashboard/page.tsx`                 | analytics-dashboard.tsx           | Analytics TabsContent             | WIRED    | Lines 7, 55-57 — AnalyticsDashboard imported and rendered|
| `apps/web/hooks/use-founder-notifications.ts`     | WS `/api/v1/analytics/founder-notifications` | WebSocket connection | WIRED    | Line 23 — `new WebSocket(\`${wsUrl}/api/v1/analytics/founder-notifications?...\`)` |

---

### Requirements Coverage

| Requirement | Source Plans     | Description                                                            | Status       | Evidence                                                                |
|-------------|------------------|------------------------------------------------------------------------|--------------|-------------------------------------------------------------------------|
| ANLYT-01    | Plan 01, Plan 02 | Founder can see which investors viewed the pitch and when              | SATISFIED    | `/analytics/summary` returns investor_label, last_viewed; displayed in InvestorTable |
| ANLYT-02    | Plan 01, Plan 02 | Founder can see time spent per section by each investor                | SATISFIED    | `/analytics/investor/{key}` aggregates section_time events; InvestorDetailRow renders per-section bars |
| ANLYT-03    | Plan 01, Plan 02 | Founder gets notified when an investor opens the shared link           | SATISFIED    | First-view detection + notify_founder + useFounderNotifications Sonner toast |
| ANLYT-04    | Plan 01, Plan 02 | Founder can see a log of all questions investors asked                 | SATISFIED    | `/analytics/investor/{key}` queries table; InvestorDetailRow Questions Asked section |
| ANLYT-05    | Plan 01, Plan 02 | System flags high-engagement investors based on behavioral signals     | SATISFIED    | engagement tiers: hot if financials>=5min OR questions>=3 OR sessions>=2 OR scroll=100%; EngagementBadge renders Hot with Flame icon |

No orphaned requirements — all 5 ANLYT-* IDs are claimed by both plans and implemented.

---

### Anti-Patterns Found

| File                                              | Line  | Pattern                | Severity | Impact                                        |
|---------------------------------------------------|-------|------------------------|----------|-----------------------------------------------|
| `apps/web/components/qa/qa-panel.tsx`             | 73    | `q.founder_answer` missing from QueryResponse type | INFO | Pre-existing TS error from Phase 5/6, not introduced by Phase 7; affects build output but unrelated to analytics goal |

**Note on TypeScript error:** `npx tsc --noEmit` exits with code 1 due to a single pre-existing error in `apps/web/components/qa/qa-panel.tsx:73` (`Property 'founder_answer' does not exist on type 'QueryResponse'`). This error was present before Phase 7 began (last touched in `089f8ab` and `574ff24`, both Phase 5/6 commits). All Phase 7 analytics files compile cleanly — the error is not caused by or related to analytics implementation.

No stub patterns found in Phase 7 files. No TODO/FIXME/placeholder comments in analytics code paths.

---

### Human Verification Required

#### 1. End-to-End First-View Notification

**Test:** Open the pitch page as an investor via a share token link (new link never used before). In a separate browser tab, have the founder logged in with the Analytics dashboard open.
**Expected:** Within a few seconds, the founder's dashboard shows a Sonner toast: "[investor email] just opened your pitch". The Analytics tab badge count increments.
**Why human:** Requires live WebSocket connection between browser sessions, real Supabase rows for share_tokens, and actual sendBeacon firing on page load.

#### 2. Scroll Depth Capture

**Test:** Open the pitch as an investor (share token). Scroll slowly to the bottom of the page, then close the tab.
**Expected:** After the tab closes, the analytics summary for that investor shows max_scroll_depth = 100. The Analytics dashboard engagement tier may update to "hot" if scroll=100 triggers the hot signal.
**Why human:** sendBeacon fires on visibilitychange/unload — only observable in a real browser.

#### 3. Collapsible Investor Row Accordion

**Test:** In the Analytics dashboard, click one investor row to expand it. Click a second investor row.
**Expected:** First row collapses, second row expands. Chevron icon rotates 90 degrees. Per-section time bars and question log render inside the expanded row.
**Why human:** Collapsible state management with render prop pattern requires interactive DOM.

#### 4. Section Heatmap Visual Accuracy

**Test:** After multiple investors have viewed the pitch with different section dwell times, open the Analytics tab.
**Expected:** Horizontal heatmap bar shows proportional color-coded segments. Sections with more total dwell time appear brighter (chart-1 color). Section labels appear below segments. Hovering a segment shows native tooltip "[label]: Xm across all investors".
**Why human:** CSS color-mix() rendering and proportional layout require visual browser inspection.

---

### Gaps Summary

No gaps. All 17 observable truths verified. All backend tests pass (7/7). All artifacts are substantive and wired. All key links confirmed present. All 5 requirement IDs satisfied.

The single TypeScript compilation error is a pre-existing issue from Phase 5/6 (qa-panel.tsx `founder_answer` property), not caused by Phase 7 work. No Phase 7 analytics files have TypeScript errors.

---

_Verified: 2026-03-20T02:00:00Z_
_Verifier: Claude (gsd-verifier)_
