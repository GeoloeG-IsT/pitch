---
phase: 02-document-ingestion
plan: 01
subsystem: api
tags: [llama-index, openai, embeddings, pdf, markdown, excel, openpyxl, tiktoken, pymupdf, rag]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Supabase schema (documents + chunks tables), FastAPI app scaffold, demo content files"
provides:
  - "LlamaIndex-based PDF parsing pipeline (PyMuPDFReader + SentenceSplitter + OpenAIEmbedding)"
  - "Markdown parsing pipeline (MarkdownNodeParser + SentenceSplitter + OpenAIEmbedding)"
  - "Excel parser with gpt-4o-mini LLM summaries and raw data in metadata"
  - "Node-to-chunk mapper converting LlamaIndex BaseNode to chunks table schema"
  - "Pipeline dispatcher routing by file_type"
  - "Pydantic models for documents and chunks"
  - "Supabase service client factory (service role key for backend writes)"
  - "Test fixtures with mocked OpenAI embedding and chat completions"
affects: [02-document-ingestion, 03-rag-query]

# Tech tracking
tech-stack:
  added: [llama-index-core, llama-index-readers-file, llama-index-embeddings-openai, openpyxl, python-multipart, pymupdf]
  patterns: [IngestionPipeline-without-vector-store, node-to-chunk-manual-mapping, mock-openai-fixtures]

key-files:
  created:
    - apps/api/app/core/supabase.py
    - apps/api/app/models/document.py
    - apps/api/app/models/chunk.py
    - apps/api/app/services/node_mapper.py
    - apps/api/app/services/parsers/pdf_pipeline.py
    - apps/api/app/services/parsers/markdown_pipeline.py
    - apps/api/app/services/parsers/excel_parser.py
    - apps/api/app/services/pipeline.py
    - apps/api/tests/conftest.py
    - apps/api/tests/test_node_mapper.py
    - apps/api/tests/test_parsers.py
  modified:
    - apps/api/pyproject.toml
    - apps/api/app/core/config.py

key-decisions:
  - "PyMuPDFReader metadata uses 'source' key (not 'page_label') in current version -- node mapper handles both"
  - "pymupdf added as explicit dependency (required by llama-index-readers-file PyMuPDFReader at runtime)"
  - "OpenAI mocking patches aget_text_embedding and aget_text_embedding_batch on the class for zero-cost unit tests"

patterns-established:
  - "IngestionPipeline without vector_store: run pipeline to get nodes, map to chunks table schema manually"
  - "Mock OpenAI fixtures: monkeypatch embedding and chat to return deterministic results"
  - "Node mapper pattern: extract metadata into first-class columns, strip internal keys from JSONB"

requirements-completed: [INGEST-01, INGEST-02, INGEST-03, INGEST-04]

# Metrics
duration: 7min
completed: 2026-03-18
---

# Phase 2 Plan 01: Core Parsing Pipeline Summary

**LlamaIndex IngestionPipeline for PDF/Markdown parsing, custom Excel parser with gpt-4o-mini summaries, node-to-chunk mapper, and 12 passing unit tests**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-18T07:48:35Z
- **Completed:** 2026-03-18T07:56:15Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Installed LlamaIndex ecosystem (core, readers, embeddings) plus openpyxl, pymupdf, python-multipart
- Built three file parsers: PDF (PyMuPDFReader), Markdown (MarkdownNodeParser), Excel (openpyxl + LLM summary)
- Created node-to-chunk mapper that converts LlamaIndex nodes to chunks table schema with tiktoken token counting
- All 12 tests passing with mocked OpenAI (no real API calls in unit tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies, create data models, Supabase service client, and test fixtures** - `540ef97` (feat)
2. **Task 2: Build node mapper, parsers, pipeline dispatcher with tests (TDD)**
   - RED: `f05f56f` (test) - failing tests for node mapper and parsers
   - GREEN: `420e79f` (feat) - implementation passing all tests

## Files Created/Modified
- `apps/api/pyproject.toml` - Added LlamaIndex, openpyxl, pymupdf, python-multipart dependencies
- `apps/api/app/core/config.py` - Extended Settings with openai_api_key and supabase_service_role_key
- `apps/api/app/core/supabase.py` - Supabase service client factory (service role key bypasses RLS)
- `apps/api/app/models/document.py` - Pydantic models: DocumentCreate, DocumentResponse, DocumentListResponse
- `apps/api/app/models/chunk.py` - Pydantic model: ChunkRecord matching chunks table schema
- `apps/api/app/services/node_mapper.py` - LlamaIndex BaseNode to chunks table dict mapper
- `apps/api/app/services/parsers/pdf_pipeline.py` - PDF ingestion via PyMuPDFReader + SentenceSplitter + OpenAIEmbedding
- `apps/api/app/services/parsers/markdown_pipeline.py` - Markdown ingestion via MarkdownNodeParser + SentenceSplitter + OpenAIEmbedding
- `apps/api/app/services/parsers/excel_parser.py` - Excel ingestion via openpyxl + gpt-4o-mini summary + OpenAIEmbedding
- `apps/api/app/services/pipeline.py` - Pipeline factory dispatching by file_type
- `apps/api/tests/conftest.py` - Shared fixtures: sample files, mock OpenAI embedding/chat
- `apps/api/tests/test_node_mapper.py` - 5 tests for node mapper
- `apps/api/tests/test_parsers.py` - 6 tests for parsers and pipeline dispatcher

## Decisions Made
- PyMuPDFReader in current version uses `source` metadata key instead of `page_label` -- node mapper supports both for forward compatibility
- Added `pymupdf` as explicit dependency since llama-index-readers-file requires it at runtime but doesn't pull it transitively
- Mock fixtures patch at the class method level (aget_text_embedding, aget_text_embedding_batch) for reliable interception

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing pymupdf dependency**
- **Found during:** Task 2 (PDF pipeline tests)
- **Issue:** PyMuPDFReader imports `fitz` which requires the `pymupdf` package, not pulled as transitive dependency
- **Fix:** Added `pymupdf` via `uv add pymupdf`
- **Files modified:** apps/api/pyproject.toml, apps/api/uv.lock
- **Verification:** PDF pipeline tests pass
- **Committed in:** 420e79f (Task 2 commit)

**2. [Rule 1 - Bug] PyMuPDFReader metadata key mismatch**
- **Found during:** Task 2 (PDF pipeline tests)
- **Issue:** Research documented `page_label` as metadata key but current PyMuPDFReader uses `source` for page number
- **Fix:** Updated node_mapper to check both `page_label` and `source`; added `source` and `total_pages` to strip keys
- **Files modified:** apps/api/app/services/node_mapper.py, apps/api/tests/test_node_mapper.py, apps/api/tests/test_parsers.py
- **Verification:** All node mapper and PDF pipeline tests pass
- **Committed in:** 420e79f (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes were necessary for correct PDF pipeline operation. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required

The plan requires `OPENAI_API_KEY` for production use (embeddings and Excel LLM summaries). Unit tests mock all OpenAI calls so no key is needed for testing. Users should add `OPENAI_API_KEY=sk-...` to their `.env` file.

## Next Phase Readiness
- All parsers ready for integration with upload endpoints (Plan 02)
- Pipeline dispatcher ready for background task processing
- Test fixtures established for future integration tests

---
## Self-Check: PASSED

All 11 created files verified on disk. All 3 task commits (540ef97, f05f56f, 420e79f) verified in git log.

---
*Phase: 02-document-ingestion*
*Completed: 2026-03-18*
