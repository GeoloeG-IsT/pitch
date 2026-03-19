# Phase 4: Smart Document Viewer - Research

**Researched:** 2026-03-19
**Domain:** Frontend UI (Next.js + React + shadcn/ui), API endpoint design, Markdown rendering, Intersection Observer
**Confidence:** HIGH

## Summary

Phase 4 transforms the existing document management system into an investor-facing pitch viewer. The codebase already has a solid foundation: shadcn/ui components (Card, Badge, Skeleton, Separator, Button, Dialog, Collapsible), a working WebSocket Q&A pipeline (`useQueryStream` hook, `StreamingAnswer`, `CitationList`, `QueryInput` components), and a well-structured chunk data model (`chunk_type: text|table|heading|image_caption`, `section_number`, `document_id`).

The primary technical challenges are: (1) a new API endpoint to fetch all ready documents with their ordered chunks, (2) rich Markdown rendering inside section cards using `react-markdown` + `@tailwindcss/typography`, (3) table chunk parsing into key-metric card grids, (4) Intersection Observer-based TOC tracking, and (5) adapting the existing Q&A components into a Sheet-based slide-in panel with section scoping. All of these are well-established patterns with mature libraries.

**Primary recommendation:** Use `react-markdown` + `@tailwindcss/typography` for text rendering, `react-intersection-observer` for TOC tracking, install shadcn `sheet`/`scroll-area`/`tooltip` components, and build two new API endpoints (`GET /api/v1/pitch` and `GET /api/v1/documents/{id}/chunks`). The Q&A panel reuses existing WebSocket infrastructure with minimal adaptation.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Gamma-style full-width cards per section with generous whitespace and smooth scrolling between distinct visual blocks
- Uniform card styling across all sections -- clean white cards on a subtle background, no alternating or type-based differentiation
- Sticky header with company name + collapsible TOC sidebar on the left for quick section jumping
- Wide content column (max-w-5xl, ~1024px) -- room for tables and financial data while staying readable
- Floating action button (FAB) always visible -- clicking opens Q&A pre-scoped to the nearest/current section
- Q&A appears as a slide-in panel from the right (like Notion comments) -- content stays visible alongside the answer
- Conversation thread mode -- all questions asked during this session shown as a scrollable thread with follow-up capability
- Section context chip above the input ("Asking about: [Section Name]") -- investor knows it's scoped, can remove chip to ask globally
- Reuses existing WebSocket streaming from Phase 3 for answer delivery
- Financial tables (chunk_type='table') render as card-based key metrics -- dashboard-style grid with big numbers
- Heading chunks (chunk_type='heading') become section dividers -- larger text with subtle horizontal rule
- Text chunks render as rich markdown -- bold, lists, links, code blocks all styled, polished blog-post feel
- Sections group by source document -- each with its own document heading
- TOC sidebar collapses into hamburger menu on mobile
- Q&A panel becomes full-screen takeover on mobile -- back button returns to content
- FAB positioned bottom-center on mobile, bottom-right on desktop
- Key metrics cards stack vertically (full-width) on mobile

### Claude's Discretion
- Exact card shadows, border-radius, spacing values (follow existing shadcn theme tokens)
- Section transition animations and scroll behavior
- Loading/skeleton states for the viewer
- Image caption chunk rendering approach
- TOC sidebar width and styling
- Error states (failed to load pitch content)
- Empty state (no documents uploaded yet)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VIEW-01 | Investor sees pitch content as a scrollable, web-native document (card/section format) | PitchViewer layout with SectionCard components, chunks API endpoint, document grouping pattern |
| VIEW-02 | Viewer is mobile-responsive | Responsive breakpoints (mobile <768px, tablet 768-1023px, desktop >=1024px), FAB repositioning, TOC drawer, full-screen Q&A dialog |
| VIEW-03 | Viewer has professional, polished visual design | shadcn theme tokens, @tailwindcss/typography prose class, Gamma-style card-on-muted-background pattern, UI-SPEC design contract |
| QA-02 | Q&A is contextual to the section being viewed (inline, not separate chat panel) | Sheet slide-in panel, Intersection Observer section tracking, section context chip, existing useQueryStream hook reuse |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-markdown | 10.1.0 | Render Markdown content in text chunks | De facto standard for React Markdown rendering, 10M+ weekly downloads |
| @tailwindcss/typography | 0.5.19 | Prose styling for rendered Markdown | Official Tailwind plugin, provides `prose` class for beautiful typography defaults |
| react-intersection-observer | 10.0.3 | Track which section is in viewport for TOC highlighting and FAB context | Most popular React IO wrapper, supports React 19, provides `useInView` hook |
| remark-gfm | 4.0.1 | GitHub Flavored Markdown support (tables, strikethrough, task lists) | Standard companion to react-markdown for extended syntax |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn Sheet | (CLI install) | Q&A slide-in panel from right side | Desktop/tablet Q&A panel overlay |
| shadcn ScrollArea | (CLI install) | Custom scrollbar for TOC sidebar and Q&A thread | Anytime content overflows in a fixed container |
| shadcn Tooltip | (CLI install) | FAB hover label, truncated TOC items | Hover affordances for compact UI elements |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-markdown | next-mdx-remote | MDX is overkill -- we render stored Markdown strings, not MDX files |
| @tailwindcss/typography | Manual prose styles | Typography plugin handles 50+ element styles including edge cases (nested lists, code in headings) |
| react-intersection-observer | Native IntersectionObserver API | Library handles cleanup, ref management, React 19 compatibility -- not worth hand-rolling |

**Installation:**
```bash
# From apps/web directory
pnpm add react-markdown remark-gfm @tailwindcss/typography react-intersection-observer

# Install shadcn components
npx shadcn@latest add sheet scroll-area tooltip
```

**Tailwind v4 typography setup** (in `app/globals.css`):
```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

Note: Tailwind CSS v4 uses `@plugin` directive instead of the v3 `plugins` array in config. This project already uses Tailwind v4 with PostCSS plugin architecture.

## Architecture Patterns

### Recommended Project Structure
```
apps/web/
  app/
    pitch/
      page.tsx              # Server component: fetch initial data, render PitchViewer
      loading.tsx            # Skeleton loading state
      error.tsx              # Error boundary
  components/
    viewer/
      pitch-viewer.tsx       # Top-level layout: header + TOC + content + FAB
      document-group.tsx     # Groups sections by source document with title
      section-card.tsx       # Dispatches to type-specific renderers
      text-section.tsx       # Markdown rendering via react-markdown + prose
      table-section.tsx      # Key-metrics grid from table content
      heading-section.tsx    # Section divider with rule
      image-caption-section.tsx  # Muted card with italic caption
      metric-card.tsx        # Single key metric (label + big number)
      toc-sidebar.tsx        # Collapsible sidebar with section links
      fab-button.tsx         # Floating action button
    qa/
      qa-panel.tsx           # Sheet-based slide-in panel wrapping Q&A thread
      qa-thread.tsx          # Scrollable list of Q&A pairs
      section-context-chip.tsx  # Badge showing current section scope
  hooks/
    use-active-section.ts    # Intersection Observer tracking for TOC + FAB
    use-query-stream.ts      # (existing) WebSocket streaming
  lib/
    pitch-api.ts             # API functions for pitch/chunk endpoints
    parse-table-content.ts   # Parse table chunk content into key-value pairs

apps/api/
  app/
    api/v1/
      pitch.py               # New: GET /api/v1/pitch endpoint
    models/
      pitch.py               # New: PitchResponse, ChunkResponse schemas
```

### Pattern 1: Document Grouping from Flat Chunks
**What:** The chunks table stores flat records with `document_id` and `section_number`. The viewer needs to group chunks by document, then order by section_number within each group.
**When to use:** When rendering the pitch viewer from chunk data.
**Example:**
```typescript
// Type for the pitch API response
interface PitchDocument {
  id: string;
  title: string;
  file_type: string;
  chunks: PitchChunk[];
}

interface PitchChunk {
  id: string;
  content: string;
  section_number: number | null;
  chunk_type: "text" | "table" | "heading" | "image_caption";
  metadata: Record<string, unknown>;
}

interface PitchResponse {
  documents: PitchDocument[];
  total_chunks: number;
}
```

### Pattern 2: Intersection Observer Section Tracking
**What:** Track which section card is currently visible in the viewport to update TOC active state and FAB section context.
**When to use:** Any scrollable content with a linked navigation.
**Example:**
```typescript
// hooks/use-active-section.ts
import { useCallback, useState } from "react";

export function useActiveSection() {
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleInView = useCallback((id: string, inView: boolean) => {
    if (inView) setActiveId(id);
  }, []);

  return { activeId, handleInView };
}

// In SectionCard:
import { useInView } from "react-intersection-observer";

function SectionCard({ chunk, onInView }: Props) {
  const { ref } = useInView({
    threshold: 0.3,
    onChange: (inView) => onInView(chunk.id, inView),
  });

  return <div ref={ref} id={`section-${chunk.id}`}>...</div>;
}
```

### Pattern 3: Table Content Parsing for Metric Cards
**What:** Parse markdown table content from `chunk_type='table'` into label-value pairs for the MetricCard grid.
**When to use:** Rendering financial data chunks.
**Example:**
```typescript
// lib/parse-table-content.ts
interface MetricPair {
  label: string;
  value: string;
  subLabel?: string;
}

export function parseTableContent(content: string): MetricPair[] | null {
  // Attempt to parse markdown table format:
  // | Metric | Value |
  // |--------|-------|
  // | TAM | $15B |
  const lines = content.trim().split("\n");
  const dataLines = lines.filter(
    (line) => line.includes("|") && !line.match(/^\|[\s-|]+\|$/)
  );

  if (dataLines.length < 2) return null; // Not enough data, fall back to raw table

  // Parse header and rows
  const pairs: MetricPair[] = [];
  for (let i = 1; i < dataLines.length; i++) {
    const cells = dataLines[i].split("|").filter(Boolean).map((c) => c.trim());
    if (cells.length >= 2) {
      pairs.push({ label: cells[0], value: cells[1], subLabel: cells[2] });
    }
  }
  return pairs.length > 0 ? pairs : null;
}
```

### Pattern 4: Q&A Panel with Session Thread
**What:** The Q&A panel maintains a session-level conversation thread. Each question/answer pair is stored in component state (not persisted beyond the session in this phase).
**When to use:** The slide-in Q&A panel.
**Example:**
```typescript
interface QAMessage {
  id: string;
  question: string;
  answer: string;
  citations: Citation[];
  status: QueryStatus;
  sectionContext: string | null; // Section name when question was asked
}

// QAPanel manages an array of QAMessage, creating a new entry per question
// Each entry uses a separate useQueryStream instance or a modified hook
// that supports multiple concurrent/sequential queries
```

### Anti-Patterns to Avoid
- **Fetching chunks individually per document:** Use a single `/api/v1/pitch` endpoint that returns all documents with chunks in one request. Multiple round-trips will cause visible loading jank.
- **Scroll event listeners for section tracking:** Use Intersection Observer, not scroll events. Scroll events fire at 60fps and cause performance issues.
- **Embedding Q&A state in global context:** Keep Q&A thread state local to the QAPanel component. It's session-scoped and doesn't need global state management.
- **SSR for the pitch viewer page:** The viewer needs client-side interactivity (IO, WebSocket, scroll). Use a server component for initial data fetch, but the interactive viewer itself should be a client component.
- **Re-creating WebSocket connections per question:** The existing `useQueryStream` creates a new WS per question, which is fine for the thread pattern. Do NOT try to multiplex a single WebSocket.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown rendering | Custom parser or dangerouslySetInnerHTML | react-markdown + remark-gfm | XSS safety, handles edge cases (nested elements, escaping), React component output |
| Prose typography | Manual CSS for 50+ HTML elements | @tailwindcss/typography `prose` class | Consistent styling for h1-h6, lists, blockquotes, code, tables, links -- years of design refinement |
| Viewport tracking | Manual scroll event + getBoundingClientRect | react-intersection-observer `useInView` | Handles cleanup, supports React 19 refs, performant native IO API |
| Slide-in panel | Custom absolute-positioned div with transitions | shadcn Sheet component | Handles focus trap, backdrop, animation, keyboard dismiss, portal rendering |
| Custom scrollbars | CSS `::-webkit-scrollbar` hacks | shadcn ScrollArea | Cross-browser, accessible, consistent with design system |

**Key insight:** This phase is primarily a UI composition task. Every building block exists as a mature library or existing component. The engineering challenge is integration and polish, not novel technical problems.

## Common Pitfalls

### Pitfall 1: Tailwind v4 Typography Plugin Setup
**What goes wrong:** Using v3-style `require('@tailwindcss/typography')` in a config file instead of v4's `@plugin` directive.
**Why it happens:** Most tutorials show the v3 setup. This project uses Tailwind CSS v4 with PostCSS plugin architecture.
**How to avoid:** Add `@plugin "@tailwindcss/typography";` to `globals.css` after the `@import "tailwindcss"` line.
**Warning signs:** `prose` class has no effect, Markdown renders as unstyled HTML.

### Pitfall 2: Prose Class Conflicts with Tailwind Reset
**What goes wrong:** Tailwind's preflight CSS resets all element styles, so `<h1>`, `<p>`, `<ul>` inside react-markdown output render without margins/sizing.
**Why it happens:** The `prose` class must be applied to the parent container, and its styles can conflict with other Tailwind utilities.
**How to avoid:** Wrap react-markdown output in a `<div className="prose prose-neutral max-w-none">`. Use `max-w-none` because the card container already constrains width. Use `not-prose` to escape the prose context for embedded non-Markdown elements.
**Warning signs:** Headings same size as body text, no list bullets, no paragraph spacing.

### Pitfall 3: Intersection Observer Firing for All Sections on Load
**What goes wrong:** When the page first renders, multiple sections are visible, causing multiple IO callbacks and an incorrect "active" section.
**Why it happens:** IO fires for all elements that are initially in view.
**How to avoid:** Use `threshold: 0.3` and pick the LAST section that reports `inView: true` (highest in the scroll, most recently scrolled to). Or use a debounce to let initial paint settle.
**Warning signs:** TOC highlights the last section on page load instead of the first.

### Pitfall 4: Sheet Component Overriding Content Scroll
**What goes wrong:** When the Sheet (Q&A panel) is open, the background content becomes unscrollable.
**Why it happens:** Sheet components typically apply `overflow: hidden` to the body to prevent background scroll.
**How to avoid:** Use the Sheet's `modal={false}` prop (if available in shadcn's base-ui variant) or use a custom non-modal panel approach. The UI-SPEC explicitly states content should stay visible and scrollable alongside the Q&A panel.
**Warning signs:** Investor can't scroll the pitch while Q&A panel is open.

### Pitfall 5: WebSocket URL Mismatch Between Proxy and Direct
**What goes wrong:** REST calls go through Next.js rewrites (`/api/v1/*`), but WebSocket connects directly to FastAPI via `NEXT_PUBLIC_WS_URL`.
**Why it happens:** Next.js rewrites don't support WebSocket upgrade.
**How to avoid:** Keep the existing pattern: REST via proxy, WebSocket via direct URL. The `useQueryStream` hook already handles this correctly.
**Warning signs:** REST works but WebSocket fails, or vice versa.

### Pitfall 6: Table Content Parsing Fragility
**What goes wrong:** Assuming all `chunk_type='table'` chunks have parseable markdown table format.
**Why it happens:** Excel parser may produce varied table formats. Some tables may be complex multi-header structures.
**How to avoid:** Always implement a fallback: if `parseTableContent()` returns null, render the content as a styled HTML table or as raw markdown. Never crash on unparseable table data.
**Warning signs:** Empty metric card grids, "undefined" values in MetricCard components.

## Code Examples

### Markdown Rendering in Text Section
```typescript
// components/viewer/text-section.tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface TextSectionProps {
  content: string;
}

export function TextSection({ content }: TextSectionProps) {
  return (
    <div className="prose prose-neutral max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
```

### TOC Sidebar with Active Section
```typescript
// components/viewer/toc-sidebar.tsx
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface TOCSidebarProps {
  documents: Array<{
    id: string;
    title: string;
    chunks: Array<{ id: string; section_number: number | null; content: string }>;
  }>;
  activeId: string | null;
  onSectionClick: (id: string) => void;
}

export function TOCSidebar({ documents, activeId, onSectionClick }: TOCSidebarProps) {
  return (
    <aside className="w-60 border-r bg-card sticky top-14 h-[calc(100vh-3.5rem)]">
      <ScrollArea className="h-full py-4">
        {documents.map((doc) => (
          <div key={doc.id} className="px-4 mb-4">
            <p className="text-sm font-semibold text-foreground mb-2">{doc.title}</p>
            {doc.chunks
              .filter((c) => c.section_number != null)
              .map((chunk) => (
                <button
                  key={chunk.id}
                  onClick={() => onSectionClick(chunk.id)}
                  className={cn(
                    "block w-full text-left text-sm py-1.5 px-3 rounded-md truncate transition-colors",
                    activeId === chunk.id
                      ? "bg-accent border-l-2 border-primary text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  {chunk.content.slice(0, 50)}...
                </button>
              ))}
          </div>
        ))}
      </ScrollArea>
    </aside>
  );
}
```

### Pitch API Endpoint (Backend)
```python
# apps/api/app/api/v1/pitch.py
from fastapi import APIRouter
from app.core.supabase import get_service_client
from app.models.pitch import PitchResponse, PitchDocument, PitchChunk

router = APIRouter(tags=["pitch"])

@router.get("/pitch")
async def get_pitch():
    """Fetch all ready documents with their chunks for the viewer."""
    client = get_service_client()

    # Get all ready documents
    docs_result = (
        client.table("documents")
        .select("id, title, file_type, file_name, created_at")
        .eq("status", "ready")
        .order("created_at")
        .execute()
    )

    documents = []
    total_chunks = 0

    for doc_row in docs_result.data:
        # Fetch chunks for each document, ordered by section_number
        chunks_result = (
            client.table("chunks")
            .select("id, content, section_number, page_number, chunk_type, metadata")
            .eq("document_id", doc_row["id"])
            .order("section_number")
            .execute()
        )
        chunks = [
            PitchChunk(
                id=c["id"],
                content=c["content"],
                section_number=c["section_number"],
                chunk_type=c["chunk_type"],
                metadata=c.get("metadata", {}),
            )
            for c in chunks_result.data
        ]
        total_chunks += len(chunks)
        documents.append(
            PitchDocument(
                id=doc_row["id"],
                title=doc_row["title"],
                file_type=doc_row["file_type"],
                chunks=chunks,
            )
        )

    return PitchResponse(documents=documents, total_chunks=total_chunks)
```

### FAB with Section Tracking
```typescript
// components/viewer/fab-button.tsx
"use client";

import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface FABButtonProps {
  onClick: () => void;
  visible: boolean;
  className?: string;
}

export function FABButton({ onClick, visible, className }: FABButtonProps) {
  if (!visible) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon-lg"
          onClick={onClick}
          aria-label="Ask a question"
          className={cn(
            "fixed z-50 h-14 w-14 rounded-full shadow-lg",
            "bottom-4 right-4",                    // Desktop: bottom-right
            "max-md:bottom-4 max-md:right-1/2 max-md:translate-x-1/2", // Mobile: bottom-center
            "transition-transform duration-150",
            className
          )}
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Ask a question</TooltipContent>
    </Tooltip>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind Typography via config plugins array | `@plugin "@tailwindcss/typography"` in CSS | Tailwind v4 (2025) | Must use CSS directive, not JS config |
| Radix UI primitives for shadcn | Base UI (`@base-ui/react`) for base-nova style | shadcn 4.x (2025) | Sheet/ScrollArea/Tooltip use base-ui internals, not Radix |
| `react-markdown` v8 with `remarkPlugins` as object | v10 with same API but ESM-only | 2024 | Ensure ESM import, no CommonJS require |
| Manual IntersectionObserver setup | `react-intersection-observer` v10 with React 19 support | 2025 | Uses cleanup functions for refs, compatible with React 19 |

**Deprecated/outdated:**
- `@tailwindcss/typography` v3-style config: Does not work with Tailwind v4
- `react-markdown` < v9: CommonJS, older remark ecosystem

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest (backend) / TypeScript type-checking (frontend) |
| Config file | apps/api/pyproject.toml (pytest), apps/web/tsconfig.json (tsc) |
| Quick run command | `cd apps/api && pnpm test` / `cd apps/web && pnpm typecheck` |
| Full suite command | `pnpm test && pnpm typecheck` (from root) |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VIEW-01 | Pitch API returns grouped documents with chunks | unit | `cd apps/api && uv run pytest tests/test_pitch_api.py -x` | No -- Wave 0 |
| VIEW-01 | Viewer renders section cards from chunk data | manual | Visual inspection in browser | N/A |
| VIEW-02 | Responsive layout at mobile/tablet/desktop breakpoints | manual | Browser DevTools responsive mode | N/A |
| VIEW-03 | Professional design matches UI-SPEC | manual | Visual comparison against UI-SPEC layout contract | N/A |
| QA-02 | Q&A panel opens scoped to current section | manual | Click FAB, verify section context chip shows current section | N/A |
| QA-02 | Section scoping passes context to query pipeline | unit | `cd apps/api && uv run pytest tests/test_pitch_api.py::test_scoped_query -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/web && pnpm typecheck` (frontend) + `cd apps/api && pnpm test` (backend)
- **Per wave merge:** Full suite from root: `pnpm test && pnpm typecheck`
- **Phase gate:** Full suite green + visual review of viewer at all breakpoints

### Wave 0 Gaps
- [ ] `apps/api/tests/test_pitch_api.py` -- covers VIEW-01 (pitch endpoint returns correct data)
- [ ] TypeScript types for PitchResponse, PitchChunk -- ensures type safety in frontend
- [ ] Manual test checklist for VIEW-02 (responsive) and VIEW-03 (visual polish)

## Open Questions

1. **Sheet modal behavior with background scroll**
   - What we know: The UI-SPEC requires content to stay visible and scrollable alongside the Q&A panel. Standard Sheet components lock background scroll.
   - What's unclear: Whether shadcn's base-ui Sheet variant supports `modal={false}` or if we need a custom non-modal panel.
   - Recommendation: Try Sheet first. If it locks background scroll, build a custom side panel using absolute/fixed positioning with the same visual treatment. This is a small implementation detail, not a blocker.

2. **Table content parsing robustness**
   - What we know: Excel parser produces markdown table format. We need to extract label-value pairs for MetricCard grid.
   - What's unclear: Exact format variations from the Excel parser output across different financial models.
   - Recommendation: Build parser with fallback to styled markdown table. Test with actual demo content from Phase 1.

3. **Q&A thread -- multiple concurrent streams**
   - What we know: Current `useQueryStream` manages a single question at a time. Thread mode needs to show previous answers while a new one streams.
   - What's unclear: Whether to modify the hook or create a wrapper that manages an array of query states.
   - Recommendation: Create a `useQAThread` hook that wraps multiple `useQueryStream` instances. Each new question creates a new entry in the thread array with its own streaming state.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `apps/web/hooks/use-query-stream.ts`, `apps/web/components/query/*`, `apps/api/app/api/v1/query.py`, `apps/api/app/services/query_engine.py` -- existing Q&A infrastructure
- Codebase inspection: `supabase/migrations/00001_init.sql` -- chunks table schema with section_number, chunk_type
- Codebase inspection: `apps/web/components.json` -- shadcn base-nova configuration
- Codebase inspection: `apps/web/app/globals.css` -- theme tokens and Tailwind v4 setup
- `.planning/phases/04-smart-document-viewer/04-UI-SPEC.md` -- complete design contract

### Secondary (MEDIUM confidence)
- [Tailwind CSS v4 Typography discussion](https://github.com/tailwindlabs/tailwindcss/discussions/14120) -- `@plugin` directive for v4
- [shadcn Sheet docs](https://ui.shadcn.com/docs/components/radix/sheet) -- Sheet component API
- [react-intersection-observer GitHub](https://github.com/thebuilder/react-intersection-observer) -- React 19 compatibility confirmed
- npm registry: react-markdown 10.1.0, remark-gfm 4.0.1, @tailwindcss/typography 0.5.19, react-intersection-observer 10.0.3

### Tertiary (LOW confidence)
- [Tailwind v4 breaks react-markdown discussion](https://github.com/tailwindlabs/tailwindcss/discussions/17645) -- potential preflight conflicts (may need testing)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries verified against npm registry, well-established
- Architecture: HIGH -- follows existing codebase patterns, clear data model from chunks table
- Pitfalls: HIGH -- identified from codebase inspection and known Tailwind v4 migration issues

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable domain, mature libraries)
