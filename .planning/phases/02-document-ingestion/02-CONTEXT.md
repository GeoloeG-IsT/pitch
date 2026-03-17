# Phase 2: Document Ingestion - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Founders can upload PDF, text, and Excel documents that are parsed with structure preserved, chunked intelligently, embedded, and stored for retrieval. Includes a founder-facing content management interface for uploading, organizing, and re-uploading documents with automatic RAG index refresh.

</domain>

<decisions>
## Implementation Decisions

### PDF & text parsing
- Support both PDF upload (primary path, proves the pipeline) and markdown/text upload (secondary, simpler format)
- PDF pitch deck: page = slide boundary. Each page becomes one section (section_number = page_number)
- Text documents (memos, architecture): heading-based splitting. Split on H1/H2/H3 headings, preserving heading hierarchy in chunk metadata
- Tables extracted from PDFs as structured data (rows/columns), stored as chunk_type='table'
- Both PDF and markdown parsers needed — PDF is the demo-credible path, markdown is the easy fallback

### Excel extraction
- Sheet-per-chunk: each worksheet becomes one chunk
- Chunk content = LLM-generated natural language summary (for embedding similarity) + raw table data stored in metadata JSONB (for precise number retrieval)
- Evaluated values only — store computed numbers, not formulas. RAG answers with actual values, not formula logic
- LLM (Claude or GPT) generates summaries at ingestion time — understands financial context for quality descriptions

### Chunking & embedding
- Embedding model: OpenAI text-embedding-3-small (1536 dimensions, matches existing schema)
- Structure-aware chunking: heading-based sections as primary chunks
- Large sections (>~500 tokens) split into sub-chunks with ~50 token overlap
- Tables get their own dedicated chunk (chunk_type='table'), separate from surrounding text
- Processing is async with status tracking: upload returns immediately, document status goes pending→processing→ready

### Claude's Discretion
- PDF parsing library choice (PyMuPDF, pdfplumber, unstructured, etc.) — researcher should evaluate
- Excel parsing library choice (openpyxl vs alternatives) — researcher should evaluate
- Upload & management UX design (drag-and-drop, progress indicators, document list layout)
- Exact token counting implementation
- Error handling and retry logic for failed parses
- Background job mechanism (FastAPI BackgroundTasks vs task queue)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product vision & requirements
- `docs/prd.md` — Full PRD with feature specs. Key sections: Document Ingestion module, RAG pipeline architecture
- `.planning/REQUIREMENTS.md` — INGEST-01 through INGEST-04, MGMT-01, MGMT-02 define this phase's requirements

### Database schema
- `supabase/migrations/00001_init.sql` — Documents table (status, file_type, metadata), Chunks table (content, embedding vector(1536), section_number, page_number, chunk_type, metadata JSONB, token_count), RLS policies

### Demo content (test data)
- `content/output/pitch-deck.pdf` — 12-15 slide pitch deck PDF for ingestion testing
- `content/output/financial-model.xlsx` — Excel financial model with TAM/SAM/SOM, revenue projections
- `content/output/investment-memo.pdf` — Investment memo PDF
- `content/output/technical-architecture.pdf` — Technical architecture PDF
- `content/pitch-deck/` — Markdown source files (secondary ingestion path)
- `content/investment-memo/` — Markdown source
- `content/technical-architecture/` — Markdown source

### Prior phase context
- `.planning/phases/01-foundation-demo-content/01-CONTEXT.md` — Schema decisions (flat chunks with metadata, HNSW index, chunk_type enum), cross-reference strategy for RAG stress-testing

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/api/app/core/config.py` — Settings with Supabase URL/key via pydantic-settings, .env resolved from project root
- `apps/api/app/api/v1/health.py` — Existing API route pattern to follow for new endpoints
- `content/build_docs.py`, `content/financial-model/build.py` — Build scripts showing how demo content is generated (useful for understanding source format)

### Established Patterns
- FastAPI with pydantic-settings for configuration
- Supabase client for database access (URL + key in .env)
- API versioning under `/api/v1/`
- RLS policies on all tables — backend needs service role key for write operations

### Integration Points
- `documents` table: new upload endpoint writes here, sets status='pending'
- `chunks` table: parser pipeline writes chunks with embeddings here
- Document status column (pending→processing→ready→error) drives async processing flow
- Phase 3 (RAG Query Engine) will read from chunks table — embedding quality and chunk structure directly affect retrieval quality

</code_context>

<specifics>
## Specific Ideas

- Demo content has intentional cross-references between documents for RAG stress-testing — the parser must preserve enough context in chunk metadata for Phase 3 to do multi-doc reasoning
- Financial model uses hybrid pricing (SaaS base + usage overage) — Excel summary should capture this so RAG can explain the business model
- The 3:44 stat (avg VC deck review time) appears in the pitch deck — should be reliably retrievable as a key talking point

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-document-ingestion*
*Context gathered: 2026-03-17*
