# Phase 5: Trust + HITL Validation - Research

**Researched:** 2026-03-19
**Domain:** Confidence scoring, HITL answer routing, founder validation dashboard, real-time push notifications
**Confidence:** HIGH

## Summary

Phase 5 adds a three-signal confidence scoring system to the existing RAG query pipeline, routes low-confidence answers through a founder review queue, and provides a validation dashboard at `/dashboard` for the founder to approve, edit, or reject queued answers. The existing codebase provides strong foundations: the `queries` table already stores question/answer/citations/status/metadata, the WebSocket streaming infrastructure is in place, and shadcn UI components (Card, Badge, Tabs, Tooltip, Textarea, Skeleton, ScrollArea) are all already installed.

The core technical challenge is integrating confidence calculation into the `run_query_pipeline` function between retrieval and response streaming, then branching the flow based on threshold. High/moderate answers stream normally with a confidence badge; low-confidence answers save a draft but show investors a "being verified" placeholder, then push the real answer via WebSocket when the founder acts. The founder dashboard is a new Next.js route (`/dashboard`) with standard CRUD against new API endpoints.

**Primary recommendation:** Extend the existing query pipeline with a `calculate_confidence` step after retrieval + reranking, store confidence on the query record, and use the existing WebSocket infrastructure to push approved answers to investors.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Three-signal confidence calculation: (1) retrieval quality from Cohere relevance_scores, (2) LLM self-assessment via GPT-4o prompt instruction, (3) coverage check verifying the question topic maps to uploaded document sections
- Three tiers: High (green, >=70%), Moderate (yellow, 40-69%), Low (red, <40%)
- Displayed as a color badge with tier label (e.g., "High confidence" in green)
- Tier label shown by default, numeric score revealed on hover/tap
- Confidence score stored on the query record for routing and dashboard display
- High confidence (>=70%): auto-publish immediately, investor sees answer with green badge
- Moderate confidence (40-69%): auto-publish with yellow badge, no disclaimer text
- Low confidence (<40%): queued for founder review, investor sees "being verified" placeholder
- Rejection requires founder to write a replacement answer
- Approved answers pushed to investor in real-time via WebSocket
- New /dashboard route, separate from investor-facing pitch viewer
- Two tabs: "Pending Review" and "History"
- Review queue card shows: investor's question, AI draft answer, confidence score, source citations, section context
- Inline editing: click the AI answer text to edit directly in place
- Three actions: Approve, Edit, Reject (must write replacement)
- DEMO_USER_ID used for founder identity until Phase 6 auth
- Confidence badge positioned below answer text, before citations section
- Moderate answers show badge only, no disclaimer
- Founder-reviewed answers display "Verified" green badge regardless of original confidence tier
- Real-time WebSocket push delivers approved answers to active investor sessions

### Claude's Discretion
- Exact confidence formula (how to weight the 3 signals)
- Coverage check implementation approach
- LLM self-assessment prompt wording
- WebSocket channel design for push notifications
- Dashboard layout, card styling, spacing (follow existing shadcn patterns)
- Animation/transition details for placeholder-to-answer replacement
- Database schema additions
- Pending review count indicator

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TRUST-01 | AI responses display confidence scores with visual indicators (green/yellow/red) | Confidence calculation service + ConfidenceBadge component; three-signal scoring (retrieval, LLM self-assessment, coverage); new CSS variables for tier colors |
| TRUST-02 | Low-confidence answers queue for founder review before being visible to investors | Answer routing logic in query pipeline; new `review_status` column on queries table; "being verified" placeholder in QA thread; WebSocket push for approved answers |
| TRUST-03 | Founder can approve, edit, or reject queued answers from a validation dashboard | New `/dashboard` route with Tabs (Pending/History); new API endpoints GET/PUT `/api/v1/reviews`; ReviewCard with inline editing and rejection form |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| FastAPI | >=0.135.0 | Backend API endpoints for review CRUD | Already in use |
| Next.js | 16.1.7 | Frontend dashboard route + investor badge UI | Already in use |
| shadcn/ui | 4.0.8 | Card, Badge, Tabs, Textarea, Tooltip, Skeleton, ScrollArea | Already installed |
| OpenAI GPT-4o | - | LLM self-assessment signal (prompt-based confidence) | Already used for answer generation |
| Cohere rerank | v3.5 | Retrieval quality signal (relevance_score) | Already in retrieval pipeline |
| Supabase | - | Database for queries table extensions | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.577.0 | ShieldCheck icon for Verified badge | Already installed |
| sonner | 2.0.7 | Toast notifications for review action errors | Already installed |

### Alternatives Considered
None -- all decisions are locked. The stack is fully determined by existing infrastructure.

**Installation:**
```bash
# Tabs component needs to be added via shadcn
cd apps/web && npx shadcn@latest add tabs
# Textarea and Tooltip are already installed
```

Note: Check if `tabs` is already installed before running. All other shadcn components (Card, Badge, Skeleton, ScrollArea, Separator, Tooltip, Textarea) are already present in `apps/web/components/ui/`.

## Architecture Patterns

### Recommended Project Structure
```
apps/api/app/
├── api/v1/
│   ├── query.py          # MODIFY: add confidence to WS "done" message
│   └── reviews.py        # NEW: GET /reviews, PUT /reviews/{id}
├── models/
│   └── query.py          # MODIFY: add confidence/review fields to models
├── services/
│   ├── query_engine.py   # MODIFY: insert confidence calculation step
│   ├── retrieval.py      # READ: use relevance_scores as signal (no changes)
│   └── confidence.py     # NEW: three-signal confidence calculator
└── ...

apps/web/
├── app/
│   └── dashboard/
│       └── page.tsx       # NEW: validation dashboard route
├── components/
│   ├── qa/
│   │   ├── qa-thread.tsx  # MODIFY: add ConfidenceBadge + VerificationPlaceholder
│   │   └── ...
│   └── dashboard/
│       ├── validation-dashboard.tsx  # NEW: top-level dashboard layout
│       ├── review-card.tsx           # NEW: question+answer+actions card
│       ├── review-queue.tsx          # NEW: pending review list
│       ├── review-history.tsx        # NEW: completed reviews list
│       ├── inline-editor.tsx         # NEW: textarea for editing answers
│       └── rejection-form.tsx        # NEW: textarea for replacement answers
├── components/
│   └── confidence-badge.tsx          # NEW: reusable badge (investor + dashboard)
│   └── verified-badge.tsx            # NEW: founder-reviewed badge
├── hooks/
│   └── use-query-stream.ts  # MODIFY: handle confidence + review-push messages
└── lib/
    └── review-api.ts         # NEW: fetch/update review endpoints
```

### Pattern 1: Confidence Calculation Service
**What:** A dedicated `confidence.py` module that computes a composite score from three independent signals.
**When to use:** After retrieval+reranking completes, before the LLM generates a response (for signal 1: retrieval quality), and after the LLM generates a response (for signal 2: LLM self-assessment). Signal 3 (coverage) can be computed alongside retrieval.
**Example:**
```python
# apps/api/app/services/confidence.py

from __future__ import annotations

def compute_retrieval_signal(chunks: list[dict]) -> float:
    """Signal 1: Average relevance_score from Cohere rerank results.

    Returns 0-1 float. If no chunks, returns 0.
    Cohere relevance_score is already 0-1 range.
    """
    if not chunks:
        return 0.0
    scores = [c.get("relevance_score", c.get("similarity", 0.0)) for c in chunks]
    # Use top-3 average to avoid dilution from low-relevance tail chunks
    top_scores = sorted(scores, reverse=True)[:3]
    return sum(top_scores) / len(top_scores)


def compute_coverage_signal(
    question: str, chunks: list[dict], document_titles: dict[str, str]
) -> float:
    """Signal 3: Does the question topic map to uploaded document sections?

    Simple keyword overlap between question terms and chunk content/titles.
    Returns 0-1 float.
    """
    import re
    question_words = set(re.findall(r"[a-z]{3,}", question.lower()))
    if not question_words:
        return 0.5  # neutral for very short questions

    # Check coverage across chunk content and document titles
    covered_words = set()
    corpus = " ".join(
        c.get("content", "") for c in chunks
    ).lower() + " " + " ".join(document_titles.values()).lower()

    for word in question_words:
        if word in corpus:
            covered_words.add(word)

    return len(covered_words) / len(question_words) if question_words else 0.0


def compute_confidence_score(
    retrieval_signal: float,
    llm_self_assessment: float,
    coverage_signal: float,
) -> tuple[float, str]:
    """Combine three signals into a final confidence score and tier.

    Weights (Claude's discretion recommendation):
    - Retrieval quality: 40% (most objective signal)
    - LLM self-assessment: 35% (model knows what it doesn't know)
    - Coverage: 25% (catches off-topic questions)

    Returns (score_0_to_100, tier_string).
    """
    score = (
        retrieval_signal * 0.40
        + llm_self_assessment * 0.35
        + coverage_signal * 0.25
    ) * 100

    score = max(0, min(100, score))

    if score >= 70:
        tier = "high"
    elif score >= 40:
        tier = "moderate"
    else:
        tier = "low"

    return (round(score, 1), tier)
```

### Pattern 2: LLM Self-Assessment via Structured Output
**What:** Modify the GPT-4o system prompt to request a confidence self-assessment in a structured suffix, then parse it out of the response.
**When to use:** During answer generation. The LLM appends a confidence line that gets stripped from the user-facing answer.
**Example:**
```python
# Addition to SYSTEM_PROMPT in query_engine.py
CONFIDENCE_SUFFIX = """

After your answer, on a new line, output EXACTLY:
CONFIDENCE: [0.0-1.0]
where the number reflects how well the source materials support your answer.
- 1.0 = sources directly and completely answer the question
- 0.7 = sources mostly answer the question with minor gaps
- 0.4 = sources partially relevant but significant gaps
- 0.1 = sources barely relevant, answer is mostly inference
- 0.0 = no relevant information in sources

This confidence line will be removed before showing to users."""


def extract_llm_confidence(full_response: str) -> tuple[str, float]:
    """Strip CONFIDENCE: line from response, return (clean_answer, score)."""
    import re
    match = re.search(r"\nCONFIDENCE:\s*([0-9]*\.?[0-9]+)\s*$", full_response)
    if match:
        score = float(match.group(1))
        clean = full_response[:match.start()].rstrip()
        return (clean, min(1.0, max(0.0, score)))
    return (full_response, 0.5)  # default moderate if parsing fails
```

### Pattern 3: Answer Routing and WebSocket Push
**What:** After confidence is computed, route the answer: auto-publish (high/moderate) or queue (low). For queued answers, the investor WebSocket receives a placeholder. When the founder acts, a push notification delivers the approved answer.
**When to use:** At the end of `run_query_pipeline`, after streaming completes.
**Key insight:** The existing WebSocket connection for answer streaming closes after the pipeline completes. For push notifications of approved answers, a separate mechanism is needed -- either a new persistent WebSocket connection or a polling approach. Given that Phase 3 already established WebSocket patterns, a lightweight notification WebSocket is the cleanest approach.

```python
# In query.py stream_query, after pipeline completes:
# For low-confidence: send placeholder message instead of answer
if confidence_tier == "low":
    await websocket.send_json({
        "type": "queued",
        "message": "This answer is being verified by the team -- check back shortly.",
        "query_id": query_id,
    })
else:
    # Normal flow: send done with confidence
    await websocket.send_json({
        "type": "done",
        "query_id": query_id,
        "confidence_score": confidence_score,
        "confidence_tier": confidence_tier,
    })
```

### Pattern 4: Review API Endpoints
**What:** Two new endpoints for the founder dashboard.
```python
# apps/api/app/api/v1/reviews.py
# GET /api/v1/reviews?status=pending_review  -- list queued answers
# PUT /api/v1/reviews/{query_id}  -- approve/edit/reject

class ReviewAction(BaseModel):
    action: Literal["approve", "edit", "reject"]
    edited_answer: str | None = None  # required for edit and reject
```

### Anti-Patterns to Avoid
- **Blocking LLM stream for confidence:** Do NOT compute all three signals before starting the stream. Signal 1 (retrieval) and Signal 3 (coverage) can be computed before streaming; Signal 2 (LLM self-assessment) comes from the LLM response itself. Stream tokens to the investor, then compute final confidence after stream completes.
- **Separate confidence API call:** Do NOT make a separate LLM call just for confidence assessment. Embed the self-assessment instruction in the existing generation prompt to avoid latency and cost doubling.
- **Polling for approved answers:** While polling would work, it contradicts the locked decision of "real-time WebSocket push." Use WebSocket for immediate delivery.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tab navigation | Custom tab state management | shadcn Tabs component | Accessible, keyboard-navigable, already styled |
| Tooltip for score reveal | Custom hover popup | shadcn Tooltip component | Already installed, handles positioning |
| Auto-resizing textarea | Manual height calculation | CSS `field-sizing: content` or textarea `rows` with JS | Browser-native is more reliable |
| WebSocket reconnection | Custom retry logic | Simple reconnect with exponential backoff | Keep it minimal for PoC |
| Time ago formatting | Custom date math | Intl.RelativeTimeFormat or tiny helper | 5 lines vs importing a library |

**Key insight:** This phase is largely "plumbing" -- extending existing patterns (query pipeline, WebSocket messages, shadcn components) rather than introducing new paradigms. Resist adding new libraries.

## Common Pitfalls

### Pitfall 1: LLM Self-Assessment Gaming
**What goes wrong:** GPT-4o tends to be overconfident in self-assessment, rating most answers 0.8+ even when sources are thin.
**Why it happens:** LLMs are trained to be helpful, which biases toward confident-sounding outputs.
**How to avoid:** (1) Calibrate prompt to anchor on source coverage, not answer quality. (2) Weight retrieval signal higher (40%) since Cohere scores are more objective. (3) Use explicit anchoring in the prompt (the scale descriptions above help). (4) Accept that empirical tuning with demo content is needed (noted in STATE.md blockers).
**Warning signs:** All answers clustering at 70-80% confidence regardless of question difficulty.

### Pitfall 2: WebSocket Lifecycle for Push Notifications
**What goes wrong:** The existing WebSocket in `use-query-stream.ts` closes after each query completes. There is no persistent connection to receive push notifications for approved answers.
**Why it happens:** Phase 3 WebSocket was designed for one query stream, not ongoing notifications.
**How to avoid:** Two options:
1. **Recommended:** Add a separate notification WebSocket endpoint (`/api/v1/notifications/stream`) that stays open for the investor's session. When the founder approves a queued answer, broadcast to connected investors.
2. **Alternative:** Use polling on the frontend to check for updated answer status. Simpler but contradicts the "real-time push" decision.
**Warning signs:** Investor sees "being verified" indefinitely even after founder approves.

### Pitfall 3: Race Condition on Confidence Routing
**What goes wrong:** Answer streams to the investor before confidence is fully calculated, then gets retroactively hidden.
**Why it happens:** Streaming starts immediately, but LLM self-assessment only available after stream completes.
**How to avoid:** For the streaming flow:
1. Retrieve chunks + compute retrieval signal + coverage signal BEFORE streaming
2. Stream the LLM answer (with confidence suffix instruction)
3. After stream completes, extract LLM self-assessment, compute final score
4. THEN decide routing: if low-confidence, the "done" message tells the client to show placeholder instead of the streamed answer
5. The client-side needs to handle this: buffer the streamed answer, only display it if confidence is sufficient
**Warning signs:** Answer flashes briefly then disappears for low-confidence queries.

### Pitfall 4: Database Migration Column Additions
**What goes wrong:** Adding columns to the `queries` table breaks existing queries if NOT NULL constraints are used without defaults.
**Why it happens:** Existing rows lack the new columns.
**How to avoid:** All new columns MUST have defaults or be nullable:
```sql
ALTER TABLE queries ADD COLUMN confidence_score FLOAT DEFAULT NULL;
ALTER TABLE queries ADD COLUMN confidence_tier TEXT DEFAULT NULL;
ALTER TABLE queries ADD COLUMN review_status TEXT DEFAULT 'auto_published';
ALTER TABLE queries ADD COLUMN reviewed_by UUID DEFAULT NULL;
ALTER TABLE queries ADD COLUMN reviewed_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE queries ADD COLUMN founder_answer TEXT DEFAULT NULL;
```

### Pitfall 5: Streaming Answer Buffering on Client
**What goes wrong:** The investor sees the full streamed answer for a low-confidence query before the "queued" message arrives to hide it.
**Why it happens:** Tokens stream in real-time but confidence routing happens after generation completes.
**How to avoid:** The client must buffer tokens and NOT render them until it receives either a `done` (show answer) or `queued` (show placeholder) message. This changes the current streaming UX. **Alternative:** Stream tokens to a hidden buffer, show "Generating..." status, then reveal answer or placeholder once confidence is determined. This trades streaming UX for correctness.
**Recommendation:** Accept the tradeoff -- show "Generating..." with a progress indicator during LLM generation, then reveal the final answer with badge (or placeholder) atomically. This is simpler and avoids the flash problem. The streaming experience is still fast (2-5 seconds typical), just not token-by-token for this phase.

## Code Examples

### Database Migration (new columns on queries table)
```sql
-- supabase/migrations/00004_confidence_and_reviews.sql

-- Confidence scoring columns
ALTER TABLE public.queries ADD COLUMN confidence_score FLOAT;
ALTER TABLE public.queries ADD COLUMN confidence_tier TEXT
  CHECK (confidence_tier IN ('high', 'moderate', 'low'));

-- Review workflow columns
ALTER TABLE public.queries ADD COLUMN review_status TEXT NOT NULL DEFAULT 'auto_published'
  CHECK (review_status IN ('auto_published', 'pending_review', 'approved', 'edited', 'rejected'));
ALTER TABLE public.queries ADD COLUMN reviewed_by UUID REFERENCES public.users(id);
ALTER TABLE public.queries ADD COLUMN reviewed_at TIMESTAMPTZ;
ALTER TABLE public.queries ADD COLUMN founder_answer TEXT;

-- Index for dashboard queries (pending reviews)
CREATE INDEX idx_queries_review_status ON public.queries(review_status)
  WHERE review_status = 'pending_review';

-- Index for review history
CREATE INDEX idx_queries_reviewed_at ON public.queries(reviewed_at DESC)
  WHERE reviewed_at IS NOT NULL;
```

### Extended QueryResponse Model
```python
class QueryResponse(BaseModel):
    query_id: str
    question: str
    answer: str | None = None
    citations: list[Citation] = []
    status: str = "pending"
    confidence_score: float | None = None
    confidence_tier: str | None = None
    review_status: str = "auto_published"
    founder_answer: str | None = None
    created_at: str | None = None
```

### ConfidenceBadge Component Pattern
```tsx
// apps/web/components/confidence-badge.tsx
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const tierConfig = {
  high: { label: "High confidence", className: "bg-[hsl(142,71%,45%)] text-white hover:bg-[hsl(142,71%,40%)]" },
  moderate: { label: "Moderate confidence", className: "bg-[hsl(38,92%,50%)] text-white hover:bg-[hsl(38,92%,45%)]" },
  low: { label: "Low confidence", className: "bg-destructive text-destructive-foreground hover:bg-destructive/90" },
} as const;

interface ConfidenceBadgeProps {
  tier: "high" | "moderate" | "low";
  score: number;  // 0-100
}

export function ConfidenceBadge({ tier, score }: ConfidenceBadgeProps) {
  const config = tierConfig[tier];
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={config.className}>{config.label}</Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Score: {score}%</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

### WebSocket Notification Channel (investor push)
```python
# apps/api/app/api/v1/notifications.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio

router = APIRouter(tags=["notifications"])

# Simple in-memory connection registry (sufficient for PoC/single-server)
_investor_connections: dict[str, WebSocket] = {}

@router.websocket("/notifications/stream")
async def notification_stream(websocket: WebSocket):
    """Persistent WebSocket for pushing approved answers to investors."""
    await websocket.accept()
    conn_id = str(id(websocket))
    _investor_connections[conn_id] = websocket
    try:
        # Keep alive -- wait for disconnect
        while True:
            await websocket.receive_text()  # ping/keep-alive
    except WebSocketDisconnect:
        pass
    finally:
        _investor_connections.pop(conn_id, None)

async def broadcast_approved_answer(query_id: str, answer: str, confidence_tier: str):
    """Called by review endpoint when founder approves/edits/rejects."""
    message = {
        "type": "answer_approved",
        "query_id": query_id,
        "answer": answer,
        "confidence_tier": "verified",  # always verified after founder review
    }
    dead = []
    for conn_id, ws in _investor_connections.items():
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(conn_id)
    for conn_id in dead:
        _investor_connections.pop(conn_id, None)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single confidence score from LLM | Multi-signal confidence (retrieval + LLM + coverage) | 2024+ RAG best practice | More robust, catches failure modes single signals miss |
| Blocking review before any answer | Threshold-based routing (auto-publish high, queue low) | Standard HITL pattern | Enables async investor exploration while maintaining quality |
| Full page refresh for updates | WebSocket push for approved answers | Already in project (Phase 3) | Real-time UX without polling |

## Open Questions

1. **Streaming UX vs Confidence Correctness**
   - What we know: Confidence can only be fully computed after LLM generation (signal 2 requires the response)
   - What's unclear: Whether to show token-by-token streaming or buffer until confidence is known
   - Recommendation: Buffer the answer during generation (show "Generating..." progress), then reveal atomically with confidence badge. This avoids the flash-then-hide problem for low-confidence answers. The 2-5 second generation time is acceptable.

2. **Confidence Calibration**
   - What we know: STATE.md flags this as a research gap requiring empirical tuning with demo content
   - What's unclear: Whether the 40%/70% thresholds will produce a reasonable distribution across demo content questions
   - Recommendation: Implement with the specified thresholds, then tune weights and thresholds based on testing. Log all three signals individually to the query metadata for calibration analysis.

3. **Notification WebSocket Scope**
   - What we know: A new persistent WebSocket is needed for push notifications (existing one closes per-query)
   - What's unclear: Should it be per-query or per-session? Should the founder dashboard also use it for real-time queue updates?
   - Recommendation: Single session-scoped notification WebSocket that both investor and founder pages connect to. Investor receives `answer_approved` messages; founder receives `new_pending_review` messages. Simple in-memory connection dict is fine for PoC single-server.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest + pytest-asyncio |
| Config file | apps/api/pyproject.toml (implicit) |
| Quick run command | `cd apps/api && uv run pytest tests/ -x -q` |
| Full suite command | `cd apps/api && uv run pytest tests/ -v` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TRUST-01a | Confidence score calculation (3 signals) | unit | `cd apps/api && uv run pytest tests/test_confidence.py -x` | Wave 0 |
| TRUST-01b | Confidence tier assignment (thresholds) | unit | `cd apps/api && uv run pytest tests/test_confidence.py::test_tier_thresholds -x` | Wave 0 |
| TRUST-01c | LLM self-assessment extraction | unit | `cd apps/api && uv run pytest tests/test_confidence.py::test_extract_llm_confidence -x` | Wave 0 |
| TRUST-02a | Low-confidence answers get review_status=pending_review | integration | `cd apps/api && uv run pytest tests/test_query_api.py::test_low_confidence_queued -x` | Wave 0 |
| TRUST-02b | High/moderate answers auto-publish | integration | `cd apps/api && uv run pytest tests/test_query_api.py::test_high_confidence_auto_publish -x` | Wave 0 |
| TRUST-03a | GET /reviews returns pending items | integration | `cd apps/api && uv run pytest tests/test_reviews_api.py::test_list_pending_reviews -x` | Wave 0 |
| TRUST-03b | PUT /reviews/{id} approve publishes answer | integration | `cd apps/api && uv run pytest tests/test_reviews_api.py::test_approve_review -x` | Wave 0 |
| TRUST-03c | PUT /reviews/{id} reject requires replacement | integration | `cd apps/api && uv run pytest tests/test_reviews_api.py::test_reject_requires_replacement -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/api && uv run pytest tests/ -x -q`
- **Per wave merge:** `cd apps/api && uv run pytest tests/ -v`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/api/tests/test_confidence.py` -- covers TRUST-01 (confidence calculation unit tests)
- [ ] `apps/api/tests/test_reviews_api.py` -- covers TRUST-03 (review CRUD integration tests)
- [ ] Extend `apps/api/tests/test_query_api.py` -- covers TRUST-02 (routing tests)

## Sources

### Primary (HIGH confidence)
- Existing codebase: `apps/api/app/services/query_engine.py`, `retrieval.py`, `app/api/v1/query.py` -- current pipeline architecture
- Existing codebase: `supabase/migrations/00003_queries_and_match_chunks.sql` -- current schema
- Existing codebase: `apps/web/hooks/use-query-stream.ts`, `components/qa/` -- current WebSocket + UI patterns
- CONTEXT.md: locked decisions and discretion areas
- UI-SPEC: `05-UI-SPEC.md` -- component inventory, layout contract, interaction contract

### Secondary (MEDIUM confidence)
- Cohere rerank API: relevance_score range is 0-1 (verified from existing `retrieval.py` usage with `> 0.01` threshold)
- OpenAI GPT-4o structured output: confidence self-assessment via prompt instruction is a well-established pattern

### Tertiary (LOW confidence)
- Confidence weight calibration (40/35/25 split): based on general RAG best practices, will need empirical tuning with demo content

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- everything is already in the project, no new dependencies
- Architecture: HIGH -- extending existing patterns (query pipeline, WebSocket, shadcn components)
- Pitfalls: HIGH -- identified from direct code analysis of existing pipeline and WebSocket lifecycle
- Confidence formula weights: LOW -- will need empirical tuning

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable -- extending existing patterns, no external dependency changes expected)
