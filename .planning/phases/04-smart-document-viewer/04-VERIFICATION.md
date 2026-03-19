---
phase: 04-smart-document-viewer
verified: 2026-03-19T17:45:00Z
status: gaps_found
score: 9/10 must-haves verified
gaps:
  - truth: "Citations in Q&A thread are clickable and scroll the viewer to referenced section"
    status: failed
    reason: "CitationList component does not accept or render any onClick handler. qa-thread.tsx spreads _onClick onto Citation objects but CitationList only accepts {citations: Citation[], open: boolean} — the _onClick property is silently ignored and citations are rendered as static cards."
    artifacts:
      - path: "apps/web/components/query/citation-list.tsx"
        issue: "No onClick prop in CitationListProps. Renders citation.document_title and citation.section_label only, no click handler on Card elements."
      - path: "apps/web/components/qa/qa-thread.tsx"
        issue: "Line 80-84: spreads {_onClick: () => onCitationClick(c.chunk_id)} into Citation objects, but CitationList never reads _onClick."
    missing:
      - "Add onClick?: (chunkId: string) => void prop to CitationListProps in citation-list.tsx"
      - "Wire onClick to each citation Card in CitationList (wrap Card in button or add onClick to Card)"
      - "Update qa-thread.tsx to pass onCitationClick prop directly to CitationList instead of via spread"
---

# Phase 4: Smart Document Viewer Verification Report

**Phase Goal:** Investors experience the pitch as a polished, scrollable web document with Q&A integrated inline at each section
**Verified:** 2026-03-19T17:45:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GET /api/v1/pitch returns all ready documents with their chunks grouped by document | VERIFIED | `apps/api/app/api/v1/pitch.py` queries `.eq("status", "ready")`, groups chunks per document, returns `PitchResponse` |
| 2 | Frontend can fetch pitch data with typed PitchResponse interface | VERIFIED | `apps/web/lib/pitch-api.ts` exports `fetchPitch()`, `PitchResponse`, `PitchDocument`, `PitchChunk` |
| 3 | Table chunk content can be parsed into label-value metric pairs | VERIFIED | `apps/web/lib/parse-table-content.ts` — full `parseTableContent` implementation, not a stub |
| 4 | Investor sees pitch content rendered as scrollable section cards grouped by document | VERIFIED | `PitchViewer` -> `DocumentGroup` -> `SectionCard` chain fully wired; `pitch-viewer.tsx` fetches via `useEffect` and renders `DocumentGroup` for each document |
| 5 | Text chunks render as rich markdown with prose typography | VERIFIED | `text-section.tsx` uses `ReactMarkdown` with `remarkGfm` and `className="prose prose-neutral max-w-none"` |
| 6 | Table chunks render as dashboard-style metric card grids with big numbers | VERIFIED | `table-section.tsx` calls `parseTableContent`, renders `MetricCard` grid with `text-[32px] font-semibold`; falls back to ReactMarkdown |
| 7 | Heading chunks render as section dividers with horizontal rules | VERIFIED | `heading-section.tsx` renders `<h2>` + `<Separator>` inside `div id="section-{id}"` |
| 8 | TOC sidebar shows document groups with section links and highlights active section | VERIFIED | `toc-sidebar.tsx`: 106 lines, `ScrollArea`, `hidden lg:block` desktop sidebar, `border-l-2 border-primary` active state, Sheet mobile drawer |
| 9 | FAB is always visible when Q&A panel is closed; clicking FAB opens Q&A panel pre-scoped to currently visible section | VERIFIED | `fab-button.tsx` with `MessageSquare`, `fixed z-50`, responsive positioning; `pitch-viewer.tsx` wires `visible={!qaOpen && data.documents.length > 0}` and passes `activeSectionName` to `QAPanel` |
| 10 | Citations in Q&A thread are clickable and scroll the viewer to referenced section | FAILED | `CitationList` has no `onClick` prop. `qa-thread.tsx` spreads `_onClick` into citation objects but `CitationList` only accepts `{citations: Citation[], open: boolean}` — `_onClick` is ignored; citations render as static cards |

**Score:** 9/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/api/app/api/v1/pitch.py` | GET /api/v1/pitch endpoint | VERIFIED | 62 lines, queries ready docs + chunks, returns `PitchResponse` |
| `apps/api/app/models/pitch.py` | Pydantic models | VERIFIED | `PitchChunk`, `PitchDocument`, `PitchResponse` with correct field types |
| `apps/api/tests/test_pitch_api.py` | Backend tests | VERIFIED | 238 lines, tests status filtering, ordering, schema, empty state |
| `apps/web/lib/pitch-api.ts` | Frontend typed API client | VERIFIED | 27 lines, all 3 interfaces + `fetchPitch()` wired to `/api/v1/pitch` |
| `apps/web/lib/parse-table-content.ts` | Markdown table parser | VERIFIED | 32 lines, full implementation with separator filtering and cell extraction |
| `apps/web/app/pitch/page.tsx` | Server component entry | VERIFIED | 5 lines, imports and renders `PitchViewer` |
| `apps/web/components/viewer/pitch-viewer.tsx` | Top-level viewer | VERIFIED | 178 lines, loading/error/empty states, FAB + QAPanel wired |
| `apps/web/components/viewer/section-card.tsx` | Chunk-type dispatcher | VERIFIED | 56 lines, dispatches by `chunk_type` with `useInView` threshold 0.3 |
| `apps/web/components/viewer/text-section.tsx` | Markdown rendering | VERIFIED | `ReactMarkdown` + `prose prose-neutral max-w-none` |
| `apps/web/components/viewer/table-section.tsx` | Metric card grid | VERIFIED | `parseTableContent` import, `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, markdown fallback |
| `apps/web/components/viewer/toc-sidebar.tsx` | TOC sidebar | VERIFIED | 106 lines, `ScrollArea`, `w-60`, `border-l-2 border-primary`, `hidden lg:block`, mobile Sheet |
| `apps/web/components/viewer/fab-button.tsx` | FAB button | VERIFIED | 44 lines, `MessageSquare`, `fixed z-50 h-14 w-14 rounded-full`, `aria-label="Ask a question"`, `max-md:` mobile centering |
| `apps/web/components/qa/qa-panel.tsx` | Q&A slide-in panel | VERIFIED | 225 lines, `useQueryStream` wired, `w-[440px]` desktop panel, `Ask anything about this pitch` placeholder, mobile Dialog fallback |
| `apps/web/components/qa/qa-thread.tsx` | Conversation thread | VERIFIED | 95 lines, `StreamingAnswer`, `CitationList`, `ScrollArea`, auto-scroll via `useEffect` |
| `apps/web/components/qa/section-context-chip.tsx` | Context badge | VERIFIED | 34 lines, `Badge`, `Asking about:`, `aria-label="Remove section filter"` |
| `apps/web/hooks/use-active-section.ts` | Active section hook | VERIFIED | 13 lines, exports `useActiveSection` with `activeId` + `handleInView` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/api/app/main.py` | `apps/api/app/api/v1/pitch.py` | `include_router(pitch_router, prefix="/api/v1")` | VERIFIED | Line 8 + 32 in main.py confirm import and registration |
| `apps/web/lib/pitch-api.ts` | `/api/v1/pitch` | `fetch(\`${API_BASE}/pitch\`)` | VERIFIED | Line 24 in pitch-api.ts |
| `apps/web/app/pitch/page.tsx` | `pitch-viewer.tsx` | `import { PitchViewer }` | VERIFIED | Line 1 of page.tsx imports and renders |
| `apps/web/components/viewer/pitch-viewer.tsx` | `pitch-api.ts` | `fetchPitch()` | VERIFIED | Line 6 + 25 in pitch-viewer.tsx |
| `apps/web/components/viewer/section-card.tsx` | `text-section.tsx` | `chunk_type === "text"` | VERIFIED | Line 50 in section-card.tsx |
| `apps/web/components/viewer/table-section.tsx` | `parse-table-content.ts` | `import { parseTableContent }` | VERIFIED | Line 5 in table-section.tsx |
| `apps/web/components/viewer/pitch-viewer.tsx` | `fab-button.tsx` | `import { FABButton }` | VERIFIED | Line 12 + 164 in pitch-viewer.tsx |
| `apps/web/components/viewer/pitch-viewer.tsx` | `qa-panel.tsx` | `import { QAPanel }` | VERIFIED | Line 13 + 169 in pitch-viewer.tsx |
| `apps/web/components/qa/qa-panel.tsx` | `hooks/use-query-stream.ts` | `useQueryStream()` | VERIFIED | Line 6 + 33 in qa-panel.tsx |
| `apps/web/components/qa/qa-thread.tsx` | `query/streaming-answer.tsx` | `StreamingAnswer` | VERIFIED | Line 7 + 68 in qa-thread.tsx |
| `apps/web/components/qa/qa-thread.tsx` | `query/citation-list.tsx` | `CitationList` | PARTIAL | Import and render exist but `_onClick` spread on Citation objects is silently ignored — `CitationList` has no onClick prop |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| VIEW-01 | 04-01, 04-02 | Investor sees pitch content as scrollable, web-native document | SATISFIED | `/pitch` route renders `DocumentGroup` -> `SectionCard` card layout from API data |
| VIEW-02 | 04-02, 04-03 | Viewer is mobile-responsive | SATISFIED | `hidden lg:block` TOC sidebar, mobile Sheet drawer, FAB `max-md:` centering, metric card `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` |
| VIEW-03 | 04-02 | Viewer has professional, polished visual design | NEEDS HUMAN | All design tokens applied: `bg-muted` background, `bg-card` sections, prose typography, `text-[32px] font-semibold` Display role, 32px/48px spacing — visual quality requires human confirmation |
| QA-02 | 04-03 | Q&A is contextual to the section being viewed (inline, not separate chat panel) | PARTIAL | FAB + section-scoped QAPanel + SectionContextChip wired correctly. Citation clickthrough broken: CitationList ignores `_onClick` prop |

**No orphaned requirements.** All Phase 4 requirements (VIEW-01, VIEW-02, VIEW-03, QA-02) are claimed in plans and accounted for above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/web/components/qa/qa-thread.tsx` | 80–84 | `_onClick` spread into Citation object passed to `CitationList` — prop never consumed | Blocker | Citation click-to-scroll does not work |

No other anti-patterns found. No TODO/FIXME/HACK/PLACEHOLDER comments. No empty implementations. No stub return values.

### Human Verification Required

#### 1. Visual design quality (VIEW-03)

**Test:** Start both dev servers (`pnpm dev` from root). Navigate to `http://localhost:3000/pitch` with at least one ready document.
**Expected:** Cards appear on a muted gray background with white card surfaces. Document titles render at 32px semibold. Text sections render with prose-styled markdown. Financial tables render as a grid of big-number metric cards. Heading sections appear as dividers with a horizontal rule. Spacing between cards is generous (32px gap, 48px between document groups).
**Why human:** Visual polish and adherence to UI-SPEC typography contract cannot be verified programmatically.

#### 2. Q&A streaming end-to-end (QA-02)

**Test:** Upload a document, wait for it to reach "ready" status, navigate to `/pitch`, click the FAB, type a question, submit.
**Expected:** Q&A panel opens pre-scoped to current section. Streaming answer appears with pulsing "Thinking..." state, followed by rendered answer text. Section context chip shows "Asking about: [Section Name]" with a dismiss X button.
**Why human:** WebSocket streaming and UI state transitions require a running backend to verify.

### Gaps Summary

One gap blocks full QA-02 achievement: **citation click-to-scroll is not wired end-to-end**.

The `qa-thread.tsx` component attempts to make citations clickable by spreading `_onClick` onto each citation object before passing it to `CitationList`. However, `CitationList` is typed as accepting `{citations: Citation[], open: boolean}` and renders each citation as a static `<Card>` — it never reads `_onClick` from the citation objects. The scroll handler exists in `pitch-viewer.tsx` (`scrollToSection`) and is passed through `qa-panel.tsx` to `qa-thread.tsx` as `onCitationClick`, but the chain breaks at `CitationList`.

The fix requires adding an `onClick` prop to `CitationListProps` and wiring it to each citation card, or restructuring `qa-thread.tsx` to render clickable citation cards directly instead of delegating to `CitationList`.

This gap is isolated to two files: `apps/web/components/query/citation-list.tsx` and `apps/web/components/qa/qa-thread.tsx`.

---

_Verified: 2026-03-19T17:45:00Z_
_Verifier: Claude (gsd-verifier)_
