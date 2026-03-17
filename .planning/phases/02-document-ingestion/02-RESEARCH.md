# Phase 2: Document Ingestion - Research

**Researched:** 2026-03-17
**Domain:** Document parsing (PDF, Excel, Markdown), embedding pipeline, FastAPI file upload
**Confidence:** HIGH

## Summary

This phase builds the core document ingestion pipeline: upload endpoints, parsers for PDF/Excel/Markdown, structure-aware chunking, OpenAI embedding generation, and a founder-facing management interface. The existing schema (documents + chunks tables with vector(1536), HNSW index, RLS policies) is already in place from Phase 1, so this phase focuses entirely on the application layer.

The recommended stack is **pymupdf4llm** for PDF-to-Markdown extraction (fast, good table support, page-level chunking built in), **openpyxl** for Excel reading (data_only mode gives evaluated values), and **tiktoken** + **OpenAI API** for token counting and embedding. File bytes are stored in Supabase Storage, metadata in the documents table, and parsed chunks with embeddings in the chunks table. Processing is async via FastAPI BackgroundTasks (adequate for PoC scale -- no need for Celery/Redis).

**Primary recommendation:** Use pymupdf4llm with `page_chunks=True` for PDF parsing, openpyxl with `data_only=True` for Excel, heading-based splitting for Markdown, and OpenAI `text-embedding-3-small` for embeddings. Process documents asynchronously with status tracking (pending -> processing -> ready/error).

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
- PDF parsing library choice -> **Recommendation: pymupdf4llm** (see Standard Stack)
- Excel parsing library choice -> **Recommendation: openpyxl** (see Standard Stack)
- Upload & management UX design
- Exact token counting implementation
- Error handling and retry logic for failed parses
- Background job mechanism -> **Recommendation: FastAPI BackgroundTasks** (see Architecture Patterns)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INGEST-01 | Founder can upload PDF pitch deck and have it parsed into searchable sections | pymupdf4llm with page_chunks=True extracts per-page markdown with table detection; each page -> one chunk with section_number = page_number |
| INGEST-02 | Founder can upload text documents (memos, architecture docs) for RAG indexing | Markdown heading-based parser splits on H1/H2/H3; both .md source files and PDF versions supported |
| INGEST-03 | Founder can upload Excel financial models with structured table extraction | openpyxl data_only=True reads evaluated values; LLM summarizes each sheet; raw data stored in metadata JSONB |
| INGEST-04 | System maps document sections to preserve structure (slides, chapters, tables) for section-aware retrieval | page_number, section_number, chunk_type, and metadata JSONB fields in chunks table store structural context |
| MGMT-01 | Founder can upload, organize, and manage pitch documents | FastAPI upload endpoints + document list/delete/organize API + Next.js management UI |
| MGMT-02 | Founder can update documents and have RAG index refresh | DELETE old chunks on re-upload, re-run parsing pipeline, new embeddings generated |

</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pymupdf4llm | 1.27.2 | PDF to Markdown with table extraction | Purpose-built for LLM/RAG pipelines; fast (0.14s/page); preserves tables as markdown; page_chunks mode gives per-page dicts with metadata |
| openpyxl | 3.1.5 | Excel file reading | Standard Python Excel library; data_only=True returns evaluated values; read_only=True for large files |
| openai | 2.28.0 | Embedding generation via API | Official Python client; typed responses; automatic retries |
| tiktoken | 0.12.0 | Token counting | Official OpenAI tokenizer; cl100k_base encoding for text-embedding-3-small; fast BPE implementation in Rust |
| python-multipart | 0.0.22 | FastAPI file upload support | Required dependency for FastAPI UploadFile/File handling |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| supabase (already installed) | - | Database + Storage client | Upload file bytes to Storage bucket; write document/chunk records to tables |
| pydantic (already installed) | - | Request/response models | Validate upload params, serialize document status responses |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pymupdf4llm | pdfplumber | pdfplumber has better raw table detection but no markdown output; pymupdf4llm integrates table + text extraction into single markdown pipeline, which is what we need for RAG |
| pymupdf4llm | unstructured | Heavier dependency, more complex setup; overkill for PoC with known document types |
| openpyxl | pandas.read_excel | pandas adds large dependency for simple sheet reading; openpyxl is lighter and gives cell-level control |
| FastAPI BackgroundTasks | Celery + Redis | Celery adds infrastructure complexity; BackgroundTasks is sufficient for single-user PoC |

**Installation:**
```bash
cd apps/api && uv add pymupdf4llm openpyxl tiktoken openai python-multipart
```

**Version verification:** All versions confirmed via `uv pip install --dry-run` on 2026-03-17. pymupdf4llm 1.27.2, openpyxl 3.1.5, tiktoken 0.12.0, openai 2.28.0, python-multipart 0.0.22.

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
│   ├── parsers/
│   │   ├── __init__.py
│   │   ├── pdf_parser.py      # pymupdf4llm-based PDF parsing
│   │   ├── markdown_parser.py # Heading-based markdown splitting
│   │   └── excel_parser.py    # openpyxl + LLM summary generation
│   ├── chunker.py             # Structure-aware chunking with overlap
│   └── embedder.py            # OpenAI embedding generation + tiktoken counting
├── main.py                    # Existing
└── __init__.py
```

### Pattern 1: Async Document Processing Pipeline

**What:** Upload endpoint accepts file, stores in Supabase Storage, creates document record with status='pending', dispatches background task that runs the full parse-chunk-embed pipeline.

**When to use:** Every document upload.

**Example:**
```python
# apps/api/app/api/v1/documents.py
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException
from app.services.ingestion import process_document
from app.core.supabase import get_service_client

router = APIRouter()

@router.post("/documents")
async def upload_document(
    file: UploadFile = File(...),
    title: str = "",
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    # CRITICAL: Read file bytes BEFORE background task (file closes after endpoint returns)
    file_bytes = await file.read()
    file_name = file.filename or "unnamed"
    file_type = _detect_file_type(file_name)

    client = get_service_client()  # Service role bypasses RLS

    # 1. Upload to Supabase Storage
    storage_path = f"documents/{doc_id}/{file_name}"
    client.storage.from_("documents").upload(storage_path, file_bytes)

    # 2. Create document record with status='pending'
    doc = client.table("documents").insert({
        "title": title or file_name,
        "file_name": file_name,
        "file_type": file_type,
        "file_size_bytes": len(file_bytes),
        "status": "pending",
        "user_id": user_id,  # From auth context
    }).execute()

    # 3. Dispatch background processing (pass bytes, NOT the UploadFile)
    background_tasks.add_task(process_document, doc.data[0]["id"], file_bytes, file_type)

    return {"id": doc.data[0]["id"], "status": "pending"}
```

### Pattern 2: Parser Interface with File-Type Dispatch

**What:** Common interface for all parsers, dispatched by file_type.

**Example:**
```python
# apps/api/app/services/ingestion.py
from app.services.parsers.pdf_parser import parse_pdf
from app.services.parsers.markdown_parser import parse_markdown
from app.services.parsers.excel_parser import parse_excel
from app.services.chunker import chunk_sections
from app.services.embedder import embed_chunks

PARSERS = {
    "pdf": parse_pdf,
    "md": parse_markdown,
    "txt": parse_markdown,  # Same heading-based parser
    "xlsx": parse_excel,
}

async def process_document(doc_id: str, file_bytes: bytes, file_type: str):
    client = get_service_client()
    try:
        client.table("documents").update({"status": "processing"}).eq("id", doc_id).execute()

        # Parse into sections
        parser = PARSERS[file_type]
        sections = parser(file_bytes)  # Returns list of Section dataclass

        # Chunk large sections (skip for Excel -- already sheet-per-chunk)
        if file_type != "xlsx":
            chunks = chunk_sections(sections, max_tokens=500, overlap_tokens=50)
        else:
            chunks = sections

        # Generate embeddings
        embedded_chunks = await embed_chunks(chunks)

        # Store chunks
        for chunk in embedded_chunks:
            client.table("chunks").insert({
                "document_id": doc_id,
                "content": chunk.content,
                "embedding": chunk.embedding,
                "section_number": chunk.section_number,
                "page_number": chunk.page_number,
                "chunk_type": chunk.chunk_type,
                "metadata": chunk.metadata,
                "token_count": chunk.token_count,
            }).execute()

        client.table("documents").update({"status": "ready"}).eq("id", doc_id).execute()
    except Exception as e:
        client.table("documents").update({
            "status": "error",
            "metadata": {"error": str(e)},
        }).eq("id", doc_id).execute()
```

### Pattern 3: pymupdf4llm Page-Level PDF Parsing

**What:** Use pymupdf4llm with page_chunks=True to get per-page markdown with table metadata.

**Example:**
```python
# apps/api/app/services/parsers/pdf_parser.py
import io
import pymupdf4llm
import pymupdf  # fitz

def parse_pdf(file_bytes: bytes) -> list[Section]:
    doc = pymupdf.open(stream=file_bytes, filetype="pdf")
    pages = pymupdf4llm.to_markdown(doc, page_chunks=True)

    sections = []
    for page_data in pages:
        page_num = page_data["metadata"]["page_number"]  # 1-based
        text = page_data["text"]

        # Check if page has tables
        has_tables = len(page_data.get("tables", [])) > 0

        sections.append(Section(
            content=text,
            page_number=page_num,
            section_number=page_num,  # page = slide = section for pitch decks
            chunk_type="table" if has_tables else "text",
            metadata={
                "toc_items": page_data.get("toc_items", []),
                "table_count": len(page_data.get("tables", [])),
            },
        ))
    return sections
```

### Pattern 4: Excel Sheet-Per-Chunk with LLM Summary

**What:** Each worksheet becomes one chunk. Content is an LLM-generated natural language summary (for embedding). Raw table data goes in metadata JSONB.

**Example:**
```python
# apps/api/app/services/parsers/excel_parser.py
import io
import json
from openpyxl import load_workbook
from openai import OpenAI

def parse_excel(file_bytes: bytes) -> list[Section]:
    wb = load_workbook(io.BytesIO(file_bytes), read_only=True, data_only=True)
    sections = []

    for idx, sheet_name in enumerate(wb.sheetnames, start=1):
        ws = wb[sheet_name]

        # Extract raw data as list of lists
        rows = []
        for row in ws.iter_rows(values_only=True):
            rows.append([str(cell) if cell is not None else "" for cell in row])

        if not any(any(cell for cell in row) for row in rows):
            continue  # Skip empty sheets

        # Generate LLM summary for embedding
        table_text = _rows_to_text(rows)
        summary = _generate_summary(sheet_name, table_text)

        sections.append(Section(
            content=summary,  # Natural language for embedding
            page_number=None,
            section_number=idx,
            chunk_type="table",
            metadata={
                "sheet_name": sheet_name,
                "raw_data": rows,  # Structured data for precise retrieval
                "row_count": len(rows),
                "col_count": max(len(r) for r in rows) if rows else 0,
            },
        ))
    return sections

def _generate_summary(sheet_name: str, table_text: str) -> str:
    client = OpenAI()
    response = client.chat.completions.create(
        model="gpt-4o-mini",  # Fast + cheap for summarization
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

### Pattern 5: Document Re-upload with RAG Index Refresh

**What:** When a document is re-uploaded, delete all existing chunks and re-process.

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

    # Delete old chunks (CASCADE not needed -- we do it explicitly for clarity)
    client.table("chunks").delete().eq("document_id", doc_id).execute()

    # Update document status back to pending
    client.table("documents").update({
        "status": "pending",
        "file_name": file.filename,
        "file_size_bytes": len(file_bytes),
    }).eq("id", doc_id).execute()

    # Re-process
    file_type = _detect_file_type(file.filename)
    background_tasks.add_task(process_document, doc_id, file_bytes, file_type)

    return {"id": doc_id, "status": "pending"}
```

### Anti-Patterns to Avoid

- **Passing UploadFile to BackgroundTasks:** Since FastAPI v0.106.0, the file object is closed before the background task runs. Always read `file_bytes = await file.read()` in the endpoint and pass bytes to the background task.
- **Using anon key for write operations:** RLS policies only allow SELECT for authenticated users. Use the **service role key** for backend INSERT/UPDATE/DELETE operations on documents and chunks tables.
- **Embedding formulas instead of values:** openpyxl without `data_only=True` returns formula strings like `=SUM(B2:B10)` which produce terrible embeddings. Always use `data_only=True`.
- **Single giant chunk per document:** Destroys retrieval precision. Always chunk at structural boundaries (pages, headings, sheets).
- **Skipping token counting before embedding:** text-embedding-3-small has an 8191 token limit. Chunks exceeding this silently truncate, losing information. Always count with tiktoken first.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF text + table extraction | Custom PDF parser with pdfminer | pymupdf4llm `to_markdown(page_chunks=True)` | Handles text flow, table detection, header/footer, and markdown formatting in one call |
| Token counting | Character-based estimation | tiktoken with cl100k_base encoding | BPE tokenization is not proportional to character count; off-by-30% errors common |
| Excel formula evaluation | Formula parser | openpyxl `data_only=True` | Reads cached computed values from xlsx; no need to implement Excel formula engine |
| Embedding generation | Custom model hosting | OpenAI API `text-embedding-3-small` | Managed service, no GPU needed, $0.02/1M tokens |
| File upload multipart parsing | Manual multipart handling | python-multipart via FastAPI UploadFile | Battle-tested, handles streaming, content-type detection |

**Key insight:** Document parsing has a deceptive amount of edge cases (encoding issues, malformed PDFs, merged cells in Excel, Unicode normalization). Using established libraries avoids months of bug-fixing.

## Common Pitfalls

### Pitfall 1: UploadFile Closed Before Background Task
**What goes wrong:** File bytes are empty/error in background task because FastAPI closes the UploadFile after the endpoint returns.
**Why it happens:** FastAPI v0.106.0+ behavior change; UploadFile.file is a SpooledTemporaryFile that gets closed.
**How to avoid:** Always `file_bytes = await file.read()` inside the endpoint handler and pass `file_bytes` (not the UploadFile) to the background task.
**Warning signs:** Empty chunks, zero-byte documents, "I/O operation on closed file" errors.

### Pitfall 2: openpyxl data_only Returns None
**What goes wrong:** `data_only=True` returns None for cells that haven't been recalculated by Excel.
**Why it happens:** openpyxl reads the cached calculated value. If the file was saved by a tool that doesn't compute formulas (like openpyxl itself), the cache is empty.
**How to avoid:** Our demo content is generated by openpyxl build scripts, so values must be written directly as values (not formulas) in the build script. Verify the build output has actual numbers. For user-uploaded files, handle None gracefully with fallback to formula text.
**Warning signs:** Entire columns of None where numbers should be.

### Pitfall 3: Supabase RLS Blocking Backend Writes
**What goes wrong:** INSERT/UPDATE on documents or chunks fails with permission denied.
**Why it happens:** The anon key respects RLS policies. Current policies only allow SELECT. No INSERT policy exists for chunks.
**How to avoid:** Use **service role key** for all backend write operations. Add `SUPABASE_SERVICE_ROLE_KEY` to Settings and use a separate client instance.
**Warning signs:** 403 or empty results on insert operations.

### Pitfall 4: Embedding Dimension Mismatch
**What goes wrong:** Vector insert fails because embedding dimensions don't match schema.
**Why it happens:** Different OpenAI models return different dimensions. text-embedding-3-small returns 1536 by default, which matches the schema.
**How to avoid:** Hardcode model name in embedder service. Never pass user-configurable model. Assert `len(embedding) == 1536` before insert.
**Warning signs:** PostgreSQL error on vector column type mismatch.

### Pitfall 5: Chunk Too Large for Embedding
**What goes wrong:** Text exceeding 8191 tokens gets silently truncated by the API, losing information.
**Why it happens:** Some PDF pages (especially with large tables) can exceed the token limit.
**How to avoid:** Count tokens with tiktoken before embedding. If chunk exceeds ~7500 tokens, split into sub-chunks with overlap.
**Warning signs:** Important information from the end of large pages/sections not retrievable.

### Pitfall 6: Supabase Storage Bucket Doesn't Exist
**What goes wrong:** Upload to storage fails because the "documents" bucket hasn't been created.
**How to avoid:** Create the bucket as part of setup (migration or init script). Check bucket existence at startup.
**Warning signs:** 404 on storage upload.

## Code Examples

### Token Counting with tiktoken
```python
# apps/api/app/services/embedder.py
import tiktoken

# Cache the encoding object (expensive to create)
_encoding = tiktoken.encoding_for_model("text-embedding-3-small")

def count_tokens(text: str) -> int:
    return len(_encoding.encode(text))
```

### Embedding Generation with Batching
```python
from openai import OpenAI

client = OpenAI()  # Reads OPENAI_API_KEY from env

async def embed_chunks(chunks: list[Section]) -> list[EmbeddedChunk]:
    results = []
    # Batch up to 100 texts per API call (API limit: 300k tokens total)
    batch_size = 50  # Conservative to stay under token limit

    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        texts = [c.content for c in batch]

        response = client.embeddings.create(
            input=texts,
            model="text-embedding-3-small",
        )

        for chunk, emb_data in zip(batch, response.data):
            results.append(EmbeddedChunk(
                **chunk.__dict__,
                embedding=emb_data.embedding,
                token_count=count_tokens(chunk.content),
            ))
    return results
```

### Heading-Based Markdown Splitting
```python
# apps/api/app/services/parsers/markdown_parser.py
import re

def parse_markdown(file_bytes: bytes) -> list[Section]:
    text = file_bytes.decode("utf-8")
    # Split on H1/H2/H3 boundaries
    heading_pattern = re.compile(r'^(#{1,3})\s+(.+)$', re.MULTILINE)

    sections = []
    matches = list(heading_pattern.finditer(text))

    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)

        heading_level = len(match.group(1))
        heading_text = match.group(2).strip()
        content = text[start:end].strip()

        sections.append(Section(
            content=content,
            page_number=None,
            section_number=i + 1,
            chunk_type="heading",
            metadata={
                "heading": heading_text,
                "heading_level": heading_level,
            },
        ))

    # Handle text before first heading
    if matches and matches[0].start() > 0:
        preamble = text[:matches[0].start()].strip()
        if preamble:
            sections.insert(0, Section(
                content=preamble,
                page_number=None,
                section_number=0,
                chunk_type="text",
                metadata={"heading": "Introduction"},
            ))

    return sections
```

### Structure-Aware Sub-Chunking with Overlap
```python
# apps/api/app/services/chunker.py
def chunk_sections(sections: list[Section], max_tokens: int = 500, overlap_tokens: int = 50) -> list[Section]:
    result = []
    for section in sections:
        tokens = count_tokens(section.content)
        if tokens <= max_tokens:
            result.append(section)
        else:
            sub_chunks = _split_with_overlap(section.content, max_tokens, overlap_tokens)
            for j, sub_content in enumerate(sub_chunks):
                result.append(Section(
                    content=sub_content,
                    page_number=section.page_number,
                    section_number=section.section_number,
                    chunk_type=section.chunk_type,
                    metadata={
                        **section.metadata,
                        "sub_chunk": j,
                        "parent_section": section.section_number,
                    },
                ))
    return result
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| pdfminer.six + custom table extraction | pymupdf4llm (unified markdown + tables) | 2024 | Single library handles both text and tables; ~10x faster than pdfminer |
| text-embedding-ada-002 (1536d) | text-embedding-3-small (1536d) | Jan 2024 | Better quality at lower cost; same dimensions so schema compatible |
| Sync file processing (block on upload) | Async with status tracking | Standard pattern | User gets immediate response; status polling or webhooks for completion |
| Formula-based Excel parsing | Evaluated-values-only with LLM summaries | Current best practice for RAG | Formulas are meaningless for semantic search; natural language summaries embed well |

**Deprecated/outdated:**
- text-embedding-ada-002: Superseded by text-embedding-3-small (better quality, lower cost, same dimensions)
- PyPDF2: Abandoned in favor of pypdf; but pymupdf4llm is better for LLM use cases

## Open Questions

1. **LLM for Excel summaries: Claude vs GPT-4o-mini?**
   - What we know: Both work. GPT-4o-mini is fast and cheap ($0.15/1M input tokens). Claude could also be used.
   - What's unclear: User may prefer Claude for consistency. Cost difference is negligible for PoC.
   - Recommendation: Use GPT-4o-mini for summaries (fast, cheap). Add OPENAI_API_KEY to config (already needed for embeddings).

2. **Supabase Storage bucket setup**
   - What we know: Need a "documents" bucket for file uploads. Must be created before first upload.
   - What's unclear: Whether to create via migration SQL, Supabase dashboard, or API call.
   - Recommendation: Create via a setup script or check-and-create at app startup.

3. **Demo content: openpyxl data_only returns None**
   - What we know: The financial model is built by `content/financial-model/build.py` using openpyxl. If formulas are used, data_only=True will return None since openpyxl doesn't evaluate formulas.
   - What's unclear: Whether build.py writes values or formulas.
   - Recommendation: Verify build.py output. If it writes formulas, modify build.py to write computed values directly.

4. **Auth context for document ownership**
   - What we know: documents table has user_id (FK to users). RLS policies filter by auth.uid(). Phase 6 implements auth.
   - What's unclear: How to handle user_id before auth exists.
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
| INGEST-01 | PDF upload parsed into page-level sections | integration | `uv run pytest tests/test_ingestion.py::test_pdf_parsing -x` | No -- Wave 0 |
| INGEST-02 | Markdown upload split by headings | unit | `uv run pytest tests/test_parsers.py::test_markdown_parser -x` | No -- Wave 0 |
| INGEST-03 | Excel upload extracts sheet data with summaries | integration | `uv run pytest tests/test_parsers.py::test_excel_parser -x` | No -- Wave 0 |
| INGEST-04 | Chunks preserve section_number, page_number, chunk_type, metadata | unit | `uv run pytest tests/test_parsers.py::test_chunk_metadata -x` | No -- Wave 0 |
| MGMT-01 | Upload, list, delete documents via API | integration | `uv run pytest tests/test_documents_api.py -x` | No -- Wave 0 |
| MGMT-02 | Re-upload deletes old chunks and re-indexes | integration | `uv run pytest tests/test_documents_api.py::test_reupload -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/api && uv run pytest tests/ -x -q`
- **Per wave merge:** `cd apps/api && uv run pytest tests/ -v`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_parsers.py` -- unit tests for PDF, Markdown, Excel parsers (covers INGEST-01 through INGEST-04)
- [ ] `tests/test_ingestion.py` -- integration tests for full pipeline (covers INGEST-01, INGEST-03)
- [ ] `tests/test_documents_api.py` -- API endpoint tests (covers MGMT-01, MGMT-02)
- [ ] `tests/conftest.py` -- shared fixtures (mock Supabase client, sample file bytes, mock OpenAI responses)
- [ ] Test data: small PDF, small xlsx, small markdown for fast tests

## Sources

### Primary (HIGH confidence)
- [PyMuPDF4LLM API docs](https://pymupdf.readthedocs.io/en/latest/pymupdf4llm/api.html) -- Full API reference for to_markdown(), page_chunks schema, table_strategy options
- [openpyxl docs](https://openpyxl.readthedocs.io/en/stable/) -- data_only, read_only modes, formula handling
- [OpenAI Embeddings docs](https://platform.openai.com/docs/guides/embeddings) -- text-embedding-3-small specs (1536d, 8191 token limit, cl100k_base encoding)
- [tiktoken GitHub](https://github.com/openai/tiktoken) -- Token counting with encoding_for_model()
- [FastAPI BackgroundTasks](https://fastapi.tiangolo.com/tutorial/background-tasks/) -- Official pattern for async processing
- [Supabase Python Storage docs](https://supabase.com/docs/reference/python/storage-from-upload) -- File upload API

### Secondary (MEDIUM confidence)
- [FastAPI UploadFile + BackgroundTasks discussion](https://github.com/fastapi/fastapi/discussions/10936) -- File closing behavior since v0.106.0
- [2025 PDF extractor comparison](https://dev.to/onlyoneaman/i-tested-7-python-pdf-extractors-so-you-dont-have-to-2025-edition-akm) -- pymupdf4llm performance benchmarks
- [OpenAI tiktoken issue #366](https://github.com/openai/tiktoken/issues/366) -- Known token count discrepancy with embedding models

### Tertiary (LOW confidence)
- LLM summary generation for Excel (GPT-4o-mini) -- pattern is standard but exact prompt needs tuning with real data

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries verified against PyPI, versions confirmed, APIs documented
- Architecture: HIGH -- patterns follow FastAPI best practices, schema already exists from Phase 1
- Pitfalls: HIGH -- documented from official sources (FastAPI UploadFile issue, openpyxl data_only behavior)
- Excel LLM summaries: MEDIUM -- concept is sound but prompt tuning needs empirical testing

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable libraries, unlikely to change)
