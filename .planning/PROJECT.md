# Zeee Pitch Zooo

## What This Is

An AI-powered interactive pitch platform that transforms static pitch decks into living, queryable documents for venture capital due diligence. Investors explore a smart scrollable document with inline AI Q&A powered by multimodal RAG, while founders maintain control through confidence-based Human-in-the-Loop validation. The PoC dogfoods itself — Zeee Pitch Zooo's own fundraising materials are the demo content.

## Core Value

Investors can ask natural language questions about any aspect of a startup's pitch — financials, technical architecture, market data — and get accurate, source-cited answers instantly, without the founder needing to be in the room.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Multimodal RAG ingestion (PDF slides, Excel financials, text documents)
- [ ] Smart document viewer (scrollable web page with pitch content)
- [ ] Inline AI Q&A (investor asks questions, AI answers from uploaded corpus)
- [ ] Confidence scoring on AI responses with visual indicators
- [ ] Evidence packs (source citations, document links for every answer)
- [ ] Confidence-based HITL (high-confidence auto-publishes, low-confidence queues for founder review)
- [ ] Founder validation dashboard (approve/edit/reject queued answers)
- [ ] Authentication and role-based access control (founder vs investor roles)
- [ ] Secure shareable links for investor access
- [ ] Founder content management (upload and manage pitch materials)
- [ ] Live pitch mode (founder presents, VC asks questions in real-time)
- [ ] Async exploration mode (investor explores solo via shared link)

### Out of Scope

- Behavioral analytics and investor intent scoring — v2 feature, not needed for PoC demo impact
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
- 2-4 week timeline to demo-ready PoC
- Demo strategy: dogfooding — the platform pitches itself using its own materials
- Target audience for demo: VCs who need to be wowed by the experience
- The PRD describes the full product vision; this PoC validates the core interaction model
- Key insight from PRD: VCs spend 3:44 on average reviewing a deck — the platform must make that time dramatically more productive
- Dual-mode usage: live pitch meetings AND async investor exploration

## Constraints

- **Tech stack**: Turborepo monorepo — Next.js/React frontend (pnpm), Python/FastAPI backend for RAG (uv), cloud-hosted
- **Timeline**: 2-4 weeks to demo-ready (tight sprint)
- **Team**: Solo + AI — every architectural decision must favor simplicity and speed
- **Content**: Must create Zeee Pitch Zooo's own pitch materials (deck, financial model, supporting docs) as demo content
- **RAG complexity**: Must handle three modalities (PDF slides, Excel spreadsheets, text documents) — the hardest technical challenge in the PoC

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Smart scrollable document (not slide viewer) | More modern feel, better for inline Q&A integration, Gamma-style UX is familiar to VCs | — Pending |
| Confidence-based HITL (not strict approval) | Enables async investor exploration without bottlenecking on founder availability | — Pending |
| Auth + RBAC only for security (not full VDR) | Sufficient credibility signal for PoC, dramatically reduces build scope | — Pending |
| Dogfooding as demo strategy | Meta-demo is compelling, reduces need for external demo content, proves the product works | — Pending |
| Next.js + Python RAG backend | Modern web stack with best-in-class AI/ML ecosystem for RAG pipeline | — Pending |
| Turborepo monorepo (pnpm + uv) | Single repo with unified build orchestration; pnpm for TS, uv for Python | — Pending |

---
*Last updated: 2026-03-17 after initialization*
