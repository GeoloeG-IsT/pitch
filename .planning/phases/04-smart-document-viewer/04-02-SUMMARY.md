---
phase: 04-smart-document-viewer
plan: 02
subsystem: ui
tags: [react, markdown, intersection-observer, responsive, tailwind, shadcn]

requires:
  - phase: 04-smart-document-viewer/01
    provides: "PitchAPI types (PitchChunk, PitchDocument, PitchResponse), fetchPitch(), parseTableContent()"
provides:
  - "/pitch route with full viewer page"
  - "Section renderers (text, table, heading, image_caption)"
  - "TOC sidebar with active section tracking"
  - "Empty, loading, and error states"
  - "Responsive layout (mobile/tablet/desktop)"
affects: [04-03-qa-panel, phase-5]

tech-stack:
  added: []
  patterns: [intersection-observer-active-tracking, chunk-type-dispatch, metric-card-grid]

key-files:
  created:
    - apps/web/app/pitch/page.tsx
    - apps/web/app/pitch/loading.tsx
    - apps/web/app/pitch/error.tsx
    - apps/web/components/viewer/pitch-viewer.tsx
    - apps/web/components/viewer/toc-sidebar.tsx
    - apps/web/components/viewer/section-card.tsx
    - apps/web/components/viewer/text-section.tsx
    - apps/web/components/viewer/table-section.tsx
    - apps/web/components/viewer/heading-section.tsx
    - apps/web/components/viewer/image-caption-section.tsx
    - apps/web/components/viewer/metric-card.tsx
    - apps/web/components/viewer/document-group.tsx
  modified: []

key-decisions:
  - "Client-side fetch in PitchViewer useEffect (viewer is fully interactive, needs IO/scroll state)"
  - "TOC uses Sheet component for mobile drawer (left side) matching existing shadcn pattern"
  - "ImageIcon from lucide-react (not Image) to avoid conflict with next/image"

patterns-established:
  - "Chunk-type dispatch: SectionCard switches renderer based on chunk_type enum"
  - "Intersection observer pattern: useInView with threshold 0.3 for active section tracking"
  - "Metric card grid: parseTableContent -> MetricCard grid with markdown fallback"

requirements-completed: [VIEW-01, VIEW-02, VIEW-03]

duration: 3min
completed: 2026-03-19
---

# Phase 4 Plan 2: Pitch Viewer Components Summary

**Gamma-style pitch viewer with markdown rendering, metric card grids, TOC sidebar with active tracking, and responsive layout across mobile/tablet/desktop**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-19T16:38:48Z
- **Completed:** 2026-03-19T16:41:44Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Complete /pitch route with scrollable section cards grouped by document
- Rich markdown rendering via react-markdown with prose typography
- Financial data renders as big-number metric card grids (32px/600 weight)
- TOC sidebar with intersection-observer active section highlighting
- Responsive: mobile hamburger drawer, tablet centered, desktop sidebar
- Empty state, loading skeletons, and error boundary with UI-SPEC copy

## Task Commits

Each task was committed atomically:

1. **Task 1: Section renderer components** - `96093c9` (feat)
2. **Task 2: PitchViewer layout, TOC sidebar, /pitch route** - `68d62b4` (feat)

## Files Created/Modified
- `apps/web/components/viewer/text-section.tsx` - Markdown rendering with prose class
- `apps/web/components/viewer/metric-card.tsx` - Single metric display (label + big number)
- `apps/web/components/viewer/table-section.tsx` - Metric grid with markdown fallback
- `apps/web/components/viewer/heading-section.tsx` - Section divider with Separator
- `apps/web/components/viewer/image-caption-section.tsx` - Muted italic caption card
- `apps/web/components/viewer/section-card.tsx` - Chunk-type dispatcher with IO
- `apps/web/components/viewer/document-group.tsx` - Document grouping with Display title
- `apps/web/components/viewer/toc-sidebar.tsx` - Desktop sidebar + mobile Sheet drawer
- `apps/web/components/viewer/pitch-viewer.tsx` - Top-level viewer layout with all states
- `apps/web/app/pitch/page.tsx` - Server component entry point
- `apps/web/app/pitch/loading.tsx` - Skeleton loading state
- `apps/web/app/pitch/error.tsx` - Error boundary with retry

## Decisions Made
- Client-side fetch in PitchViewer useEffect since viewer is fully interactive (IO, scroll state)
- TOC uses Sheet component for mobile drawer from left side, matching existing shadcn pattern
- Used ImageIcon from lucide-react (not "Image") to avoid conflict with next/image

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Viewer renders all chunk types with proper styling
- Active section tracking ready for Q&A panel context scoping (Plan 03)
- All components exported and composable for FAB + QAPanel integration

## Self-Check: PASSED

- All 12 created files verified present on disk
- Commit 96093c9 (Task 1) verified in git log
- Commit 68d62b4 (Task 2) verified in git log
- pnpm typecheck: passed
- pnpm build: passed

---
*Phase: 04-smart-document-viewer*
*Completed: 2026-03-19*
