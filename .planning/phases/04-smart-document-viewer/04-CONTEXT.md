# Phase 4: Smart Document Viewer - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Investors experience the pitch as a polished, scrollable web document with Q&A integrated inline at each section. Covers: section-based content rendering from chunks, inline contextual Q&A via slide-in panel, mobile-responsive layout, and professional visual design. Does NOT cover: confidence scoring (Phase 5), authentication (Phase 6), analytics (Phase 7), or live pitch mode (Phase 8).

</domain>

<decisions>
## Implementation Decisions

### Content layout & visual design
- Gamma-style full-width cards per section with generous whitespace and smooth scrolling between distinct visual blocks
- Uniform card styling across all sections — clean white cards on a subtle background, no alternating or type-based differentiation
- Sticky header with company name + collapsible TOC sidebar on the left for quick section jumping
- Wide content column (max-w-5xl, ~1024px) — room for tables and financial data while staying readable

### Inline Q&A interaction
- Floating action button (FAB) always visible — clicking opens Q&A pre-scoped to the nearest/current section
- Q&A appears as a slide-in panel from the right (like Notion comments) — content stays visible alongside the answer
- Conversation thread mode — all questions asked during this session shown as a scrollable thread with follow-up capability
- Section context chip above the input ("Asking about: [Section Name]") — investor knows it's scoped, can remove chip to ask globally
- Reuses existing WebSocket streaming from Phase 3 for answer delivery

### Section rendering by type
- Financial tables (chunk_type='table') render as card-based key metrics — dashboard-style grid with big numbers (TAM, Revenue, Burn Rate) rather than raw HTML tables
- Heading chunks (chunk_type='heading') become section dividers — larger text with subtle horizontal rule, separating groups of content cards
- Text chunks render as rich markdown — bold, lists, links, code blocks all styled, polished blog-post feel
- Sections group by source document — Pitch Deck sections together, then Financial Model, then supporting docs — each with its own document heading
- Image caption chunks: Claude's discretion on rendering approach

### Mobile & responsive behavior
- TOC sidebar collapses into hamburger menu that opens a slide-out drawer on mobile
- Q&A panel becomes full-screen takeover on mobile — back button returns to content
- FAB positioned bottom-center on mobile — equally thumb-reachable for both hands, prominent
- Key metrics cards stack vertically (full-width) on mobile — no cramped grids
- Desktop: FAB bottom-right (standard position)

### Claude's Discretion
- Exact card shadows, border-radius, spacing values (follow existing shadcn theme tokens)
- Section transition animations and scroll behavior
- Loading/skeleton states for the viewer
- Image caption chunk rendering approach
- TOC sidebar width and styling
- Error states (failed to load pitch content)
- Empty state (no documents uploaded yet)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product vision
- `docs/prd.md` — Full PRD with viewer module specs, investor experience requirements
- `.planning/REQUIREMENTS.md` — VIEW-01 (scrollable web document), VIEW-02 (mobile-responsive), VIEW-03 (professional design), QA-02 (inline contextual Q&A)

### Database schema & data model
- `supabase/migrations/00001_init.sql` — Chunks table with section_number, page_number, chunk_type, document_id — the data source for viewer sections
- `apps/api/app/models/chunk.py` — ChunkRecord schema with chunk_type enum (text, table, heading, image_caption)
- `apps/api/app/models/document.py` — DocumentResponse with title, metadata for document grouping

### Existing Q&A infrastructure (Phase 3)
- `apps/web/hooks/use-query-stream.ts` — WebSocket streaming hook to reuse for inline Q&A
- `apps/web/components/query/` — StreamingAnswer, CitationList, QueryInput components to adapt for the slide-in panel
- `apps/api/app/services/query_engine.py` — Query engine with GPT-4o streaming, citation generation
- `apps/api/app/services/retrieval.py` — Vector retrieval + Cohere rerank pipeline

### Prior phase context
- `.planning/phases/03-rag-query-engine/03-CONTEXT.md` — Citation format (document_id + section_number for clickable links), WebSocket streaming, professional/concise AI tone

### Frontend patterns
- `apps/web/components/ui/` — shadcn/ui components (Card, Badge, Skeleton, Separator, Button, Dialog)
- `apps/web/lib/utils.ts` — cn() helper for Tailwind class merging
- `apps/web/app/globals.css` — Theme tokens (CSS variables, HSL/OKLCH)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Card` component (shadcn/ui): base for section cards, already has shadow/rounded variants
- `Skeleton` component: loading states for viewer sections
- `useQueryStream` hook: WebSocket streaming for Q&A panel, already handles status/answer/citations/error
- `StreamingAnswer` component: renders streaming text, adaptable for slide-in panel
- `CitationList` component: expandable citation display, reuse in Q&A thread
- `QueryInput` component: text input with submit, reuse for Q&A panel input
- `Badge` component: could be used for section context chip ("Asking about: [Section]")
- `Separator` component: for section dividers between document groups

### Established Patterns
- shadcn/ui base-nova style with CSS variables for theming
- Tailwind utilities composed via cn() helper
- Next.js App Router with client components for interactive features
- API proxy via Next.js rewrites for REST endpoints
- WebSocket connects directly to FastAPI (not through proxy) via NEXT_PUBLIC_WS_URL

### Integration Points
- New route: `/pitch` or `/viewer` for the investor-facing document viewer
- API endpoint needed: GET /api/v1/documents/{id}/chunks — fetch all chunks for a document, ordered by section_number
- API endpoint needed: GET /api/v1/pitch — fetch all "ready" documents with their chunks for the viewer
- Q&A panel reuses existing WebSocket /api/v1/query/{id}/stream endpoint
- Query engine needs section-scoping: pass current section context to boost relevant chunk retrieval

</code_context>

<specifics>
## Specific Ideas

- The viewer is the core investor experience — this is what VCs see when they open a shared link. It must feel like Gamma, not like a developer tool.
- Financial metrics displayed as big-number cards (TAM: $X.XB, Revenue: $XM) are more impactful than raw spreadsheet tables for VC audiences.
- The FAB + slide-in panel pattern keeps the pitch content primary while making Q&A always accessible — investors shouldn't feel like they left the pitch to ask a question.
- Section context chip ("Asking about: Market Size") gives the AI better retrieval context AND shows the investor their question is scoped intelligently.
- Citation data from Phase 3 already includes document_id + section_number — Phase 4 can make these clickable to scroll to the referenced section in the viewer.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-smart-document-viewer*
*Context gathered: 2026-03-19*
