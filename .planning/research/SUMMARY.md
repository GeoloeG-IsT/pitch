# Project Research Summary

**Project:** Zeee Pitch Zooo
**Domain:** AI-powered interactive pitch / due diligence platform with multimodal RAG
**Researched:** 2026-03-17
**Confidence:** MEDIUM-HIGH

## Executive Summary

Zeee Pitch Zooo sits at an unprecedented intersection of three mature product categories — AI presentation tools (Gamma, Beautiful.ai), virtual data rooms (DocSend, Ansarada), and AI document Q&A (NotebookLM, ChatPDF) — and no existing product combines all three. The recommended approach is a two-service architecture: a Next.js 16 frontend handling auth, investor-facing pages, and the founder dashboard, paired with a Python FastAPI backend handling all RAG operations. Supabase provides the unified data layer (Postgres, pgvector, auth, storage) and eliminates four separate services. This is a proven stack for AI-powered document applications and is achievable by a solo founder in 2–4 weeks if scope is disciplined.

The core product innovation is confidence-scored, source-cited AI Q&A built on top of a polished scrollable pitch viewer, with a human-in-the-loop (HITL) workflow that lets founders validate low-confidence answers before investors see them. This combination is genuinely unique — no competitor has it. The critical path is the RAG pipeline: everything else depends on document ingestion working correctly. The single biggest risk is spending too much time perfecting retrieval and not enough time on the investor-facing UI and demo content that actually convinces VCs.

The PoC must deliver a vertical slice quickly: PDF ingestion → chunking → embedding → retrieval → streamed answer with citations → confidence badge. Once that slice works end-to-end, everything else is an enhancement. Multimodal RAG (Excel, charts) and live pitch mode are real differentiators but belong in v1.x and v2+ respectively. The dogfood content — Zeee Pitch Zooo's own pitch materials used as demo data — must be created in parallel with Phase 1 engineering, not as a last-minute task.

## Key Findings

### Recommended Stack

The stack is centered on Next.js 16 + FastAPI + Supabase, with LlamaParse for document ingestion and LlamaIndex for RAG orchestration. The Vercel AI SDK handles frontend streaming with minimal boilerplate (`streamText()` + `useChat()`). Better Auth replaces Auth.js as the new standard for TypeScript-first RBAC. Claude API is preferred over OpenAI for answer generation due to superior reasoning on financial/technical content, but OpenAI's `text-embedding-3-small` is recommended for embeddings since Claude lacks a standalone embedding model.

**Core technologies:**
- Next.js 16 + React 19: Frontend framework — App Router is mature, handles SSR for shareable investor links, pairs with Vercel AI SDK for streaming
- FastAPI 0.115+: Python RAG backend — de facto standard for AI/ML APIs, native async, automatic OpenAPI docs that serve as the API contract
- Supabase (hosted): Unified data layer — Postgres + pgvector + Auth + Storage in one service, free tier covers PoC scale
- Claude API (Anthropic): Answer generation — best reasoning quality for financial/technical Q&A, 200K context handles full pitch decks
- OpenAI text-embedding-3-small: Embeddings — $0.02/1M tokens, excellent quality, used since Claude lacks embeddings
- LlamaParse v2: Document parsing — best accuracy for complex layouts and tables in pitch decks, 10K free credits/month
- LlamaIndex 0.12+: RAG orchestration — 35% higher retrieval accuracy vs LangChain for retrieval-focused use cases
- Better Auth 1.x: Authentication — TypeScript-first, built-in RBAC, Auth.js team has migrated to it
- Vercel AI SDK 6.x: Frontend streaming — production-ready streaming UI in under 50 lines

**What to avoid:** LangChain (over-abstracted, constant breaking changes), Clerk auth ($25/month, overkill for 2-role RBAC), Chroma (no managed hosting for deployed apps), Prisma ORM (unnecessary layer over Supabase client).

See `.planning/research/STACK.md` for full alternatives analysis and version compatibility matrix.

### Expected Features

The product has a clear MVP core and a well-scoped v1.x extension set. No competitor combines AI document Q&A with presentation-grade viewing and due diligence features — the unique positioning is the confidence-scored, source-cited Q&A layer on a polished pitch viewing experience with founder-controlled answer quality.

**Must have (table stakes) — PoC demo:**
- PDF ingestion and RAG pipeline — the entire product gates on this working
- Scrollable web-native document viewer — Gamma's card UX is the benchmark; static PDF embeds feel dated
- AI Q&A with inline source citations — NotebookLM trained users to expect this; answers without sources are untrustworthy
- Confidence scoring with visual indicators — unique differentiator; green/yellow/orange states, not raw numbers
- Auth + secure shareable links — minimum credibility for sensitive financial content
- Founder content upload and management — get materials into the system
- Mobile-responsive viewer — investors review on iPads and phones

**Should have (competitive) — v1.x after validation:**
- HITL founder validation dashboard — the core trust mechanism; low-confidence answers queue for founder review
- Viewer analytics (who viewed, time-per-section) — DocSend made this table stakes for fundraising
- Async exploration mode — investor explores solo with auto-published high-confidence answers
- Excel/financial model ingestion — critical for financial Q&A but significantly harder than PDF text
- Evidence packs (exportable source bundles) — maps to how investors compile due diligence memos

**Defer (v2+):**
- Live pitch mode with real-time Q&A — WebSocket infrastructure is significant scope
- Behavioral analytics / investor intent scoring — needs data volume to be meaningful
- CRM integrations — stub endpoints for demo credibility, build later
- Image/chart understanding in RAG — computationally expensive multimodal AI
- Full VDR security suite (watermarking, DRM) — post-product-market-fit

**Anti-features to avoid:** AI-generated deck creation (different product), real-time collaborative editing (creation feature, not consumption), audio/video overviews (tangential, computationally expensive).

See `.planning/research/FEATURES.md` for competitor analysis table and full dependency graph.

### Architecture Approach

The architecture follows a Backend-for-Frontend (BFF) pattern: Next.js API routes act as an authenticated gateway to the Python FastAPI backend, handling auth enforcement and SSE stream proxying so the Python backend never needs auth logic. All RAG logic lives in Python — Next.js is intentionally a thin proxy. This prevents the anti-pattern of coupling retrieval logic to the frontend and preserves the ability to iterate RAG quality independently. The two-service structure (Next.js on Vercel, FastAPI on Railway) keeps deployment simple for a solo developer.

**Major components:**
1. Document Viewer (Next.js) — scrollable pitch content as web sections, inline Q&A anchors, source citation display
2. Inline Q&A Panel (Next.js + SSE consumer) — accepts investor questions, streams AI answers, shows confidence badges
3. Founder Dashboard (Next.js, role-protected) — review HITL queue, approve/edit/reject answers, manage uploads
4. Next.js BFF (API routes) — auth enforcement, SSE stream proxy to FastAPI, CORS elimination
5. Ingestion Pipeline (FastAPI background task) — LlamaParse parsing, semantic chunking with modality tags, OpenAI embedding generation, pgvector storage
6. RAG Query Engine (FastAPI) — vector retrieval, reranking, prompt construction, streaming Claude/OpenAI completion
7. HITL / Confidence Router (FastAPI) — composite confidence scoring (retrieval score + groundedness check), auto-publish vs queue routing
8. Supabase data layer — Postgres (users, docs, answers, queue), pgvector (embeddings), Storage (original files)

**Key patterns:**
- SSE (not WebSockets) for Q&A streaming — unidirectional, simpler, auto-reconnects, FastAPI `StreamingResponse` supports natively
- Modality-tagged chunks — each chunk carries `text | table | chart | slide_title` metadata for richer citations
- Composite confidence scoring — retrieval similarity score + LLM groundedness check + answer specificity, weighted toward retrieval quality
- Re-runnable ingestion pipeline — design for re-ingestion from day one; bad parsing or chunking should be fixable by re-running

See `.planning/research/ARCHITECTURE.md` for data flow diagrams, project structure, and scaling considerations.

### Critical Pitfalls

1. **PDF table destruction during parsing** — Standard parsers (PyPDF2, PyMuPDF) destroy financial table structure. Use LlamaParse or Docling for layout-aware extraction. Validate with actual financial tables (cap table, revenue projections) as the very first ingestion test. If numbers in RAG responses don't match source documents, this is the cause.

2. **Naive chunking destroys financial reasoning context** — Fixed-size token chunking splits tables across chunks and orphans metrics from their labels. Use document-structure-aware chunking: one chunk per slide, entire tables as single chunks, Excel sheets as logical sections. Studies show 80% of RAG failures trace back to chunking, not retrieval or generation.

3. **LLM confidence scores are uncalibrated** — LLMs produce high-confidence hallucinations routinely. Do NOT rely on LLM self-reported confidence alone. Build composite signal: retrieval similarity score + groundedness check (does the answer reference only retrieved content?) + answer specificity. Start conservative (queue more for review), calibrate against known-correct demo content.

4. **Overengineering the RAG pipeline at the expense of the demo** — RAG is endlessly tweakable and technically fascinating. Hard time-box: 1 week maximum for the pipeline PoC. Ship the simplest thing that works. The investor-facing viewer and demo content quality matter more to VCs than retrieval benchmarks.

5. **Demo content created under pressure at the end** — The platform's demo IS its own pitch materials. Weak pitch deck + cool tool = VC concludes the tool makes weak pitches look weak. Create the 12–15 slide pitch deck, financial model, and 2–3 supporting documents in parallel with Phase 1 engineering, not after.

6. **Next.js / Python integration becomes API plumbing spaghetti** — Design the API contract upfront with 5–6 endpoints maximum. FastAPI generates OpenAPI specs automatically — use these as the living contract. CORS issues are eliminated entirely by the BFF pattern.

See `.planning/research/PITFALLS.md` for UX pitfalls, security mistakes, performance traps, and a "looks done but isn't" verification checklist.

## Implications for Roadmap

The architecture research provides an explicit suggested build order. The roadmap should follow it closely, with content creation as a parallel workstream.

### Phase 1: Foundation + API Contract

**Rationale:** Everything gates on a working infrastructure skeleton with a defined API contract. CORS issues and integration ambiguity must be eliminated before any feature work. Starting with the contract also prevents the "two separate apps that don't talk well" pitfall.
**Delivers:** Running Next.js skeleton + FastAPI skeleton with health check, Supabase/pgvector wired up, basic data models (users, documents, chunks), 5–6 endpoint API contract documented, Docker Compose for local dev, Better Auth baseline, role-based route groups
**Addresses:** Founder content upload (scaffolding), auth + secure sharing (skeleton)
**Avoids:** Next.js/Python integration spaghetti (Pitfall 7), security gaps from auth-free dev

**Research flag:** Standard patterns — well-documented Next.js + FastAPI setup, skip research-phase.

### Phase 2: Document Ingestion Pipeline

**Rationale:** The RAG pipeline is entirely gated on correct ingestion. Chunking and parsing decisions made here flow downstream to everything else. Getting this right before building retrieval prevents the most expensive re-work (re-embedding all documents).
**Delivers:** File upload endpoint, LlamaParse PDF parsing integration, document-structure-aware chunking (slide-per-chunk, table-as-unit), OpenAI embedding generation, pgvector storage, ingestion status tracking (async background task with progress)
**Addresses:** PDF ingestion (P1), Excel/financial model ingestion (P2 — validate Excel parsing here even if full financial Q&A comes later)
**Avoids:** PDF table destruction (Pitfall 1), naive chunking (Pitfall 2), synchronous ingestion blocking UI (Performance Trap)

**Research flag:** May need phase research for LlamaParse + Docling integration details and optimal chunking strategies for financial documents.

### Phase 3: RAG Query Engine + Basic Q&A UI

**Rationale:** Build the engine before the polished viewer. The scrollable viewer's value comes from inline Q&A — there's no point building the UI container without the engine that powers it. SSE streaming must be implemented from day one (not as a polish step) because a blank 5–10 second wait kills the demo.
**Delivers:** Vector retrieval from pgvector, prompt construction with top-k chunks, Claude streaming completion, SSE stream through BFF to browser, basic Q&A UI component with typing indicator, source citation display
**Addresses:** AI Q&A with citations (P1 core), confidence scoring (P1 differentiator — initial implementation)
**Avoids:** No streaming UX (Performance Trap), RAG logic in frontend (Anti-Pattern 1)

**Research flag:** Standard RAG patterns — well-documented with LlamaIndex + FastAPI + SSE. Skip research-phase unless confidence scoring implementation needs deeper investigation.

### Phase 4: Smart Document Viewer

**Rationale:** The document viewer is the investor-facing product surface. Build it once the Q&A engine works so inline Q&A integration is real, not mocked. This phase is the highest-visibility work — it's what VCs actually see and interact with.
**Delivers:** Scrollable pitch content rendering (sections, not slides), inline Q&A integration anchored to sections, source citation panel, confidence badge UI (green/yellow/orange visual indicators, not raw numbers), mobile-responsive layout, pre-populated suggested questions
**Addresses:** Scrollable document viewer (P1), professional visual design (P1), mobile responsiveness (P1), inline contextual Q&A (differentiator)
**Avoids:** Showing raw chunk text as citations (UX Pitfall), confidence scores as raw numbers (UX Pitfall), blank Q&A input without suggested questions (UX Pitfall)

**Research flag:** Standard Next.js component patterns. Skip research-phase. Focus effort on UX quality, not technical research.

### Phase 5: HITL + Confidence Routing

**Rationale:** HITL is the core trust differentiator but depends on a working Q&A pipeline to calibrate against. Build confidence routing after basic Q&A is working so real answer data informs threshold calibration. This is the phase where the composite confidence signal (retrieval + groundedness + specificity) gets tuned against the actual dogfood demo content.
**Delivers:** Composite confidence scoring logic, answer lifecycle (generated → scored → routed → published), HITL answer queue in Postgres, founder review dashboard (approve/edit/reject), auto-publish for high-confidence answers, founder notification when queue has items
**Addresses:** HITL founder validation (P2), confidence-scored responses (P1 differentiator fully implemented), async exploration mode (P2 enabled)
**Avoids:** LLM confidence miscalibration (Pitfall 3), HITL queue always empty or always full, published answers missing founder attribution

**Research flag:** Confidence calibration approach needs validation against actual demo content. May benefit from a brief research spike on groundedness checking methods.

### Phase 6: Auth, RBAC, Shareable Links + Analytics

**Rationale:** Auth can be developed against hardcoded users during earlier phases, then applied as a layer. This minimizes auth boilerplate slowing down core feature work. Viewer analytics requires real users accessing the platform, so it logically follows auth.
**Delivers:** Role-based route protection (founder vs investor), investor invite links (token-based with configurable expiry), shareable link revocation, per-viewer tracking and time-per-section analytics, founder dashboard analytics view, secure document access control on all endpoints
**Addresses:** Auth + secure sharing (P1 — fully hardened), viewer analytics (P2), evidence packs (P2 — can be added here as an extension of citation infrastructure)
**Avoids:** No access control on document endpoints (Security Mistake), shared links that don't expire (Security Mistake)

**Research flag:** Better Auth + Next.js 16 RBAC integration is well-documented. Standard patterns — skip research-phase.

### Phase 7: Demo Polish + Dogfood Content

**Rationale:** The demo IS the product at PoC stage. A technically complete platform with weak pitch materials or a rough demo flow fails to convert VCs. This phase explicitly allocates time for content quality and happy-path curation.
**Delivers:** Polished 12–15 slide pitch deck for Zeee Pitch Zooo, financial model with realistic projections (TAM/SAM/SOM, revenue model, burn rate), 2–3 supporting documents (competitive landscape, technical architecture, team), curated "top 5 investor questions" with verified excellent answers, end-to-end demo flow validated, error states and edge cases handled
**Addresses:** Demo content quality (Pitfall 6), "looks done but isn't" checklist items
**Avoids:** Placeholder content at demo time, financial model with obviously fake numbers, demo breaking on likely investor questions

**Research flag:** No technical research needed. This is a content + QA phase.

### Phase Ordering Rationale

- **Infrastructure before features:** The API contract and data models in Phase 1 eliminate the most expensive integration failures; everything builds on this.
- **Ingestion before retrieval:** You cannot test vector search without vectors in the database. Chunking decisions made in Phase 2 cannot be changed cheaply later.
- **Engine before viewer:** Building the Q&A UI around a working engine produces a real product; building the UI first produces a prototype with mocked data that must be redone.
- **HITL after Q&A works:** Confidence threshold calibration requires real answer data. Building HITL before the pipeline produces data is guesswork.
- **Auth as a layer, not a prerequisite:** Hardcoded users unblock Phase 2–4 development without security gaps (never deploy without auth, but develop faster with stubs).
- **Content parallel to Phase 1:** Demo content must be created in parallel, not sequentially. The roadmap should treat this as a separate workstream with a hard deadline before Phase 7.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Ingestion):** LlamaParse + Docling integration details, optimal chunking strategies for financial documents, and Excel-to-structured-markdown preprocessing approach are worth a research spike before implementation
- **Phase 5 (HITL):** Groundedness checking implementation (LLM-as-judge vs embedding similarity vs explicit fact extraction) has multiple viable approaches with different accuracy/cost tradeoffs; brief research recommended

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Next.js + FastAPI + Supabase setup is extensively documented
- **Phase 3 (RAG Query):** LlamaIndex + FastAPI + SSE streaming patterns are well-established
- **Phase 4 (Viewer):** Standard Next.js component patterns; effort is UX quality, not technical research
- **Phase 6 (Auth):** Better Auth + Next.js RBAC is well-documented; straightforward implementation
- **Phase 7 (Demo Polish):** Content and QA work, no technical research needed

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core stack (Next.js, FastAPI, Supabase, Claude) is verified with official sources and production usage patterns. LlamaParse vs Docling choice has benchmark data. Better Auth migration from Auth.js confirmed via GitHub discussion. |
| Features | MEDIUM-HIGH | Competitor analysis based on marketing pages and third-party reviews (medium confidence sources). Core feature prioritization is logically grounded and internally consistent. No user research exists yet — validate assumptions with actual VCs early. |
| Architecture | MEDIUM-HIGH | Architecture patterns (BFF, SSE, pgvector) are well-documented with production examples. Confidence scoring composite approach is reasonable but threshold values require empirical calibration against real demo content. |
| Pitfalls | HIGH | Multiple independent sources converge on the same pitfalls (PDF parsing, chunking, LLM confidence calibration). Chunking failure rate (80% of RAG failures) cited with specific accuracy benchmarks (0.47 naive vs 0.79 semantic). Well-validated concerns. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Confidence threshold calibration:** The 0.8 threshold for HITL routing is a starting point only. Must be empirically tuned against the actual Zeee Pitch Zooo demo content during Phase 5. No universal threshold exists — this is per-content-corpus.
- **Excel parsing approach:** The research identifies Excel as a first-class problem but the optimal preprocessing pipeline (openpyxl → markdown tables → LLM summarization vs direct Excel RAG) needs validation with real financial model content before committing to an approach in Phase 2.
- **Embedding model choice:** Research recommends OpenAI `text-embedding-3-small` as the baseline, but Voyage AI is flagged as a higher-quality alternative if avoiding OpenAI entirely is a requirement. Confirm vendor preference before Phase 2.
- **Section-aware context mapping:** The inline contextual Q&A (asking about what you're currently reading) requires mapping document sections to their corresponding embeddings. This is architecturally noted but implementation details need working out in Phase 3/4.
- **VC user research:** Feature prioritization assumes what VCs want based on competitor analysis. Validate with 2–3 actual VC conversations before Phase 7 demo polish to ensure the dogfood pitch materials resonate.

## Sources

### Primary (HIGH confidence)
- [Next.js Blog](https://nextjs.org/blog) — Next.js 16.1 confirmed as current stable
- [Vercel AI SDK Docs](https://ai-sdk.dev/docs/introduction) — v6.x streaming, RAG middleware
- [Supabase pgvector Docs](https://supabase.com/docs/guides/database/extensions/pgvector) — pgvector 0.8.x built-in
- [Auth.js joins Better Auth — GitHub Discussion](https://github.com/nextauthjs/next-auth/discussions/13252) — Auth.js team migration confirmed
- [Better Auth Docs](https://better-auth.com/) — RBAC, multi-tenancy, Next.js integration
- [DocSend pitch deck analytics](https://www.docsend.com/solutions/startup-fundraising/) — viewer analytics as table stakes
- [Enterprise RAG: Common Pitfalls (Fram)](https://wearefram.com/blog/enterprise-rag/) — pitfall validation
- [Benchmarking Hallucination Detection (Cleanlab)](https://cleanlab.ai/blog/rag-tlm-hallucination-benchmarking/) — LLM confidence calibration
- [Human-in-the-Loop AI in Document Workflows (Parseur)](https://parseur.com/blog/hitl-best-practices) — HITL patterns

### Secondary (MEDIUM confidence)
- [PDF Extraction Benchmark 2025](https://procycons.com/en/blogs/pdf-data-extraction-benchmark/) — Docling vs Unstructured vs LlamaParse comparison
- [pgvector vs Pinecone 2026](https://www.tigerdata.com/blog/pgvector-is-now-as-fast-as-pinecone-at-75-less-cost) — pgvector competitive at small scale
- [LlamaIndex vs LangChain 2025](https://latenode.com/blog/platform-comparisons-alternatives/automation-platform-comparisons/langchain-vs-llamaindex-2025-complete-rag-framework-comparison) — LlamaIndex better for retrieval-focused RAG
- [Building Production RAG Systems in 2026](https://brlikhon.engineer/blog/building-production-rag-systems-in-2026-complete-architecture-guide) — architecture patterns
- [Streaming APIs with FastAPI and Next.js](https://sahansera.dev/streaming-apis-python-nextjs-part1/) — SSE implementation
- [Gamma AI features](https://gamma.app/products/presentations) — viewer UX benchmark
- [NotebookLM review](https://effortlessacademic.com/notebook-lm-googles-academic-ai-tool/) — Q&A citation patterns
- [Hands-on RAG Over Excel Sheets](https://blog.dailydoseofds.com/p/hands-on-rag-over-excel-sheets) — Excel RAG approach

### Tertiary (LOW confidence, needs validation)
- [Interactpitch Product Hunt listing](https://www.producthunt.com/products/interactpitch-2) — competitor feature assessment
- [Datasite vs Intralinks comparison](https://dataroom-providers.org/blog/datasite-vs-intralinks/) — VDR feature landscape
- [AI tools for venture capital 2026](https://www.affinity.co/guides/vc-ai-tools) — market context

---
*Research completed: 2026-03-17*
*Ready for roadmap: yes*
