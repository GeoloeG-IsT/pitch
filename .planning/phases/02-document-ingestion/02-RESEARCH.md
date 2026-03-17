# Phase 2: Document Ingestion - Research

**Researched:** 2026-03-17
**Domain:** LlamaIndex RAG framework, document parsing, embedding pipeline, Supabase/pgvector
**Confidence:** HIGH

## Summary

This phase builds the core document ingestion pipeline using **LlamaIndex** as the main RAG framework. LlamaIndex provides document readers (PDF via PyMuPDF, Markdown), node parsers (MarkdownNodeParser, SentenceSplitter), embedding integration (OpenAI text-embedding-3-small), and an IngestionPipeline that orchestrates the full parse-chunk-embed flow. The existing schema (documents + chunks tables with vector(1536), HNSW index, RLS policies) is already in place from Phase 1.

**Critical architecture decision:** LlamaIndex's built-in vector stores (SupabaseVectorStore uses `vecs` library with its own schema; PGVectorStore creates its own table with columns `id`, `text`, `metadata_`, `node_id`, `embedding`) do NOT match our existing `chunks` table schema. The recommended approach is to use LlamaIndex's IngestionPipeline **without a vector store** -- run the pipeline to get processed nodes with embeddings, then write to our existing `chunks` table manually via Supabase client. This preserves our schema with `section_number`, `page_number`, `chunk_type`, `document_id`, `token_count` as first-class columns while still leveraging LlamaIndex for parsing, chunking, and embedding.

**Primary recommendation:** Use LlamaIndex IngestionPipeline with PyMuPDFReader (PDF), MarkdownNodeParser + SentenceSplitter (text), and OpenAIEmbedding for the parse-chunk-embed pipeline. Run pipeline.run() without vector_store to get nodes, then map node metadata to our existing chunks table schema via Supabase client. Excel processing requires custom code outside LlamaIndex (openpyxl + LLM summary).

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- PDF pitch deck: page = slide boundary. Each page becomes one section (section_number = page_number)
- Text documents (memos, architecture): heading-based splitting on H1/H2/H3, preserving heading hierarchy in chunk metadata
- Tables extracted from PDFs as structured data (rows/columns), stored as chunk_type='table'
- Excel: sheet-per-chunk, content = LLM-generated natural language summary + raw table data in metadata JSONB
- Excel: evaluated values only (computed numbers, not formulas)
- LLM generates Excel summaries at ingestion time
- Embedding model: OpenAI text-embedding-3-small (1536 dimensions)
- Structure-aware chunking with heading-based sections as primary chunks
- Large sections (>~500 tokens) split into sub-chunks with ~50 token overlap
- Tables get dedicated chunk (chunk_type='table')
- Processing is async with status tracking: pending -> processing -> ready
- Both PDF and markdown parsers needed

### Claude's Discretion
- PDF parsing library choice -> **Recommendation: LlamaIndex PyMuPDFReader** (wraps pymupdf4llm, outputs LlamaIndex Documents per page)
- Excel parsing library choice -> **Recommendation: openpyxl** (LlamaIndex's PandasExcelReader is deprecated; custom code with openpyxl + LLM summary is the right approach)
- Upload & management UX design
- Exact token counting implementation -> **Recommendation: tiktoken** (pulled in as LlamaIndex dependency)
- Error handling and retry logic for failed parses
- Background job mechanism -> **Recommendation: FastAPI BackgroundTasks** (adequate for PoC)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INGEST-01 | Founder can upload PDF pitch deck and have it parsed into searchable sections | LlamaIndex PyMuPDFReader returns one Document per page; each page -> one node with page_label metadata; maps directly to section_number = page_number |
| INGEST-02 | Founder can upload text documents (memos, architecture docs) for RAG indexing | LlamaIndex MarkdownNodeParser splits on headings; SentenceSplitter handles sub-chunking for large sections |
| INGEST-03 | Founder can upload Excel financial models with structured table extraction | Custom code: openpyxl data_only=True reads evaluated values; LLM summarizes each sheet; wrap as LlamaIndex TextNode for embedding |
| INGEST-04 | System maps document sections to preserve structure (slides, chapters, tables) for section-aware retrieval | LlamaIndex nodes carry metadata dict; map page_label, heading, heading_level to our chunk columns (section_number, page_number, chunk_type, metadata JSONB) |
| MGMT-01 | Founder can upload, organize, and manage pitch documents | FastAPI upload endpoints + document list/delete/organize API + Next.js management UI |
| MGMT-02 | Founder can update documents and have RAG index refresh | DELETE old chunks on re-upload via Supabase client, re-run LlamaIndex pipeline, new embeddings generated |

</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| llama-index-core | 0.14.18 | Core RAG framework: IngestionPipeline, node parsers, schema | Central orchestration; IngestionPipeline handles transform chaining, caching, async |
| llama-index-readers-file | 0.6.0 | File readers: PyMuPDFReader for PDF, MarkdownReader for text | PyMuPDFReader returns per-page Documents with metadata; integrates with pymupdf4llm |
| llama-index-embeddings-openai | 0.6.0 | OpenAI embedding integration | Wraps OpenAI API; works as IngestionPipeline transformation; handles batching |
| openpyxl | 3.1.5 | Excel file reading | data_only=True returns evaluated values; LlamaIndex's PandasExcelReader is deprecated |
| tiktoken | 0.12.0 | Token counting | Pulled in by llama-index-core; cl100k_base encoding for text-embedding-3-small |
| python-multipart | 0.0.22 | FastAPI file upload support | Required dependency for FastAPI UploadFile/File handling |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| openai (already a dependency of llama-index-embeddings-openai) | 2.28.0 | LLM calls for Excel sheet summaries | Excel ingestion: generate natural language summaries per sheet |
| supabase (already installed) | - | Database + Storage client | Upload file bytes to Storage; write document/chunk records to tables |
| pydantic (already installed) | - | Request/response models | Validate upload params, serialize document status responses |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| LlamaIndex PyMuPDFReader | pymupdf4llm directly | pymupdf4llm is lower-level but gives more control; PyMuPDFReader wraps it and returns LlamaIndex Documents, which integrate cleanly with IngestionPipeline |
| LlamaIndex MarkdownNodeParser | Custom regex heading splitter | Custom gives full control but MarkdownNodeParser handles edge cases (nested headings, code blocks) and integrates with pipeline |
| Manual embedding calls | LlamaIndex OpenAIEmbedding transform | LlamaIndex handles batching and works as pipeline step; manual calls give more control over batch sizing |
| IngestionPipeline + manual DB write | PGVectorStore (perform_setup=True) | PGVectorStore creates its own table schema (id, text, metadata_, node_id, embedding) which doesn't match our chunks table. Manual write preserves our schema with first-class columns for section_number, page_number, chunk_type, document_id |
| openpyxl (custom) | LlamaIndex PandasExcelReader | PandasExcelReader is deprecated. Custom openpyxl + LLM summary is the correct approach for sheet-per-chunk with natural language summaries |

**Installation:**
```bash
cd apps/api && uv add llama-index-core llama-index-readers-file llama-index-embeddings-openai openpyxl python-multipart
```

**Note:** `tiktoken`, `openai`, and `pypdf` are pulled in as transitive dependencies of llama-index packages. No need to install separately.

**Version verification:** All versions confirmed via `uv pip install --dry-run` on 2026-03-17. llama-index-core 0.14.18, llama-index-readers-file 0.6.0, llama-index-embeddings-openai 0.6.0, openpyxl 3.1.5, tiktoken 0.12.0, openai 2.28.0.

## Architecture Patterns

### Recommended Project Structure
```
apps/api/app/
├── api/v1/
│   ├── health.py              # Existing
│   ├── documents.py           # Upload, list, delete, re-upload endpoints
│   └── __init__.py
├── core/
│   ├── config.py              # Existing -- add OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY
│   └── supabase.py            # Supabase client factory (service role for writes)
├── models/
│   ├── document.py            # Pydantic models for document CRUD
│   └── chunk.py               # Pydantic models for chunk data
├── services/
│   ├── ingestion.py           # Orchestrates full pipeline: upload -> parse -> chunk -> embed -> store
│   ├── pipeline.py            # LlamaIndex IngestionPipeline factory + node-to-chunk mapping
│   ├── parsers/
│   │   ├── __init__.py
│   │   ├── pdf_pipeline.py    # PyMuPDFReader + SentenceSplitter pipeline for PDFs
│   │   ├── markdown_pipeline.py  # MarkdownNodeParser + SentenceSplitter pipeline
│   │   └── excel_parser.py    # openpyxl + LLM summary (custom, not LlamaIndex pipeline)
│   └── node_mapper.py         # Maps LlamaIndex nodes to our chunks table schema
├── main.py                    # Existing
└── __init__.py
```

### Pattern 1: LlamaIndex IngestionPipeline Without Vector Store

**What:** Use IngestionPipeline for parse + chunk + embed, but write to our existing chunks table manually. This lets us leverage LlamaIndex's orchestration while keeping our custom schema with first-class columns.

**When to use:** All document types (PDF, Markdown). Excel uses custom code but still feeds through the embedding step.

**Why not use PGVectorStore:** PGVectorStore creates tables with columns `(id, text, metadata_, node_id, embedding)`. Our existing `chunks` table has `(id, document_id, content, embedding, section_number, page_number, chunk_type, metadata, token_count)`. Using PGVectorStore would require abandoning our schema or maintaining two tables. Manual write is cleaner.

**Example:**
```python
# apps/api/app/services/pipeline.py
from llama_index.core.ingestion import IngestionPipeline
from llama_index.core.node_parser import SentenceSplitter, MarkdownNodeParser
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.readers.file import PyMuPDFReader

def create_pdf_pipeline() -> IngestionPipeline:
    """Pipeline for PDF documents: page-level splitting + embedding."""
    return IngestionPipeline(
        transformations=[
            # SentenceSplitter handles large pages (>500 tokens)
            SentenceSplitter(chunk_size=500, chunk_overlap=50),
            OpenAIEmbedding(model="text-embedding-3-small"),
        ]
    )

def create_markdown_pipeline() -> IngestionPipeline:
    """Pipeline for Markdown/text: heading-based splitting + sub-chunking + embedding."""
    return IngestionPipeline(
        transformations=[
            MarkdownNodeParser(),  # Splits on headings
            SentenceSplitter(chunk_size=500, chunk_overlap=50),  # Sub-chunk large sections
            OpenAIEmbedding(model="text-embedding-3-small"),
        ]
    )

async def run_pdf_pipeline(file_bytes: bytes, file_path: str) -> list:
    """Load PDF and run through pipeline, returning processed nodes."""
    reader = PyMuPDFReader()
    # Returns one Document per page with metadata including page_label
    documents = reader.load_data(file_path)

    pipeline = create_pdf_pipeline()
    nodes = await pipeline.arun(documents=documents)
    return nodes

async def run_markdown_pipeline(file_bytes: bytes) -> list:
    """Parse markdown content through LlamaIndex pipeline."""
    from llama_index.core import Document
    doc = Document(text=file_bytes.decode("utf-8"))
    pipeline = create_markdown_pipeline()
    nodes = await pipeline.arun(documents=[doc])
    return nodes
```

### Pattern 2: Node-to-Chunk Mapping

**What:** Convert LlamaIndex BaseNode objects to our chunks table schema, extracting metadata into first-class columns.

**Example:**
```python
# apps/api/app/services/node_mapper.py
from llama_index.core.schema import BaseNode
import tiktoken

_encoding = tiktoken.encoding_for_model("text-embedding-3-small")

def node_to_chunk_record(node: BaseNode, document_id: str) -> dict:
    """Map a LlamaIndex node to our chunks table schema."""
    metadata = node.metadata or {}

    # Extract page_number from LlamaIndex's PyMuPDFReader metadata
    page_number = metadata.get("page_label")
    if page_number is not None:
        page_number = int(page_number)

    # Determine chunk_type from metadata
    chunk_type = metadata.get("chunk_type", "text")
    heading = metadata.get("header_path", metadata.get("heading"))
    if heading:
        chunk_type = "heading"

    # Token count
    text = node.get_content()
    token_count = len(_encoding.encode(text))

    return {
        "document_id": document_id,
        "content": text,
        "embedding": node.embedding,
        "section_number": metadata.get("section_number", page_number),
        "page_number": page_number,
        "chunk_type": chunk_type,
        "metadata": {
            k: v for k, v in metadata.items()
            if k not in ("page_label", "file_path", "file_name", "chunk_type")
        },
        "token_count": token_count,
    }
```

### Pattern 3: Async Document Processing with LlamaIndex

**What:** Upload endpoint accepts file, stores in Supabase Storage, creates document record with status='pending', dispatches background task that runs the LlamaIndex pipeline and writes chunks.

**Example:**
```python
# apps/api/app/services/ingestion.py
from app.services.pipeline import run_pdf_pipeline, run_markdown_pipeline
from app.services.parsers.excel_parser import parse_excel
from app.services.node_mapper import node_to_chunk_record
from app.core.supabase import get_service_client

PIPELINE_MAP = {
    "pdf": run_pdf_pipeline,
    "md": run_markdown_pipeline,
    "txt": run_markdown_pipeline,
}

async def process_document(doc_id: str, file_bytes: bytes, file_type: str, temp_path: str):
    client = get_service_client()
    try:
        client.table("documents").update({"status": "processing"}).eq("id", doc_id).execute()

        if file_type == "xlsx":
            # Excel uses custom parser (not LlamaIndex pipeline)
            chunks = await parse_excel(file_bytes)
        else:
            # PDF and Markdown use LlamaIndex IngestionPipeline
            pipeline_fn = PIPELINE_MAP[file_type]
            if file_type == "pdf":
                nodes = await pipeline_fn(file_bytes, temp_path)
            else:
                nodes = await pipeline_fn(file_bytes)
            chunks = [node_to_chunk_record(node, doc_id) for node in nodes]

        # Batch insert chunks
        for chunk in chunks:
            chunk["document_id"] = doc_id
            client.table("chunks").insert(chunk).execute()

        client.table("documents").update({"status": "ready"}).eq("id", doc_id).execute()
    except Exception as e:
        client.table("documents").update({
            "status": "error",
            "metadata": {"error": str(e)},
        }).eq("id", doc_id).execute()
```

### Pattern 4: Excel Sheet-Per-Chunk with LLM Summary (Custom, Not LlamaIndex)

**What:** Excel parsing cannot use LlamaIndex's pipeline because PandasExcelReader is deprecated and the requirement (sheet-per-chunk with LLM summary + raw data in metadata) is too custom. Use openpyxl directly, generate LLM summaries, then create embeddings via LlamaIndex's OpenAIEmbedding.

**Example:**
```python
# apps/api/app/services/parsers/excel_parser.py
import io
from openpyxl import load_workbook
from openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding

embed_model = OpenAIEmbedding(model="text-embedding-3-small")

async def parse_excel(file_bytes: bytes) -> list[dict]:
    wb = load_workbook(io.BytesIO(file_bytes), read_only=True, data_only=True)
    chunks = []

    for idx, sheet_name in enumerate(wb.sheetnames, start=1):
        ws = wb[sheet_name]
        rows = []
        for row in ws.iter_rows(values_only=True):
            rows.append([str(cell) if cell is not None else "" for cell in row])

        if not any(any(cell for cell in row) for row in rows):
            continue

        # LLM summary for embedding
        table_text = _rows_to_text(rows)
        summary = _generate_summary(sheet_name, table_text)

        # Generate embedding via LlamaIndex's OpenAIEmbedding
        embedding = await embed_model.aget_text_embedding(summary)

        chunks.append({
            "content": summary,
            "embedding": embedding,
            "section_number": idx,
            "page_number": None,
            "chunk_type": "table",
            "metadata": {
                "sheet_name": sheet_name,
                "raw_data": rows,
                "row_count": len(rows),
                "col_count": max(len(r) for r in rows) if rows else 0,
            },
            "token_count": len(_encoding.encode(summary)),
        })
    return chunks

def _generate_summary(sheet_name: str, table_text: str) -> str:
    client = OpenAI()
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{
            "role": "system",
            "content": "Summarize this financial spreadsheet data in clear natural language. Include all key numbers, metrics, and relationships. Be comprehensive -- this summary will be used for semantic search.",
        }, {
            "role": "user",
            "content": f"Sheet: {sheet_name}\n\n{table_text}",
        }],
        max_tokens=1000,
    )
    return response.choices[0].message.content
```

### Pattern 5: PyMuPDFReader Per-Page Loading

**What:** LlamaIndex's PyMuPDFReader (from llama-index-readers-file) wraps pymupdf and returns one Document per page by default, with `page_label` in metadata.

**Example:**
```python
from llama_index.readers.file import PyMuPDFReader
import tempfile, os

def load_pdf_as_documents(file_bytes: bytes) -> list:
    """Write bytes to temp file, load via PyMuPDFReader, return per-page Documents."""
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        f.write(file_bytes)
        temp_path = f.name

    try:
        reader = PyMuPDFReader()
        documents = reader.load_data(temp_path)
        # Each document has metadata: {"page_label": "1", "file_path": "...", ...}
        return documents
    finally:
        os.unlink(temp_path)
```

### Pattern 6: Document Re-upload with RAG Index Refresh

**What:** Delete existing chunks for the document, re-run the LlamaIndex pipeline, write new chunks.

**Example:**
```python
@router.put("/documents/{doc_id}")
async def reupload_document(
    doc_id: str,
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    file_bytes = await file.read()
    client = get_service_client()

    # Delete old chunks
    client.table("chunks").delete().eq("document_id", doc_id).execute()

    # Update document status
    client.table("documents").update({
        "status": "pending",
        "file_name": file.filename,
        "file_size_bytes": len(file_bytes),
    }).eq("id", doc_id).execute()

    file_type = _detect_file_type(file.filename)
    background_tasks.add_task(process_document, doc_id, file_bytes, file_type)
    return {"id": doc_id, "status": "pending"}
```

### Anti-Patterns to Avoid

- **Using SupabaseVectorStore or PGVectorStore directly:** These create their own table schemas that don't match our existing `chunks` table. Use IngestionPipeline without vector_store and write manually.
- **Passing UploadFile to BackgroundTasks:** File object is closed after endpoint returns. Always `file_bytes = await file.read()` first.
- **Using anon key for write operations:** RLS policies restrict writes. Use **service role key** for backend INSERT/UPDATE/DELETE.
- **Embedding formulas instead of values:** openpyxl without `data_only=True` returns formula strings. Always use `data_only=True`.
- **Skipping token counting before embedding:** text-embedding-3-small has 8191 token limit. Count with tiktoken first.
- **Running MarkdownNodeParser on PDF output:** PyMuPDFReader already returns per-page Documents. Don't re-parse with MarkdownNodeParser for PDFs; use SentenceSplitter directly for sub-chunking large pages.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF text + table extraction | Custom PDF parser | LlamaIndex PyMuPDFReader (wraps pymupdf) | Returns per-page LlamaIndex Documents with metadata; integrates with IngestionPipeline |
| Markdown heading-based splitting | Custom regex splitter | LlamaIndex MarkdownNodeParser | Handles nested headings, code blocks, edge cases; preserves heading hierarchy in metadata |
| Sub-chunking large sections | Custom token-based splitter | LlamaIndex SentenceSplitter(chunk_size=500, chunk_overlap=50) | Respects sentence boundaries; configurable size/overlap; works as pipeline transformation |
| Embedding generation | Raw OpenAI API calls | LlamaIndex OpenAIEmbedding transform | Handles batching; works as pipeline step; async support via arun() |
| Token counting | Character-based estimation | tiktoken (pulled in by llama-index-core) | BPE tokenization; exact counts for text-embedding-3-small |
| Parse-chunk-embed orchestration | Custom sequential code | LlamaIndex IngestionPipeline | Handles transform chaining, caching, async, parallel workers |
| File upload multipart parsing | Manual multipart handling | python-multipart via FastAPI UploadFile | Battle-tested, streaming support |

**Key insight:** LlamaIndex replaces the custom parser/chunker/embedder pipeline from the previous research with a unified framework. The main exception is Excel, where the sheet-per-chunk + LLM summary requirement is too custom for any LlamaIndex reader. The other key insight is that LlamaIndex's vector stores don't match our schema, so we use the pipeline for processing but write to our table manually.

## Common Pitfalls

### Pitfall 1: LlamaIndex Vector Store Schema Mismatch
**What goes wrong:** Using PGVectorStore or SupabaseVectorStore creates tables with columns `(id, text, metadata_, node_id, embedding)` that don't match our `chunks` table.
**Why it happens:** LlamaIndex vector stores assume they own the table schema.
**How to avoid:** Use IngestionPipeline without `vector_store` parameter. Get nodes from `pipeline.run()`, then map to our schema and write via Supabase client.
**Warning signs:** New tables appearing in the database; our chunks table empty; queries returning unexpected column formats.

### Pitfall 2: PyMuPDFReader Requires File Path, Not Bytes
**What goes wrong:** PyMuPDFReader.load_data() expects a file path, not bytes.
**Why it happens:** The reader opens the file from disk using pymupdf.
**How to avoid:** Write uploaded bytes to a temp file, pass the path to PyMuPDFReader, clean up temp file after.
**Warning signs:** TypeError or FileNotFoundError in PDF loading.

### Pitfall 3: UploadFile Closed Before Background Task
**What goes wrong:** File bytes are empty in background task.
**Why it happens:** FastAPI closes UploadFile after endpoint returns.
**How to avoid:** Always `file_bytes = await file.read()` in the endpoint and pass bytes to background task.
**Warning signs:** Empty chunks, "I/O operation on closed file" errors.

### Pitfall 4: SentenceSplitter chunk_size Is in Characters by Default
**What goes wrong:** Chunks are much larger than expected in tokens because SentenceSplitter's chunk_size counts characters, not tokens.
**Why it happens:** Default tokenizer in SentenceSplitter counts characters unless configured.
**How to avoid:** Pass a tokenizer function or use TokenTextSplitter instead if you need exact token-based splitting. For our use case, SentenceSplitter with chunk_size=500 and the default tokenizer (which uses tiktoken internally when available) should work well. Verify with test documents.
**Warning signs:** Chunks exceeding 500 tokens despite chunk_size=500.

### Pitfall 5: openpyxl data_only Returns None
**What goes wrong:** `data_only=True` returns None for cells not recalculated by Excel.
**Why it happens:** openpyxl reads cached calculated values. If saved by openpyxl itself, cache is empty.
**How to avoid:** Demo content build scripts must write values directly (not formulas). For user uploads, handle None with fallback.
**Warning signs:** Entire columns of None where numbers should be.

### Pitfall 6: Supabase RLS Blocking Backend Writes
**What goes wrong:** INSERT/UPDATE on documents or chunks fails with permission denied.
**Why it happens:** Anon key respects RLS policies; current policies only allow SELECT for chunks.
**How to avoid:** Use **service role key** for all backend write operations.
**Warning signs:** 403 or empty results on insert operations.

### Pitfall 7: MarkdownNodeParser Metadata Key Names
**What goes wrong:** Expected metadata keys like `heading` or `heading_level` aren't where you expect them.
**Why it happens:** MarkdownNodeParser stores heading info in `header_path` metadata key, not `heading`.
**How to avoid:** Inspect actual node metadata during development. Log node.metadata for first few nodes when building the mapper.
**Warning signs:** section_number and chunk_type always null/default in chunks table.

## Code Examples

### LlamaIndex IngestionPipeline for PDF (Complete)
```python
# Source: LlamaIndex official docs - IngestionPipeline module guide
from llama_index.core.ingestion import IngestionPipeline
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.readers.file import PyMuPDFReader
import tempfile, os

async def ingest_pdf(file_bytes: bytes) -> list:
    # PyMuPDFReader requires file path
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        f.write(file_bytes)
        temp_path = f.name

    try:
        reader = PyMuPDFReader()
        documents = reader.load_data(temp_path)
        # documents: list of Document, one per page
        # Each has metadata: {"page_label": "1", "file_path": "...", "file_name": "..."}

        pipeline = IngestionPipeline(
            transformations=[
                SentenceSplitter(chunk_size=500, chunk_overlap=50),
                OpenAIEmbedding(model="text-embedding-3-small"),
            ]
        )

        # arun for async; no vector_store means nodes returned directly
        nodes = await pipeline.arun(documents=documents)
        return nodes
    finally:
        os.unlink(temp_path)
```

### LlamaIndex MarkdownNodeParser + SentenceSplitter Pipeline
```python
# Source: LlamaIndex official docs - Node Parser modules
from llama_index.core import Document
from llama_index.core.ingestion import IngestionPipeline
from llama_index.core.node_parser import MarkdownNodeParser, SentenceSplitter
from llama_index.embeddings.openai import OpenAIEmbedding

async def ingest_markdown(text: str) -> list:
    doc = Document(text=text)

    pipeline = IngestionPipeline(
        transformations=[
            MarkdownNodeParser(),           # Split on headings
            SentenceSplitter(chunk_size=500, chunk_overlap=50),  # Sub-chunk large sections
            OpenAIEmbedding(model="text-embedding-3-small"),
        ]
    )

    nodes = await pipeline.arun(documents=[doc])
    return nodes
```

### OpenAI Embedding via LlamaIndex (Standalone)
```python
# Source: llama-index-embeddings-openai docs
from llama_index.embeddings.openai import OpenAIEmbedding

embed_model = OpenAIEmbedding(model="text-embedding-3-small")

# Single text
embedding = await embed_model.aget_text_embedding("some text")

# Batch
embeddings = await embed_model.aget_text_embedding_batch(["text1", "text2", "text3"])
```

### Token Counting with tiktoken
```python
import tiktoken

_encoding = tiktoken.encoding_for_model("text-embedding-3-small")

def count_tokens(text: str) -> int:
    return len(_encoding.encode(text))
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom pymupdf4llm + manual chunking + raw OpenAI API | LlamaIndex IngestionPipeline (PyMuPDFReader + SentenceSplitter + OpenAIEmbedding) | LlamaIndex 0.14.x (2025-2026) | Unified pipeline with caching, async, transform chaining; less custom code to maintain |
| LlamaIndex PandasExcelReader | Deprecated; use openpyxl directly | 2025 | LlamaIndex dropped PandasExcelReader; custom code needed for sheet-per-chunk + LLM summary |
| SupabaseVectorStore (vecs library) | PGVectorStore or manual write | Current | SupabaseVectorStore uses `vecs` schema; PGVectorStore uses own table format; manual write for custom schemas |
| text-embedding-ada-002 | text-embedding-3-small | Jan 2024 | Better quality at lower cost; same 1536 dimensions |
| Sync pipeline | IngestionPipeline.arun() | LlamaIndex 0.9.7+ | Proper async support; significantly faster |

**Deprecated/outdated:**
- `PandasExcelReader`: Deprecated in LlamaIndex. Use openpyxl directly for Excel.
- `text-embedding-ada-002`: Superseded by text-embedding-3-small.
- `SupabaseVectorStore` for custom schemas: Uses `vecs` library which creates its own table structure.

## Open Questions

1. **SentenceSplitter chunk_size: characters or tokens?**
   - What we know: SentenceSplitter's `chunk_size` parameter defaults to character count but uses tiktoken internally when available. The `TokenTextSplitter` is an alternative that always counts tokens.
   - What's unclear: Whether the default SentenceSplitter with chunk_size=500 gives chunks of ~500 tokens or ~500 characters (which would be ~125 tokens).
   - Recommendation: Test with demo content during implementation. If chunks are too small, switch to `TokenTextSplitter(chunk_size=500, chunk_overlap=50)` or increase SentenceSplitter's chunk_size.

2. **MarkdownNodeParser metadata keys**
   - What we know: MarkdownNodeParser creates nodes split on markdown headings. It stores heading information in node metadata.
   - What's unclear: Exact metadata key names (is it `header_path`, `heading`, `section_header`?).
   - Recommendation: Log node.metadata for first few nodes when implementing. Build mapper flexibly to handle different key names.

3. **LLM for Excel summaries: Claude vs GPT-4o-mini?**
   - What we know: Both work. GPT-4o-mini is fast and cheap. OPENAI_API_KEY is already needed for embeddings.
   - Recommendation: Use GPT-4o-mini for summaries. Keeps everything on one API key.

4. **PyMuPDFReader table detection**
   - What we know: PyMuPDFReader uses pymupdf which supports table detection. pymupdf4llm's `to_markdown()` includes table data in the markdown output.
   - What's unclear: Whether PyMuPDFReader exposes table metadata separately (like pymupdf4llm's `page_chunks=True` does with the "tables" key) or just includes tables inline in the markdown text.
   - Recommendation: If tables are inline in markdown, detect them by checking for markdown table syntax (pipes and dashes) and set chunk_type='table' in the mapper. If more granular table extraction is needed, use pymupdf4llm directly instead of PyMuPDFReader.

5. **Auth context for document ownership**
   - What we know: documents table has user_id (FK to users). Phase 6 implements auth.
   - Recommendation: Use a hardcoded demo user ID for Phase 2. Service role key bypasses RLS for writes.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest + pytest-asyncio (already installed) |
| Config file | None explicit -- uses pyproject.toml defaults |
| Quick run command | `cd apps/api && uv run pytest tests/ -x -q` |
| Full suite command | `cd apps/api && uv run pytest tests/ -v` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INGEST-01 | PDF upload parsed into page-level sections via LlamaIndex PyMuPDFReader | integration | `uv run pytest tests/test_ingestion.py::test_pdf_parsing -x` | No -- Wave 0 |
| INGEST-02 | Markdown upload split by headings via MarkdownNodeParser | unit | `uv run pytest tests/test_parsers.py::test_markdown_pipeline -x` | No -- Wave 0 |
| INGEST-03 | Excel upload extracts sheet data with LLM summaries | integration | `uv run pytest tests/test_parsers.py::test_excel_parser -x` | No -- Wave 0 |
| INGEST-04 | Node-to-chunk mapper preserves section_number, page_number, chunk_type, metadata | unit | `uv run pytest tests/test_node_mapper.py -x` | No -- Wave 0 |
| MGMT-01 | Upload, list, delete documents via API | integration | `uv run pytest tests/test_documents_api.py -x` | No -- Wave 0 |
| MGMT-02 | Re-upload deletes old chunks and re-indexes via LlamaIndex pipeline | integration | `uv run pytest tests/test_documents_api.py::test_reupload -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/api && uv run pytest tests/ -x -q`
- **Per wave merge:** `cd apps/api && uv run pytest tests/ -v`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_parsers.py` -- unit tests for PDF and Markdown LlamaIndex pipelines (covers INGEST-01, INGEST-02)
- [ ] `tests/test_node_mapper.py` -- unit tests for node-to-chunk mapping (covers INGEST-04)
- [ ] `tests/test_ingestion.py` -- integration tests for full pipeline including Excel (covers INGEST-01, INGEST-03)
- [ ] `tests/test_documents_api.py` -- API endpoint tests (covers MGMT-01, MGMT-02)
- [ ] `tests/conftest.py` -- shared fixtures (mock Supabase client, mock LlamaIndex nodes, sample file bytes, mock OpenAI responses)
- [ ] Test data: small PDF (2-3 pages), small xlsx (2 sheets), small markdown for fast tests

## Sources

### Primary (HIGH confidence)
- [LlamaIndex IngestionPipeline docs](https://developers.llamaindex.ai/python/framework/module_guides/loading/ingestion_pipeline/) -- Pipeline creation, vector store attachment, async arun(), caching
- [LlamaIndex Node Parser Modules](https://developers.llamaindex.ai/python/framework/module_guides/loading/node_parsers/modules/) -- SentenceSplitter, MarkdownNodeParser, TokenTextSplitter parameters
- [LlamaIndex SimpleDirectoryReader](https://developers.llamaindex.ai/python/framework/module_guides/loading/simpledirectoryreader/) -- File loading, custom extractors, metadata
- [LlamaIndex Supabase Vector Store demo](https://developers.llamaindex.ai/python/framework/integrations/vector_stores/supabasevectorindexdemo/) -- SupabaseVectorStore setup (used to understand schema incompatibility)
- [LlamaIndex PGVectorStore docs](https://developers.llamaindex.ai/python/examples/vector_stores/postgres/) -- Table schema, metadata storage, custom queries
- [PyMuPDF4LLM API docs](https://pymupdf.readthedocs.io/en/latest/pymupdf4llm/api.html) -- to_markdown(), page_chunks, LlamaMarkdownReader, table_strategy
- [PyPI: llama-index-core 0.14.18](https://pypi.org/project/llama-index-core/) -- Version verification
- [PyPI: llama-index-readers-file 0.6.0](https://pypi.org/project/llama-index-readers-file/) -- Version verification
- [PyPI: llama-index-embeddings-openai 0.6.0](https://pypi.org/project/llama-index-embeddings-openai/) -- Version verification
- [PyPI: llama-index-vector-stores-postgres 0.8.1](https://pypi.org/project/llama-index-vector-stores-postgres/) -- Version verification (investigated but not recommended)

### Secondary (MEDIUM confidence)
- [LlamaIndex Async Ingestion Pipeline example](https://developers.llamaindex.ai/python/examples/ingestion/async_ingestion_pipeline/) -- arun() usage, metadata extraction patterns
- [LlamaIndex PandasExcelReader deprecation discussion](https://github.com/run-llama/llama_index/discussions/11604) -- Confirmed PandasExcelReader deprecated
- [OpenAI Embeddings docs](https://platform.openai.com/docs/guides/embeddings) -- text-embedding-3-small specs (1536d, 8191 token limit)
- [FastAPI BackgroundTasks](https://fastapi.tiangolo.com/tutorial/background-tasks/) -- Async processing pattern

### Tertiary (LOW confidence)
- LLM summary generation prompt for Excel sheets -- pattern is sound but exact prompt needs tuning with real demo data
- MarkdownNodeParser exact metadata key names -- needs empirical verification during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all library versions confirmed via uv pip dry-run; LlamaIndex packages current as of 2026-03-16/17
- Architecture: HIGH -- "pipeline without vector store" pattern confirmed in LlamaIndex docs; manual DB write is straightforward
- Vector store incompatibility: HIGH -- verified SupabaseVectorStore uses vecs schema, PGVectorStore uses own table format; both confirmed incompatible with existing chunks table
- Node parsers: MEDIUM -- SentenceSplitter and MarkdownNodeParser documented; exact chunk_size behavior (chars vs tokens) and metadata key names need empirical validation
- Excel pipeline: HIGH -- openpyxl approach unchanged from previous research; LlamaIndex PandasExcelReader confirmed deprecated
- Pitfalls: HIGH -- file closing, RLS, data_only documented from official sources; vector store mismatch verified

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (LlamaIndex releases frequently but core APIs are stable)
