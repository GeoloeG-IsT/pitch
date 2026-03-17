# Stack Research

**Domain:** AI-powered interactive pitch/due diligence platform with multimodal RAG
**Researched:** 2026-03-17
**Confidence:** HIGH (core stack) / MEDIUM (emerging libraries)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.x | Frontend framework + API routes | Current stable (16.1). App Router is mature, Turbopack stable for dev. Handles SSR for shareable investor links, API routes for lightweight endpoints. Project constraint already specifies Next.js. |
| React | 19.x | UI library | Ships with Next.js 16. Server Components reduce client bundle for document viewer. Suspense boundaries for streaming AI responses. |
| FastAPI | 0.115+ | Python RAG backend API | De facto standard for Python AI/ML APIs. Native async for concurrent RAG queries, Pydantic validation, automatic OpenAPI docs. Every RAG tutorial and production system uses FastAPI. |
| Supabase | hosted | Database + Auth + Storage + Vector | One platform gives you Postgres, pgvector, auth with RBAC, file storage, and Row Level Security. Eliminates 4+ separate services. Free tier handles PoC scale. Solo founder's best friend. |
| pgvector (via Supabase) | 0.8.x | Vector similarity search | Built into Supabase Postgres. No separate vector DB needed at PoC scale (<1M vectors). HNSW indexing for fast retrieval. Keeps vectors co-located with relational data (users, documents, answers). |
| Claude API (Anthropic) | latest | LLM for Q&A generation + confidence scoring | Best reasoning quality for nuanced financial/technical Q&A. Native PDF understanding via vision. Long context (200K tokens) handles full pitch decks. You're already building with Claude. |
| Vercel AI SDK | 6.x | Frontend streaming + LLM integration | `streamText()` + `useChat()` gives production-ready streaming UI in <50 lines. Provider-agnostic (works with Claude, GPT, Gemini). Built for Next.js. Handles SSE complexity. |

### Document Processing Pipeline

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| LlamaParse | v2 | PDF + slide deck extraction | Best accuracy for complex layouts, tables, and images in pitch decks. 10K free credits/month covers PoC. "Cost-effective" tier at 3 credits/page is viable. Handles the hard part of multimodal RAG. |
| Unstructured | 0.16+ | Fallback document processing + chunking | Better semantic chunking than LlamaParse. Use for text documents and as fallback. Open source, runs locally. Provides labeled chunks (Title, NarrativeText) for better retrieval. |
| openpyxl | 3.1+ | Excel file parsing | Standard Python library for .xlsx files. Lightweight, no AI credits needed. Read cell values, formulas, sheet names. Pair with Claude for financial table understanding. |
| python-pptx | 1.0+ | PowerPoint extraction (if needed) | Direct slide content extraction. Lighter than LlamaParse for simple decks. Use as complement when slide-level granularity is needed. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| LlamaIndex | 0.12+ | RAG orchestration + retrieval | Document indexing, hybrid search, reranking. Use its index structures over pgvector for retrieval pipeline. Better retrieval accuracy than raw vector search. |
| Better Auth | 1.x | Authentication framework | New standard replacing Auth.js/NextAuth. TypeScript-first, built-in RBAC with roles/teams, framework-agnostic. Auth.js team has joined Better Auth. Use this over Auth.js for new projects. |
| Tailwind CSS | 4.x | Styling | Rapid UI development. Utility-first is fastest for solo dev. No component library lock-in. |
| shadcn/ui | latest | UI component library | Copy-paste components (not npm dependency). Full control, consistent design. Pairs with Tailwind. Build the document viewer and dashboard fast. |
| Zustand | 5.x | Client state management | Lightweight, no boilerplate. Perfect for document viewer state (scroll position, active Q&A, panel toggles). Simpler than Redux for PoC scope. |
| Zod | 3.x | Schema validation | Shared validation between frontend forms and API contracts. Works with Better Auth, React Hook Form, and server actions. |
| React Hook Form | 7.x | Form handling | Founder dashboard forms (upload, edit answers, manage access). Performant, minimal re-renders. |

### Infrastructure

| Technology | Purpose | Why |
|------------|---------|-----|
| Vercel | Frontend hosting | Zero-config Next.js deployment. Preview deployments for demo iterations. Free tier sufficient for PoC. |
| Railway or Render | Python backend hosting | Simple container deployment for FastAPI. ~$5/month. Docker-based, easy CI/CD. Railway has better DX for solo devs. |
| Supabase (hosted) | Database + Auth + Storage + Vector | Single managed service. Free tier: 500MB DB, 1GB storage, 50K auth users. Eliminates ops burden. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| TypeScript | Type safety (frontend) | Non-negotiable for Next.js projects. Catches integration bugs early. |
| Python 3.12+ | RAG backend language | Type hints, async/await, match statements. Best AI/ML ecosystem. |
| Ruff | Python linting + formatting | Replaces flake8, black, isort. 10-100x faster. Single tool. |
| Biome | JS/TS linting + formatting | Replaces ESLint + Prettier. Faster, less config. |
| Docker Compose | Local dev environment | Run Supabase local + FastAPI + Next.js together. Reproducible setup. |
| pnpm | Package manager | Faster installs, strict dependency resolution, disk efficient. |

## Installation

```bash
# Frontend (Next.js)
pnpm create next-app@latest pitch-frontend --typescript --tailwind --app --src-dir
cd pitch-frontend
pnpm add @ai-sdk/anthropic ai zustand zod react-hook-form @hookform/resolvers
pnpm add better-auth @better-auth/next
pnpm add -D @biomejs/biome

# UI components (shadcn/ui - copy-paste, not installed)
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card dialog input textarea tabs badge scroll-area

# Python backend (RAG pipeline)
pip install fastapi uvicorn[standard] python-multipart
pip install anthropic llama-index llama-parse
pip install unstructured[pdf] openpyxl python-pptx
pip install supabase vecs  # Supabase Python client + vector helper
pip install ruff  # Development
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Supabase (auth + DB + vector) | Separate Postgres + Pinecone + Auth.js | If you need >10M vectors or enterprise-grade vector search. Not at PoC scale. |
| Better Auth | Auth.js v5 | If you're already deep in an Auth.js codebase. For new projects, Better Auth is now the recommended path (Auth.js team joined Better Auth). |
| LlamaParse | Docling (IBM) | If you need fully open-source, on-premise processing. Docling has 97.9% accuracy on complex tables but is 1GB+ install and slower. LlamaParse is faster and good enough for PoC. |
| pgvector (via Supabase) | Pinecone | If you need managed vector search at scale (>10M vectors) or don't want to manage indexing. pgvector at PoC scale (<100K vectors) is equivalent performance at zero extra cost. |
| Claude API | OpenAI GPT-4o | If you need multimodal embeddings (OpenAI has them, Anthropic doesn't yet). For Q&A quality on financial/technical content, Claude is superior. Use OpenAI embeddings alongside Claude for generation if needed. |
| FastAPI | Next.js API routes only | If your RAG pipeline is trivially simple. Python ecosystem for AI/ML is irreplaceable -- LlamaIndex, Unstructured, pandas all require Python. Don't fight it. |
| Vercel AI SDK | Direct Anthropic SDK (TS) | If you need fine-grained control over streaming. Vercel AI SDK abstracts provider differences and gives you `useChat()` for free. Use direct SDK only for custom streaming patterns. |
| Railway | Fly.io | If you need edge deployment or more regions. Railway has simpler DX for Python services. Both work fine for PoC. |
| LlamaIndex | LangChain | If you need complex agent workflows (LangGraph). For document retrieval focus, LlamaIndex has better indexing and 35% higher retrieval accuracy. LangChain is over-engineered for this use case. |
| Zustand | Jotai / Redux Toolkit | If you need atomic state (Jotai) or middleware-heavy state (Redux). Zustand is the sweet spot for PoC-scale client state. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| LangChain (as primary framework) | Over-abstracted for retrieval-focused RAG. Constant breaking changes. Abstractions hide what's happening, making debugging harder. "LangChain tax" is real -- you fight the framework more than you build. | LlamaIndex for retrieval pipeline + direct Claude API for generation |
| MongoDB Atlas Vector Search | Adding a NoSQL database when you already have Postgres is unnecessary complexity. Vector search capabilities lag behind pgvector. | pgvector via Supabase |
| Chroma (embedded) | Fine for local prototyping, not for deployed web app. No managed hosting. Data persistence is fragile. | pgvector via Supabase (production-ready, managed, co-located with relational data) |
| Clerk (auth) | $25/month after 10K MAUs. Vendor lock-in. Overkill for 2-role RBAC (founder + investor). | Better Auth (free, self-hosted, built-in RBAC) |
| Firebase / Firestore | Google ecosystem lock-in. No native vector search. Poor fit for complex queries needed in RAG. Supabase gives you Postgres power with Firebase-like DX. | Supabase |
| Prisma ORM | Adds complexity between you and Postgres. Supabase client + raw SQL (via Supabase JS/Python) is simpler for this use case. Schema migrations are handled by Supabase dashboard or raw SQL. | Supabase client libraries + Drizzle ORM if you must have an ORM |
| Express.js (for Python backend replacement) | The RAG ecosystem is Python. LlamaIndex, Unstructured, pandas, numpy -- all Python. Don't try to replicate this in Node.js. | FastAPI |
| Create React App | Dead project. Next.js is the React meta-framework. | Next.js 16 |
| Webpack | Turbopack is now stable in Next.js 16 for dev. Webpack is legacy. | Turbopack (built into Next.js) |

## Stack Patterns by Variant

**If you need OpenAI embeddings (recommended for vector search quality):**
- Use `text-embedding-3-small` from OpenAI for embeddings
- Use Claude for answer generation
- Because Claude doesn't have a standalone embedding model, and OpenAI's embedding models are excellent and cheap ($0.02/1M tokens)

**If you want to avoid OpenAI entirely:**
- Use Voyage AI embeddings (best quality alternative)
- Or use `llama-index` local embeddings (`sentence-transformers`) but quality is lower
- Because some projects have single-vendor requirements

**If investor demo needs real-time "live pitch" mode:**
- Use Supabase Realtime for WebSocket pub/sub
- Founder and investor share a session, questions appear in real-time
- Because Supabase Realtime is included free and requires zero additional infrastructure

**If you outgrow Supabase free tier:**
- Supabase Pro is $25/month with 8GB DB, 100GB storage
- This handles the next 6+ months post-PoC easily
- Because vertical scaling on Supabase is seamless

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Next.js 16.x | React 19.x | Ships together. Don't install React separately. |
| Better Auth 1.x | Next.js 16.x | First-class support. Needs Next.js 16+ for stable proxy support. |
| Vercel AI SDK 6.x | Next.js 16.x | Built for App Router. Server Actions + streaming. |
| LlamaIndex 0.12+ | Python 3.12+ | Ensure Python 3.12+ for best async performance. |
| FastAPI 0.115+ | Pydantic 2.x | FastAPI now requires Pydantic v2. Don't install Pydantic v1. |
| Supabase JS v2 | Next.js 16.x | Use `@supabase/ssr` package for server-side auth in App Router. |

## Architecture Overview (Stack Perspective)

```
[Investor Browser]                    [Founder Browser]
       |                                     |
  [Next.js 16 on Vercel]              [Next.js 16 on Vercel]
  - Document viewer                   - Validation dashboard
  - AI Q&A streaming (Vercel AI SDK)  - Content management
  - Better Auth (session)             - Better Auth (founder role)
       |                                     |
       +------ API Routes (Next.js) ---------+
       |                                     |
  [Supabase]                          [FastAPI on Railway]
  - Postgres (users, docs, answers)   - RAG pipeline
  - pgvector (embeddings)             - Document ingestion
  - Auth (Better Auth adapter)        - LlamaIndex retrieval
  - Storage (uploaded files)          - Claude API (generation)
  - Realtime (live pitch mode)        - Confidence scoring
```

## Key Architecture Decision: Two Services, Not Three

Keep it to **Next.js (frontend + light API)** and **FastAPI (RAG backend)** only. Don't add a third service (e.g., separate auth service, separate vector DB, message queue). For a solo founder on a 2-4 week timeline:

- Next.js handles: auth flows, investor-facing pages, founder dashboard, light CRUD
- FastAPI handles: document ingestion, embedding generation, retrieval, LLM calls, confidence scoring
- Supabase handles: everything stateful (DB, vectors, files, auth state, realtime)

## Sources

- [Next.js Blog - Latest releases](https://nextjs.org/blog) -- Next.js 16.1 confirmed as current stable
- [Vercel AI SDK Docs](https://ai-sdk.dev/docs/introduction) -- v6.x with streaming, RAG middleware
- [Supabase pgvector Docs](https://supabase.com/docs/guides/database/extensions/pgvector) -- pgvector 0.8.x built-in
- [Auth.js joins Better Auth - GitHub Discussion](https://github.com/nextauthjs/next-auth/discussions/13252) -- Auth.js team migration confirmed
- [Better Auth Docs](https://better-auth.com/) -- RBAC, multi-tenancy, Next.js integration
- [LlamaParse v2 Pricing](https://www.llamaindex.ai/pricing) -- 10K free credits/month, tiered pricing
- [PDF Extraction Benchmark 2025](https://procycons.com/en/blogs/pdf-data-extraction-benchmark/) -- Docling vs Unstructured vs LlamaParse comparison
- [pgvector vs Pinecone 2026](https://www.tigerdata.com/blog/pgvector-is-now-as-fast-as-pinecone-at-75-less-cost) -- pgvector competitive at small scale
- [FastAPI RAG tutorials](https://www.analyticsvidhya.com/blog/2026/03/building-a-rag-api-with-fastapi/) -- Production patterns
- [Anthropic Python SDK](https://github.com/anthropics/anthropic-sdk-python) -- Streaming, async support
- [LlamaIndex vs LangChain 2025](https://latenode.com/blog/platform-comparisons-alternatives/automation-platform-comparisons/langchain-vs-llamaindex-2025-complete-rag-framework-comparison) -- LlamaIndex better for retrieval-focused RAG

---
*Stack research for: AI-powered interactive pitch/due diligence platform*
*Researched: 2026-03-17*
