# Phase 3: RAG Query Engine - Research

**Researched:** 2026-03-19
**Domain:** RAG retrieval pipeline, LLM streaming, WebSocket real-time delivery
**Confidence:** HIGH

## Summary

Phase 3 implements the core RAG query pipeline: vector similarity search against the existing `chunks` table (pgvector HNSW index with 1536-dim OpenAI embeddings), Cohere reranking for relevance filtering, GPT-4o answer generation with streaming, and WebSocket-based token delivery to the frontend. The backend stack is already largely in place -- FastAPI with Starlette's native WebSocket support, OpenAI SDK v2.29.0, and Supabase service client for database access.

The main new dependencies are `cohere` for reranking and a Supabase RPC function for vector similarity search (PostgREST does not support pgvector operators directly). The frontend needs a WebSocket client connecting directly to FastAPI (not through Next.js rewrites, which do not support WebSocket proxying). A `queries` table stores question/answer/citation history for downstream phases.

**Primary recommendation:** Use FastAPI's built-in WebSocket support (Starlette), the OpenAI async streaming API (`AsyncOpenAI.chat.completions.create(stream=True)`), Cohere `rerank-v3.5` model, and a Supabase RPC function for cosine similarity search. Frontend WebSocket connects directly to `ws://localhost:8000` during development.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Citation format**: Hybrid inline tags like [Pitch Deck] in text + expandable "Sources" section with full details (document name, section label, section number). Section-level granularity. Citation data includes document_id + section_number for Phase 4 clickability.
- **Retrieval strategy**: Top 20 chunks via pgvector cosine similarity, rerank to top 10 via Cohere Rerank API. Metadata-boosted retrieval for chunk_type based on question intent.
- **Streaming & API design**: WebSocket for token streaming. Two-step flow: POST /api/v1/query creates query record + returns query_id, then WS /api/v1/query/{id}/stream delivers tokens. DEMO_USER_ID bypass. Query history persisted to queries table.
- **Answer behavior**: GPT-4o for generation. Professional/concise tone (CFO answering due diligence). 2-4 sentences default. Honest about unanswerable questions.

### Claude's Discretion
- WebSocket library choice (FastAPI native WebSocket vs socket.io etc.)
- Exact Cohere reranking parameters (model, relevance_score threshold)
- Metadata boosting heuristics (which keywords map to which chunk_types)
- System prompt engineering (exact wording within professional/concise tone)
- Queries table schema details (indexes, constraints)
- Error handling for LLM failures mid-stream

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| QA-01 | Investor can ask natural language questions and receive AI-generated answers with source citations | Vector retrieval + Cohere rerank + GPT-4o generation with citation-aware prompt; queries table persists Q&A with JSONB citations |
| QA-03 | AI is aware of full pitch structure and can reference related sections elsewhere in the presentation | Retrieve top 20 chunks across ALL documents (no document filter), rerank to top 10; system prompt instructs cross-document reasoning; citation format references document name + section |
| QA-04 | Answers stream in real-time (not loading spinner then full response) | WebSocket endpoint streams GPT-4o tokens via AsyncOpenAI streaming; frontend receives tokens incrementally |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| openai (Python) | 2.29.0 | GPT-4o streaming answer generation | Already installed; AsyncOpenAI provides native async streaming |
| cohere | >=5.20.0 | Reranking retrieved chunks | Official SDK; rerank-v3.5 model; simple `co.rerank()` API |
| fastapi | 0.135.1 | WebSocket endpoint + REST query endpoint | Already installed; Starlette WebSocket support built in |
| supabase (Python) | installed | Vector search via RPC, query persistence | Already installed; service role client for RLS bypass |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| starlette | 0.52.1 | WebSocket class (via FastAPI) | Already a FastAPI dependency; no separate install |
| tiktoken | installed | Token counting for context window management | Already installed via node_mapper; reuse for prompt budgeting |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| FastAPI native WebSocket | python-socketio | Socket.io adds complexity, reconnection logic, but overkill for single-connection streaming; native WebSocket is simpler and sufficient |
| Cohere Rerank | Cross-encoder reranking (sentence-transformers) | Local model avoids API cost but requires GPU; Cohere is pay-per-call with better quality |
| Direct WebSocket to FastAPI | SSE through Next.js proxy | SSE would work through Next.js rewrites but WebSocket chosen for Phase 8 Live Mode compatibility |

**Installation:**
```bash
cd apps/api && uv add cohere>=5.20.0
```

No frontend packages needed -- native WebSocket API in browser.

## Architecture Patterns

### Recommended Project Structure
```
apps/api/app/
  api/v1/
    query.py              # POST /api/v1/query + WS /api/v1/query/{id}/stream
  services/
    retrieval.py          # Vector search + Cohere rerank
    query_engine.py       # Orchestrates retrieval -> prompt -> LLM stream
  models/
    query.py              # QueryCreate, QueryResponse, Citation pydantic models

apps/web/
  lib/
    query-api.ts          # createQuery() + WebSocket stream client
  hooks/
    use-query-stream.ts   # React hook for WebSocket streaming state

supabase/migrations/
  00003_queries_table.sql       # queries table + match_chunks RPC function
```

### Pattern 1: Supabase RPC for Vector Search
**What:** PostgREST does not support pgvector operators (`<=>`), so vector search must use a Postgres function called via `client.rpc()`.
**When to use:** Every query retrieval call.
**Example:**
```sql
-- Source: https://supabase.com/docs/guides/ai/semantic-search
create or replace function match_chunks(
  query_embedding vector(1536),
  match_threshold float default 0.0,
  match_count int default 20
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  section_number int,
  page_number int,
  chunk_type text,
  metadata jsonb,
  token_count int,
  similarity float
)
language sql stable
as $$
  select
    c.id,
    c.document_id,
    c.content,
    c.section_number,
    c.page_number,
    c.chunk_type,
    c.metadata,
    c.token_count,
    1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  where 1 - (c.embedding <=> query_embedding) > match_threshold
  order by c.embedding <=> query_embedding asc
  limit least(match_count, 200);
$$;
```

Python call:
```python
result = client.rpc("match_chunks", {
    "query_embedding": query_vector,
    "match_threshold": 0.0,
    "match_count": 20,
}).execute()
chunks = result.data  # list of dicts
```

### Pattern 2: Two-Step Query Flow (REST + WebSocket)
**What:** POST creates query record, returns ID; WebSocket streams the answer.
**When to use:** Every user question.
**Example:**
```python
# POST /api/v1/query
@router.post("/query")
async def create_query(request: QueryCreate):
    client = get_service_client()
    query_record = client.table("queries").insert({
        "question": request.question,
        "user_id": DEMO_USER_ID,
        "status": "pending",
    }).execute()
    query_id = query_record.data[0]["id"]
    return {"query_id": query_id}

# WS /api/v1/query/{query_id}/stream
@router.websocket("/query/{query_id}/stream")
async def stream_query(websocket: WebSocket, query_id: str):
    await websocket.accept()
    try:
        # 1. Retrieve + rerank
        # 2. Build prompt with context
        # 3. Stream GPT-4o tokens
        # 4. Persist final answer + citations
        # 5. Close WebSocket
    except WebSocketDisconnect:
        pass
```

### Pattern 3: OpenAI Async Streaming
**What:** Use AsyncOpenAI to stream GPT-4o completions token-by-token.
**When to use:** During WebSocket answer delivery.
**Example:**
```python
# Source: https://developers.openai.com/api/docs/guides/streaming-responses
from openai import AsyncOpenAI

openai_client = AsyncOpenAI()

stream = await openai_client.chat.completions.create(
    model="gpt-4o",
    messages=messages,
    stream=True,
    temperature=0.3,
)

full_response = ""
async for chunk in stream:
    delta = chunk.choices[0].delta.content
    if delta:
        full_response += delta
        await websocket.send_json({"type": "token", "content": delta})

await websocket.send_json({"type": "done", "full_answer": full_response})
```

### Pattern 4: Cohere Reranking
**What:** Over-fetch 20 chunks, rerank to top 10 with Cohere.
**When to use:** Between vector retrieval and prompt construction.
**Example:**
```python
# Source: https://docs.cohere.com/docs/reranking-quickstart
import cohere

co = cohere.ClientV2(api_key=settings.cohere_api_key)

rerank_results = co.rerank(
    model="rerank-v3.5",
    query=question,
    documents=[chunk["content"] for chunk in retrieved_chunks],
    top_n=10,
)

reranked_chunks = [
    retrieved_chunks[result.index]
    for result in rerank_results.results
    if result.relevance_score > 0.01  # filter very low relevance
]
```

### Pattern 5: WebSocket Message Protocol
**What:** Structured JSON messages over WebSocket for frontend consumption.
**When to use:** All WebSocket communication.
```typescript
// Message types from server to client
type StreamMessage =
  | { type: "status"; status: "retrieving" | "generating" }
  | { type: "token"; content: string }
  | { type: "citations"; citations: Citation[] }
  | { type: "done"; query_id: string }
  | { type: "error"; message: string }
```

### Anti-Patterns to Avoid
- **Proxying WebSocket through Next.js rewrites:** Next.js rewrites do not support WebSocket upgrade. Connect directly to FastAPI backend.
- **Synchronous OpenAI calls in async handler:** Always use `AsyncOpenAI`, never `OpenAI()` in async FastAPI endpoints.
- **Building full response before sending:** Defeats the streaming requirement. Send tokens incrementally.
- **Filtering chunks by single document:** QA-03 requires cross-document awareness. Never filter by document_id in retrieval.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Vector similarity search | Custom distance calculations in Python | Supabase RPC + pgvector `<=>` operator | Database-level HNSW index is orders of magnitude faster |
| Reranking | Custom cross-encoder or TF-IDF reranker | Cohere Rerank API | Production-quality relevance with single API call |
| Token streaming | Manual chunking of complete responses | OpenAI `stream=True` + AsyncOpenAI | Native SDK support, handles SSE parsing internally |
| WebSocket handling | Raw TCP sockets or polling | FastAPI/Starlette WebSocket class | Built-in connection lifecycle, JSON send/receive |
| Query embedding | Custom embedding pipeline | OpenAI `text-embedding-3-small` via SDK | Same model used for chunk embeddings (consistency required) |

**Key insight:** The retrieval pipeline is glue code connecting well-supported APIs (pgvector, Cohere, OpenAI). Every component has a mature library -- the work is integration and prompt engineering, not algorithm implementation.

## Common Pitfalls

### Pitfall 1: WebSocket Connection Through Next.js Proxy
**What goes wrong:** Frontend tries `ws://localhost:3000/api/v1/query/{id}/stream` expecting Next.js to proxy. Connection fails because Next.js rewrites only support HTTP, not WebSocket upgrade.
**Why it happens:** Existing API calls go through `/api/v1/*` proxy pattern.
**How to avoid:** Frontend WebSocket connects directly to FastAPI: `ws://localhost:8000/api/v1/query/{id}/stream`. Use an environment variable (`NEXT_PUBLIC_WS_URL`) for the WebSocket base URL.
**Warning signs:** WebSocket connection immediately closes or 404s.

### Pitfall 2: Embedding Model Mismatch
**What goes wrong:** Query embedding uses a different model than chunk embeddings, producing vectors in different spaces. Cosine similarity returns garbage results.
**Why it happens:** Code uses different OpenAI model names or dimensions.
**How to avoid:** Always use `text-embedding-3-small` (1536 dimensions) for query embedding, matching the ingestion pipeline.
**Warning signs:** All similarity scores near 0 regardless of query.

### Pitfall 3: Cohere API Key Not Configured
**What goes wrong:** Reranking fails at runtime because `COHERE_API_KEY` is not in environment.
**Why it happens:** New dependency not in existing `.env` template.
**How to avoid:** Add `cohere_api_key` to `Settings` in `config.py`. Document in `.env.example`. Graceful fallback: if no Cohere key, skip reranking and use raw vector similarity order.
**Warning signs:** 500 errors on query with Cohere auth message.

### Pitfall 4: Context Window Overflow
**What goes wrong:** 10 reranked chunks with system prompt exceed GPT-4o's context window or produce degraded answers from excessive context.
**Why it happens:** Chunks vary in size; 10 chunks could be 500 tokens or 5000 tokens.
**How to avoid:** Budget tokens: system prompt (~300) + context chunks (cap at ~6000 tokens) + question (~100) + generation buffer (~2000). Truncate or drop lowest-ranked chunks if budget exceeded. Use `token_count` field from chunks table.
**Warning signs:** OpenAI returns context_length_exceeded error; answers become unfocused.

### Pitfall 5: Citation Extraction from LLM Output
**What goes wrong:** LLM generates citation tags that don't match actual source documents, or hallucinated section references.
**Why it happens:** LLM is asked to generate citations inline but doesn't have reliable metadata mapping.
**How to avoid:** Don't rely on LLM to generate citation references from scratch. Instead: (1) include chunk metadata in the prompt context with explicit labels, (2) instruct LLM to use those labels, (3) post-process the response to map inline tags back to actual chunk metadata. Send structured citation data separately via the `citations` WebSocket message.
**Warning signs:** Citations reference documents or sections that don't exist.

### Pitfall 6: WebSocket Cleanup on Error
**What goes wrong:** LLM error mid-stream leaves WebSocket in limbo. Client shows partial answer with no indication of failure.
**Why it happens:** Exception during streaming doesn't automatically notify the client.
**How to avoid:** Wrap the entire stream loop in try/except. On any error, send `{"type": "error", "message": "..."}` before closing. Update query status to "error" in database.
**Warning signs:** Frontend hangs after partial answer with no completion signal.

## Code Examples

### Query Embedding Generation
```python
# Reuse the same model as ingestion pipeline
from openai import AsyncOpenAI

async def get_query_embedding(question: str) -> list[float]:
    client = AsyncOpenAI()
    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=question,
    )
    return response.data[0].embedding
```

### Metadata Boosting Heuristic
```python
# Boost chunk_type weights based on question keywords
FINANCIAL_KEYWORDS = {"revenue", "cost", "profit", "margin", "arr", "burn", "runway",
                      "valuation", "funding", "financial", "price", "subscription"}
TABLE_KEYWORDS = {"compare", "comparison", "table", "breakdown", "numbers", "data"}

def get_chunk_type_boost(question: str) -> dict[str, float]:
    """Return boost multipliers for chunk_types based on question intent."""
    words = set(question.lower().split())
    boosts = {"text": 1.0, "table": 1.0, "heading": 0.8, "image_caption": 0.5}

    if words & FINANCIAL_KEYWORDS:
        boosts["table"] = 1.5  # Boost table chunks for financial questions
    if words & TABLE_KEYWORDS:
        boosts["table"] = 1.5

    return boosts
```

### System Prompt Template
```python
SYSTEM_PROMPT = """You are a knowledgeable investment analyst assistant for Zeee Pitch Zooo.
You answer investor due diligence questions based ONLY on the provided source materials.

INSTRUCTIONS:
- Be professional, direct, and concise -- like a well-prepared CFO answering due diligence questions.
- Default to 2-4 sentences. Expand for complex multi-document questions.
- Weave source citations naturally using [Document Name, Section] format.
- When information spans multiple documents, cross-reference and synthesize.
- If the materials don't contain the answer, say so clearly and suggest related information that IS available.
- Never hallucinate or invent information not in the sources.

SOURCE MATERIALS:
{context}

Answer the following question:"""
```

### Queries Table Schema
```sql
CREATE TABLE public.queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT,
  citations JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'streaming', 'complete', 'error')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for user query history (Phase 7 analytics)
CREATE INDEX idx_queries_user_id ON public.queries(user_id);
CREATE INDEX idx_queries_created_at ON public.queries(created_at DESC);

-- RLS
ALTER TABLE public.queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own queries"
  ON public.queries FOR SELECT
  USING (auth.uid() = user_id);
```

### Citation JSONB Structure
```json
[
  {
    "document_id": "uuid",
    "document_title": "Pitch Deck",
    "section_number": 3,
    "section_label": "Market Size",
    "chunk_id": "uuid",
    "relevance_score": 0.92
  }
]
```

### Frontend WebSocket Hook Pattern
```typescript
// hooks/use-query-stream.ts
export function useQueryStream() {
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<"idle" | "retrieving" | "generating" | "done" | "error">("idle");
  const [citations, setCitations] = useState<Citation[]>([]);

  const askQuestion = useCallback(async (question: string) => {
    setAnswer("");
    setStatus("retrieving");

    // Step 1: Create query via REST
    const res = await fetch("/api/v1/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const { query_id } = await res.json();

    // Step 2: Connect WebSocket directly to backend
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
    const ws = new WebSocket(`${wsUrl}/api/v1/query/${query_id}/stream`);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case "status":
          setStatus(msg.status);
          break;
        case "token":
          setAnswer((prev) => prev + msg.content);
          break;
        case "citations":
          setCitations(msg.citations);
          break;
        case "done":
          setStatus("done");
          break;
        case "error":
          setStatus("error");
          break;
      }
    };
  }, []);

  return { answer, status, citations, askQuestion };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| OpenAI `openai.ChatCompletion.create()` | `openai.AsyncOpenAI().chat.completions.create()` | OpenAI SDK v1.0+ (2023) | Must use new SDK pattern; old pattern removed |
| Cohere v1 API (`co.rerank()`) | Cohere v2 API (`co.rerank()` via `ClientV2`) | Cohere SDK 5.x (2024) | Use `cohere.ClientV2()` not `cohere.Client()` |
| SSE for streaming | WebSocket (project decision) | N/A | WebSocket chosen for Phase 8 Live Mode compatibility |
| LlamaIndex query engine | Direct OpenAI + pgvector | N/A (project pattern) | Project uses LlamaIndex only for ingestion; query pipeline is custom |

**Deprecated/outdated:**
- `cohere.Client()` v1 API: Use `cohere.ClientV2()` for current API
- `openai.ChatCompletion.create()`: Removed in openai SDK 1.0+; use `client.chat.completions.create()`

## Open Questions

1. **Section labels for citations**
   - What we know: Chunks have `section_number` and `page_number`. Documents have `title`.
   - What's unclear: There's no `section_label` field stored in chunks. Headings exist as separate chunks with `chunk_type="heading"` but aren't linked to their child text chunks.
   - Recommendation: For citation display, use document title + "Section {section_number}" or "Page {page_number}". Optionally, look up the nearest heading chunk by section_number for a human-readable label. This can be refined in Phase 4.

2. **Cohere API key provisioning**
   - What we know: Project uses `.env` for secrets with `pydantic-settings`.
   - What's unclear: Whether the user has a Cohere API key ready.
   - Recommendation: Add `cohere_api_key` to Settings with empty default. Implement graceful degradation: if no key, skip reranking and use raw vector similarity top-10.

3. **Token budget for context**
   - What we know: GPT-4o has 128K context window. Chunks are 500 tokens each (from ingestion settings).
   - What's unclear: Exact token budget needed to balance answer quality vs context overload.
   - Recommendation: Budget ~6000 tokens for context (roughly 10-12 chunks at 500 tokens each). This leaves ample room for system prompt and generation.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest + pytest-asyncio |
| Config file | apps/api/pyproject.toml (minimal) |
| Quick run command | `cd apps/api && uv run pytest tests/ -x -q` |
| Full suite command | `cd apps/api && uv run pytest tests/ -v` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QA-01 | Query returns answer with citations | integration | `cd apps/api && uv run pytest tests/test_query_api.py -x` | No - Wave 0 |
| QA-01 | Vector retrieval returns relevant chunks | unit | `cd apps/api && uv run pytest tests/test_retrieval.py -x` | No - Wave 0 |
| QA-01 | Cohere reranking reorders by relevance | unit | `cd apps/api && uv run pytest tests/test_retrieval.py::test_reranking -x` | No - Wave 0 |
| QA-03 | Retrieval spans multiple documents | unit | `cd apps/api && uv run pytest tests/test_retrieval.py::test_cross_document -x` | No - Wave 0 |
| QA-04 | WebSocket streams tokens incrementally | integration | `cd apps/api && uv run pytest tests/test_query_api.py::test_websocket_stream -x` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/api && uv run pytest tests/ -x -q`
- **Per wave merge:** `cd apps/api && uv run pytest tests/ -v`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_query_api.py` -- covers QA-01 (REST endpoint), QA-04 (WebSocket streaming)
- [ ] `tests/test_retrieval.py` -- covers QA-01 (vector search + reranking), QA-03 (cross-document)
- [ ] Mock fixtures for Cohere rerank API in `tests/conftest.py`
- [ ] Mock fixtures for AsyncOpenAI streaming in `tests/conftest.py`
- [ ] WebSocket test client setup (httpx + `TestClient.websocket_connect()`)
- [ ] Migration: `00003_queries_table.sql` with `match_chunks` RPC function

## Sources

### Primary (HIGH confidence)
- OpenAI Python SDK v2.29.0 -- already installed, verified via `uv pip list`
- FastAPI/Starlette 0.52.1 WebSocket support -- built-in, no additional deps
- Supabase pgvector schema -- verified from `00001_init.sql` (vector(1536), HNSW index)
- [Supabase semantic search docs](https://supabase.com/docs/guides/ai/semantic-search) -- RPC function pattern for vector search

### Secondary (MEDIUM confidence)
- [Cohere Rerank quickstart](https://docs.cohere.com/docs/reranking-quickstart) -- `co.rerank()` API, `rerank-v3.5` model confirmed
- [Cohere PyPI](https://pypi.org/project/cohere/) -- v5.20.5 latest, ClientV2 API
- [OpenAI streaming guide](https://developers.openai.com/api/docs/guides/streaming-responses) -- `stream=True` pattern with async iteration
- [Next.js WebSocket proxy discussion](https://github.com/vercel/next.js/discussions/38057) -- confirms rewrites do NOT support WebSocket

### Tertiary (LOW confidence)
- Cohere `rerank-v4.0-pro` model mentioned in docs -- may be newer but `rerank-v3.5` is well-established and sufficient; validate availability

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all core libraries already installed except cohere; APIs well-documented
- Architecture: HIGH -- two-step REST+WS pattern is standard; RPC function pattern verified from Supabase docs
- Pitfalls: HIGH -- WebSocket proxy limitation confirmed by Next.js community; embedding mismatch is a known RAG pitfall

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable domain, 30-day window)
