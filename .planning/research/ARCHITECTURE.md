# Architecture Research

**Domain:** AI-powered interactive pitch/due diligence platform with multimodal RAG
**Researched:** 2026-03-17
**Confidence:** MEDIUM-HIGH

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                       Frontend (Next.js)                            │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Document  │  │ Inline    │  │ Founder      │  │ Auth / RBAC  │  │
│  │ Viewer    │  │ Q&A Panel │  │ Dashboard    │  │ (Auth.js)    │  │
│  └─────┬────┘  └─────┬─────┘  └──────┬───────┘  └──────┬───────┘  │
│        │              │               │                 │          │
├────────┴──────────────┴───────────────┴─────────────────┴──────────┤
│                     Next.js API Routes (BFF)                       │
│         SSE streaming proxy  |  Auth middleware  |  RBAC           │
├────────────────────────────────────────────────────────────────────┤
│                                HTTP                                │
├────────────────────────────────────────────────────────────────────┤
│                     Python Backend (FastAPI)                       │
│  ┌──────────────┐  ┌───────────────┐  ┌────────────────────────┐  │
│  │ Ingestion    │  │ RAG Query     │  │ HITL / Confidence      │  │
│  │ Pipeline     │  │ Engine        │  │ Router                 │  │
│  └──────┬───────┘  └───────┬───────┘  └────────┬───────────────┘  │
│         │                  │                    │                  │
│  ┌──────┴───────┐  ┌──────┴────────┐  ┌───────┴───────────────┐  │
│  │ Doc Parser   │  │ Retriever +   │  │ Answer Queue          │  │
│  │ (Docling)    │  │ Reranker      │  │ (approval workflow)   │  │
│  └──────────────┘  └───────────────┘  └───────────────────────┘  │
├────────────────────────────────────────────────────────────────────┤
│                        Data Layer                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ PostgreSQL   │  │ pgvector     │  │ Object Storage         │  │
│  │ (app data)   │  │ (embeddings) │  │ (original files)       │  │
│  └──────────────┘  └──────────────┘  └────────────────────────┘  │
├────────────────────────────────────────────────────────────────────┤
│                     External Services                              │
│  ┌──────────────┐  ┌──────────────┐                               │
│  │ OpenAI API   │  │ OpenAI       │                               │
│  │ (embeddings) │  │ (chat/LLM)   │                               │
│  └──────────────┘  └──────────────┘                               │
└────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Document Viewer** | Render pitch content as smart scrollable page, highlight sections, show inline Q&A anchors | Next.js React components, MDX or structured JSON rendering |
| **Inline Q&A Panel** | Accept investor questions, stream AI answers with citations, show confidence badges | React + SSE consumer, `@microsoft/fetch-event-source` |
| **Founder Dashboard** | Review low-confidence answers, approve/edit/reject, manage uploads | React admin UI, protected by role |
| **Auth / RBAC** | Login, role assignment (founder/investor), shareable link tokens | Auth.js (NextAuth v5) + JWT + invite tokens |
| **Next.js BFF** | Proxy API calls to Python backend, enforce auth, stream SSE responses | Next.js API routes / Route Handlers |
| **Ingestion Pipeline** | Parse uploaded docs, chunk, embed, store vectors | FastAPI background tasks, Docling, OpenAI embeddings |
| **RAG Query Engine** | Retrieve relevant chunks, rerank, generate answer with citations | LlamaIndex retriever + OpenAI chat completion |
| **HITL / Confidence Router** | Score answer confidence, route high-confidence to auto-publish, low-confidence to queue | Custom logic on LLM confidence + retrieval scores |
| **PostgreSQL** | Users, roles, answers, approval queue, document metadata | PostgreSQL 16 via SQLAlchemy/asyncpg |
| **pgvector** | Vector similarity search for embeddings | pgvector extension in same PostgreSQL instance |
| **Object Storage** | Store original uploaded files (PDFs, Excel, docs) | Local filesystem for PoC, S3-compatible for prod |

## Recommended Project Structure

```
zeee-pitch-zooo/
├── frontend/                    # Next.js application
│   ├── app/                     # App Router
│   │   ├── (auth)/              # Auth pages (login, register)
│   │   ├── (investor)/          # Investor-facing routes
│   │   │   ├── pitch/[id]/      # Smart document viewer + Q&A
│   │   │   └── explore/[token]/ # Shareable link entry point
│   │   ├── (founder)/           # Founder-facing routes
│   │   │   ├── dashboard/       # Validation dashboard
│   │   │   ├── upload/          # Content management
│   │   │   └── answers/         # Answer review queue
│   │   └── api/                 # BFF API routes
│   │       ├── auth/            # Auth.js handlers
│   │       ├── query/           # Proxy to RAG backend (SSE)
│   │       └── documents/       # Document management proxy
│   ├── components/              # Shared React components
│   │   ├── viewer/              # Document viewer components
│   │   ├── qa/                  # Q&A interface components
│   │   └── ui/                  # Design system primitives
│   └── lib/                     # Utilities, hooks, types
│
├── backend/                     # Python FastAPI application
│   ├── app/
│   │   ├── api/                 # FastAPI route handlers
│   │   │   ├── query.py         # Q&A endpoint (SSE streaming)
│   │   │   ├── ingest.py        # Document upload + processing
│   │   │   └── answers.py       # HITL answer management
│   │   ├── core/                # Configuration, dependencies
│   │   ├── ingestion/           # Document processing pipeline
│   │   │   ├── parsers.py       # Docling-based parsing
│   │   │   ├── chunkers.py      # Smart chunking strategies
│   │   │   └── embedders.py     # Embedding generation
│   │   ├── rag/                 # RAG query pipeline
│   │   │   ├── retriever.py     # Vector search + reranking
│   │   │   ├── generator.py     # LLM answer generation
│   │   │   └── confidence.py    # Confidence scoring logic
│   │   ├── models/              # SQLAlchemy ORM models
│   │   └── services/            # Business logic layer
│   └── tests/
│
├── shared/                      # Shared types/contracts (optional)
├── docker-compose.yml           # PostgreSQL + pgvector
└── Makefile                     # Dev workflow commands
```

### Structure Rationale

- **Monorepo with two apps:** Next.js and Python are distinct runtimes. Keeping them in one repo simplifies deployment and versioning for a solo developer while keeping concerns cleanly separated.
- **App Router grouping by role:** `(investor)` and `(founder)` route groups map directly to RBAC roles, making middleware-based access control straightforward.
- **Backend organized by capability:** `ingestion/`, `rag/`, and `api/` separate document processing, query execution, and HTTP handling. This prevents the common mistake of tangling ingestion logic with query logic.
- **BFF pattern in Next.js:** API routes proxy to the Python backend. This avoids CORS issues, centralizes auth enforcement in one place, and lets the frontend stream SSE without direct Python exposure.

## Architectural Patterns

### Pattern 1: Backend-for-Frontend (BFF) with SSE Proxying

**What:** Next.js API routes act as an authenticated gateway to the Python backend. For Q&A queries, the BFF opens an SSE connection to FastAPI and forwards the stream to the browser.

**When to use:** Always for this project. The BFF ensures auth is enforced server-side before any request reaches the Python backend.

**Trade-offs:** Adds a network hop (browser -> Next.js -> FastAPI). For a PoC this is negligible. The benefit is that the Python backend never needs to handle auth — it trusts the BFF.

```typescript
// app/api/query/route.ts
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();
  const backendStream = await fetch(`${BACKEND_URL}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, userId: session.user.id }),
  });

  // Forward the SSE stream
  return new Response(backendStream.body, {
    headers: { "Content-Type": "text/event-stream" },
  });
}
```

### Pattern 2: Confidence-Based HITL Routing

**What:** Every RAG answer gets a confidence score (0.0-1.0) computed from retrieval similarity scores + LLM self-assessment. High-confidence answers (>0.8) auto-publish. Low-confidence answers (<0.8) queue for founder review. This is the core product differentiator.

**When to use:** For every Q&A interaction.

**Trade-offs:** Setting the threshold too high means everything queues (bad async experience). Setting it too low risks publishing wrong answers. Start at 0.8, make it configurable per-founder.

```python
# backend/app/rag/confidence.py
@dataclass
class ScoredAnswer:
    answer: str
    confidence: float  # 0.0 - 1.0
    sources: list[SourceCitation]
    retrieval_scores: list[float]

def compute_confidence(retrieval_scores: list[float], llm_self_score: float) -> float:
    avg_retrieval = sum(retrieval_scores) / len(retrieval_scores)
    # Weighted: retrieval quality matters more than LLM self-assessment
    return 0.6 * avg_retrieval + 0.4 * llm_self_score

def route_answer(answer: ScoredAnswer, threshold: float = 0.8) -> str:
    if answer.confidence >= threshold:
        return "auto_publish"
    return "queue_for_review"
```

### Pattern 3: Multimodal Chunking with Modality Tags

**What:** During ingestion, each document is parsed into chunks that carry modality metadata (text, table, chart, slide). This metadata is stored alongside the embedding and used during retrieval to provide richer citations ("See slide 4, table on revenue projections").

**When to use:** During document ingestion. Critical for the "evidence packs" feature.

**Trade-offs:** More complex ingestion pipeline, but dramatically better answer quality and citation accuracy. Docling handles most of the heavy lifting for layout detection.

```python
# backend/app/ingestion/chunkers.py
@dataclass
class Chunk:
    content: str
    modality: str  # "text" | "table" | "chart" | "slide_title"
    source_doc: str
    page_number: int
    metadata: dict  # slide number, table caption, etc.
```

## Data Flow

### Ingestion Flow (Founder uploads documents)

```
Founder uploads PDF/Excel/Doc
    |
    v
Next.js BFF (auth check, file validation)
    |
    v
FastAPI /api/ingest (receives file, saves to storage)
    |
    v
Background Task: Docling parses document
    |
    ├── PDF slides → text chunks + table chunks + image descriptions
    ├── Excel → structured table chunks with column headers
    └── Text docs → paragraph-level chunks
    |
    v
OpenAI text-embedding-3-small generates embeddings
    |
    v
pgvector stores (embedding, chunk text, modality, source metadata)
    |
    v
PostgreSQL stores document record (name, type, upload date, chunk count)
```

### Query Flow (Investor asks a question)

```
Investor types question in Q&A panel
    |
    v
Next.js BFF (auth check, rate limit)
    |
    v
FastAPI /api/query (SSE endpoint)
    |
    ├── 1. Embed the question (OpenAI embeddings)
    ├── 2. Vector search in pgvector (top-k=10 chunks)
    ├── 3. Rerank results (cross-encoder or LLM-based)
    ├── 4. Build prompt with top-5 chunks as context
    ├── 5. Stream LLM response (OpenAI GPT-4o)
    ├── 6. Compute confidence score
    └── 7. Package source citations
    |
    v
SSE stream to browser: tokens + final metadata (confidence, sources)
    |
    v
Confidence Router:
    ├── >= 0.8 → Auto-publish, visible to all investors
    └── < 0.8  → Queue for founder review, show "pending" to investor
```

### HITL Validation Flow (Founder reviews answers)

```
Founder opens Dashboard → sees queued answers
    |
    ├── Approve → answer published as-is, confidence upgraded
    ├── Edit → founder modifies answer, published with founder attribution
    └── Reject → answer hidden, optionally replaced with founder's answer
    |
    v
Published answers cached → future similar questions may hit cache
```

### Key Data Flows

1. **Document ingestion:** Upload -> Parse -> Chunk -> Embed -> Store. This is an async background task. The founder sees progress but does not wait for completion to use the platform.
2. **Real-time Q&A:** Question -> Embed -> Retrieve -> Generate -> Stream. The entire chain must feel fast (first token <2s). SSE streaming makes perceived latency much lower than actual.
3. **Answer lifecycle:** Generated -> Scored -> Routed -> (optionally reviewed) -> Published. Published answers become part of the platform's knowledge, reducing repeat LLM calls.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-10 users (PoC) | Single PostgreSQL instance, single FastAPI process, local file storage. This is the target. |
| 10-100 users | Add Redis for answer caching and rate limiting. Move file storage to S3. Add connection pooling. |
| 100-1000 users | Separate ingestion workers (Celery/ARQ). Consider dedicated vector DB (Qdrant) if pgvector becomes bottleneck. Add CDN for static pitch content. |
| 1000+ users | Multi-tenant isolation, horizontal FastAPI scaling, dedicated embedding service, full observability stack. |

### Scaling Priorities

1. **First bottleneck (LLM latency):** OpenAI API calls dominate response time. Mitigate with answer caching (same/similar questions get cached answers), streaming (masks latency), and keeping chunk context small.
2. **Second bottleneck (ingestion throughput):** Large PDFs with many tables take time to parse. Mitigate with background processing and progress indicators. Not a PoC concern.

## Anti-Patterns

### Anti-Pattern 1: Putting RAG Logic in the Frontend

**What people do:** Call OpenAI directly from Next.js API routes, embed retrieval logic in the BFF layer.
**Why it's wrong:** Tightly couples the frontend to the AI pipeline. Makes it impossible to iterate on RAG quality independently. Python has far superior tooling for RAG (LlamaIndex, Docling, etc.).
**Do this instead:** Keep ALL RAG logic in the Python backend. Next.js is a thin auth + streaming proxy.

### Anti-Pattern 2: Single Giant Chunks

**What people do:** Dump entire pages or documents into single chunks.
**Why it's wrong:** Destroys retrieval precision. When a chunk contains a full page of mixed content, the embedding becomes a blurry average of everything, matching broadly but precisely nothing.
**Do this instead:** Chunk by semantic unit (paragraph, table, slide section). Keep chunks 200-500 tokens. Use Docling's layout detection to find natural boundaries.

### Anti-Pattern 3: Skipping Confidence Scoring

**What people do:** Show every LLM answer immediately to users.
**Why it's wrong:** For a due diligence platform, a wrong answer about revenue or legal status is catastrophic. Investors will lose trust in one bad answer.
**Do this instead:** Always score confidence. Start conservative (queue more for review). Loosen thresholds as answer quality proves reliable.

### Anti-Pattern 4: Building a Custom Vector DB Abstraction

**What people do:** Create an abstraction layer to "support multiple vector databases."
**Why it's wrong:** For a solo developer on a 2-4 week timeline, this is pure waste. You will use one vector store.
**Do this instead:** Use pgvector directly. It lives in your PostgreSQL instance. Zero additional infrastructure. If you outgrow it later, migrating is straightforward because the abstraction boundary is at the retriever level.

### Anti-Pattern 5: WebSocket for Q&A Instead of SSE

**What people do:** Use WebSockets for the Q&A streaming because it feels more "real-time."
**Why it's wrong:** WebSockets are bidirectional and stateful, adding complexity for a unidirectional use case (server streams answer to client). They require connection management, heartbeats, and reconnection logic.
**Do this instead:** Use Server-Sent Events (SSE). The Q&A flow is request-response with streaming. SSE is simpler, works over standard HTTP, auto-reconnects, and FastAPI's `StreamingResponse` supports it natively.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| OpenAI API (embeddings) | `text-embedding-3-small` via Python SDK | ~$0.02/1M tokens. Batch during ingestion, single call per query. |
| OpenAI API (chat) | `gpt-4o` via Python SDK, streaming enabled | ~$2.50/1M input tokens. Stream via SSE for perceived speed. |
| PostgreSQL + pgvector | `asyncpg` + SQLAlchemy async | Single instance handles both app data and vectors for PoC. |
| Docling | Python library, runs in-process | IBM open-source. Parses PDF layout, tables, images. No external API call. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Next.js BFF <-> FastAPI | HTTP REST + SSE | BFF adds auth headers. FastAPI trusts authenticated requests. JSON request/response except SSE for streaming. |
| FastAPI API <-> Ingestion Pipeline | Background tasks (in-process) | FastAPI's `BackgroundTasks` for PoC. Upgrade to Celery/ARQ if needed. |
| FastAPI API <-> RAG Engine | Direct Python function calls | No need for message queues at PoC scale. The RAG engine is a Python module, not a separate service. |
| RAG Engine <-> pgvector | SQL via SQLAlchemy | Vector similarity search uses pgvector's `<=>` cosine distance operator. |

## Suggested Build Order

Based on component dependencies, the recommended build sequence is:

```
Phase 1: Foundation
├── PostgreSQL + pgvector setup (docker-compose)
├── FastAPI skeleton with health check
├── Next.js skeleton with Auth.js
└── Basic data models (users, documents, chunks)

Phase 2: Ingestion Pipeline
├── File upload endpoint (FastAPI)
├── Docling PDF parser integration
├── Chunking strategy implementation
├── OpenAI embedding generation
└── pgvector storage

Phase 3: RAG Query Engine
├── Vector retrieval from pgvector
├── Prompt construction with retrieved context
├── OpenAI streaming completion
├── SSE streaming through BFF to browser
└── Basic Q&A UI component

Phase 4: Smart Document Viewer
├── Structured pitch content rendering
├── Inline Q&A integration
├── Source citation display
└── Confidence badge UI

Phase 5: HITL + Confidence Routing
├── Confidence scoring logic
├── Answer queue (PostgreSQL)
├── Founder review dashboard
├── Approve/edit/reject workflow
└── Auto-publish for high-confidence

Phase 6: Auth, RBAC, Shareable Links
├── Role-based route protection
├── Investor invite links (token-based)
├── Founder vs investor UI gating
└── Secure document access control
```

**Build order rationale:**
- Database and skeletons first because everything depends on them.
- Ingestion before query because you need data in the vector store before you can retrieve from it.
- RAG query before the viewer because the viewer's value comes from inline Q&A — build the engine first, then the presentation.
- HITL after basic Q&A works because confidence routing is a refinement of the query pipeline, not a prerequisite.
- Auth last (for PoC speed) because you can develop with hardcoded users and add real auth as a layer on top. However, if the demo requires login, pull basic Auth.js setup into Phase 1.

## Sources

- [Building Production RAG Systems in 2026](https://brlikhon.engineer/blog/building-production-rag-systems-in-2026-complete-architecture-guide) - Architecture patterns overview
- [Multimodal RAG: A Hands-On Guide](https://www.datacamp.com/tutorial/multimodal-rag) - Multimodal processing approaches
- [PDF Table Extraction Showdown: Docling vs LlamaParse vs Unstructured](https://boringbot.substack.com/p/pdf-table-extraction-showdown-docling) - Document parsing benchmarks
- [LlamaIndex vs LangChain: Which One To Choose In 2026?](https://contabo.com/blog/llamaindex-vs-langchain-which-one-to-choose-in-2026/) - RAG framework comparison
- [Production RAG in 2026: LangChain vs LlamaIndex](https://rahulkolekar.com/production-rag-in-2026-langchain-vs-llamaindex/) - Framework decision guidance
- [Best Vector Databases in 2026](https://encore.dev/articles/best-vector-databases) - Vector DB comparison
- [Streaming APIs with FastAPI and Next.js](https://sahansera.dev/streaming-apis-python-nextjs-part1/) - SSE implementation pattern
- [Auth.js Role Based Access Control](https://authjs.dev/guides/role-based-access-control) - RBAC implementation guide
- [RAG-Anything: All-in-One RAG Framework](https://github.com/HKUDS/RAG-Anything) - Multimodal RAG reference implementation
- [Multimodal RAG Development: 12 Best Practices](https://www.augmentcode.com/guides/multimodal-rag-development-12-best-practices-for-production-systems) - Production best practices

---
*Architecture research for: AI-powered interactive pitch/due diligence platform with multimodal RAG*
*Researched: 2026-03-17*
