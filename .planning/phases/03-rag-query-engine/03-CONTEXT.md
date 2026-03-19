# Phase 3: RAG Query Engine - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Investors can ask natural language questions and receive streamed, source-cited AI answers that draw from the full pitch corpus. Covers vector retrieval, reranking, prompt construction, streaming delivery, and query persistence. The frontend Q&A interface (inline viewer integration) is Phase 4; confidence scoring and HITL routing is Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Citation format
- Hybrid approach: brief inline tags like [Pitch Deck] woven into answer text, plus an expandable "Sources" section at the bottom with full details (document name, section label, section number)
- Section-level granularity: cite by document name + section/slide name (e.g., [Pitch Deck, Market Size], [Financial Model, Revenue Projections]) — maps to existing section_number metadata
- Citation data includes document_id + section_number so Phase 4 can make them clickable links to the viewer
- Multi-document answers cross-reference naturally — AI weaves sources into a coherent narrative rather than grouping by document

### Retrieval strategy
- Retrieve top 20 chunks via pgvector cosine similarity, then rerank to top 10 using Cohere Rerank API
- LLM-based reranking via Cohere for improved relevance (over-fetch then filter)
- Metadata-boosted retrieval: boost certain chunk_types based on question intent (e.g., financial keywords boost table chunks)
- Pure vector similarity as the base, with metadata boosting as an additional signal

### Streaming & API design
- WebSocket for token streaming (chosen for future Phase 8 Live Mode compatibility)
- Two-step flow: POST /api/v1/query creates a query record and returns query_id, then WS /api/v1/query/{id}/stream delivers tokens
- DEMO_USER_ID bypass for auth (same pattern as document endpoints — Phase 6 adds real auth)
- Query history persisted to a queries table: question, answer, citations (JSONB), timestamps — feeds Phase 5 HITL and Phase 7 analytics

### Answer behavior
- LLM: GPT-4o for answer generation (OpenAI already in the stack for embeddings, strong cross-doc reasoning)
- Tone: Professional and concise — direct, factual, like a well-prepared CFO answering due diligence questions
- Length: 2-4 sentences by default, expanding for complex multi-document questions
- Unanswerable questions: Honest with scope — clearly states what's not in the materials, suggests related info that IS available. No hallucination, no strict refusal

### Claude's Discretion
- WebSocket library choice (FastAPI native WebSocket, or socket.io, etc.)
- Exact Cohere reranking parameters (model, relevance_score threshold)
- Metadata boosting heuristics (which keywords map to which chunk_types)
- System prompt engineering (exact wording within the professional/concise tone)
- Queries table schema details (indexes, constraints)
- Error handling for LLM failures mid-stream

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product vision & requirements
- `docs/prd.md` — Full PRD with Q&A module specs, RAG pipeline architecture vision
- `.planning/REQUIREMENTS.md` — QA-01 (natural language Q&A with citations), QA-03 (cross-section awareness), QA-04 (real-time streaming)

### Database schema
- `supabase/migrations/00001_init.sql` — Chunks table with embedding vector(1536), section_number, page_number, chunk_type, metadata JSONB — the retrieval source

### Existing ingestion pipeline
- `apps/api/app/services/pipeline.py` — How chunks are created (format dispatch, node mapping)
- `apps/api/app/services/node_mapper.py` — Chunk metadata structure (section_number, page_number, chunk_type) — citations must reference these fields
- `apps/api/app/models/chunk.py` — ChunkRecord schema with chunk_type enum

### Prior phase context
- `.planning/phases/01-foundation-demo-content/01-CONTEXT.md` — HNSW index decision, cross-reference strategy for multi-doc reasoning
- `.planning/phases/02-document-ingestion/02-CONTEXT.md` — OpenAI text-embedding-3-small, structure-aware chunking, LLM summaries for Excel sheets

### Frontend patterns
- `apps/web/lib/api.ts` — Existing API client pattern to extend with query functions
- `apps/web/app/documents/page.tsx` — Existing polling/status pattern (reference for streaming UX)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/api/app/core/supabase.py` — get_service_client() for database access (retrieval queries)
- `apps/api/app/core/config.py` — Settings with openai_api_key already configured
- `apps/api/app/models/chunk.py` — ChunkRecord with chunk_type, section_number, page_number
- `apps/web/lib/api.ts` — API client pattern (extend with query/stream functions)
- `apps/web/components/ui/` — shadcn/ui components (Card, Badge, Skeleton) for streaming UI

### Established Patterns
- FastAPI with pydantic models for request/response validation
- API versioning under /api/v1/ with APIRouter
- Next.js rewrites proxy /api/v1/* to FastAPI backend
- Supabase service role client for privileged database operations
- OpenAI SDK already configured via settings.openai_api_key in os.environ

### Integration Points
- `chunks` table: retrieval queries read embeddings + content + metadata from here
- New `queries` table: stores question, answer, citations for Phase 5/7
- `documents` table: citation display needs document title, which comes from here
- WebSocket endpoint needs to be added to FastAPI app in main.py
- Frontend needs new query API client functions and a streaming text component

</code_context>

<specifics>
## Specific Ideas

- The demo content has intentional cross-references between documents — the retrieval + reranking pipeline must surface chunks from multiple docs for questions like "How does the revenue model support the market size claims?"
- Financial questions should reliably surface table chunks from the Excel financial model (metadata boosting helps here)
- The 3:44 stat (avg VC deck review time) from the pitch deck should be a reliably retrievable key talking point
- Two-step query flow (POST + WS) enables the queries table to be written before streaming starts, giving a clean audit trail

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-rag-query-engine*
*Context gathered: 2026-03-19*
