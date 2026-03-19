# Documentation Generation Plan

Generated: 2026-03-19
Project: /home/pascal/wks/pitch

## Summary

- **Total Tasks**: 113
- **File Tasks**: 89
- **Directory Tasks**: 24
- **Traversal**: Post-order (children before parents)

---

## Phase 1: File Analysis (Post-Order Traversal)

### Depth 5: apps/api/app/api/v1/ (4 files)
- [x] `apps/api/app/api/v1/documents.py`
- [x] `apps/api/app/api/v1/health.py`
- [x] `apps/api/app/api/v1/pitch.py`
- [x] `apps/api/app/api/v1/query.py`

### Depth 5: apps/api/app/services/parsers/ (3 files)
- [x] `apps/api/app/services/parsers/excel_parser.py`
- [x] `apps/api/app/services/parsers/markdown_pipeline.py`
- [x] `apps/api/app/services/parsers/pdf_pipeline.py`

### Depth 5: apps/web/app/api/health/ (1 files)
- [x] `apps/web/app/api/health/route.ts`

### Depth 4: apps/api/app/core/ (2 files)
- [x] `apps/api/app/core/config.py`
- [x] `apps/api/app/core/supabase.py`

### Depth 4: apps/api/app/models/ (4 files)
- [x] `apps/api/app/models/chunk.py`
- [x] `apps/api/app/models/document.py`
- [x] `apps/api/app/models/pitch.py`
- [x] `apps/api/app/models/query.py`

### Depth 4: apps/api/app/services/ (5 files)
- [x] `apps/api/app/services/ingestion.py`
- [x] `apps/api/app/services/node_mapper.py`
- [x] `apps/api/app/services/pipeline.py`
- [x] `apps/api/app/services/query_engine.py`
- [x] `apps/api/app/services/retrieval.py`

### Depth 4: apps/web/app/documents/ (2 files)
- [x] `apps/web/app/documents/layout.tsx`
- [x] `apps/web/app/documents/page.tsx`

### Depth 4: apps/web/app/pitch/ (3 files)
- [x] `apps/web/app/pitch/error.tsx`
- [x] `apps/web/app/pitch/loading.tsx`
- [x] `apps/web/app/pitch/page.tsx`

### Depth 4: apps/web/app/query/ (2 files)
- [x] `apps/web/app/query/layout.tsx`
- [x] `apps/web/app/query/page.tsx`

### Depth 4: apps/web/components/documents/ (5 files)
- [x] `apps/web/components/documents/delete-dialog.tsx`
- [x] `apps/web/components/documents/document-card.tsx`
- [x] `apps/web/components/documents/document-list.tsx`
- [x] `apps/web/components/documents/replace-dialog.tsx`
- [x] `apps/web/components/documents/upload-zone.tsx`

### Depth 4: apps/web/components/qa/ (3 files)
- [x] `apps/web/components/qa/qa-panel.tsx`
- [x] `apps/web/components/qa/qa-thread.tsx`
- [x] `apps/web/components/qa/section-context-chip.tsx`

### Depth 4: apps/web/components/query/ (5 files)
- [x] `apps/web/components/query/citation-badge.tsx`
- [x] `apps/web/components/query/citation-list.tsx`
- [x] `apps/web/components/query/query-input.tsx`
- [x] `apps/web/components/query/query-status.tsx`
- [x] `apps/web/components/query/streaming-answer.tsx`

### Depth 4: apps/web/components/ui/ (15 files)
- [x] `apps/web/components/ui/badge.tsx`
- [x] `apps/web/components/ui/button.tsx`
- [x] `apps/web/components/ui/card.tsx`
- [x] `apps/web/components/ui/collapsible.tsx`
- [x] `apps/web/components/ui/dialog.tsx`
- [x] `apps/web/components/ui/dropdown-menu.tsx`
- [x] `apps/web/components/ui/input.tsx`
- [x] `apps/web/components/ui/progress.tsx`
- [x] `apps/web/components/ui/scroll-area.tsx`
- [x] `apps/web/components/ui/separator.tsx`
- [x] `apps/web/components/ui/sheet.tsx`
- [x] `apps/web/components/ui/skeleton.tsx`
- [x] `apps/web/components/ui/sonner.tsx`
- [x] `apps/web/components/ui/textarea.tsx`
- [x] `apps/web/components/ui/tooltip.tsx`

### Depth 4: apps/web/components/viewer/ (10 files)
- [x] `apps/web/components/viewer/document-group.tsx`
- [x] `apps/web/components/viewer/floating-input.tsx`
- [x] `apps/web/components/viewer/heading-section.tsx`
- [x] `apps/web/components/viewer/image-caption-section.tsx`
- [x] `apps/web/components/viewer/metric-card.tsx`
- [x] `apps/web/components/viewer/pitch-viewer.tsx`
- [x] `apps/web/components/viewer/section-card.tsx`
- [x] `apps/web/components/viewer/table-section.tsx`
- [x] `apps/web/components/viewer/text-section.tsx`
- [x] `apps/web/components/viewer/toc-sidebar.tsx`

### Depth 3: apps/api/app/ (1 files)
- [x] `apps/api/app/main.py`

### Depth 3: apps/web/app/ (3 files)
- [x] `apps/web/app/globals.css`
- [x] `apps/web/app/layout.tsx`
- [x] `apps/web/app/page.tsx`

### Depth 3: apps/web/lib/ (5 files)
- [x] `apps/web/lib/api.ts`
- [x] `apps/web/lib/parse-table-content.ts`
- [x] `apps/web/lib/pitch-api.ts`
- [x] `apps/web/lib/query-api.ts`
- [x] `apps/web/lib/utils.ts`

### Depth 3: packages/shared-types/src/ (1 files)
- [x] `packages/shared-types/src/index.ts`

### Depth 3: apps/web/hooks/ (2 files)
- [x] `apps/web/hooks/use-active-section.ts`
- [x] `apps/web/hooks/use-query-stream.ts`

### Depth 2: apps/api/ (2 files)
- [x] `apps/api/package.json`
- [x] `apps/api/pyproject.toml`

### Depth 2: apps/web/ (5 files)
- [x] `apps/web/components.json`
- [x] `apps/web/next.config.ts`
- [x] `apps/web/package.json`
- [x] `apps/web/postcss.config.mjs`
- [x] `apps/web/tsconfig.json`

### Depth 2: packages/shared-types/ (2 files)
- [x] `packages/shared-types/package.json`
- [x] `packages/shared-types/tsconfig.json`

### Depth 1: supabase/ (1 files)
- [x] `supabase/config.toml`

### Depth 0: ./ (3 files)
- [x] `package.json`
- [x] `pnpm-workspace.yaml`
- [x] `turbo.json`

---

## Phase 2: Directory AGENTS.md (Post-Order Traversal, 24 directories)

### Depth 5
- [x] `apps/api/app/api/v1/AGENTS.md`
- [x] `apps/api/app/services/parsers/AGENTS.md`
- [x] `apps/web/app/api/health/AGENTS.md`

### Depth 4
- [x] `apps/api/app/core/AGENTS.md`
- [x] `apps/api/app/models/AGENTS.md`
- [x] `apps/api/app/services/AGENTS.md`
- [x] `apps/web/app/documents/AGENTS.md`
- [x] `apps/web/app/pitch/AGENTS.md`
- [x] `apps/web/app/query/AGENTS.md`
- [x] `apps/web/components/documents/AGENTS.md`
- [x] `apps/web/components/qa/AGENTS.md`
- [x] `apps/web/components/query/AGENTS.md`
- [x] `apps/web/components/ui/AGENTS.md`
- [x] `apps/web/components/viewer/AGENTS.md`

### Depth 3
- [x] `apps/api/app/AGENTS.md`
- [x] `apps/web/app/AGENTS.md`
- [x] `apps/web/lib/AGENTS.md`
- [x] `packages/shared-types/src/AGENTS.md`
- [x] `apps/web/hooks/AGENTS.md`

### Depth 2
- [x] `apps/api/AGENTS.md`
- [x] `apps/web/AGENTS.md`
- [x] `packages/shared-types/AGENTS.md`

### Depth 1
- [x] `supabase/AGENTS.md`

### Depth 0
- [x] `./AGENTS.md` (root)
