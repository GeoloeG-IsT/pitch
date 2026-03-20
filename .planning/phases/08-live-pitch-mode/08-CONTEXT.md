# Phase 8: Live Pitch Mode - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Founders can present the pitch in real-time while investors ask questions via the Q&A interface, with the founder seeing incoming questions and AI draft answers in a presenter view. Covers: live session lifecycle (start/end), presenter view at /present, real-time question routing through founder, investor live indicators, and WebSocket coordination between founder and investor sessions. Does NOT cover: confidence scoring changes (Phase 5 handles that), analytics on live sessions (could be Phase 7 extension), or authentication changes (Phase 6 handles that).

</domain>

<decisions>
## Implementation Decisions

### Session lifecycle
- Founder starts a live session via "Go Live" toggle on /dashboard
- Multiple concurrent investors supported — group pitch meeting scenario
- Investors with existing shared links auto-join the live session when they open the pitch viewer — no separate URL or explicit join action needed
- When founder ends the session, pitch viewer reverts to normal async exploration mode
- Unanswered live questions stay in the review queue after session ends
- No scheduling — live sessions are instant on/off

### Presenter view
- New dedicated /present route — full-screen presenter page separate from /dashboard and /pitch
- Primary layout: real-time feed of incoming investor questions with AI draft answers beside each question
- No pitch content shown in presenter view — founder already knows their pitch, focus is on managing Q&A
- Each question shows investor identity (name/email) so founder can personalize responses
- Header shows live count of connected investors with a dropdown listing who is currently viewing
- Three actions per question: Approve (publish AI draft), Edit (modify then approve), Override (clear AI draft, write custom answer from scratch)
- Founder can dismiss/skip questions — investor sees "This question was not addressed in this session"

### Question flow in live mode
- ALL questions route through the founder during a live session — no auto-publish regardless of confidence score
- AI generates a draft answer for each question (same RAG pipeline as async), but it's shown only to the founder in the presenter view
- Investor sees a "being reviewed" placeholder while waiting (same pattern as Phase 5's verification placeholder)
- When founder approves/edits/overrides, the answer is pushed to the investor in real-time via WebSocket
- Founder can write a fully custom answer, bypassing the AI draft entirely
- Dismissed questions show a dismissal message to the investor

### Investor live experience
- Persistent "LIVE" banner at the top of the pitch viewer when a live session is active
- Investors browse the pitch freely at their own pace — no founder-guided section control
- Each investor sees only their own Q&A thread — no cross-investor visibility
- Q&A interaction is the same as async (FAB + slide-in panel) but answers come from founder approval instead of auto-publish
- All answered questions persist after the session ends — investors can revisit later
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product vision & requirements
- `.planning/REQUIREMENTS.md` — LIVE-01 (founder presents while investors ask real-time questions), LIVE-02 (presenter view with incoming questions and AI draft answers)
- `.planning/PROJECT.md` — Dual-mode usage: live pitch meetings AND async investor exploration

### WebSocket infrastructure (reuse/extend)
- `apps/api/app/api/v1/notifications.py` — In-memory WebSocket registries for founders (`_founder_connections`) and investors (`_investor_connections`), `notify_founder()`, `broadcast_approved_answer()` functions
- `apps/web/hooks/use-notification-stream.ts` — Investor WebSocket hook for receiving approved answers (extend for live mode)
- `apps/web/hooks/use-founder-notifications.ts` — Founder WebSocket hook with auth token (extend for live session events)
- `apps/web/hooks/use-query-stream.ts` — WebSocket streaming hook for Q&A (AI answer generation)

### Query pipeline & HITL (Phase 5 patterns to reuse)
- `apps/api/app/api/v1/query.py` — Query creation and WebSocket streaming endpoint
- `apps/api/app/api/v1/reviews.py` — Review queue API (approve/edit/reject patterns to reuse)
- `apps/api/app/services/query_engine.py` — RAG pipeline that generates draft answers
- `apps/api/app/services/confidence.py` — Confidence scoring (still runs but routing changes in live mode)

### Existing UI to extend
- `apps/web/components/qa/qa-panel.tsx` — Investor Q&A panel (add "being reviewed" state for live mode)
- `apps/web/components/dashboard/validation-dashboard.tsx` — Founder dashboard (add "Go Live" toggle)
- `apps/web/components/dashboard/review-card.tsx` — Review card pattern to adapt for presenter view
- `apps/web/components/dashboard/inline-editor.tsx` — Inline editing pattern for founder answer editing

### Prior phase context
- `.planning/phases/04-smart-document-viewer/04-CONTEXT.md` — FAB + slide-in Q&A panel, section-scoped questions, WebSocket streaming
- `.planning/phases/05-trust-hitl-validation/05-CONTEXT.md` — Confidence scoring, answer routing, "being verified" placeholder, founder review dashboard, real-time push of approved answers

### Auth infrastructure
- `apps/web/hooks/use-auth.ts` — Auth hook for role detection (founder vs investor)
- `apps/web/middleware.ts` — Route protection middleware (protect /present for founders)
- `apps/api/app/core/auth.py` — JWT auth dependency for API endpoints

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `notifications.py` — In-memory WebSocket registries for both founders and investors. `notify_founder()` and `broadcast_approved_answer()` can be extended for live session events (new question, answer approved, session start/end)
- `use-notification-stream.ts` — Investor WebSocket hook already handles `answer_approved` events. Extend with `session_started`, `session_ended` message types
- `use-founder-notifications.ts` — Founder WebSocket with auth. Extend for live question feed
- `review-card.tsx` + `inline-editor.tsx` — Card layout and inline editing patterns from Phase 5 validation dashboard. Adapt for presenter view question cards
- `validation-dashboard.tsx` — Dashboard shell with tabs. Add "Go Live" button to header
- `qa-panel.tsx` + `verification-placeholder.tsx` — "Being verified" placeholder pattern reusable for live mode waiting state

### Established Patterns
- WebSocket streaming: POST creates record, WS streams results (query.py pattern)
- In-memory connection registries with dead connection cleanup (notifications.py)
- callbackRef pattern to avoid WebSocket reconnects (use-notification-stream.ts)
- Sonner toasts for real-time notifications
- shadcn/ui Card, Badge, Tabs, Button components for dashboard UI
- JWT auth via query params for WebSocket connections

### Integration Points
- New route: `/present` for founder presenter view (protected by middleware for founder role)
- New API endpoints: POST /api/v1/sessions (start live session), DELETE /api/v1/sessions (end session), GET /api/v1/sessions/active (check if live)
- Extend query creation: detect active live session and route through founder instead of auto-publish
- Extend notifications.py: new message types for live session events
- Dashboard: "Go Live" toggle button that creates/destroys a session
- Pitch viewer: check for active session on mount, show LIVE banner if active

</code_context>

<specifics>
## Specific Ideas

- The presenter view is a mission-critical real-time tool — it should feel snappy and focused. No pitch content clutter, just a clean feed of questions with quick actions. Think "Slido for the presenter" but integrated with AI.
- The "Go Live" button is a big moment — it should feel intentional. Maybe a confirmation dialog: "Starting live session. Investors will see a LIVE indicator."
- Investor identity on questions is valuable for VCs-of-VCs scenarios where a partner is presenting to their own LPs — knowing who's asking helps personalize.
- The "being reviewed" placeholder during live sessions reuses Phase 5's pattern, maintaining consistency. Investors who've used the platform in async mode will recognize the UX.
- Override (custom answer) is essential — in a live meeting, the founder might want to say "Let me address that after the presentation" or provide context the AI doesn't have.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-live-pitch-mode*
*Context gathered: 2026-03-20*
