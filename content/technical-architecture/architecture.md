# Technical Architecture: Zeee Pitch Zooo

**Version:** 0.1.0
**Last Updated:** March 2026

---

## System Overview

Zeee Pitch Zooo is built as a Turborepo monorepo with a Next.js frontend and FastAPI backend, using Supabase for database, authentication, and vector search. The architecture is designed for a single-tenant proof of concept with a clear path to multi-tenant production scaling.

The system ingests heterogeneous pitch materials (PDFs, Excel spreadsheets, markdown documents), processes them through a multimodal RAG pipeline, and serves an interactive document experience where investors can ask natural language questions and receive streaming, source-cited answers.

For business context on why this architecture matters, see Investment Memo, Section: The Product. For the user-facing experience this architecture enables, see Pitch Deck, Slides 4-6: How It Works and The Experience.

---

## Architecture Diagram

```
                         +------------------+
                         |   User Browser   |
                         +--------+---------+
                                  |
                                  | HTTPS
                                  v
                    +-------------+-------------+
                    |     Next.js Frontend      |
                    |     (App Router, RSC)      |
                    |  - Smart Document Viewer   |
                    |  - Inline Q&A UI           |
                    |  - Streaming Responses      |
                    +-------------+-------------+
                                  |
                                  | /api/v1/* (proxy rewrite)
                                  v
                    +-------------+-------------+
                    |     FastAPI Backend        |
                    |     (Python, async)        |
                    |  - Document ingestion API  |
                    |  - Query processing API    |
                    |  - Confidence scoring      |
                    +------+-------+------+-----+
                           |       |      |
              +------------+   +---+---+  +----------+
              |                |       |             |
              v                v       v             v
     +--------+------+  +-----+--+ +--+------+ +----+-------+
     | Document      |  |Supabase| |Supabase | | LLM API    |
     | Parser        |  |  Auth  | |pgvector | | (GPT-4o /  |
     | - PDF extract |  |  +RLS  | | Vector  | |  Claude)   |
     | - Excel parse |  +--------+ | Store   | +------------+
     | - MD process  |             +---+------+
     +--------+------+                 |
              |                        |
              v                        v
     +--------+------+         +------+--------+
     | Chunker       |         | PostgreSQL    |
     | - Section-    |         | - users       |
     |   aware split |         | - documents   |
     | - Metadata    |         | - chunks      |
     |   extraction  |         | - (analytics) |
     +--------+------+         +---------------+
              |
              v
     +--------+------+
     | Embedder      |
     | - OpenAI      |
     |   text-emb-   |
     |   3-small     |
     | - 1536 dims   |
     +---------------+


     QUERY FLOW:
     +---------+    +-----------+    +----------+    +----------+
     | User    +--->| Embedding +--->| Vector   +--->| LLM      |
     | Question|    | (query)   |    | Search   |    | Generate |
     +---------+    +-----------+    | (top-K)  |    | + Stream |
                                     +----------+    +----------+
```

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js (App Router) | Server components, streaming support, modern React patterns |
| Backend | FastAPI (Python) | Async request handling, auto-generated API docs, ML ecosystem access |
| Database | Supabase (PostgreSQL + pgvector) | Auth + RLS + vector search unified in one managed platform |
| Monorepo | Turborepo + pnpm | Build caching, task orchestration, dependency management |
| Python Mgmt | uv | Fast, deterministic dependency resolution and virtual environments |
| Embeddings | OpenAI text-embedding-3-small | 1536 dimensions, cost-effective at $0.003/query, high quality |
| LLM | GPT-4o / Claude | Multimodal understanding, streaming output, strong reasoning |
| Vector Index | pgvector HNSW | Better recall than IVFFlat at our scale, no training required |

Infrastructure costs are factored into the burn rate analysis in Financial Model, Tab: Burn Rate & Runway. The AI inference cost per query ($0.003) is documented in Financial Model, Tab: Assumptions.

---

## RAG Pipeline

The retrieval-augmented generation pipeline is the technical core of Zeee Pitch Zooo. It handles the full lifecycle from document upload through query response.

### Document Ingestion

The ingestion pipeline processes three primary document types, each requiring specialized parsing:

**PDF Parsing:**
- Per-slide extraction for pitch decks (detecting page boundaries as slide transitions)
- Section-aware splitting for long-form documents (memos, architecture docs)
- Table detection and structured extraction
- Image and figure captioning for multimodal content

**Excel Parsing:**
- Sheet-aware extraction using openpyxl
- Table structure preservation including headers, formulas, and cell relationships
- Named range and sheet cross-reference resolution
- Numeric formatting preservation for financial data

**Markdown/Text Parsing:**
- Heading-based section detection
- Code block and table extraction
- Link and cross-reference identification
- Metadata extraction from frontmatter

### Chunking Strategy

Documents are split into chunks using a section-aware strategy that preserves document structure:

- **Chunk boundaries** align with document sections (headings, slide breaks, sheet boundaries)
- **Chunk size** targets 500-1000 tokens with overlap for context continuity
- **Metadata per chunk:**
  - `source_document_id`: links back to the parent document
  - `section_number`: sequential position within the document
  - `page_number`: original page/slide/sheet number
  - `chunk_type`: text, table, heading, code, or mixed
  - `section_title`: the heading or sheet name this chunk belongs to
  - Custom metadata via JSONB for extensibility

### Embedding and Storage

Chunks are embedded using OpenAI's text-embedding-3-small model (1536 dimensions) and stored in Supabase's pgvector extension:

- **Embedding model:** text-embedding-3-small selected for cost-performance balance
- **Vector storage:** pgvector column on the chunks table
- **Index type:** HNSW (Hierarchical Navigable Small World) for approximate nearest neighbor search
  - HNSW chosen over IVFFlat: better recall without training, acceptable build time at our scale
  - Parameters: `m=16, ef_construction=64` (tunable based on corpus size)
- **Cost:** Approximately $0.003 per query at current OpenAI pricing (see Financial Model, Tab: Assumptions)

### Query Processing

The query pipeline transforms a natural language question into a streaming, cited response:

1. **Question embedding:** User question is embedded using the same model (text-embedding-3-small)
2. **Vector similarity search:** Top-K nearest chunks retrieved via pgvector cosine similarity
3. **Cross-document retrieval:** Search spans ALL document chunks, not scoped to a single document -- this enables cross-document reasoning (e.g., asking about financials while reading the deck)
4. **Context assembly:** Retrieved chunks are assembled into a prompt with source metadata
5. **LLM generation:** GPT-4o or Claude generates a response with inline source citations
6. **Streaming delivery:** Response is streamed to the frontend via Server-Sent Events for real-time display

The cross-document reasoning capability is a key differentiator described in Pitch Deck, Slide 7: Technology. It enables queries like "What's the CAC payback period?" to pull data from the financial model even when the investor is reading the pitch deck.

---

## Data Model

The data model is intentionally simple -- three core tables plus Supabase Auth for user management. This flat structure optimizes for the PoC phase while maintaining a clear upgrade path.

### Core Tables

**Users:** Linked to Supabase Auth, storing profile information and role assignments. The `role` field distinguishes founders (who upload and manage content) from investors (who view and query). Supabase Auth handles authentication; the users table extends it with application-specific data.

**Documents:** Represents uploaded pitch materials. Each document belongs to a user (founder) and tracks its processing status through the ingestion pipeline. The `metadata` JSONB column stores document-type-specific information (slide count for decks, sheet names for Excel, section headers for text documents).

**Chunks:** The core retrieval unit. Each chunk belongs to a document and contains the text content, embedding vector, and rich metadata for source attribution. The embedding column uses pgvector's `vector(1536)` type with an HNSW index for efficient similarity search.

Document types supported include PDF pitch decks, Excel financial models, and markdown/text documents (see Pitch Deck, Slide 5: How It Works for the user-facing upload flow).

### Schema

```sql
-- Users: linked to Supabase Auth
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT NOT NULL,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'founder' CHECK (role IN ('founder', 'investor', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documents: uploaded pitch materials
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'xlsx', 'md', 'txt')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chunks: parsed document sections with embeddings
CREATE TABLE chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536),
    section_number INTEGER,
    page_number INTEGER,
    chunk_type TEXT NOT NULL DEFAULT 'text' CHECK (chunk_type IN ('text', 'table', 'heading', 'code', 'mixed')),
    section_title TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HNSW index for vector similarity search
CREATE INDEX chunks_embedding_idx ON chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
```

---

## Trust Layer

The trust layer ensures AI response quality through confidence scoring and human-in-the-loop validation. Every AI response passes through a confidence assessment before being displayed to the investor.

### Confidence Scoring

Confidence is calculated based on three factors:

1. **Retrieval relevance:** Cosine similarity score between the query embedding and retrieved chunks. Higher similarity indicates the retrieved context is more relevant to the question.
2. **Source coverage:** Whether the answer is supported by retrieved sources. Answers that closely paraphrase source material score higher than those requiring inference.
3. **Consistency:** Whether multiple retrieved chunks agree on the answer. Cross-corroboration increases confidence.

### Display Tiers

| Tier | Score Range | Indicator | Behavior |
|------|------------|-----------|----------|
| High | 0.85 - 1.0 | Green | Auto-published, displayed immediately |
| Medium | 0.60 - 0.84 | Yellow | Published with confidence indicator visible |
| Low | 0.00 - 0.59 | Red | Queued for founder review (HITL validation) |

### HITL Validation Dashboard

Founders access a validation dashboard where low-confidence responses are queued for review. For each flagged response, the founder can:

- **Approve:** Accept the AI's answer as accurate
- **Edit:** Modify the answer while keeping the source citations
- **Reject:** Remove the response entirely and optionally provide a manual answer
- **Improve sources:** Add or update document content to improve future responses

Trust requirements and risk mitigation strategy are detailed in Investment Memo, Section: Risk Factors and Mitigations.

---

## Security Model

### Authentication

Supabase Auth handles all user authentication with support for:
- Email/password login
- OAuth providers (Google, GitHub) for convenience
- Magic link authentication for investor access

### Authorization (Row-Level Security)

PostgreSQL Row-Level Security (RLS) policies enforce access control at the database level:

- **Founders** can read/write their own documents and chunks
- **Investors** can read documents shared with them (via shareable links)
- **Admin** has full access for support and debugging
- All policies are enforced at the database level, preventing bypass even if application logic has bugs

### Data Isolation

- No data leaves the platform -- all AI processing happens server-side
- Document content and embeddings are stored in Supabase, not sent to external analytics
- Shareable links include revocation capability
- Session tokens expire according to Supabase Auth defaults

---

## Scalability Considerations

### Current Architecture (PoC)

The proof-of-concept architecture is single-tenant, optimized for simplicity and speed of development:

- Single Supabase project with shared tables
- Namespaced by `user_id` foreign key (multi-tenant ready)
- Stateless FastAPI backend (horizontally scalable)
- pgvector HNSW index (scales to millions of vectors without retraining)

### Path to Production Scale

| Concern | Current | Production Path |
|---------|---------|----------------|
| Multi-tenancy | user_id namespace | Already in schema; add RLS policies per tenant |
| Vector scale | Single HNSW index | Partition by user_id; pgvector scales to millions |
| Connection pooling | Supabase default | Supabase handles via PgBouncer |
| Backend scaling | Single instance | Stateless design enables horizontal scaling |
| Embedding throughput | Sequential | Batch processing with async workers |
| LLM rate limits | Single API key | Multiple keys, request queuing, fallback models |

### Performance Targets

| Metric | Target | Approach |
|--------|--------|----------|
| Query latency (p50) | < 2 seconds | HNSW index, connection pooling, streaming |
| Query latency (p99) | < 5 seconds | Timeout handling, cached embeddings |
| Document ingestion | < 30 seconds | Async processing, chunked upload |
| Concurrent users | 50+ | Stateless backend, Supabase connection pooling |

See Financial Model, Tab: Assumptions for the infrastructure cost assumptions underlying these performance targets, including AI inference costs per query and expected query volumes per investor session.
