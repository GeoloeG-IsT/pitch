# Roadmap: Zeee Pitch Zooo

## Overview

This roadmap delivers a demo-ready PoC of an AI-powered interactive pitch platform in 8 phases. The critical path runs through document ingestion and RAG -- everything downstream depends on documents being correctly parsed, chunked, and retrievable. Demo content is created first (Phase 1) so it's available for testing every subsequent phase with real data. The investor-facing viewer and Q&A engine form the core experience (Phases 3-4), with trust/HITL, auth, analytics, and live mode layered on top. Every phase delivers a coherent, testable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation + Demo Content** - Turborepo monorepo scaffolding (pnpm + uv), API contract, and Zeee Pitch Zooo's own pitch materials
- [ ] **Phase 2: Document Ingestion** - Multimodal document parsing, chunking, embedding, and content management
- [ ] **Phase 3: RAG Query Engine** - Vector retrieval, prompt construction, and streamed AI answers with citations
- [ ] **Phase 4: Smart Document Viewer** - Scrollable investor-facing pitch viewer with inline contextual Q&A
- [ ] **Phase 5: Trust + HITL Validation** - Confidence scoring, answer routing, and founder review dashboard
- [ ] **Phase 6: Auth + Access Control** - Authentication, RBAC, shareable links, and access revocation
- [ ] **Phase 7: Analytics** - Investor engagement tracking, per-section analytics, and behavioral signals
- [ ] **Phase 8: Live Pitch Mode** - Real-time presenter view with live investor Q&A

## Phase Details

### Phase 1: Foundation + Demo Content
**Goal**: A Turborepo monorepo (pnpm + uv) with running Next.js frontend and FastAPI backend, Supabase provisioned, API contract defined, and Zeee Pitch Zooo's own pitch materials ready for ingestion testing
**Depends on**: Nothing (first phase)
**Requirements**: DEMO-01, DEMO-02, DEMO-03
**Success Criteria** (what must be TRUE):
  1. Turborepo monorepo initialized with pnpm (TS workspace) and uv (Python workspace), both services building and running
  2. Next.js frontend and FastAPI backend communicating via health check endpoint
  3. Supabase database provisioned with pgvector extension enabled and core data models (users, documents, chunks) created
  3. A 12-15 slide pitch deck PDF for Zeee Pitch Zooo exists and is ready for upload
  4. A financial model spreadsheet (TAM/SAM/SOM, revenue projections, burn rate) exists and is ready for upload
  5. At least 2 supporting documents (investment memo, technical architecture) exist and are ready for upload
**Plans**: 2 plans

Plans:
- [ ] 01-01-PLAN.md -- Scaffold Turborepo monorepo with Next.js, FastAPI, Supabase schema, and health status page
- [ ] 01-02-PLAN.md -- Create demo content (pitch deck, financial model, investment memo, technical architecture)

### Phase 2: Document Ingestion
**Goal**: Founders can upload PDF, text, and Excel documents that are parsed with structure preserved, chunked intelligently, embedded, and stored for retrieval
**Depends on**: Phase 1
**Requirements**: INGEST-01, INGEST-02, INGEST-03, INGEST-04, MGMT-01, MGMT-02
**Success Criteria** (what must be TRUE):
  1. Founder can upload a PDF pitch deck and see it parsed into individual slide sections with text and table structure intact
  2. Founder can upload text documents (memos, architecture docs) and see them indexed for retrieval
  3. Founder can upload an Excel financial model and see tables extracted as structured, queryable data
  4. Founder can view, organize, and re-upload documents with the RAG index refreshing automatically
  5. Document sections preserve their original structure (slide boundaries, chapter headings, table layouts) in the chunk metadata
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: RAG Query Engine
**Goal**: Investors can ask natural language questions and receive streamed, source-cited AI answers that draw from the full pitch corpus
**Depends on**: Phase 2
**Requirements**: QA-01, QA-03, QA-04
**Success Criteria** (what must be TRUE):
  1. Investor can type a natural language question and receive an AI-generated answer with specific source citations (document name, section)
  2. Answers stream in real-time token-by-token (not a loading spinner followed by a full response)
  3. AI references related sections across the full pitch structure when relevant (e.g., linking financials to market size claims)
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Smart Document Viewer
**Goal**: Investors experience the pitch as a polished, scrollable web document with Q&A integrated inline at each section
**Depends on**: Phase 3
**Requirements**: VIEW-01, VIEW-02, VIEW-03, QA-02
**Success Criteria** (what must be TRUE):
  1. Investor sees pitch content rendered as a scrollable, card/section-based web document (not a PDF embed or slide viewer)
  2. Q&A is contextual to the section being viewed -- investor can ask questions inline at any section, not in a separate chat panel
  3. Viewer renders correctly and is usable on mobile devices (iPad, phone)
  4. Visual design is professional and polished -- comparable to Gamma or a high-quality landing page
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD

### Phase 5: Trust + HITL Validation
**Goal**: AI responses display calibrated confidence indicators, low-confidence answers are routed to the founder for review before investors see them, and founders can approve/edit/reject from a dashboard
**Depends on**: Phase 3
**Requirements**: TRUST-01, TRUST-02, TRUST-03
**Success Criteria** (what must be TRUE):
  1. Every AI response displays a confidence score with a visual indicator (green/yellow/red) that investors can see
  2. Low-confidence answers are automatically queued and hidden from investors until the founder reviews them
  3. Founder can view queued answers in a validation dashboard and approve, edit, or reject each one
  4. High-confidence answers auto-publish without founder intervention, enabling async investor exploration
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

### Phase 6: Auth + Access Control
**Goal**: Users have secure accounts with role-based permissions, and founders control investor access through shareable links they can revoke
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. Users can create accounts and log in with persistent sessions
  2. Founder and investor roles have different permissions -- founders see dashboard/management views, investors see the pitch viewer
  3. Founder can generate a secure shareable link that gives an investor access to the pitch
  4. Founder can revoke an investor's access, immediately preventing further viewing
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

### Phase 7: Analytics
**Goal**: Founders have visibility into investor engagement -- who viewed, how long, which sections, what questions, and which investors show the strongest signals
**Depends on**: Phase 6
**Requirements**: ANLYT-01, ANLYT-02, ANLYT-03, ANLYT-04, ANLYT-05
**Success Criteria** (what must be TRUE):
  1. Founder can see a list of which investors viewed the pitch and when they last accessed it
  2. Founder can see time spent per section for each investor
  3. Founder receives a notification when an investor opens a shared link
  4. Founder can view a log of all questions investors have asked across sessions
  5. System flags high-engagement investors based on behavioral signals (extended time on financials, multiple deep questions)
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD

### Phase 8: Live Pitch Mode
**Goal**: Founders can present the pitch in real-time while investors ask questions via the Q&A interface, with the founder seeing incoming questions and AI draft answers in a presenter view
**Depends on**: Phase 4, Phase 5
**Requirements**: LIVE-01, LIVE-02
**Success Criteria** (what must be TRUE):
  1. Founder can initiate a live pitch session where investors join and ask questions via the Q&A interface in real-time
  2. Founder sees a presenter view showing incoming investor questions alongside AI-drafted answers they can approve or override before publishing
**Plans**: TBD

Plans:
- [ ] 08-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8
Note: Phase 6 (Auth) depends on Phase 1 only and can execute in parallel with Phases 2-5 if desired.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation + Demo Content | 0/2 | Planning complete | - |
| 2. Document Ingestion | 0/0 | Not started | - |
| 3. RAG Query Engine | 0/0 | Not started | - |
| 4. Smart Document Viewer | 0/0 | Not started | - |
| 5. Trust + HITL Validation | 0/0 | Not started | - |
| 6. Auth + Access Control | 0/0 | Not started | - |
| 7. Analytics | 0/0 | Not started | - |
| 8. Live Pitch Mode | 0/0 | Not started | - |
