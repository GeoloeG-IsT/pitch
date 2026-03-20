# Zeee Pitch Zooo

## What This Is

An AI-powered interactive pitch platform that transforms static pitch decks into living, queryable documents for venture capital due diligence. Investors explore a smart scrollable document with inline AI Q&A powered by multimodal RAG, while founders maintain control through confidence-based Human-in-the-Loop validation. Includes live pitch mode for real-time presentations with presenter controls.

## Core Value

Investors can ask natural language questions about any aspect of a startup's pitch — financials, technical architecture, market data — and get accurate, source-cited answers instantly, without the founder needing to be in the room.

## Requirements

### Validated

- ✓ Multimodal RAG ingestion (PDF slides, Excel financials, text documents) — v1.0
- ✓ Smart document viewer (scrollable web page with pitch content) — v1.0
- ✓ Inline AI Q&A (investor asks questions, AI answers from uploaded corpus) — v1.0
- ✓ Confidence scoring on AI responses with visual indicators — v1.0
- ✓ Evidence packs (source citations, document links for every answer) — v1.0
- ✓ Confidence-based HITL (high-confidence auto-publishes, low-confidence queues for founder review) — v1.0
- ✓ Founder validation dashboard (approve/edit/reject queued answers) — v1.0
- ✓ Authentication and role-based access control (founder vs investor roles) — v1.0
- ✓ Secure shareable links for investor access — v1.0
- ✓ Founder content management (upload and manage pitch materials) — v1.0
- ✓ Live pitch mode (founder presents, VC asks questions in real-time) — v1.0
- ✓ Async exploration mode (investor explores solo via shared link) — v1.0
- ✓ Investor analytics and engagement tracking — v1.0 (moved from Out of Scope)

### Active

- [ ] Confidence threshold calibration with real user data
- [ ] Mobile responsive polish
- [ ] Rate limiting on API endpoints
- [ ] Password strength validation on signup

### Out of Scope

- A/B narrative testing — compelling but complex, defer to post-fundraise
- CRM integrations (Salesforce, HubSpot) — stub for demo, build post-PoC
- Slack integration — not needed for PoC validation
- LLMOps pipeline (prompt versioning, CI evaluation) — engineering maturity concern, not demo-critical
- Full VDR security (watermarking, DRM, remote wipe, encryption audit) — auth + RBAC sufficient for PoC credibility
- EU AI Act / regulatory compliance infrastructure — important but not PoC-blocking
- SOC 2 Type II attestation — enterprise concern, not PoC scope
- Mobile app — web-first
- Multi-tenant SaaS infrastructure — single-tenant PoC is fine

## Context

- Solo founder building with AI assistance (Claude), pre-fundraise
- v1.0 MVP shipped in 3 days (2026-03-17 → 2026-03-20)
- ~13,900 LOC: 8,124 TypeScript + 5,485 Python + 302 SQL
- Demo strategy: dogfooding — the platform pitches itself using its own materials
- Target audience for demo: VCs who need to be wowed by the experience
- Dual-mode usage: live pitch meetings AND async investor exploration
- WSL2 development environment: browser→Supabase direct calls hang, all client-side auth uses cookie-based token extraction

## Constraints

- **Tech stack**: Turborepo monorepo — Next.js 15/React 19 frontend (pnpm), Python/FastAPI backend for RAG (uv), Supabase (PostgreSQL 15)
- **Team**: Solo + AI — every architectural decision must favor simplicity and speed
- **Content**: Zeee Pitch Zooo's own pitch materials (deck, financial model, supporting docs) as demo content
- **Environment**: WSL2 — browser→Supabase direct API calls hang, must proxy through Next.js server or read from cookies

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Smart scrollable document (not slide viewer) | More modern feel, better for inline Q&A integration | ✓ Good — polished viewer with TOC, metric cards, section highlighting |
| Confidence-based HITL (not strict approval) | Enables async investor exploration without bottlenecking on founder | ✓ Good — 3-signal scoring, auto-publish for high confidence |
| Auth + RBAC only for security (not full VDR) | Sufficient credibility signal for PoC | ✓ Good — Supabase auth, role-based access, share tokens |
| Dogfooding as demo strategy | Meta-demo is compelling, proves the product works | ✓ Good — self-referential pitch materials |
| Next.js + Python RAG backend | Modern web stack with best-in-class AI/ML ecosystem | ✓ Good — clean separation, API proxy avoids CORS |
| Turborepo monorepo (pnpm + uv) | Single repo with unified build orchestration | ✓ Good — turbo tasks orchestrate cross-language builds |
| LlamaIndex for RAG pipeline | Mature framework with PDF/Excel parsers, embedding integration | ✓ Good — handled all document types well |
| Cookie-based auth token extraction | WSL2 Supabase client calls hang from browser | ✓ Good — reliable workaround, works across all hooks |
| In-memory session cache with DB hydration | Fast session lookups without DB round-trips | ✓ Good — survives restarts via startup hook |

---
*Last updated: 2026-03-20 after v1.0 milestone*
