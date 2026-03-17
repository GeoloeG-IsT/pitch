# Phase 1: Foundation + Demo Content - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Turborepo monorepo scaffolding (pnpm + uv) with running Next.js frontend and FastAPI backend, Supabase provisioned with pgvector, API contract defined, and Zeee Pitch Zooo's own pitch materials (deck, financial model, supporting docs) created and ready for ingestion testing in Phase 2.

</domain>

<decisions>
## Implementation Decisions

### Pitch deck narrative
- Narrative arc structure (not classic VC slide order): open with investor pain point (3:44 avg review time), build tension around broken status quo, reveal platform as resolution
- Bold & visionary tone — selling the dream, pre-seed energy
- Primary moat emphasis: interactive experience (AI Q&A + smart viewer combo — no one else lets investors interrogate a pitch in real-time)
- Range-based funding ask ($1-2M) — signals flexibility, leaves room for negotiation
- 12-15 slides total

### Financial model scope
- VC-standard detail level: TAM/SAM/SOM, 3-year revenue projections, unit economics, burn rate, runway
- Hybrid pricing model: base SaaS subscription + usage-based overage (per-investor-view or per-query)
- Market sizing: top-down for TAM (global VC deal flow), bottom-up for SAM/SOM (startups raising x avg spend)
- Illustrative but plausible numbers — realistic-looking projections, clearly labeled as demo content

### Supporting documents
- Investment memo: why-now thesis format — market timing argument (AI maturity + VC deal flow growth + broken status quo)
- Technical architecture doc: high-level system design — architecture diagram, component overview, tech stack rationale, RAG pipeline flow
- Intentionally designed to stress-test RAG: cross-references between docs, tables with numbers, claims requiring multi-doc reasoning for impressive demo Q&A
- Format: markdown source files (.md), generate PDF/Excel from them during build — version-controlled, CI-friendly

### Supabase data models
- Flat chunks with metadata: content, embedding vector, source doc ID, section number, page number, chunk type (text/table/heading)
- Core + stubs schema approach: create users, documents, chunks tables now; add placeholder columns/tables for auth roles and analytics to avoid painful migrations later
- Supabase CLI migrations for database versioning
- Supabase Auth from the start — users table comes free, RLS policies for access control, less custom code in Phase 6

### Claude's Discretion
- Turborepo workspace layout and shared config structure
- Next.js app router vs pages router
- FastAPI project structure and dependency management
- Health check endpoint design
- Exact pgvector configuration (dimensions, index type)
- Build pipeline for markdown-to-PDF/Excel conversion
- Exact slide count within 12-15 range

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product vision
- `docs/prd.md` — Full product requirements document with strategic context, feature specifications, and technical architecture vision. Key sections: Executive Vision (market context, 3:44 stat), Feature specifications (all modules), Technical Architecture recommendations.

### Project planning
- `.planning/PROJECT.md` — Project constraints, key decisions, tech stack (Turborepo, pnpm, uv, Next.js, FastAPI, Supabase)
- `.planning/REQUIREMENTS.md` — v1 requirements with IDs (DEMO-01, DEMO-02, DEMO-03 are Phase 1 requirements)
- `.planning/ROADMAP.md` — Phase dependencies and success criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None yet — Phase 1 establishes the foundational patterns all subsequent phases will follow

### Integration Points
- Turborepo monorepo structure will host all future frontend and backend code
- Supabase schema (users, documents, chunks) is the foundation for Phases 2-8
- Demo content markdown files feed directly into Phase 2 document ingestion testing
- Supabase Auth setup in Phase 1 reduces Phase 6 scope significantly

</code_context>

<specifics>
## Specific Ideas

- Pitch deck opens with the 3:44 stat (avg time VCs spend reviewing decks) as the hook — this is from the PRD and should anchor the narrative
- Financial model uses hybrid pricing (SaaS base + usage overage) to model both predictable revenue and engagement upside
- Supporting docs intentionally seed cross-document references so demo Q&A can show multi-doc reasoning (e.g., financial claims in deck referencing specific cells in the model)
- The platform dogfoods itself — Zeee Pitch Zooo's own materials ARE the demo content, making the meta-demo compelling

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-demo-content*
*Context gathered: 2026-03-17*
