# Phase 7: Analytics - Research

**Researched:** 2026-03-20
**Domain:** Client-side engagement tracking, analytics dashboard, real-time notifications
**Confidence:** HIGH

## Summary

Phase 7 adds investor engagement analytics to the existing pitch platform. The work spans four domains: (1) client-side event tracking in the pitch viewer using Intersection Observer for section visibility timing and sendBeacon for reliable data flushing, (2) a new `analytics_events` database table and FastAPI endpoints for event ingestion and aggregation, (3) an Analytics dashboard tab with section heatmap and investor engagement table, and (4) real-time WebSocket notifications to founders when investors first open shared links.

The codebase already contains most of the building blocks: the `use-active-section.ts` hook demonstrates the exact Intersection Observer pattern needed, `PendingCountBadge` provides the polling badge template, the `notifications.py` WebSocket registry pattern handles real-time push, and the dashboard Tabs component is ready for a third tab. The primary new work is the tracking hook, the sendBeacon endpoint, the analytics aggregation queries, and the dashboard UI components.

**Primary recommendation:** Build the tracking layer (hook + beacon endpoint + migration) first, then the dashboard UI and notification integration. The tracking layer is the data foundation everything else depends on.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Analytics dashboard is a new "Analytics" tab on the existing /dashboard page (alongside Reviews and Access)
- Overview is an investor table showing: name/email (or "Anonymous (...token hint)" for token-only access), last viewed, total time, questions asked, engagement level badge
- Email shown if share token had investor_email set; otherwise "Anonymous (...last4)" label
- Aggregate section heatmap (color-coded horizontal bar chart) above the investor table
- Clicking an investor row expands inline (no page navigation)
- Per-section time tracked via Intersection Observer (reuse pattern from use-active-section.ts)
- Events accumulated in memory, flushed via sendBeacon() on page unload/visibility change
- Tracked events: page open/close timestamps, per-section visibility duration, questions asked per section (already in queries table), return visits, scroll depth (25/50/75/100%)
- Anonymous token-link investors tracked identically to authenticated investors (by share_token_id vs user_id)
- In-app Sonner toast for real-time notification ("Investor X just opened your pitch") + notification badge on Analytics tab
- Notification on first view only per investor/token -- return visits update analytics silently
- Badge count on Analytics tab only (not on SiteNav)
- Uses existing WebSocket infrastructure for real-time push
- Four behavioral signals for high-engagement: 5+ min on financials, 3+ deep questions, 2+ sessions, 100% scroll completion
- Simple rule-based: ANY signal met = high-engagement
- "Hot" badge, high-engagement investors sort to top
- Engagement computed on dashboard load (query aggregates) -- no background jobs

### Claude's Discretion
- Exact event table schema design
- sendBeacon endpoint implementation details
- Heatmap bar chart component and color scale
- Expandable row animation and detail layout
- WebSocket notification channel design
- Badge count polling interval
- Scroll depth calculation thresholds

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ANLYT-01 | Founder can see which investors viewed the pitch and when | analytics_events table tracks page_open events with timestamps; aggregation query groups by investor identity (user_id or share_token_id) |
| ANLYT-02 | Founder can see time spent per section by each investor | Intersection Observer tracks per-section visibility duration; events stored with section_id and duration_ms; aggregation sums per investor per section |
| ANLYT-03 | Founder gets notified when an investor opens the shared link | WebSocket notification channel pushes pitch_opened event to connected founder clients; Sonner toast displays notification |
| ANLYT-04 | Founder can see a log of all questions investors asked | Existing queries table already has share_token_id; aggregation query joins queries with share_tokens to group by investor |
| ANLYT-05 | System flags high-engagement investors based on behavioral signals | Aggregation query computes 4 signals from analytics_events + queries tables; any signal met = "Hot" badge |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Intersection Observer API | Browser native | Section visibility time tracking | Already used in use-active-section.ts; MDN documents time-tracking use case |
| Navigator.sendBeacon() | Browser native | Reliable event flush on page unload | Fire-and-forget POST, guaranteed delivery even during page close |
| visibilitychange event | Browser native | Trigger event flush on tab hide | More reliable than unload/beforeunload, especially on mobile |
| FastAPI | Existing | sendBeacon POST endpoint + analytics GET endpoints | Already the backend framework |
| shadcn/ui Collapsible | Existing | Expandable investor detail rows | Already installed per UI-SPEC |
| shadcn/ui Tabs | Existing | Third dashboard tab | Already used for Reviews/Access |
| Sonner | Existing | Real-time toast notifications | Already integrated for toasts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Page Visibility API | Browser native | Detect tab switches to pause timers | Must pause section timers when tab is hidden |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| sendBeacon | fetch with keepalive:true | sendBeacon is simpler for fire-and-forget; fetch keepalive allows custom headers but not needed here |
| In-memory accumulation | Per-event HTTP requests | Memory accumulation reduces network requests dramatically; single flush is the standard analytics pattern |

**No new package installations required.** All functionality uses browser-native APIs and existing project dependencies.

## Architecture Patterns

### Recommended Project Structure
```
apps/web/
  hooks/
    use-tracking.ts              # Section visibility + scroll depth tracking hook
  lib/
    analytics-api.ts             # API client for analytics endpoints
  components/dashboard/
    analytics-dashboard.tsx      # Container: heatmap + investor table
    section-heatmap.tsx          # Horizontal bar chart
    investor-table.tsx           # Sortable table with expandable rows
    investor-detail-row.tsx      # Per-section breakdown + question log
    engagement-badge.tsx         # Hot/Active/Viewed badge
    analytics-count-badge.tsx    # Notification count badge on tab

apps/api/
  app/api/v1/
    analytics.py                 # Event ingestion + aggregation endpoints
  app/models/
    analytics.py                 # Pydantic models for analytics events

supabase/migrations/
  00007_analytics_events.sql     # New table + indexes
```

### Pattern 1: Client-Side Event Accumulator with Beacon Flush
**What:** Accumulate visibility events in a Map<sectionId, durationMs> in memory. On visibilitychange (hidden) or beforeunload, flush via sendBeacon() as JSON blob.
**When to use:** Always -- this is the core tracking mechanism.
**Example:**
```typescript
// Source: MDN sendBeacon docs + visibilitychange API
const sectionTimes = useRef<Map<string, number>>(new Map());
const sessionStart = useRef<number>(Date.now());

function flush() {
  const payload = {
    session_id: sessionId,
    share_token_id: shareTokenId || null,
    user_id: userId || null,
    events: Array.from(sectionTimes.current.entries()).map(([sectionId, ms]) => ({
      section_id: sectionId,
      duration_ms: ms,
    })),
    scroll_depth: currentScrollDepth,
    session_start: sessionStart.current,
    session_end: Date.now(),
  };
  navigator.sendBeacon('/api/v1/analytics/events', JSON.stringify(payload));
}

useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') flush();
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    flush(); // Also flush on component unmount
  };
}, []);
```

### Pattern 2: Intersection Observer Section Timer
**What:** Track cumulative visibility duration per section using Intersection Observer callbacks paired with timestamps.
**When to use:** For per-section time tracking (ANLYT-02).
**Example:**
```typescript
// Reuse pattern from use-active-section.ts
const visibleSince = useRef<Map<string, number>>(new Map());

function handleSectionVisibility(sectionId: string, isVisible: boolean) {
  if (isVisible) {
    visibleSince.current.set(sectionId, Date.now());
  } else {
    const start = visibleSince.current.get(sectionId);
    if (start) {
      const elapsed = Date.now() - start;
      sectionTimes.current.set(
        sectionId,
        (sectionTimes.current.get(sectionId) || 0) + elapsed
      );
      visibleSince.current.delete(sectionId);
    }
  }
}
```

### Pattern 3: Founder Notification via WebSocket Registry
**What:** When a pitch_opened event is ingested for a first-time viewer, look up the founder_id from share_tokens and push a notification to any connected founder WebSocket.
**When to use:** For ANLYT-03 real-time notifications.
**Example:**
```python
# In analytics.py endpoint, after inserting page_open event
# Check if this is the first view for this token/user
if is_first_view:
    founder_id = share_token_row["founder_id"]
    investor_label = share_token_row.get("investor_email") or "An investor"
    await notify_founder(founder_id, {
        "type": "pitch_opened",
        "investor": investor_label,
    })
```

### Pattern 4: Aggregation-on-Read for Engagement Scoring
**What:** Compute engagement metrics via SQL aggregation queries when the dashboard loads, rather than maintaining materialized scores.
**When to use:** For ANLYT-05 engagement flagging. Appropriate at PoC scale; would need caching/materialization at scale.
**Example:**
```sql
-- Aggregate per investor: total time, financials time, session count, scroll depth
SELECT
  COALESCE(ae.user_id::text, ae.share_token_id::text) as investor_key,
  st.investor_email,
  st.token,
  MAX(ae.created_at) as last_viewed,
  SUM(ae.duration_ms) as total_time_ms,
  SUM(CASE WHEN ae.section_id IN (financial_section_ids) THEN ae.duration_ms ELSE 0 END) as financials_time_ms,
  COUNT(DISTINCT ae.session_id) as session_count,
  MAX(ae.scroll_depth) as max_scroll_depth
FROM analytics_events ae
LEFT JOIN share_tokens st ON ae.share_token_id = st.id
WHERE ae.founder_id = :founder_id
GROUP BY investor_key, st.investor_email, st.token;
```

### Anti-Patterns to Avoid
- **Per-event HTTP requests:** Never send individual HTTP requests for each section visibility change. Accumulate in memory and flush as a batch.
- **Using unload/beforeunload exclusively:** These events are unreliable on mobile. Always use visibilitychange as the primary trigger with beforeunload as fallback.
- **Background jobs for engagement scoring:** At PoC scale, computing engagement on dashboard load is sufficient. Don't add complexity with DB triggers or cron jobs.
- **Tracking authenticated founders' own views:** Filter out the founder's own pitch views from analytics to avoid inflating numbers.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Section visibility detection | Custom scroll position calculations | Intersection Observer API | Browser-native, handles edge cases (partial visibility, nested scrolling), already proven in use-active-section.ts |
| Reliable page-close data transmission | XMLHttpRequest in beforeunload | navigator.sendBeacon() | Guaranteed delivery, non-blocking, designed for exactly this use case |
| Toast notifications | Custom notification popups | Sonner (already integrated) | Consistent with existing notification UX across the app |
| Expandable table rows | Custom show/hide with state | shadcn Collapsible component | Handles aria attributes, animation, and keyboard accessibility |
| Time formatting | Manual duration string building | Simple utility function | Straightforward but worth a small reusable `formatDuration(ms)` helper |

**Key insight:** The browser platform provides purpose-built APIs (Intersection Observer, sendBeacon, visibilitychange, Page Visibility) that handle the hard edge cases of analytics tracking. The existing codebase already demonstrates most of these patterns.

## Common Pitfalls

### Pitfall 1: Tab-Hidden Timers Keep Running
**What goes wrong:** Section visibility timers continue accumulating time when the user switches browser tabs, inflating engagement metrics.
**Why it happens:** Intersection Observer reports elements as "visible" even when the tab itself is not visible.
**How to avoid:** Listen to `document.visibilitychange` and pause all active section timers when `document.visibilityState === 'hidden'`. Resume when it becomes `'visible'` again.
**Warning signs:** Unusually high section times that don't match realistic reading speeds.

### Pitfall 2: sendBeacon Content-Type
**What goes wrong:** FastAPI endpoint doesn't receive the JSON body because sendBeacon sends with `text/plain` content-type by default when given a string.
**Why it happens:** `navigator.sendBeacon(url, jsonString)` sets Content-Type to `text/plain`. FastAPI's `Body()` parser expects `application/json`.
**How to avoid:** Use a `Blob` with explicit content type: `new Blob([JSON.stringify(payload)], { type: 'application/json' })`. Or use `Request` body parsing on the FastAPI side that accepts text/plain.
**Warning signs:** 422 Unprocessable Entity responses from the beacon endpoint.

### Pitfall 3: sendBeacon Payload Size Limit
**What goes wrong:** Very long sessions with many sections could exceed the ~64KB browser limit for sendBeacon payloads.
**Why it happens:** Accumulating too many events without intermediate flushes.
**How to avoid:** Add a periodic flush (e.g., every 5 minutes via setInterval) in addition to the visibilitychange flush. This also prevents data loss from browser crashes.
**Warning signs:** sendBeacon() returning false (payload rejected).

### Pitfall 4: Founder Viewing Own Pitch
**What goes wrong:** Founder's own pitch views appear in the analytics, distorting engagement data.
**Why it happens:** The tracking hook fires for all viewers including the founder.
**How to avoid:** Check the user role before enabling tracking. Only track when viewing via share token or as an investor-role user.
**Warning signs:** Analytics showing the founder's own email in the investor list.

### Pitfall 5: Double-Counting Return Visits
**What goes wrong:** Multiple browser tabs or rapid page refreshes create duplicate "first view" notifications.
**Why it happens:** Race condition between checking if a view exists and inserting a new one.
**How to avoid:** Use a database unique constraint or ON CONFLICT clause for the first-view check. The notification should be triggered server-side only when a genuinely new record is created.
**Warning signs:** Founder receiving multiple "just opened" toasts for the same investor.

### Pitfall 6: WebSocket Notification Routing
**What goes wrong:** Pitch-opened notifications go to all connected founders instead of just the pitch owner.
**Why it happens:** The existing notification registry (`_investor_connections`) doesn't key by user ID.
**How to avoid:** Create a founder-keyed WebSocket registry (e.g., `_founder_connections: dict[str, list[WebSocket]]`) that maps founder_id to their connected sockets.
**Warning signs:** Founders seeing notifications for pitches they don't own (multi-founder scenario).

### Pitfall 7: sendBeacon Through Next.js Proxy
**What goes wrong:** sendBeacon goes to `/api/v1/analytics/events` which gets proxied via Next.js rewrites to FastAPI, but sendBeacon may not include cookies/auth headers automatically.
**Why it happens:** sendBeacon is a fire-and-forget POST that doesn't include custom headers. The share token or user identity must be in the payload itself, not in Authorization headers.
**How to avoid:** Include share_token or user_id directly in the beacon payload body. The FastAPI endpoint should accept identity from the payload rather than requiring JWT auth headers.
**Warning signs:** 401 Unauthorized responses that are silently swallowed (sendBeacon doesn't expose response).

## Code Examples

### Analytics Events Table Schema
```sql
-- Source: Project conventions from existing migrations
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  share_token_id UUID REFERENCES public.share_tokens(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,           -- Client-generated session identifier
  event_type TEXT NOT NULL
    CHECK (event_type IN ('page_open', 'page_close', 'section_time', 'scroll_depth')),
  section_id TEXT,                    -- Chunk ID for section_time events
  duration_ms INTEGER,               -- Time in milliseconds for section_time events
  scroll_depth INTEGER               -- 25, 50, 75, or 100 for scroll_depth events
    CHECK (scroll_depth IS NULL OR scroll_depth IN (25, 50, 75, 100)),
  metadata JSONB DEFAULT '{}',       -- Extensible metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- At least one identity must be present
  CONSTRAINT identity_required CHECK (user_id IS NOT NULL OR share_token_id IS NOT NULL)
);

-- Query patterns: by founder (dashboard), by session, by investor identity
CREATE INDEX idx_analytics_founder ON analytics_events(founder_id);
CREATE INDEX idx_analytics_session ON analytics_events(session_id);
CREATE INDEX idx_analytics_user ON analytics_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_analytics_token ON analytics_events(share_token_id) WHERE share_token_id IS NOT NULL;
CREATE INDEX idx_analytics_created ON analytics_events(created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Founders can read analytics for their own pitches
CREATE POLICY "Founders read own analytics"
  ON public.analytics_events FOR SELECT
  USING (auth.uid() = founder_id);

-- Anyone can insert events (beacon endpoint uses service role)
-- No RLS insert policy needed -- service role bypasses RLS
```

### sendBeacon Endpoint (FastAPI)
```python
# Source: Project conventions from existing endpoints
from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter(tags=["analytics"])

class SectionTimeEvent(BaseModel):
    section_id: str
    duration_ms: int

class BeaconPayload(BaseModel):
    session_id: str
    user_id: str | None = None
    share_token_id: str | None = None
    founder_id: str  # Required: whose pitch is being viewed
    events: list[SectionTimeEvent]
    scroll_depth: int | None = None  # 25, 50, 75, 100
    session_start: int  # Unix timestamp ms
    session_end: int    # Unix timestamp ms

@router.post("/analytics/events", status_code=204)
async def ingest_events(request: Request):
    """Receive tracking events via sendBeacon. No auth required (identity in payload)."""
    body = await request.body()
    payload = BeaconPayload.model_validate_json(body)

    client = get_service_client()
    rows = []

    # Page open/close events
    rows.append({
        "founder_id": payload.founder_id,
        "user_id": payload.user_id,
        "share_token_id": payload.share_token_id,
        "session_id": payload.session_id,
        "event_type": "page_open",
        "metadata": {"timestamp": payload.session_start},
    })

    # Section time events
    for evt in payload.events:
        rows.append({
            "founder_id": payload.founder_id,
            "user_id": payload.user_id,
            "share_token_id": payload.share_token_id,
            "session_id": payload.session_id,
            "event_type": "section_time",
            "section_id": evt.section_id,
            "duration_ms": evt.duration_ms,
        })

    # Scroll depth
    if payload.scroll_depth:
        rows.append({
            "founder_id": payload.founder_id,
            "user_id": payload.user_id,
            "share_token_id": payload.share_token_id,
            "session_id": payload.session_id,
            "event_type": "scroll_depth",
            "scroll_depth": payload.scroll_depth,
        })

    if rows:
        client.table("analytics_events").insert(rows).execute()

    return None  # 204 No Content
```

### Tracking Hook Pattern
```typescript
// Source: Derived from use-active-section.ts + MDN sendBeacon/visibilitychange docs
"use client";
import { useCallback, useEffect, useRef } from "react";

interface TrackingConfig {
  founderId: string;
  userId?: string;
  shareTokenId?: string;
}

export function useTracking(config: TrackingConfig) {
  const sessionId = useRef(crypto.randomUUID());
  const sessionStart = useRef(Date.now());
  const sectionTimes = useRef<Map<string, number>>(new Map());
  const visibleSince = useRef<Map<string, number>>(new Map());
  const scrollDepth = useRef(0);
  const flushed = useRef(false);

  // Pause timers on tab hidden
  useEffect(() => {
    const onVisChange = () => {
      if (document.visibilityState === "hidden") {
        // Finalize all visible sections
        for (const [id, start] of visibleSince.current) {
          const elapsed = Date.now() - start;
          sectionTimes.current.set(id, (sectionTimes.current.get(id) || 0) + elapsed);
        }
        visibleSince.current.clear();
        flush();
      }
    };
    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, []);

  const flush = useCallback(() => {
    if (flushed.current) return;
    if (sectionTimes.current.size === 0 && scrollDepth.current === 0) return;

    const payload = {
      session_id: sessionId.current,
      user_id: config.userId || null,
      share_token_id: config.shareTokenId || null,
      founder_id: config.founderId,
      events: Array.from(sectionTimes.current.entries()).map(([sectionId, ms]) => ({
        section_id: sectionId,
        duration_ms: ms,
      })),
      scroll_depth: scrollDepth.current || null,
      session_start: sessionStart.current,
      session_end: Date.now(),
    };

    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    navigator.sendBeacon("/api/v1/analytics/events", blob);
    flushed.current = true;
  }, [config]);

  const trackSectionVisibility = useCallback((sectionId: string, isVisible: boolean) => {
    if (isVisible) {
      visibleSince.current.set(sectionId, Date.now());
    } else {
      const start = visibleSince.current.get(sectionId);
      if (start) {
        const elapsed = Date.now() - start;
        sectionTimes.current.set(sectionId, (sectionTimes.current.get(sectionId) || 0) + elapsed);
        visibleSince.current.delete(sectionId);
      }
    }
  }, []);

  const updateScrollDepth = useCallback((depth: number) => {
    if (depth > scrollDepth.current) scrollDepth.current = depth;
  }, []);

  return { trackSectionVisibility, updateScrollDepth, flush };
}
```

### Founder WebSocket Notification Registry
```python
# Source: Derived from existing notifications.py pattern
_founder_connections: dict[str, list[WebSocket]] = {}

async def register_founder(founder_id: str, ws: WebSocket):
    if founder_id not in _founder_connections:
        _founder_connections[founder_id] = []
    _founder_connections[founder_id].append(ws)

async def unregister_founder(founder_id: str, ws: WebSocket):
    if founder_id in _founder_connections:
        _founder_connections[founder_id] = [
            w for w in _founder_connections[founder_id] if w is not ws
        ]

async def notify_founder(founder_id: str, message: dict):
    if founder_id not in _founder_connections:
        return
    dead = []
    for ws in _founder_connections[founder_id]:
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(ws)
    for ws in dead:
        _founder_connections[founder_id].remove(ws)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| beforeunload/unload for analytics | visibilitychange + sendBeacon | 2020+ | beforeunload unreliable on mobile; visibilitychange fires consistently |
| Pixel tracking (GET requests) | sendBeacon POST with JSON | 2018+ | Richer data payloads, no response needed |
| Server-side session tracking | Client-side Intersection Observer | Browser native | Accurate section-level visibility without server-side approximation |

**Deprecated/outdated:**
- `unload` event: Unreliable on mobile browsers, often not fired. Use `visibilitychange` instead.
- XMLHttpRequest in beforeunload: Blocks page close, often cancelled by browser. sendBeacon is the replacement.

## Open Questions

1. **Founder ID resolution for tracking**
   - What we know: Share tokens have a `founder_id` field. Authenticated users viewing the pitch would need the founder_id from somewhere.
   - What's unclear: How does the pitch viewer know which founder owns the pitch? Currently the pitch endpoint returns documents without explicit founder_id.
   - Recommendation: Add `founder_id` to the pitch API response, or infer it from the share token validation response (which already returns `founder_id`). For authenticated investors, store founder_id in the pitch response metadata.

2. **Financial section identification for engagement scoring**
   - What we know: The "5+ min on financials" signal requires identifying which sections are financial content.
   - What's unclear: There's no explicit "financials" tag on pitch sections. Document titles or chunk metadata would need to be matched.
   - Recommendation: Use document file_type = "xlsx" as a proxy for financial sections, or match section headings containing "financial", "revenue", "model" keywords. Keep the heuristic simple for PoC.

3. **Analytics event authentication**
   - What we know: sendBeacon cannot include custom headers. Identity must be in the payload.
   - What's unclear: Security implications of accepting unauthenticated event ingestion.
   - Recommendation: Validate that the provided share_token_id or user_id exists in the database. Rate-limit the beacon endpoint. Accept the trade-off that this endpoint has weaker auth for PoC -- the data is write-only and doesn't expose sensitive information.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest + pytest-asyncio (backend), no frontend test framework |
| Config file | apps/api/tests/conftest.py |
| Quick run command | `cd apps/api && uv run pytest tests/ -x -k analytics` |
| Full suite command | `cd apps/api && uv run pytest tests/ -x` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ANLYT-01 | Analytics aggregation returns investor list with view timestamps | unit | `cd apps/api && uv run pytest tests/test_analytics_api.py::test_investor_list -x` | No -- Wave 0 |
| ANLYT-02 | Per-section time aggregation returns correct durations | unit | `cd apps/api && uv run pytest tests/test_analytics_api.py::test_section_times -x` | No -- Wave 0 |
| ANLYT-03 | First-view event triggers founder notification | unit | `cd apps/api && uv run pytest tests/test_analytics_api.py::test_first_view_notification -x` | No -- Wave 0 |
| ANLYT-04 | Question log aggregation groups by investor | unit | `cd apps/api && uv run pytest tests/test_analytics_api.py::test_question_log -x` | No -- Wave 0 |
| ANLYT-05 | Engagement scoring flags high-engagement correctly | unit | `cd apps/api && uv run pytest tests/test_analytics_api.py::test_engagement_scoring -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/api && uv run pytest tests/test_analytics_api.py -x`
- **Per wave merge:** `cd apps/api && uv run pytest tests/ -x`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/api/tests/test_analytics_api.py` -- covers ANLYT-01 through ANLYT-05
- [ ] Test fixtures for analytics_events table data
- [ ] Migration 00007 must be applied for test database

## Sources

### Primary (HIGH confidence)
- [MDN: Navigator.sendBeacon()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon) - sendBeacon API usage, limitations, content-type behavior
- [MDN: Timing element visibility with Intersection Observer](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API/Timing_element_visibility) - Section visibility time tracking pattern
- [MDN: Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) - Observer configuration, thresholds, rootMargin
- Project codebase: `use-active-section.ts`, `notifications.py`, `access-table.tsx`, `pending-count-badge.tsx` - Existing patterns to reuse

### Secondary (MEDIUM confidence)
- [web.dev: Intersection Observer v2](https://web.dev/articles/intersectionobserver-v2) - trackVisibility and delay options
- [PlainSignal: Beacon API in Analytics](https://plainsignal.com/glossary/beacon-api) - sendBeacon best practices and payload limits

### Tertiary (LOW confidence)
- None -- all findings verified against primary sources or existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All browser-native APIs, verified via MDN docs, existing codebase patterns
- Architecture: HIGH - Directly extends existing patterns (Intersection Observer hook, WebSocket registry, dashboard tabs, Supabase migrations)
- Pitfalls: HIGH - sendBeacon content-type issue and tab-hidden timer problem are well-documented in MDN

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable browser APIs, no rapid changes expected)
