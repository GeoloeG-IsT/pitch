---
phase: 04-smart-document-viewer
plan: 03
subsystem: ui
tags: [react, websocket, qa, streaming, sheet, dialog, responsive, intersection-observer]

requires:
  - phase: 04-smart-document-viewer/02
    provides: "PitchViewer layout, section renderers, TOC sidebar, active section tracking"
  - phase: 03
    provides: "useQueryStream hook, StreamingAnswer, CitationList, QueryInput, WebSocket streaming"
provides:
  - "FAB button with responsive positioning (desktop right, mobile center)"
  - "Q&A slide-in panel (Sheet desktop, Dialog mobile) with section scoping"
  - "Conversation thread with streaming answers and clickable citations"
  - "Section context chip with dismiss for global mode"
  - "useActiveSection hook for viewport section tracking"
affects: [phase-5, phase-7]

tech-stack:
  added: []
  patterns: [fab-qa-panel-integration, section-scoped-qa, citation-scroll-highlight]

key-files:
  created:
    - apps/web/hooks/use-active-section.ts
    - apps/web/components/viewer/fab-button.tsx
    - apps/web/components/qa/section-context-chip.tsx
    - apps/web/components/qa/qa-thread.tsx
    - apps/web/components/qa/qa-panel.tsx
  modified:
    - apps/web/components/viewer/pitch-viewer.tsx

key-decisions:
  - "Custom fixed panel instead of Sheet for Q&A (avoids modal scroll-lock, keeps content scrollable)"
  - "Single useQueryStream instance with message snapshot pattern for conversation history"
  - "Citation click scrolls viewer with 2s ring-primary/30 highlight per UI-SPEC Animation Contract"

patterns-established:
  - "FAB hides when panel is open, reappears on close"
  - "Section context prepended to question as [Context: ...] for retrieval pipeline boost"
  - "Content area shifts right (lg:pr-[460px]) when Q&A panel open on desktop"

requirements-completed: [QA-02, VIEW-02]

duration: 8min
completed: 2026-03-19
---

# Phase 4 Plan 3: Inline Q&A Panel Summary

**Floating action button with section-scoped Q&A slide-in panel, conversation thread with streaming answers, and citation-driven viewer navigation**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-19T17:10:00Z
- **Completed:** 2026-03-19T17:19:24Z
- **Tasks:** 3 (2 auto + 1 human-verify checkpoint)
- **Files modified:** 6

## Accomplishments
- FAB button with responsive positioning (bottom-right desktop, bottom-center mobile)
- Q&A panel as custom fixed panel on desktop (440px, non-modal) and Dialog on mobile
- Conversation thread reusing StreamingAnswer and CitationList from Phase 3
- Section context chip showing "Asking about: [Section]" with dismiss for global mode
- PitchViewer integration with active section derivation, citation scroll highlight, and content shift

## Task Commits

Each task was committed atomically:

1. **Task 1: FAB button, Q&A panel, section context chip, conversation thread** - `88f7a82` (feat)
2. **Task 2: Wire FAB and Q&A panel into PitchViewer** - `ff35a4b` (feat)
3. **Task 3: Visual verification checkpoint** - approved by user (no commit)

## Files Created/Modified
- `apps/web/hooks/use-active-section.ts` - Hook for tracking viewport-visible section
- `apps/web/components/viewer/fab-button.tsx` - Floating action button with tooltip and responsive positioning
- `apps/web/components/qa/section-context-chip.tsx` - Badge with section name and dismiss button
- `apps/web/components/qa/qa-thread.tsx` - Scrollable conversation thread with streaming answers
- `apps/web/components/qa/qa-panel.tsx` - Fixed panel (desktop) / Dialog (mobile) with input, thread, section scoping
- `apps/web/components/viewer/pitch-viewer.tsx` - Modified to integrate FAB, QAPanel, useActiveSection, citation highlight

## Decisions Made
- Custom fixed-position panel instead of Sheet to avoid modal scroll-lock (keeps pitch content scrollable while Q&A is open)
- Single useQueryStream hook instance with snapshot pattern for building conversation history
- Citation click triggers smooth scroll with 2-second ring highlight per UI-SPEC Animation Contract

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Complete pitch viewer with inline Q&A ready for Phase 5 enhancements
- WebSocket streaming integrated and verified end-to-end
- Section scoping pattern established for future context-aware features

## Self-Check: PASSED

- All 5 created files verified present on disk
- Modified file (pitch-viewer.tsx) verified present on disk
- Commit 88f7a82 (Task 1) verified in git log
- Commit ff35a4b (Task 2) verified in git log
- Task 3: human-verify checkpoint approved

---
*Phase: 04-smart-document-viewer*
*Completed: 2026-03-19*
