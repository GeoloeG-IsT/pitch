---
phase: 04-smart-document-viewer
plan: 01
subsystem: api, ui
tags: [fastapi, pydantic, typescript, react-markdown, tailwind-typography, supabase]

# Dependency graph
requires:
  - phase: 02-ingestion-pipeline
    provides: documents and chunks tables with status lifecycle and chunk_type classification
provides:
  - GET /api/v1/pitch endpoint returning ready documents with ordered chunks
  - PitchResponse/PitchDocument/PitchChunk Pydantic models
  - Frontend typed pitch-api.ts client with fetchPitch()
  - Markdown table parser (parse-table-content.ts) for MetricCard rendering
  - shadcn Sheet, ScrollArea, Tooltip components installed
  - @tailwindcss/typography plugin configured
affects: [04-02-viewer-ui, 04-03-qa-integration]

# Tech tracking
tech-stack:
  added: [react-markdown, remark-gfm, "@tailwindcss/typography", react-intersection-observer]
  patterns: [pitch endpoint grouping documents with chunks, table content parsing to MetricPair]

key-files:
  created:
    - apps/api/app/models/pitch.py
    - apps/api/app/api/v1/pitch.py
    - apps/api/tests/test_pitch_api.py
    - apps/web/lib/pitch-api.ts
    - apps/web/lib/parse-table-content.ts
    - apps/web/components/ui/sheet.tsx
    - apps/web/components/ui/scroll-area.tsx
    - apps/web/components/ui/tooltip.tsx
  modified:
    - apps/api/app/main.py
    - apps/web/app/globals.css
    - apps/web/package.json

key-decisions:
  - "Pitch endpoint selects only id/title/file_type columns from documents (minimal payload)"
  - "Chunks ordered by section_number ascending with nulls-last via Supabase .order()"

patterns-established:
  - "Pitch API pattern: single endpoint returning denormalized document+chunks response"
  - "Table parser pattern: filter separator lines, skip header, extract cell pairs"

requirements-completed: [VIEW-01]

# Metrics
duration: 6min
completed: 2026-03-19
---

# Phase 4 Plan 1: Pitch API and Data Layer Summary

**GET /api/v1/pitch endpoint with Pydantic models, typed frontend client, markdown table parser, and @tailwindcss/typography plugin**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-19T16:30:11Z
- **Completed:** 2026-03-19T16:36:13Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Backend pitch endpoint returns ready documents with chunks grouped by document and ordered by section_number
- Frontend typed interfaces mirror backend PitchResponse schema exactly
- Table content parser extracts label-value MetricPair pairs from markdown tables
- All dependencies installed: react-markdown, remark-gfm, @tailwindcss/typography, react-intersection-observer, shadcn sheet/scroll-area/tooltip

## Task Commits

Each task was committed atomically:

1. **Task 1: Backend pitch API endpoint** - `cd9c824` (test: failing tests) + `b176d8a` (feat: implementation)
2. **Task 2: Frontend pitch API client, table parser, dependencies** - `28bce4f` (feat)

_Note: Task 1 followed TDD with RED/GREEN commits_

## Files Created/Modified
- `apps/api/app/models/pitch.py` - PitchChunk, PitchDocument, PitchResponse Pydantic models
- `apps/api/app/api/v1/pitch.py` - GET /api/v1/pitch endpoint querying ready documents + chunks
- `apps/api/app/main.py` - Router registration for pitch_router
- `apps/api/tests/test_pitch_api.py` - 5 test behaviors covering response shape, filtering, ordering, schema, empty state
- `apps/web/lib/pitch-api.ts` - Typed PitchResponse interface and fetchPitch() function
- `apps/web/lib/parse-table-content.ts` - MetricPair interface and parseTableContent() parser
- `apps/web/app/globals.css` - Added @plugin "@tailwindcss/typography"
- `apps/web/components/ui/sheet.tsx` - shadcn Sheet component for Q&A panel
- `apps/web/components/ui/scroll-area.tsx` - shadcn ScrollArea for TOC/Q&A scroll
- `apps/web/components/ui/tooltip.tsx` - shadcn Tooltip for FAB hover label

## Decisions Made
- Pitch endpoint selects only id/title/file_type columns from documents table (minimal payload, no file_size_bytes or metadata needed for viewer)
- Chunks ordered by section_number ascending via Supabase .order() (nulls handled by database default ordering)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Pitch API endpoint ready for 04-02 viewer UI to consume
- All shadcn components (Sheet, ScrollArea, Tooltip) and npm dependencies (react-markdown, remark-gfm, react-intersection-observer) available for 04-02
- Typography plugin configured for prose class rendering of text chunks

---
*Phase: 04-smart-document-viewer*
*Completed: 2026-03-19*
