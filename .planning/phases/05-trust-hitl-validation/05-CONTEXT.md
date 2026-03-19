# Phase 5: Trust + HITL Validation - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

AI responses display calibrated confidence indicators, low-confidence answers are routed to the founder for review before investors see them, and founders can approve/edit/reject from a dashboard. Covers: confidence scoring (3-signal), answer routing by threshold, founder validation dashboard at /dashboard, investor-facing confidence badges, and real-time push of approved answers. Does NOT cover: authentication (Phase 6), analytics (Phase 7), or live pitch mode (Phase 8).

</domain>

<decisions>
## Implementation Decisions

### Confidence scoring
- Three-signal confidence calculation: (1) retrieval quality from Cohere relevance_scores, (2) LLM self-assessment via GPT-4o prompt instruction, (3) coverage check verifying the question topic maps to uploaded document sections
- Three tiers: High (green, >=70%), Moderate (yellow, 40-69%), Low (red, <40%)
- Displayed as a color badge with tier label (e.g., "High confidence" in green)
- Tier label shown by default, numeric score revealed on hover/tap
- Confidence score stored on the query record for routing and dashboard display

### Answer routing
- High confidence (>=70%): auto-publish immediately, investor sees answer with green badge
- Moderate confidence (40-69%): auto-publish with yellow badge, no disclaimer text — badge speaks for itself
- Low confidence (<40%): queued for founder review, investor sees "being verified" placeholder message ("This answer is being verified by the team — check back shortly.")
- Rejection requires founder to write a replacement answer — investor always gets something, never a dead end
- Approved answers pushed to investor in real-time via WebSocket (infrastructure exists from Phase 3 streaming)

### Founder dashboard
- New /dashboard route, separate from investor-facing pitch viewer
- Two tabs: "Pending Review" (action items) and "History" (past decisions with approve/edit/reject status)
- Review queue card shows: investor's question, AI draft answer, confidence score, source citations, and which section it was asked from — full context for informed decisions
- Inline editing: click the AI answer text to edit directly in place, Approve button confirms
- Three actions per queued answer: Approve (publish as-is), Edit (inline modify then approve), Reject (must write replacement answer)
- DEMO_USER_ID used for founder identity until Phase 6 auth

### Investor experience
- Confidence badge positioned below answer text, before citations section — natural reading flow: answer -> confidence -> evidence
- Moderate (yellow) answers show badge only, no disclaimer text
- When founder approves/edits a queued answer, "being verified" placeholder smoothly animates into the approved answer with badge
- Founder-reviewed answers display a special "Verified" green badge regardless of original confidence tier — signals human oversight
- High-confidence auto-published answers show their tier badge (green "High confidence")
- Real-time WebSocket push delivers approved answers to active investor sessions

### Claude's Discretion
- Exact confidence formula (how to weight the 3 signals — retrieval, LLM self-assessment, coverage)
- Coverage check implementation approach (keyword matching, embedding similarity to doc titles, etc.)
- LLM self-assessment prompt wording
- WebSocket channel design for push notifications to investors
- Dashboard layout, card styling, spacing (follow existing shadcn patterns)
- Animation/transition details for placeholder-to-answer replacement
- Database schema additions (confidence fields on queries table, review status, founder edits)
- Pending review count indicator (badge on nav, etc.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product vision & requirements
- `docs/prd.md` — Full PRD with HITL validation module specs, confidence scoring vision
- `.planning/REQUIREMENTS.md` — TRUST-01 (confidence visual indicators), TRUST-02 (low-confidence queuing), TRUST-03 (founder approve/edit/reject dashboard)

### Database schema
- `supabase/migrations/00001_init.sql` — Core tables (users, documents, chunks)
- `supabase/migrations/00003_queries_and_match_chunks.sql` — Queries table (question, answer, citations, status, metadata) — extend with confidence fields and review status

### Existing query pipeline
- `apps/api/app/services/query_engine.py` — RAG pipeline orchestrator (retrieve -> prompt -> stream). Confidence scoring integrates here.
- `apps/api/app/services/retrieval.py` — Vector retrieval + Cohere rerank pipeline. relevance_score is one confidence signal.
- `apps/api/app/models/query.py` — Citation model with relevance_score, QueryResponse model to extend with confidence

### WebSocket infrastructure
- `apps/web/hooks/use-query-stream.ts` — WebSocket streaming hook (extend for push notifications of approved answers)
- `apps/web/components/qa/` — Q&A panel components to extend with confidence badges

### Frontend patterns
- `apps/web/components/ui/` — shadcn/ui components (Card, Badge, Skeleton, Tabs) for dashboard
- `apps/web/app/globals.css` — Theme tokens for confidence badge colors
- `apps/web/lib/utils.ts` — cn() helper for Tailwind class merging

### Prior phase context
- `.planning/phases/03-rag-query-engine/03-CONTEXT.md` — Query persistence to queries table, WebSocket streaming, citation format with relevance_score
- `.planning/phases/04-smart-document-viewer/04-CONTEXT.md` — Q&A panel design (slide-in from right), FAB interaction, section context scoping

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `queries` table: already stores question, answer, citations (JSONB), status, metadata (JSONB) — extend with confidence_score, review_status, reviewer_notes fields
- `query_engine.py`: run_query_pipeline orchestrates retrieve -> prompt -> stream — insert confidence calculation after retrieval, before routing decision
- `retrieval.py`: returns chunks with relevance_score from Cohere rerank — first signal for confidence
- `use-query-stream.ts`: WebSocket hook with status/token/citation/error message types — extend with confidence and review-push message types
- `Badge` component (shadcn/ui): use for confidence tier display
- `Tabs` component (shadcn/ui): use for Pending/History tabs in dashboard
- `Card` component: use for review queue cards

### Established Patterns
- FastAPI with pydantic models for request/response validation
- API versioning under /api/v1/ with APIRouter
- WebSocket streaming pattern: POST creates record, WS streams results
- Supabase service client for database operations
- Next.js App Router with client components for interactive features
- DEMO_USER_ID bypass for auth (Phase 6 adds real auth)

### Integration Points
- `queries` table needs new columns: confidence_score (float), confidence_tier (text), review_status (text: auto_published/pending_review/approved/rejected), reviewed_by (UUID), reviewed_at (timestamp), founder_answer (text for rejection replacements)
- New API endpoints: GET /api/v1/reviews (pending queue), PUT /api/v1/reviews/{query_id} (approve/edit/reject)
- New frontend route: /dashboard for founder validation UI
- WebSocket extension: new message type for pushing approved answers to investor sessions
- Query pipeline modification: confidence calculation step between retrieval and streaming

</code_context>

<specifics>
## Specific Ideas

- The "being verified" placeholder should feel intentional and professional — not like an error or loading state. It signals human oversight, which builds trust.
- Founder-reviewed answers getting a "Verified" badge is a trust signal — it tells investors "a human confirmed this," which is more valuable than showing the original AI confidence score.
- The inline edit UX should feel fast — founder clicks, edits text, hits Approve. Minimal friction for high-throughput review sessions.
- Real-time push of approved answers via WebSocket makes the platform feel alive and responsive — investors see the answer appear without refreshing.
- The three-signal confidence (retrieval + LLM self-assessment + coverage) provides defense in depth — even if retrieval scores are high, the LLM can flag uncertainty, and coverage check catches off-topic questions.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-trust-hitl-validation*
*Context gathered: 2026-03-19*
