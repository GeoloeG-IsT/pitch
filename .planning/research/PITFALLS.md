# Pitfalls Research

**Domain:** AI-powered interactive pitch/due diligence platform with multimodal RAG
**Researched:** 2026-03-17
**Confidence:** HIGH (multiple sources converge on same pitfalls)

## Critical Pitfalls

### Pitfall 1: PDF Table and Financial Data Destruction During Parsing

**What goes wrong:**
Standard PDF parsers (PyPDF2, PyMuPDF, basic pdfplumber) merge columns, break rows, and destroy the relational structure of tables. Financial documents -- the core content of this platform -- are table-heavy (P&L statements, cap tables, projections). When tables are flattened into text, the RAG pipeline retrieves garbled data. An investor asks "What's the projected ARR in Year 3?" and gets a wrong number because the parser merged adjacent columns.

**Why it happens:**
PDFs are a visual format, not a semantic one. Text extraction follows reading order, not table structure. Developers test with simple text-heavy PDFs and assume parsing works, then discover financial tables are broken only after building the full pipeline.

**How to avoid:**
Use a modern document parser purpose-built for structured extraction. LlamaParse or Docling (open-source, uses AI models for layout analysis and table structure recognition) are the current best options. For the PoC, consider a hybrid approach: use LlamaParse for PDF slides, and for financial tables specifically, convert Excel source files directly rather than parsing their PDF representations. Test parsing with actual financial tables (cap table, revenue projections) as the very first validation step.

**Warning signs:**
- Numbers in RAG responses don't match source documents
- AI answers about financial metrics are vague or hedged when the data is clearly in the documents
- Chunk previews show garbled table content

**Phase to address:**
Phase 1 (Document Ingestion). This must be validated before any other pipeline work begins. If parsing is broken, everything downstream is garbage.

---

### Pitfall 2: Chunking Strategy Destroys Context for Financial Reasoning

**What goes wrong:**
Naive fixed-size chunking (e.g., 500 tokens) splits a financial table across two chunks, separates a metric from its explanation, or orphans a chart caption from its data. Studies show 80% of RAG failures trace back to chunking decisions, not retrieval or generation. Naive chunking achieves faithfulness scores of 0.47-0.51 vs. optimized semantic chunking at 0.79-0.82.

**Why it happens:**
Default chunking in LangChain/LlamaIndex is character or token-based with overlap. This works for prose but fails catastrophically for structured financial data where a single table row might be 30 tokens but represents a complete semantic unit.

**How to avoid:**
Use document-structure-aware chunking: keep entire tables as single chunks, keep slide content together as units, treat each Excel sheet as a logical section. For this project specifically:
- PDF slides: one chunk per slide (they're already semantic units)
- Excel sheets: one chunk per logical table/section, preserve headers with every chunk
- Text documents: semantic chunking with paragraph-level boundaries
Add metadata to every chunk (source document, page/slide number, section type) -- this enables citation and evidence packs.

**Warning signs:**
- AI gives partial answers ("revenue is $2M" without specifying which year)
- Retrieval returns fragments that don't make sense standalone
- Citation links point to correct pages but the quoted text is incomplete

**Phase to address:**
Phase 1 (Document Ingestion). Chunking strategy must be defined alongside parsing, not as an afterthought.

---

### Pitfall 3: LLM Confidence Scores Are Not Calibrated -- HITL Thresholds Will Be Wrong

**What goes wrong:**
The core product feature -- confidence-based HITL where high-confidence answers auto-publish and low-confidence answers queue for founder review -- relies on meaningful confidence scores. But LLMs produce high-confidence hallucinations routinely. A model can be 95% "confident" while citing a number that doesn't exist in the source documents. Setting a threshold at 0.8 might auto-publish hallucinated answers or queue everything depending on the model's calibration.

**Why it happens:**
LLM confidence reflects training data distributions, not factual accuracy. Models are notoriously overconfident on questions outside their retrieval context. The confidence-accuracy alignment varies by model, prompt, and domain. There is no universal threshold.

**How to avoid:**
Do NOT rely on the LLM's self-reported confidence alone. Build a composite confidence signal:
1. **Retrieval quality**: similarity score of retrieved chunks (did we find relevant content?)
2. **Groundedness check**: does the answer only reference information present in retrieved chunks? (Simple LLM-as-judge call)
3. **Answer specificity**: does the answer contain concrete data points vs. vague hedging?

For the PoC, start with a conservative threshold (queue more for review) and calibrate based on the actual demo content. Hard-code initial thresholds and tune them manually against the known-correct answers for the dogfood pitch materials.

**Warning signs:**
- All answers are "high confidence" regardless of question difficulty
- Obvious wrong answers pass the confidence threshold
- The founder review queue is either always empty or always full

**Phase to address:**
Phase 2 (RAG Pipeline & Q&A) for initial implementation, then Phase 3 (HITL Workflow) for threshold calibration. This needs iterative tuning, not one-shot configuration.

---

### Pitfall 4: Overengineering the RAG Pipeline Instead of Shipping the Demo

**What goes wrong:**
Solo founder spends 3 of 4 weeks building a sophisticated RAG pipeline with re-ranking, query decomposition, hybrid search, agentic retrieval -- and runs out of time for the investor-facing UI, the founder dashboard, or the actual demo content. The PoC has great retrieval but looks terrible and can't be demonstrated convincingly.

**Why it happens:**
RAG is technically fascinating and endlessly tweakable. Each improvement is measurable and feels productive. Meanwhile, the UI/UX that actually impresses VCs gets deferred. The dogfood content (the actual pitch deck, financial model) gets created last under time pressure.

**How to avoid:**
Set a hard time-box for the RAG pipeline: 1 week maximum for the PoC. Use the simplest architecture that works:
- Single embedding model (text-embedding-3-small or similar)
- ChromaDB for vector store (zero config, in-process)
- Basic semantic search (no re-ranking for v1)
- Direct prompt-with-context generation

Allocate equal or more time to: the investor-facing document viewer, the demo flow, and creating compelling pitch content. The demo needs to feel polished, not just technically correct.

**Warning signs:**
- Week 2 and still optimizing retrieval metrics
- No working UI screens yet
- Demo content (the actual pitch deck) hasn't been created
- Adding "just one more" retrieval improvement

**Phase to address:**
This is a project-level constraint, not a phase-level one. The roadmap must front-load a vertical slice (ingestion + basic Q&A + minimal UI) in Phase 1, then polish outward.

---

### Pitfall 5: Excel/Spreadsheet Ingestion Treated as an Afterthought

**What goes wrong:**
Developer gets PDF parsing working, gets text Q&A working, then discovers Excel financial models are a completely different beast. Multi-sheet workbooks with formulas, merged cells, conditional formatting, and cross-references don't convert cleanly to text chunks. The financial model -- arguably the most important document for VC due diligence -- produces the worst RAG answers.

**Why it happens:**
PDFs and text documents have mature parsing libraries. Excel is structurally different: it's a grid, not a document. Traditional embeddings struggle with numerical reasoning. A cell containing "$2.4M" next to "Year 3 ARR" requires understanding spatial relationships that text embeddings don't capture well.

**How to avoid:**
Treat Excel as a first-class citizen, not an afterthought:
1. Pre-process Excel into structured markdown tables (preserve headers, labels, and relationships)
2. Create natural language summaries of key financial tables using an LLM during ingestion (e.g., "The financial model projects ARR growing from $500K in Year 1 to $5M in Year 3")
3. For the PoC, manually curate 5-10 key financial facts as a "financial summary" document alongside the raw data -- this is the fastest path to accurate financial Q&A
4. Consider using the Excel source directly rather than trying to RAG over a PDF export of the spreadsheet

**Warning signs:**
- Financial questions get vague answers while text-based questions work well
- Chunk previews of Excel data show meaningless number sequences
- The LLM can't answer "What's the burn rate?" despite it being in the financial model

**Phase to address:**
Phase 1 (Document Ingestion). Excel parsing must be validated alongside PDF parsing, not deferred to a later phase.

---

### Pitfall 6: The Dogfood Content Paradox -- Demo Content Created Under Pressure

**What goes wrong:**
The platform's demo IS its own pitch materials. If the pitch deck is weak, the financial model is incomplete, or the supporting docs are thin, then the demo fails regardless of how good the technology is. A VC sees a mediocre pitch presented through a cool tool -- and concludes the tool makes mediocre pitches look mediocre.

**Why it happens:**
The founder focuses on building the platform and treats content creation as a secondary task. Creating a compelling pitch deck, a realistic financial model, and supporting documents is itself a multi-day effort that competes for time with engineering.

**How to avoid:**
Create the demo content FIRST or in parallel with Phase 1 engineering. The content should be:
- A polished 12-15 slide pitch deck (the kind you'd actually send to a VC)
- A financial model with realistic projections (TAM/SAM/SOM, revenue model, burn rate)
- 2-3 supporting documents (competitive landscape, technical architecture overview, team bios)

Draft the content early and iterate it. The content quality IS the demo quality. Consider having the content ready before the RAG pipeline so you can test parsing immediately.

**Warning signs:**
- Week 3 and still using placeholder content ("Lorem ipsum" or generic startup data)
- Financial model has obviously fake numbers that undermine credibility
- The pitch deck was created in one evening

**Phase to address:**
Content creation should be a parallel workstream starting in Phase 1, not a final-phase task. The roadmap should explicitly allocate time for this.

---

### Pitfall 7: Next.js + Python Backend Becomes Two Separate Apps That Don't Talk Well

**What goes wrong:**
The Next.js frontend and Python RAG backend become two independent projects with mismatched APIs, CORS issues, inconsistent error handling, and no shared type definitions. Every feature requires coordinated changes in two codebases. The developer spends more time on API plumbing than on features.

**Why it happens:**
Next.js and Python naturally want to be separate services. Unlike a pure Next.js + Node.js setup where you can use server actions and shared types, Python requires explicit API contracts. Solo developers often skip API design and bolt things together ad-hoc.

**How to avoid:**
Design the API contract upfront with 5-6 endpoints maximum for the PoC:
1. `POST /ingest` -- upload and process documents
2. `POST /query` -- ask a question, get an answer with citations
3. `GET /documents` -- list ingested documents
4. `GET /queue` -- get pending HITL review items
5. `POST /review` -- approve/reject a queued answer
6. `GET /health` -- backend status

Use FastAPI (not Flask) for the Python backend -- it generates OpenAPI specs automatically, has built-in request validation, and async support. Use Next.js API routes as a thin proxy/BFF layer to avoid CORS entirely. Keep the Python backend focused purely on RAG operations.

**Warning signs:**
- CORS errors in development
- Duplicated validation logic in frontend and backend
- API endpoints proliferating beyond the initial contract
- Spending more than a day on API integration issues

**Phase to address:**
Phase 1 (Project Setup). Define the API contract before writing any code. Use the FastAPI auto-generated docs as the contract.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hard-coded confidence thresholds | Ship HITL faster | Thresholds won't generalize to other pitch decks | PoC only -- fine for dogfood demo, must parameterize for multi-tenant |
| ChromaDB in-process | Zero infrastructure | No persistence across deploys, no concurrent access | PoC only -- migrate to pgvector or Qdrant when going multi-tenant |
| LLM-generated financial summaries during ingestion | Accurate financial Q&A | Summaries could hallucinate, adds ingestion latency | Acceptable if human-verified for the demo content |
| Skipping authentication for development | Faster iteration | Security hole if deployed without adding it | Development only -- must add before any external demo |
| Single embedding model for all modalities | Simpler pipeline | May underperform on tables vs. prose | PoC -- evaluate multi-model approach post-validation |
| Manual content curation alongside RAG | Better demo answers | Doesn't scale beyond dogfood content | PoC only -- this IS the right approach for a demo |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| OpenAI API | No timeout/retry logic; one slow call blocks the UI | Set 30s timeout, implement streaming for Q&A responses, show typing indicator |
| OpenAI API | Sending entire documents as context instead of retrieved chunks | Limit context to top-k retrieved chunks (3-5), include source metadata |
| LlamaParse / Document parsing API | Assuming parsing is instant; blocking upload UI | Parse async, show processing status, allow user to continue while parsing completes |
| Vector store (ChromaDB) | Not persisting the collection directory | Configure explicit persist_directory, verify data survives server restart |
| Vercel / Cloud deployment | Assuming Python backend deploys alongside Next.js | Deploy Python backend separately (Railway, Render, or a small VPS); Next.js on Vercel with API rewrites |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Synchronous document ingestion | Upload hangs for 30+ seconds | Background job with status polling | Any PDF over 20 pages |
| No streaming for LLM responses | 5-10 second blank wait before answer appears | Implement SSE/streaming from day one | Every single query |
| Loading full document content on page load | Slow initial page render | Lazy load sections, paginate content | Documents over 50 pages |
| Re-embedding on every query | Slow Q&A response | Embed once during ingestion, query against stored embeddings | This would be broken from the start -- verify you're not accidentally doing this |
| No caching of repeated questions | Same question hits LLM every time | Cache Q&A pairs, invalidate on content change | Multiple investors exploring the same deck |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing raw LLM prompts in API responses | Investors see system instructions, prompt injection surface | Strip system prompts from responses, return only the answer and citations |
| No access control on document endpoints | Anyone with the URL can access confidential pitch materials | Implement shareable link tokens with expiry, verify on every API call |
| Storing API keys in frontend code | Key theft, billing abuse | All LLM calls go through Python backend only; keys in environment variables |
| Allowing arbitrary file uploads without validation | Malicious files, server compromise | Whitelist PDF/XLSX/DOCX only, validate MIME types, scan file size limits |
| Shared investor links don't expire | Leaked links give permanent access to confidential materials | Token-based links with configurable expiry (7-30 days for PoC) |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No loading state during Q&A | Investor thinks app is broken, clicks away | Stream response tokens, show "Searching documents..." then "Generating answer..." |
| Showing raw chunk text as citations | Confusing, looks broken | Show clean source card: document name, page number, highlighted relevant excerpt |
| Confidence scores shown as raw numbers (0.73) | Meaningless to investors | Use visual indicators: green checkmark (verified), yellow (AI-generated), orange (pending review) |
| Asking investors to navigate complex UI | Friction kills the demo | Single scrollable page with inline Q&A -- the document IS the interface |
| No suggested questions | Blank input box is intimidating | Pre-populate 3-5 compelling example questions that showcase the best answers |
| Q&A answers without source links | Investor can't verify, doesn't trust | Every answer must link back to the specific slide/page/cell it came from |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Document ingestion:** Often missing error handling for malformed PDFs -- verify with corrupted/scanned PDFs that graceful errors appear
- [ ] **Q&A pipeline:** Often missing streaming -- verify first token appears within 1-2 seconds, not after full generation
- [ ] **Citations:** Often missing page-level granularity -- verify clicking a citation scrolls to the exact source location
- [ ] **HITL queue:** Often missing notification to founder -- verify founder knows when items need review (email, dashboard badge)
- [ ] **Shareable links:** Often missing expiry/revocation -- verify a revoked link actually stops working
- [ ] **Mobile responsiveness:** Often broken in document viewers -- verify the demo works on a tablet (VCs review on iPads)
- [ ] **Demo flow:** Often missing the "happy path" curation -- verify the 5 most likely investor questions produce excellent answers
- [ ] **Error states:** Often missing entirely -- verify what happens when the LLM API is down, when a document fails to parse, when a question has no relevant context

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Bad PDF parsing | MEDIUM | Swap parser (LlamaParse/Docling), re-ingest all documents; pipeline should support re-ingestion |
| Wrong chunking strategy | MEDIUM | Redefine chunks, re-embed everything; this is why the ingestion pipeline must be re-runnable |
| Confidence calibration wrong | LOW | Adjust thresholds, no code change needed if thresholds are configurable |
| Two-app integration mess | HIGH | Refactor to clean API contract; this is why defining the contract upfront matters |
| Demo content too weak | MEDIUM | Spend 2-3 focused days on content; better to delay demo than show weak content |
| Scope creep in RAG pipeline | MEDIUM | Cut scope ruthlessly, time-box remaining work, ship with simpler retrieval |
| Excel parsing broken | LOW-MEDIUM | Fall back to manually curated financial summary document while fixing parser |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| PDF table destruction | Phase 1: Document Ingestion | Parse a financial table PDF, verify numbers match source exactly |
| Chunking destroys context | Phase 1: Document Ingestion | Review 10 random chunks, verify each makes sense standalone |
| Confidence miscalibration | Phase 2: RAG Pipeline + Phase 3: HITL | Test 20 questions, verify confidence correlates with answer quality |
| Overengineering RAG | Project-level time-boxing | Working vertical slice (upload -> question -> answer) by end of week 1 |
| Excel ingestion failure | Phase 1: Document Ingestion | Ask 5 financial questions, verify answers match spreadsheet data |
| Weak demo content | Parallel workstream from Phase 1 | External reviewer rates pitch deck quality before demo |
| Next.js/Python integration | Phase 1: Project Setup | API contract documented, health check working, one end-to-end call proven |
| No streaming UX | Phase 2: RAG Pipeline | First answer token visible within 2 seconds of asking |
| Security gaps | Phase 4: Auth & Polish | Penetration test shareable links, verify key isolation |

## Sources

- [Enterprise RAG: Common Pitfalls & Effective Solutions (Fram)](https://wearefram.com/blog/enterprise-rag/)
- [PDF Parsing in RAG: How to Parse PDF Tables (Elasticsearch Labs)](https://www.elastic.co/search-labs/blog/alternative-approach-for-parsing-pdfs-in-rag)
- [Fix RAG Hallucinations at the Source: Top PDF Parsers Ranked 2025](https://infinityai.medium.com/3-proven-techniques-to-accurately-parse-your-pdfs-2c01c5badb84)
- [Hands-on RAG Over Excel Sheets (Daily Dose of DS)](https://blog.dailydoseofds.com/p/hands-on-rag-over-excel-sheets)
- [Human-in-the-Loop AI in Document Workflows (Parseur)](https://parseur.com/blog/hitl-best-practices)
- [Improving RAG Systems with Human-in-the-Loop Review (Label Studio)](https://labelstud.io/blog/why-human-review-is-essential-for-better-rag-systems/)
- [LLM Hallucinations in 2026 (Lakera)](https://www.lakera.ai/blog/guide-to-hallucinations-in-large-language-models)
- [Benchmarking Hallucination Detection Methods in RAG (Cleanlab)](https://cleanlab.ai/blog/rag-tlm-hallucination-benchmarking/)
- [pgvector vs ChromaDB (Elest.io)](https://blog.elest.io/pgvector-vs-chromadb-when-to-extend-postgresql-and-when-to-go-dedicated/)
- [Vector Stores for RAG Comparison (Glukhov)](https://www.glukhov.org/post/2025/12/vector-stores-for-rag-comparison/)
- [Building Production RAG Systems in 2026 (Likhon)](https://brlikhon.engineer/blog/building-production-rag-systems-in-2026-complete-tutorial-with-langchain-pinecone)
- [Next.js with Python Backend Discussion (Hacker News)](https://news.ycombinator.com/item?id=41866366)

---
*Pitfalls research for: AI-powered interactive pitch/due diligence platform with multimodal RAG*
*Researched: 2026-03-17*
