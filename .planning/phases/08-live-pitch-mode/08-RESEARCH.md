# Phase 8: Live Pitch Mode - Research

**Researched:** 2026-03-20
**Domain:** Real-time session management, WebSocket coordination, presenter UI
**Confidence:** HIGH

## Summary

Phase 8 adds a live pitch session mode where founders present in real-time while investors ask questions that route through the founder for approval before being published. The core technical challenge is extending the existing WebSocket infrastructure (notifications.py) with session state management and a new presenter view at /present.

The existing codebase provides strong foundations: in-memory WebSocket registries for both founders and investors, a review workflow (approve/edit/reject) from Phase 5, and the confidence-based routing in query.py that can be overridden during live sessions. The primary new work is (1) a `live_sessions` database table, (2) a sessions API, (3) live-mode routing logic in the query pipeline, (4) a presenter view page, and (5) extensions to the investor notification stream for session events.

**Primary recommendation:** Extend the existing notifications.py WebSocket infrastructure with new message types for live session events. Use in-memory session state backed by a database table for persistence. Build the presenter view as a new /present route reusing review-card patterns from Phase 5.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Founder starts a live session via "Go Live" toggle on /dashboard
- Multiple concurrent investors supported -- group pitch meeting scenario
- Investors with existing shared links auto-join the live session when they open the pitch viewer -- no separate URL or explicit join action needed
- When founder ends the session, pitch viewer reverts to normal async exploration mode
- Unanswered live questions stay in the review queue after session ends
- No scheduling -- live sessions are instant on/off
- New dedicated /present route -- full-screen presenter page separate from /dashboard and /pitch
- Primary layout: real-time feed of incoming investor questions with AI draft answers beside each question
- No pitch content shown in presenter view -- founder already knows their pitch, focus is on managing Q&A
- Each question shows investor identity (name/email) so founder can personalize responses
- Header shows live count of connected investors with a dropdown listing who is currently viewing
- Three actions per question: Approve (publish AI draft), Edit (modify then approve), Override (clear AI draft, write custom answer from scratch)
- Founder can dismiss/skip questions -- investor sees "This question was not addressed in this session"
- ALL questions route through the founder during a live session -- no auto-publish regardless of confidence score
- AI generates a draft answer for each question (same RAG pipeline as async), but it's shown only to the founder in the presenter view
- Investor sees a "being reviewed" placeholder while waiting (same pattern as Phase 5's verification placeholder)
- When founder approves/edits/overrides, the answer is pushed to the investor in real-time via WebSocket
- Founder can write a fully custom answer, bypassing the AI draft entirely
- Dismissed questions show a dismissal message to the investor
- Persistent "LIVE" banner at the top of the pitch viewer when a live session is active
- Investors browse the pitch freely at their own pace -- no founder-guided section control
- Each investor sees only their own Q&A thread -- no cross-investor visibility
- Q&A interaction is the same as async (FAB + slide-in panel) but answers come from founder approval instead of auto-publish
- All answered questions persist after the session ends -- investors can revisit later
- Dismissed questions show the dismissal message permanently

### Claude's Discretion
- WebSocket channel design for live session coordination (extend existing notifications.py or new endpoint)
- Database schema for live sessions (session table, or flag on existing data)
- "Go Live" button placement and styling on /dashboard
- Presenter view card styling, question ordering (chronological vs priority)
- LIVE banner design and animation
- Transition animations when session starts/ends
- How to handle questions that were mid-streaming when session ends
- Mobile responsiveness of /present route

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LIVE-01 | Founder can present the pitch while investors ask questions via the Q&A interface in real-time | Session lifecycle API, WebSocket session events, live-mode query routing, investor LIVE banner |
| LIVE-02 | Founder sees a presenter view with incoming questions and AI draft answers | /present route, presenter question feed via WebSocket, approve/edit/override/dismiss actions, investor identity display |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| FastAPI | >=0.135.0 | WebSocket endpoints, REST API for sessions | Already used for all backend APIs |
| Next.js | 16.1.7 | /present route, client components | Already the frontend framework |
| Supabase | 2.99.2 | live_sessions table, query status updates | Already the database layer |
| shadcn/ui | base-nova | Presenter view components (Card, Badge, Button) | Already the component library |

### Supporting (already in project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | (existing) | Toast notifications for session start/end | Already used throughout |
| lucide-react | (existing) | Icons for Go Live button, presenter actions | Already used throughout |
| Supabase SSR | 0.9.0 | Auth for /present route protection | Already used in middleware |

### No New Dependencies
This phase requires zero new npm or pip packages. All functionality is achievable by extending existing WebSocket infrastructure, Supabase tables, and UI components.

## Architecture Patterns

### Recommended Project Structure
```
apps/api/app/
  api/v1/
    sessions.py         # NEW: session lifecycle API + presenter WS
  models/
    session.py          # NEW: Pydantic models for live sessions

apps/web/
  app/present/
    page.tsx            # NEW: presenter view route
  components/present/
    presenter-view.tsx  # NEW: main presenter layout
    question-card.tsx   # NEW: question card with actions (adapts review-card)
    live-header.tsx     # NEW: connected investor count + dropdown
    override-editor.tsx # NEW: from-scratch answer editor
  hooks/
    use-live-session.ts # NEW: session state hook
    use-presenter-stream.ts # NEW: WebSocket hook for presenter feed
  lib/
    session-api.ts      # NEW: API client for sessions
```

### Pattern 1: Session Lifecycle via REST + WebSocket Events
**What:** REST endpoints manage session state (create/end), WebSocket broadcasts state changes to all connected clients.
**When to use:** Session start/end are discrete events, but notifications of those events need to be real-time.
**Example:**
```python
# apps/api/app/api/v1/sessions.py
# POST /api/v1/sessions -- start a live session
# DELETE /api/v1/sessions/{session_id} -- end a live session
# GET /api/v1/sessions/active -- check if a live session is active for a founder

# On session start: notify all connected investors via broadcast
# On session end: notify all connected investors, revert to async mode
```

### Pattern 2: Live-Mode Query Routing Override
**What:** When a live session is active, override the confidence-based routing in query.py to always queue questions for founder review, regardless of confidence score.
**When to use:** During any active live session for the relevant founder.
**Example:**
```python
# In query.py stream_query, after run_query_pipeline:
# Check if founder has active live session
# If yes: always set status="queued", review_status="pending_review"
# AND notify founder via WebSocket with question + AI draft
# If no: use existing confidence-based routing
```

### Pattern 3: Extend Existing WebSocket Registries
**What:** Extend notifications.py with new message types rather than creating separate WebSocket endpoints for live sessions.
**When to use:** For all live session events (session_started, session_ended, new_live_question, answer_approved_live, question_dismissed).
**Recommendation:** Use the existing `notify_founder()` and `broadcast_approved_answer()` patterns. Add a new `broadcast_session_event()` function for investor-facing session state changes.
```python
# New message types for investor notification stream:
# { "type": "session_started" }
# { "type": "session_ended" }
# { "type": "question_dismissed", "query_id": "..." }

# New message types for founder notification stream:
# { "type": "new_live_question", "query_id": "...", "question": "...",
#   "investor_label": "...", "ai_draft": "...", "citations": [...] }
# { "type": "investor_connected", "count": N, "investors": [...] }
# { "type": "investor_disconnected", "count": N, "investors": [...] }
```

### Pattern 4: In-Memory Session State + DB Persistence
**What:** Keep active session state in memory for fast lookups (is there an active session?), backed by a database table for persistence across restarts.
**When to use:** Session active-check happens on every query creation -- must be fast.
```python
# In-memory: _active_sessions: dict[str, str] = {}  # founder_id -> session_id
# DB table: live_sessions (id, founder_id, started_at, ended_at)
# On startup: load any sessions where ended_at IS NULL
# On session start: insert DB row, update in-memory
# On session end: update DB row ended_at, remove from in-memory
```

### Pattern 5: Presenter WebSocket for Real-Time Question Feed
**What:** Dedicated WebSocket endpoint for the presenter view that streams incoming questions with AI draft answers as they complete.
**Recommendation:** New WebSocket endpoint at `/api/v1/sessions/presenter-stream` authenticated via JWT. Reuse the founder connection registry pattern from analytics.py.
```python
# When a live question finishes RAG processing:
# 1. Store as queued (no auto-publish)
# 2. Send to founder via presenter WebSocket:
#    { "type": "new_live_question", "query_id": "...",
#      "question": "...", "investor_label": "investor@email.com",
#      "ai_draft": "...", "citations": [...] }
# 3. Investor sees "being reviewed" placeholder
```

### Anti-Patterns to Avoid
- **Separate WebSocket server for live mode:** The existing FastAPI WebSocket infrastructure is sufficient. Do not add a separate server or library (like Socket.IO).
- **Polling for session state:** Use WebSocket events, not polling, for real-time session state changes. The only poll-acceptable pattern is the initial check on page load (GET /api/v1/sessions/active).
- **Storing session state only in memory:** Must have DB persistence. In-memory is a cache for performance.
- **Creating a new investor WebSocket endpoint for live mode:** Extend the existing notification_stream with new message types.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Review workflow | New approve/edit/reject logic | Extend existing reviews.py | Same pattern, just add "dismiss" action and "override" (custom answer) |
| WebSocket auth | New auth mechanism | Reuse query param JWT pattern from analytics.py | Proven, already works in the codebase |
| Inline editing | New editor component | Adapt existing InlineEditor from dashboard | Same UX pattern with different context |
| Question cards | Build from scratch | Adapt ReviewCard from dashboard | Same structure (question, answer, actions), different context |
| "Being reviewed" state | New placeholder | Reuse VerificationPlaceholder | Already exists, just change copy for live mode context |

**Key insight:** Phase 8 is fundamentally an extension of Phase 5's review workflow, made real-time. Almost every UI pattern exists in the codebase already -- the new work is the coordination layer.

## Common Pitfalls

### Pitfall 1: Race Condition Between Session End and In-Flight Questions
**What goes wrong:** Founder ends session while AI is still generating a draft answer for a question. The question finishes processing after session ends.
**Why it happens:** RAG pipeline takes several seconds; session end is instant.
**How to avoid:** Questions submitted during a live session should be marked with `live_session_id`. When they finish processing, check if session is still active. If ended, leave them in the review queue (per user decision: "unanswered live questions stay in the review queue after session ends").
**Warning signs:** Questions appearing in neither the presenter view nor the async queue.

### Pitfall 2: Investor WebSocket Not Connected When Session Starts
**What goes wrong:** Investor opens pitch viewer before live session starts, but notification stream WebSocket may not be connected or may have different message handler setup.
**Why it happens:** The investor notification stream only handles `answer_approved` events currently.
**How to avoid:** Extend the existing `useNotificationStream` hook to handle `session_started` and `session_ended` message types. On `session_started`, update local state to show LIVE banner and switch to live-mode Q&A behavior.
**Warning signs:** Investor doesn't see LIVE banner despite active session.

### Pitfall 3: Stale Investor Count After Tab Switch
**What goes wrong:** Presenter view shows incorrect connected investor count because WebSocket disconnections weren't properly tracked.
**Why it happens:** The existing investor connection registry uses connection ID (not investor identity). Multiple tabs from one investor appear as separate connections.
**How to avoid:** Track investor identity (share_token_id or user_id) alongside connection ID. Deduplicate by identity for the count display. Use the existing dead-connection cleanup pattern.
**Warning signs:** Count showing higher than actual unique investors.

### Pitfall 4: Query Status Check Constraint Violation
**What goes wrong:** New query statuses or review_status values fail DB constraint checks.
**Why it happens:** The queries table has CHECK constraints on `status` and `review_status` columns.
**How to avoid:** If adding a "dismissed" review_status, must include it in the migration that updates the CHECK constraint. Current allowed: `('auto_published', 'pending_review', 'approved', 'edited', 'rejected')`. Need to add `'dismissed'`.
**Warning signs:** 500 errors on dismiss action.

### Pitfall 5: Middleware Not Protecting /present Route
**What goes wrong:** Non-founders can access /present route.
**Why it happens:** Current middleware only protects `/dashboard` and `/documents` as FOUNDER_ONLY_PATHS.
**How to avoid:** Add `/present` to the FOUNDER_ONLY_PATHS array in middleware.ts.
**Warning signs:** Investors seeing the presenter view.

## Code Examples

### Database Migration (00008_live_sessions.sql)
```sql
-- Live session tracking
CREATE TABLE public.live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ  -- NULL = active
);

CREATE INDEX idx_live_sessions_active ON public.live_sessions(founder_id)
  WHERE ended_at IS NULL;

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage own sessions"
  ON public.live_sessions FOR ALL
  USING (auth.uid() = founder_id);

-- Add live_session_id to queries for tracking
ALTER TABLE public.queries ADD COLUMN IF NOT EXISTS live_session_id UUID
  REFERENCES public.live_sessions(id);

-- Add 'dismissed' to review_status CHECK constraint
ALTER TABLE public.queries DROP CONSTRAINT queries_review_status_check;
ALTER TABLE public.queries ADD CONSTRAINT queries_review_status_check
  CHECK (review_status IN ('auto_published', 'pending_review', 'approved', 'edited', 'rejected', 'dismissed'));
```

### Session API Pydantic Models
```python
# apps/api/app/models/session.py
from pydantic import BaseModel

class SessionResponse(BaseModel):
    session_id: str
    founder_id: str
    started_at: str
    ended_at: str | None = None
    is_active: bool = True

class LiveQuestionEvent(BaseModel):
    query_id: str
    question: str
    investor_label: str
    ai_draft: str | None = None
    citations: list = []
    created_at: str | None = None

class SessionAction(BaseModel):
    """Actions on live questions: approve, edit, override, dismiss"""
    action: str  # "approve" | "edit" | "override" | "dismiss"
    edited_answer: str | None = None
```

### Presenter View Question Card (adapting ReviewCard)
```typescript
// apps/web/components/present/question-card.tsx
// Adapts the ReviewCard pattern with these changes:
// 1. Shows investor identity (name/email) in header
// 2. Four actions instead of three: Approve, Edit, Override, Dismiss
// 3. Override clears AI draft and opens blank editor
// 4. Dismiss sends dismissal message to investor
// 5. No confidence badge (irrelevant in live mode)
```

### Live-Mode Query Routing
```python
# In query.py stream_query, after run_query_pipeline completes:
from app.api.v1.sessions import get_active_session

active_session = get_active_session(founder_id)
if active_session:
    # Always queue during live sessions, regardless of confidence
    client.table("queries").update({
        "answer": answer,
        "citations": [c.model_dump() for c in citations],
        "status": "queued",
        "confidence_score": confidence_score,
        "confidence_tier": confidence_tier,
        "review_status": "pending_review",
        "live_session_id": active_session["id"],
    }).eq("id", query_id).execute()

    # Notify founder's presenter view
    await notify_founder(founder_id, {
        "type": "new_live_question",
        "query_id": query_id,
        "question": query_row["question"],
        "investor_label": investor_label,
        "ai_draft": answer,
        "citations": [c.model_dump() for c in citations],
    })

    await websocket.send_json({"type": "queued", "query_id": query_id})
else:
    # Existing confidence-based routing
    ...
```

### Investor Session State Hook
```typescript
// In the pitch viewer, check for active session on mount:
// GET /api/v1/sessions/active?founder_id=xxx
// If active, show LIVE banner and switch Q&A to live mode
// Listen for session_started/session_ended via notification WebSocket
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Confidence-based auto-routing (Phase 5) | Founder-gated routing during live sessions | Phase 8 | All questions queued regardless of confidence |
| Async review dashboard | Real-time presenter view | Phase 8 | Questions appear instantly as they're processed |
| Notification stream (answer_approved only) | Extended with session events | Phase 8 | Investors get live mode state changes |

**Key architectural change:** The query routing logic in query.py gains a session-awareness check. This is the single most important integration point -- it determines whether a question goes through the existing async flow or the new live flow.

## Open Questions

1. **Founder identity resolution for questions**
   - What we know: Share tokens have `investor_email` field. Authenticated users have email in users table.
   - What's unclear: How to resolve identity for questions from share-token investors (who aren't authenticated users) -- need to look up share_token_id from the query record.
   - Recommendation: When creating queries, store the share_token_id (already done in create_query). On the presenter view, resolve identity by joining queries -> share_tokens -> investor_email.

2. **Connected investor tracking granularity**
   - What we know: Current investor WebSocket registry uses connection ID, not investor identity.
   - What's unclear: Whether to track by share_token_id or by WebSocket connection for the "connected investors" count.
   - Recommendation: Extend investor WebSocket connection to include share_token identity. When connecting, pass share_token as query param (already done for query streaming). Map connection ID -> investor identity for deduplication.

3. **Mid-streaming session end behavior**
   - What we know: User decided unanswered live questions stay in review queue.
   - What's unclear: What happens to the investor's streaming answer UI when session ends mid-stream.
   - Recommendation: Let the RAG pipeline finish (it runs server-side). The question stays queued. On session end, investor's "being reviewed" placeholder stays until founder handles it from the async review queue. Send a toast to the investor: "Live session ended. Pending answers will be reviewed asynchronously."

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest + pytest-asyncio (backend), manual testing (frontend) |
| Config file | apps/api/tests/conftest.py |
| Quick run command | `cd apps/api && uv run pytest tests/ -x -q` |
| Full suite command | `cd apps/api && uv run pytest tests/ -x` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LIVE-01 | Session creation API | unit | `cd apps/api && uv run pytest tests/test_sessions_api.py -x` | No -- Wave 0 |
| LIVE-01 | Session end API | unit | `cd apps/api && uv run pytest tests/test_sessions_api.py -x` | No -- Wave 0 |
| LIVE-01 | Active session check | unit | `cd apps/api && uv run pytest tests/test_sessions_api.py -x` | No -- Wave 0 |
| LIVE-01 | Live-mode query routing override | unit | `cd apps/api && uv run pytest tests/test_query_api.py::test_live_mode_routing -x` | No -- Wave 0 |
| LIVE-02 | Live question actions (approve/edit/override/dismiss) | unit | `cd apps/api && uv run pytest tests/test_sessions_api.py::test_live_actions -x` | No -- Wave 0 |
| LIVE-02 | Dismiss sets review_status | unit | `cd apps/api && uv run pytest tests/test_sessions_api.py::test_dismiss -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/api && uv run pytest tests/ -x -q`
- **Per wave merge:** `cd apps/api && uv run pytest tests/ -x`
- **Phase gate:** Full suite green before /gsd:verify-work

### Wave 0 Gaps
- [ ] `apps/api/tests/test_sessions_api.py` -- covers LIVE-01, LIVE-02 session and action endpoints
- [ ] Migration 00008 must exist before tests run (DB schema dependency)

## Sources

### Primary (HIGH confidence)
- Codebase inspection: notifications.py -- WebSocket registries and broadcast patterns
- Codebase inspection: query.py -- confidence-based routing logic at lines 136-163
- Codebase inspection: reviews.py -- approve/edit/reject workflow
- Codebase inspection: middleware.ts -- FOUNDER_ONLY_PATHS pattern
- Codebase inspection: review-card.tsx -- UI card pattern for question review
- Codebase inspection: verification-placeholder.tsx -- "being reviewed" placeholder
- Codebase inspection: 00005_confidence_and_reviews.sql -- CHECK constraints on queries table
- Codebase inspection: 00006_share_tokens.sql -- share_token schema with investor_email
- Codebase inspection: analytics.py -- founder WebSocket auth + connection pattern

### Secondary (MEDIUM confidence)
- CONTEXT.md user decisions -- locked implementation choices from /gsd:discuss-phase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all existing libraries
- Architecture: HIGH -- extends proven patterns (WebSocket registries, review workflow, middleware protection)
- Pitfalls: HIGH -- identified from direct codebase inspection (CHECK constraints, middleware gaps, connection tracking)

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable -- no external dependencies changing)
