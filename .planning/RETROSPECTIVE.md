# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-20
**Phases:** 9 | **Plans:** 22 | **Tasks:** 53

### What Was Built
- Multimodal RAG pipeline (PDF, Excel, Markdown) with LlamaIndex + Cohere reranking
- Smart scrollable pitch viewer with inline Q&A, TOC sidebar, metric cards
- 3-signal confidence scoring with founder review queue (auto-publish for high confidence)
- Supabase auth with role-based access, share tokens, OAuth
- Investor analytics: page views, engagement scoring, real-time notifications
- Live pitch mode: presenter view with approve/edit/override/dismiss actions

### What Worked
- Wave-based parallel execution kept plans independent and reduced conflicts
- Cookie-based auth token extraction pattern solved WSL2 Supabase hang issues once and reused everywhere
- Tight 1-2 task plans executed cleanly — most plans completed in 3-7 minutes
- User verification checkpoints caught real integration issues (WebSocket auth, investor tracking, role display)
- Milestone audit found 2 critical cross-phase integration bugs that user testing hadn't surfaced (share token auth injection, startup hydration)

### What Was Inefficient
- Phase 8 required 7 hotfixes during checkpoint verification — many were WSL2-specific issues that could have been caught if the research phase had flagged WSL2 as a constraint
- ROADMAP.md progress table got out of sync (phases 5, 7 still showed "Not started" despite being complete) — manual checkbox management is error-prone
- Some SUMMARY.md files lacked `one_liner` field, making milestone stats extraction incomplete

### Patterns Established
- WSL2 workaround: never call Supabase client from browser; use `getAuthHeaders()` (cookie extraction) or server-side API routes
- In-memory caches with DB startup hydration for fast lookups (used for sessions, extensible)
- `callbackRef` pattern in React hooks to avoid WebSocket reconnects on callback changes

### Key Lessons
1. Cross-phase integration bugs hide until milestone audit — always run audit before completing
2. WSL2 constraints must be documented early and treated as architectural decisions, not runtime bugs
3. Frontend checkpoint plans (autonomous: false) are valuable — they caught 7 bugs that code-only verification missed
4. Small, focused plans (2-3 tasks) execute more reliably than large ones

### Cost Observations
- Model mix: ~70% opus (execution), ~25% sonnet (verification, checking), ~5% haiku
- Execution speed: 22 plans in ~3 days
- Notable: Phase 8 took longest due to checkpoint-driven debugging cycle; Phases 1-7 were mostly autonomous

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 9 | 22 | Initial milestone — established wave execution, checkpoint, and audit patterns |

### Top Lessons (Verified Across Milestones)

1. Milestone audit catches integration bugs that per-phase verification misses
2. WSL2 development requires explicit architectural decisions around browser↔backend communication
