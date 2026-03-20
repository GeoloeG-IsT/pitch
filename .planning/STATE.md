---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
stopped_at: Completed 09-01-PLAN.md
last_updated: "2026-03-20T10:05:49.135Z"
last_activity: 2026-03-20 -- Completed 09-01 (shared-types removal and audit update)
progress:
  total_phases: 9
  completed_phases: 9
  total_plans: 22
  completed_plans: 22
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** Investors can ask natural language questions about any aspect of a startup's pitch and get accurate, source-cited answers instantly, without the founder needing to be in the room.
**Current focus:** All 9 phases complete. v1.0 PoC delivered, verified, and polished.

## Current Position

Phase: 9 of 9 (Polish: Citation Clicks and Shared-Types Cleanup)
Plan: 1 of 1 in current phase (09-01 complete)
Status: All Phases Complete
Last activity: 2026-03-20 -- Completed 09-01 (shared-types removal and audit update)

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 1 | 1/2 | ~25min | ~25min |

**Recent Trend:**
- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 01 P02 | 10min | 2 tasks | 10 files |
| Phase 02 P01 | 7min | 2 tasks | 13 files |
| Phase 02 P02 | 5min | 2 tasks | 5 files |
| Phase 02 P03 | 15min | 2 tasks | 15 files |
| Phase 03 P01 | 8min | 2 tasks | 10 files |
| Phase 03 P02 | 12min | 3 tasks | 16 files |
| Phase 04 P01 | 6min | 2 tasks | 11 files |
| Phase 04 P02 | 3min | 2 tasks | 12 files |
| Phase 04 P03 | 8min | 3 tasks | 6 files |
| Phase 05 P01 | 7min | 2 tasks | 11 files |
| Phase 05 P02 | 3min | 2 tasks | 9 files |
| Phase 05 P03 | 4min | 2 tasks | 12 files |
| Phase 06 P01 | 3min | 4 tasks | 10 files |
| Phase 06 P02 | 6min | 4 tasks | 16 files |
| Phase 06 P03 | 4min | 2 tasks | 10 files |
| Phase 06 P04 | 5min | 3 tasks | 7 files |
| Phase 07 P01 | 7min | 2 tasks | 6 files |
| Phase 07 P02 | 4min | 2 tasks | 12 files |
| Phase 08 P01 | 6min | 2 tasks | 9 files |
| Phase 08 P02 | 20min | 3 tasks | 24 files |
| Phase 09 P01 | 3min | 2 tasks | 9 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: 8 phases derived from 30 v1 requirements at fine granularity
- Roadmap: Demo content creation in Phase 1 (parallel with scaffolding, not deferred to end)
- Roadmap: Auth (Phase 6) depends only on Phase 1, can parallelize with core pipeline phases
- 01-01: HNSW index for pgvector (not IVFFlat) -- better recall at our scale
- 01-01: shadcn New York style with CSS variables for component theming
- 01-01: Next.js rewrites proxy /api/v1/* to FastAPI backend (single origin)
- [Phase 01]: Hatchling build backend with packages=['.'] for scripts-only Python project
- [Phase 01]: Generated output in content/output/ excluded via .gitignore (reproducible from source)
- [Phase 01]: Cross-references use natural language patterns for RAG stress-testing
- 02-01: PyMuPDFReader metadata uses 'source' key (not 'page_label') -- node mapper handles both
- 02-01: pymupdf added as explicit dependency for PyMuPDFReader runtime
- 02-01: IngestionPipeline without vector_store pattern -- manual mapping to chunks table schema
- 02-02: DEMO_USER_ID hardcoded UUID for auth bypass until Phase 6
- 02-02: Batch chunk insert in groups of 50 to avoid Supabase payload limits
- 02-02: File bytes read eagerly before background task (UploadFile closes after endpoint return)
- 02-03: Sonner for toast notifications (shadcn integration, non-blocking UX)
- 02-03: 3-second polling interval for document status updates
- 02-03: Deduplicate uploads by filename (replace existing rather than creating duplicate)
- 03-01: Cohere rerank graceful degradation: skip reranking if COHERE_API_KEY empty
- 03-01: Token budget of 6000 for context window to prevent overflow
- 03-01: Regex word extraction for metadata boost keyword matching (handles punctuation)
- 03-02: WebSocket connects directly to FastAPI (not through Next.js proxy) via NEXT_PUBLIC_WS_URL
- 03-02: Empty chunks guard returns helpful "upload documents first" message
- 03-02: Cohere rerank guard prevents 400 error on empty document list
- 04-01: Pitch endpoint selects only id/title/file_type columns (minimal payload)
- 04-01: Chunks ordered by section_number ascending via Supabase .order()
- [Phase 04]: Client-side fetch in PitchViewer useEffect (viewer is fully interactive)
- [Phase 04]: TOC uses Sheet component for mobile drawer (left side) matching shadcn pattern
- [Phase 04]: ImageIcon from lucide-react to avoid next/image conflict
- 04-03: Custom fixed panel instead of Sheet for Q&A (avoids modal scroll-lock, keeps content scrollable)
- 04-03: Single useQueryStream instance with message snapshot pattern for conversation history
- 04-03: Citation click scrolls viewer with 2s ring-primary/30 highlight per UI-SPEC Animation Contract
- 05-01: Confidence weights: retrieval 0.40, LLM 0.35, coverage 0.25
- 05-01: Confidence tiers: >=70 high, >=40 moderate, <40 low
- 05-01: CONFIDENCE: line in system prompt, stripped via replace_answer WebSocket message
- 05-01: Low-confidence answers stored as status=queued, review_status=pending_review
- [Phase 05]: Inline HSL values in badge classNames for direct color control
- [Phase 05]: callbackRef pattern in useNotificationStream to avoid WebSocket reconnects
- [Phase 05]: queryId added to QAMessage for notification-to-message matching
- [Phase 05]: SiteNav as separate client component (layout.tsx is server component)
- [Phase 05]: PendingCountBadge polls every 30s via setInterval (no WebSocket needed for count)
- [Phase 05]: fetchReviewHistory merges three status-filtered API calls client-side
- 06-01: Migration numbered 00006 (not 00003) because 00002-00005 already existed
- 06-01: Three-client Supabase SSR pattern: browser, server (cookies), middleware (getUser)
- 06-01: FastAPI JWT auth via PyJWT with HS256 + authenticated audience
- 06-02: useActionState (React 19) for login/signup form state management
- 06-02: base-ui render prop for DropdownMenuTrigger (not asChild) per base-nova pattern
- 06-02: Role fetched from public.users table in middleware (not JWT claims) for PoC
- [Phase 06]: secrets.token_urlsafe(16) for share tokens (no nanoid dependency needed)
- [Phase 06]: WebSocket auth via query params (access_token for JWT, token for share tokens)
- [Phase 06]: Native HTML select for expiry picker (no shadcn Select component needed)
- [Phase 06]: base-ui render prop on AlertDialogTrigger (not asChild) per base-nova pattern
- 07-01: sendBeacon payload parsed via request.body() + model_validate_json (handles text/plain)
- 07-01: Engagement tiers: hot (financials>=5min OR questions>=3 OR sessions>=2 OR scroll>=100%), active (7d), viewed
- 07-01: Founder WebSocket registry uses list[WebSocket] per founder_id for multiple tabs
- 07-01: First-view detection queries page_open count after insert (count<=1 = first view)
- [Phase 07]: useAnalyticsCountBadge exported as hook for parent-controlled count reset on tab switch
- [Phase 07]: Heatmap section data aggregated client-side by fetching all investor details in parallel
- [Phase 08]: In-memory _active_sessions cache with DB startup hydration for fast session lookups
- [Phase 08]: PoC single-tenant: iterate all _active_sessions (at most 1) for live query routing
- [Phase 08]: Override action maps to review_status=edited; dismiss broadcasts question_dismissed event
- [Phase 08]: useNotificationStream refactored to options object for multi-callback extensibility
- [Phase 08]: Live-mode questions use isLiveReviewing flag with status=done to skip streaming sync
- [Phase 08]: GoLiveButton uses Dialog (start) / AlertDialog (end) for different confirmation severity
- [Phase 08]: Server-side /api/me route added to work around WSL2 Supabase direct-call hanging
- [Phase 08]: Cookie-based getAuthHeaders for presenter WebSocket on WSL2
- [Phase 09]: Pre-existing mypy errors in apps/api are out of scope (not caused by shared-types removal)

### Roadmap Evolution

- Phase 9 added: Polish: citation clicks and shared-types cleanup

### Pending Todos

None yet.

### Blockers/Concerns

- Research gap: Confidence threshold calibration requires empirical tuning with demo content in Phase 5
- RESOLVED: Excel parsing uses openpyxl + gpt-4o-mini summaries (validated in 02-01)
- RESOLVED: Embedding model is OpenAI text-embedding-3-small (confirmed in 02-01)

## Session Continuity

Last session: 2026-03-20T10:01:30.144Z
Stopped at: Completed 09-01-PLAN.md
Resume file: None
