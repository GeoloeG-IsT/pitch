# Requirements: Zeee Pitch Zooo

**Defined:** 2026-03-17
**Core Value:** Investors can ask natural language questions about any aspect of a startup's pitch — financials, technical architecture, market data — and get accurate, source-cited answers instantly, without the founder needing to be in the room.

## v1 Requirements

Requirements for the PoC demo. Each maps to roadmap phases.

### Document Ingestion

- [x] **INGEST-01**: Founder can upload PDF pitch deck and have it parsed into searchable sections
- [x] **INGEST-02**: Founder can upload text documents (memos, architecture docs) for RAG indexing
- [x] **INGEST-03**: Founder can upload Excel financial models with structured table extraction
- [x] **INGEST-04**: System maps document sections to preserve structure (slides, chapters, tables) for section-aware retrieval

### Document Viewer

- [x] **VIEW-01**: Investor sees pitch content as a scrollable, web-native document (card/section format)
- [x] **VIEW-02**: Viewer is mobile-responsive
- [x] **VIEW-03**: Viewer has professional, polished visual design

### AI Q&A

- [x] **QA-01**: Investor can ask natural language questions and receive AI-generated answers with source citations
- [x] **QA-02**: Q&A is contextual to the section being viewed (inline, not separate chat panel)
- [x] **QA-03**: AI is aware of full pitch structure and can reference related sections elsewhere in the presentation
- [x] **QA-04**: Answers stream in real-time (not a loading spinner then full response)

### Trust & Validation

- [x] **TRUST-01**: AI responses display confidence scores with visual indicators (green/yellow/red)
- [x] **TRUST-02**: Low-confidence answers queue for founder review before being visible to investors
- [x] **TRUST-03**: Founder can approve, edit, or reject queued answers from a validation dashboard

### Auth & Security

- [x] **AUTH-01**: Users can create accounts and log in
- [x] **AUTH-02**: Role-based access control (founder vs investor roles with different permissions)
- [x] **AUTH-03**: Founder can generate secure shareable links for investor access
- [x] **AUTH-04**: Founder can revoke investor access

### Content Management

- [x] **MGMT-01**: Founder can upload, organize, and manage pitch documents
- [x] **MGMT-02**: Founder can update documents and have RAG index refresh

### Analytics

- [ ] **ANLYT-01**: Founder can see which investors viewed the pitch and when
- [ ] **ANLYT-02**: Founder can see time spent per section by each investor
- [ ] **ANLYT-03**: Founder gets notified when an investor opens the shared link
- [ ] **ANLYT-04**: Founder can see a log of all questions investors asked
- [ ] **ANLYT-05**: System flags high-engagement investors based on behavioral signals (5+ min on financials, multiple deep questions)

### Live Pitch Mode

- [ ] **LIVE-01**: Founder can present the pitch while investors ask questions via the Q&A interface in real-time
- [ ] **LIVE-02**: Founder sees a presenter view with incoming questions and AI draft answers

### Demo Content

- [x] **DEMO-01**: Create Zeee Pitch Zooo's own pitch deck as demo content
- [x] **DEMO-02**: Create Zeee Pitch Zooo's financial model as demo content
- [x] **DEMO-03**: Create supporting documents (investment memo, technical architecture) as demo content

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced RAG

- **RAG-01**: Image and chart understanding in RAG pipeline (OCR + vision models)
- **RAG-02**: Cross-document reasoning (combine insights from multiple files)

### Security Hardening

- **SEC-01**: Dynamic watermarking on rendered documents
- **SEC-02**: DRM and remote wipe capability
- **SEC-03**: Full audit trail with tamper-proof logging
- **SEC-04**: SOC 2 Type II compliance infrastructure

### Ecosystem

- **ECO-01**: Salesforce CRM integration
- **ECO-02**: HubSpot CRM integration
- **ECO-03**: Slack integration for HITL notifications
- **ECO-04**: Investor intent scoring with ML models

### Experimentation

- **EXP-01**: A/B narrative testing with statistical controls
- **EXP-02**: Narrative friction point detection

### Operations

- **OPS-01**: Prompt versioning and rollback
- **OPS-02**: RAG evaluation pipeline (RAG Triad metrics)
- **OPS-03**: Multi-language support

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| AI pitch deck generation | Zeee Pitch Zooo is a consumption/exploration tool, not a creation tool |
| Real-time collaborative editing | Founder uploads, investors consume — no editing collaboration needed |
| Audio/video summaries (NotebookLM-style) | Tangential to core Q&A value, computationally expensive |
| Multi-tenant SaaS infrastructure | Single-tenant PoC is sufficient for demo |
| Mobile native app | Web-first, responsive design covers mobile use cases |
| EU AI Act compliance | Important but not PoC-blocking |
| Payment/billing system | No monetization in PoC phase |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INGEST-01 | Phase 2 | Complete |
| INGEST-02 | Phase 2 | Complete |
| INGEST-03 | Phase 2 | Complete |
| INGEST-04 | Phase 2 | Complete |
| VIEW-01 | Phase 4 | Complete |
| VIEW-02 | Phase 4 | Complete |
| VIEW-03 | Phase 4 | Complete |
| QA-01 | Phase 3 | Complete |
| QA-02 | Phase 4 | Complete |
| QA-03 | Phase 3 | Complete |
| QA-04 | Phase 3 | Complete |
| TRUST-01 | Phase 5 | Complete |
| TRUST-02 | Phase 5 | Complete |
| TRUST-03 | Phase 5 | Complete |
| AUTH-01 | Phase 6 | Complete |
| AUTH-02 | Phase 6 | Complete |
| AUTH-03 | Phase 6 | Complete |
| AUTH-04 | Phase 6 | Complete |
| MGMT-01 | Phase 2 | Complete |
| MGMT-02 | Phase 2 | Complete |
| ANLYT-01 | Phase 7 | Pending |
| ANLYT-02 | Phase 7 | Pending |
| ANLYT-03 | Phase 7 | Pending |
| ANLYT-04 | Phase 7 | Pending |
| ANLYT-05 | Phase 7 | Pending |
| LIVE-01 | Phase 8 | Pending |
| LIVE-02 | Phase 8 | Pending |
| DEMO-01 | Phase 1 | Complete |
| DEMO-02 | Phase 1 | Complete |
| DEMO-03 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-17 after roadmap creation*
