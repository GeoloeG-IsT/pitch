# Phase 7: Analytics - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Founders get visibility into investor engagement -- who viewed the pitch, how long they spent per section, what questions they asked, and which investors show the strongest interest signals. Covers: event tracking in the pitch viewer, analytics dashboard tab, real-time open notifications, question log aggregation, and rule-based high-engagement flagging.

</domain>

<decisions>
## Implementation Decisions

### Analytics dashboard layout
- New "Analytics" tab on the existing /dashboard page (alongside Access management)
- Overview is an investor table showing: name/email (or "Anonymous (...token hint)" for token-only access), last viewed, total time, questions asked, engagement level badge
- Email shown if share token had investor_email set; otherwise "Anonymous (...last4)" label
- Aggregate section heatmap (color-coded horizontal bar chart) at the top of the analytics tab, above the investor table -- shows which pitch sections draw the most attention across all investors
- Clicking an investor row expands inline to show per-section time breakdown and question log (no page navigation)

### Engagement tracking
- Per-section time tracked via Intersection Observer (reuse pattern from use-active-section.ts TOC highlighting)
- Events accumulated in memory, flushed via sendBeacon() on page unload/visibility change (minimal network requests)
- Tracked events: page open/close timestamps, per-section visibility duration, questions asked per section (already in queries table), return visits (same token/user multiple sessions), scroll depth reached (25/50/75/100%)
- Anonymous token-link investors tracked identically to authenticated investors (by share_token_id vs user_id)

### Notification delivery
- In-app Sonner toast when founder is online ("Investor X just opened your pitch") + notification badge on the Analytics tab
- Notification on first view only per investor/token -- return visits update analytics silently, no repeat notifications
- Badge count on Analytics tab only (not on top-level SiteNav Dashboard link)
- Uses existing WebSocket infrastructure for real-time push to founder

### Investor signals & flagging
- Four behavioral signals flag high-engagement: extended time on financials (5+ min), multiple deep questions (3+), return visits (2+ sessions), high scroll completion (100%)
- Simple rule-based: if ANY signal is met, investor flagged as high-engagement
- Visual treatment: "Hot" badge on investor row, high-engagement investors sort to top of table
- Engagement computed on dashboard load (query aggregates from events table) -- no background jobs or DB triggers

### Claude's Discretion
- Exact event table schema design
- sendBeacon endpoint implementation details
- Heatmap bar chart component and color scale
- Expandable row animation and detail layout
- WebSocket notification channel design
- Badge count polling interval
- Scroll depth calculation thresholds

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database schema
- `supabase/migrations/00001_init.sql` -- Users table with role column, documents table with view_count/last_viewed_at columns (potential reuse for view tracking)
- `supabase/migrations/00003_queries_and_match_chunks.sql` -- Queries table storing all Q&A with user_id, already indexed by user_id and created_at
- `supabase/migrations/00006_share_tokens.sql` -- Share tokens table with founder_id, investor_email, share_token_id added to queries table for anonymous tracking

### Pitch viewer (tracking integration point)
- `apps/web/app/pitch/page.tsx` -- Pitch page with share token validation, entry point for tracking
- `apps/web/hooks/use-active-section.ts` -- Intersection Observer pattern for TOC highlighting (reuse for section time tracking)
- `apps/web/components/viewer/pitch-viewer.tsx` -- Viewer component where tracking hooks will be added

### Dashboard (analytics tab integration point)
- `apps/web/components/dashboard/site-nav.tsx` -- Navigation component, needs Analytics tab
- `apps/web/components/dashboard/access-table.tsx` -- Existing table component pattern to follow for investor table
- `apps/web/components/dashboard/pending-count-badge.tsx` -- Badge pattern to reuse for analytics notification badge

### Real-time infrastructure
- `apps/web/hooks/use-query-stream.ts` -- WebSocket connection pattern (NEXT_PUBLIC_WS_URL)
- `apps/api/app/api/v1/query.py` -- WebSocket endpoint pattern for real-time features

### Auth context
- `apps/web/hooks/use-auth.ts` -- Auth hook for identifying founder vs investor
- `apps/api/app/core/auth.py` -- JWT auth dependency for API endpoints

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `use-active-section.ts` Intersection Observer hook: reuse pattern for section visibility tracking
- `PendingCountBadge` component: reuse polling badge pattern for analytics notification count
- `access-table.tsx` table component: follow same table pattern for investor analytics table
- Sonner toast system: use for real-time "investor opened" notifications
- WebSocket infrastructure (`use-query-stream.ts`): reuse for push notifications to founder
- `share_token_id` on queries table: already links anonymous Q&A to share tokens

### Established Patterns
- Dashboard uses tabs (Access management tab exists, add Analytics tab alongside)
- Client components fetch data via `/api/v1/*` proxy to FastAPI backend
- WebSocket connects directly to FastAPI (not through Next.js proxy) via NEXT_PUBLIC_WS_URL
- shadcn/ui New York style with CSS variables for theming
- sendBeacon() for reliable page-unload data transmission (no existing pattern, new)

### Integration Points
- Pitch viewer (`pitch-viewer.tsx`): add tracking hook for section visibility and scroll depth
- Pitch page (`pitch/page.tsx`): pass share token or user context to tracking hook
- Dashboard SiteNav: add "Analytics" tab with notification badge
- FastAPI: new analytics endpoints (event ingestion, aggregation queries, notification WebSocket)
- New DB migration: analytics_events table for tracking data

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 07-analytics*
*Context gathered: 2026-03-20*
