---
phase: 03-rag-query-engine
plan: 01
subsystem: api
tags: [pgvector, cohere, openai, rag, retrieval, streaming, pydantic]

# Dependency graph
requires:
  - phase: 02-document-ingestion
    provides: "chunks table with embeddings, documents table, Supabase service client"
provides:
  - "queries table for Q&A persistence"
  - "match_chunks RPC function for vector similarity search"
  - "Retrieval pipeline: embed -> search -> boost -> rerank"
  - "Query engine orchestrator with GPT-4o streaming"
  - "Citation, QueryCreate, QueryResponse pydantic models"
affects: [03-02 (API endpoints and WebSocket), phase-4 (citation UI), phase-7 (analytics)]

# Tech tracking
tech-stack:
  added: ["cohere>=5.20.0"]
  patterns: ["Supabase RPC for pgvector search", "Cohere rerank-v3.5 with graceful degradation", "AsyncOpenAI streaming", "Token-budgeted context assembly"]

key-files:
  created:
    - "supabase/migrations/00003_queries_and_match_chunks.sql"
    - "apps/api/app/models/query.py"
    - "apps/api/app/services/retrieval.py"
    - "apps/api/app/services/query_engine.py"
    - "apps/api/tests/test_retrieval.py"
  modified:
    - "apps/api/app/core/config.py"
    - "apps/api/tests/conftest.py"
    - ".env.example"
    - "apps/api/pyproject.toml"

key-decisions:
  - "Cohere rerank graceful degradation: skip reranking if COHERE_API_KEY empty"
  - "Token budget of 6000 for context window to prevent overflow"
  - "Regex word extraction for metadata boost keyword matching (handles punctuation)"

patterns-established:
  - "Supabase RPC pattern: client.rpc('match_chunks', params).execute() for pgvector queries"
  - "AsyncOpenAI streaming: async for chunk in stream with delta.content extraction"
  - "Metadata boosting: keyword-based table chunk score multiplier (1.5x for financial queries)"

requirements-completed: [QA-01, QA-03]

# Metrics
duration: 8min
completed: 2026-03-19
---

# Phase 3 Plan 01: RAG Query Data Layer & Services Summary

**Vector retrieval pipeline with Cohere reranking, metadata boosting, GPT-4o streaming orchestrator, and queries table migration**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-19T13:31:11Z
- **Completed:** 2026-03-19T13:39:33Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Created queries table and match_chunks RPC function for vector similarity search
- Built full retrieval pipeline: embedding -> vector search -> metadata boost -> Cohere rerank
- Implemented query engine orchestrator with GPT-4o streaming and citation extraction
- All 31 tests pass (8 new retrieval tests + 23 existing)

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration, Cohere install, and config update** - `a4a81c5` (feat)
2. **Task 2: TDD RED - Failing tests for retrieval pipeline** - `c3ff0a2` (test)
3. **Task 2: TDD GREEN - Implement retrieval pipeline and query engine** - `aea47ca` (feat)

## Files Created/Modified
- `supabase/migrations/00003_queries_and_match_chunks.sql` - Queries table + match_chunks vector search RPC
- `apps/api/app/models/query.py` - Citation, QueryCreate, QueryResponse pydantic models
- `apps/api/app/services/retrieval.py` - Vector search, metadata boosting, Cohere reranking pipeline
- `apps/api/app/services/query_engine.py` - RAG orchestrator with GPT-4o streaming and context budgeting
- `apps/api/tests/test_retrieval.py` - 8 unit tests covering all retrieval pipeline functions
- `apps/api/tests/conftest.py` - Added AsyncOpenAI, Cohere, and Supabase RPC mock fixtures
- `apps/api/app/core/config.py` - Added cohere_api_key setting
- `.env.example` - Added COHERE_API_KEY and NEXT_PUBLIC_WS_URL
- `apps/api/pyproject.toml` - Added cohere dependency

## Decisions Made
- Cohere rerank graceful degradation: if COHERE_API_KEY is empty, skip reranking and return chunks in vector similarity order
- Token budget of 6000 tokens for context assembly prevents GPT-4o context overflow
- Used regex word extraction (`re.findall(r"[a-z]+", ...)`) for metadata boost keyword matching to handle punctuation in questions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed keyword matching for punctuated questions**
- **Found during:** Task 2 (metadata boost implementation)
- **Issue:** `question.lower().split()` produces tokens like "revenue?" which don't match keyword set "revenue"
- **Fix:** Changed to `re.findall(r"[a-z]+", question.lower())` to extract clean words
- **Files modified:** apps/api/app/services/retrieval.py
- **Verification:** test_metadata_boost_financial passes
- **Committed in:** aea47ca (Task 2 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Essential for correctness of metadata boosting. No scope creep.

## Issues Encountered
None

## User Setup Required

External service (Cohere) requires API key configuration:
- `COHERE_API_KEY` must be set in `.env` for reranking to activate
- Without it, the system degrades gracefully (uses vector similarity order)
- Get key from: https://dashboard.cohere.com/api-keys

## Next Phase Readiness
- Retrieval pipeline and query engine ready for Plan 02 to wire API endpoints and WebSocket
- All services export clean interfaces: `retrieve_and_rerank()`, `run_query_pipeline()`
- Mock fixtures in conftest.py ready for API-level integration tests

## Self-Check: PASSED

All 5 created files verified on disk. All 3 commit hashes verified in git log.

---
*Phase: 03-rag-query-engine*
*Completed: 2026-03-19*
