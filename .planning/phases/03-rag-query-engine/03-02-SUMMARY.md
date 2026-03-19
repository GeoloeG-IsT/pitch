---
phase: 03-rag-query-engine
plan: 02
subsystem: api, ui
tags: [fastapi, websocket, react, streaming, citations, shadcn, nextjs]

# Dependency graph
requires:
  - phase: 03-rag-query-engine/01
    provides: "Query data models, retrieval pipeline, query engine service, queries table"
  - phase: 02-document-pipeline
    provides: "Document ingestion, chunks table, Supabase vector store"
provides:
  - "POST /api/v1/query endpoint for query creation"
  - "WebSocket /api/v1/query/{id}/stream for token streaming"
  - "React useQueryStream hook for WebSocket state management"
  - "Full query page UI with streaming answer and citation components"
affects: [04-answer-quality, 05-confidence-calibration]

# Tech tracking
tech-stack:
  added: [shadcn collapsible, shadcn input, shadcn textarea]
  patterns: [WebSocket streaming via direct FastAPI connection, React hook for WS lifecycle, token-by-token rendering with blinking cursor]

key-files:
  created:
    - apps/api/app/api/v1/query.py
    - apps/api/tests/test_query_api.py
    - apps/web/lib/query-api.ts
    - apps/web/hooks/use-query-stream.ts
    - apps/web/app/query/page.tsx
    - apps/web/app/query/layout.tsx
    - apps/web/components/query/query-input.tsx
    - apps/web/components/query/streaming-answer.tsx
    - apps/web/components/query/citation-badge.tsx
    - apps/web/components/query/citation-list.tsx
    - apps/web/components/query/query-status.tsx
  modified:
    - apps/api/app/main.py
    - apps/api/app/services/retrieval.py
    - apps/api/app/services/query_engine.py

key-decisions:
  - "WebSocket connects directly to FastAPI backend (not through Next.js proxy) via NEXT_PUBLIC_WS_URL"
  - "Empty chunks guard returns helpful 'upload documents first' message instead of sending empty context to LLM"
  - "Cohere rerank guard prevents 400 error when no documents exist"

patterns-established:
  - "WebSocket streaming: POST to create resource, then WS to stream results"
  - "React hook pattern: useQueryStream manages full WS lifecycle with cleanup"
  - "Token-by-token rendering with blinking cursor via animate-pulse"

requirements-completed: [QA-01, QA-03, QA-04]

# Metrics
duration: 12min
completed: 2026-03-19
---

# Phase 3 Plan 02: API + UI Integration Summary

**Query API endpoints with WebSocket streaming, React query page with token-by-token answer rendering and expandable citation sources**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-19T14:00:00Z
- **Completed:** 2026-03-19T14:12:00Z
- **Tasks:** 3
- **Files modified:** 16

## Accomplishments
- POST /api/v1/query creates query records, WebSocket streams tokens incrementally
- Full query page at /query with input, streaming answer, and expandable Sources section
- End-to-end RAG Q&A flow verified: question in, streamed answer with citations out
- Empty-document edge case handled gracefully with helpful messaging

## Task Commits

Each task was committed atomically:

1. **Task 1: API endpoints and integration tests** - `5381090` (feat)
2. **Task 2: Frontend query page with streaming UI** - `c3181c5` (feat)
3. **Task 3: Verify end-to-end RAG Q&A flow** - `ec12d61` (fix)

## Files Created/Modified
- `apps/api/app/api/v1/query.py` - POST /api/v1/query + WebSocket /api/v1/query/{id}/stream
- `apps/api/app/main.py` - Query router mounted at /api/v1
- `apps/api/tests/test_query_api.py` - Integration tests for query endpoints
- `apps/web/lib/query-api.ts` - Query API client with Citation/QueryResponse types
- `apps/web/hooks/use-query-stream.ts` - React hook managing WebSocket streaming state
- `apps/web/app/query/page.tsx` - Query page with input, streaming answer, citations
- `apps/web/app/query/layout.tsx` - Query page metadata layout
- `apps/web/components/query/query-input.tsx` - Textarea input with submit button
- `apps/web/components/query/streaming-answer.tsx` - Token-by-token answer with blinking cursor
- `apps/web/components/query/citation-badge.tsx` - Inline citation badge component
- `apps/web/components/query/citation-list.tsx` - Expandable Sources section with Collapsible
- `apps/web/components/query/query-status.tsx` - Status indicator (Searching/Generating)
- `apps/api/app/services/retrieval.py` - Added empty chunks guard for rerank
- `apps/api/app/services/query_engine.py` - Added empty context guard with helpful message

## Decisions Made
- WebSocket connects directly to FastAPI backend via NEXT_PUBLIC_WS_URL (not through Next.js proxy) to avoid Next.js WS limitations
- Empty chunks guard in rerank_chunks prevents Cohere API 400 error when no documents uploaded
- Empty context guard in run_query_pipeline returns "upload documents first" message instead of hallucinating

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Guard empty chunks in rerank_chunks**
- **Found during:** Task 3 (end-to-end verification)
- **Issue:** Cohere rerank API returns 400 error when called with empty documents list
- **Fix:** Added `if not chunks: return []` guard at start of rerank_chunks
- **Files modified:** apps/api/app/services/retrieval.py
- **Verification:** Query works correctly when no documents uploaded
- **Committed in:** ec12d61

**2. [Rule 1 - Bug] Guard empty context in run_query_pipeline**
- **Found during:** Task 3 (end-to-end verification)
- **Issue:** GPT-4o called with empty context produces unhelpful responses
- **Fix:** Added empty chunks guard returning "No documents have been uploaded yet" message
- **Files modified:** apps/api/app/services/query_engine.py
- **Verification:** User sees helpful message instead of error when no documents exist
- **Committed in:** ec12d61

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes essential for graceful handling of empty-database state. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Full RAG Q&A pipeline operational end-to-end
- Query page accessible at /query with streaming answers and citations
- Ready for Phase 4 (answer quality improvements) or Phase 5 (confidence calibration)

## Self-Check: PASSED

All 11 created files verified present. All 3 task commits verified in git log.

---
*Phase: 03-rag-query-engine*
*Completed: 2026-03-19*
