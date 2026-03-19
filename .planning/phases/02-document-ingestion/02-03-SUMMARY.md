---
phase: 02-document-ingestion
plan: 03
subsystem: ui
tags: [react, nextjs, shadcn, drag-drop, file-upload, polling, toast, document-management]

# Dependency graph
requires:
  - phase: 02-document-ingestion/02
    provides: "Document CRUD API endpoints (POST/GET/DELETE/PUT /api/v1/documents)"
provides:
  - "Founder-facing document management page at /documents"
  - "Drag-and-drop file upload with PDF/Excel/Markdown support"
  - "Real-time status polling (Queued -> Indexing -> Ready/Failed)"
  - "Delete and replace document flows with confirmation dialogs"
  - "Typed API client (apps/web/lib/api.ts) for document CRUD"
affects: [03-rag-query-engine, 04-smart-document-viewer]

# Tech tracking
tech-stack:
  added: [shadcn/dialog, shadcn/progress, shadcn/sonner, shadcn/dropdown-menu, shadcn/skeleton, shadcn/separator, lucide-react]
  patterns: [status-polling-with-useEffect, drag-drop-file-upload, toast-notifications-via-sonner, confirmation-dialog-pattern]

key-files:
  created:
    - apps/web/lib/api.ts
    - apps/web/app/documents/page.tsx
    - apps/web/app/documents/layout.tsx
    - apps/web/components/documents/upload-zone.tsx
    - apps/web/components/documents/document-card.tsx
    - apps/web/components/documents/document-list.tsx
    - apps/web/components/documents/delete-dialog.tsx
    - apps/web/components/documents/replace-dialog.tsx
    - supabase/migrations/00002_seed_demo_user.sql
  modified:
    - apps/web/app/layout.tsx
    - apps/api/app/main.py
    - apps/api/app/services/parsers/excel_parser.py
    - apps/api/app/api/v1/documents.py
    - apps/web/app/documents/page.tsx

key-decisions:
  - "Sonner for toast notifications (shadcn integration, non-blocking UX)"
  - "3-second polling interval for status updates (balance of responsiveness vs load)"
  - "5-minute polling timeout to prevent indefinite polling on stuck documents"
  - "Deduplicate uploads by filename -- replace existing document rather than creating duplicate"

patterns-established:
  - "Status polling: useEffect with setInterval, tracking pollingIds in state"
  - "File upload: hidden input + drag-drop zone, FormData POST to API"
  - "Confirmation dialog: separate dialog component with open/onOpenChange/onConfirm props"
  - "API client: typed fetch wrappers in apps/web/lib/api.ts"

requirements-completed: [MGMT-01, MGMT-02]

# Metrics
duration: 15min
completed: 2026-03-19
---

# Phase 2 Plan 3: Document Management UI Summary

**Drag-and-drop document management page with upload zone, status polling (Queued/Indexing/Ready), delete/replace confirmation dialogs, and sonner toast notifications**

## Performance

- **Duration:** ~15 min (including human verification and bug fixes)
- **Started:** 2026-03-19T00:00:00Z
- **Completed:** 2026-03-19T00:15:00Z
- **Tasks:** 2 (1 auto + 1 human-verify checkpoint)
- **Files modified:** 15 (core plan files) + shadcn UI components

## Accomplishments
- Built complete /documents page with drag-and-drop upload zone supporting PDF, Excel, and Markdown
- Status polling transitions documents through Queued -> Indexing -> Ready/Failed with visual badges and progress indicators
- Delete and replace flows with confirmation dialogs and toast notifications
- Typed API client with uploadDocument, listDocuments, getDocument, deleteDocument, replaceDocument
- Fixed 5 bugs discovered during human verification (FK constraint, env var export, lazy embedding init, upload dedup, UI state dedup)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install shadcn components, create API client, and build document management page** - `df75103` (feat)
2. **Task 2: Verify document management UI** - `d08674c` (fix -- bug fixes from human verification)

## Files Created/Modified
- `apps/web/lib/api.ts` - Typed API client with Document interface and CRUD functions
- `apps/web/app/documents/page.tsx` - Main document management page with upload, polling, delete, replace
- `apps/web/app/documents/layout.tsx` - Layout with metadata for /documents route
- `apps/web/components/documents/upload-zone.tsx` - Drag-and-drop file upload component
- `apps/web/components/documents/document-card.tsx` - Document display with status badge and overflow menu
- `apps/web/components/documents/document-list.tsx` - Document list with loading/empty/populated states
- `apps/web/components/documents/delete-dialog.tsx` - Delete confirmation dialog
- `apps/web/components/documents/replace-dialog.tsx` - Replace confirmation dialog
- `apps/web/app/layout.tsx` - Added Toaster component for sonner notifications
- `supabase/migrations/00002_seed_demo_user.sql` - Demo user seed for FK constraint
- `apps/api/app/main.py` - OPENAI_API_KEY export to os.environ
- `apps/api/app/services/parsers/excel_parser.py` - Lazy-init OpenAIEmbedding
- `apps/api/app/api/v1/documents.py` - Deduplicate uploads by filename

## Decisions Made
- Used sonner (via shadcn) for toast notifications -- lightweight, non-blocking UX
- 3-second polling interval balances responsiveness with API load
- 5-minute polling timeout prevents indefinite polling on stuck documents
- Deduplicate uploads by filename: replacing existing document rather than creating a second entry

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Demo user seed for FK constraint**
- **Found during:** Task 2 (human verification)
- **Issue:** Document uploads failed because user_id FK referenced a non-existent user
- **Fix:** Created `supabase/migrations/00002_seed_demo_user.sql` to seed the DEMO_USER_ID
- **Files modified:** supabase/migrations/00002_seed_demo_user.sql
- **Verification:** Upload succeeds after migration
- **Committed in:** d08674c

**2. [Rule 1 - Bug] OPENAI_API_KEY not available to LlamaIndex**
- **Found during:** Task 2 (human verification)
- **Issue:** LlamaIndex couldn't find OPENAI_API_KEY because it was only in .env, not exported to os.environ
- **Fix:** Added os.environ export in apps/api/app/main.py startup
- **Files modified:** apps/api/app/main.py
- **Verification:** Embedding generation works after fix
- **Committed in:** d08674c

**3. [Rule 1 - Bug] OpenAIEmbedding instantiated before env var available**
- **Found during:** Task 2 (human verification)
- **Issue:** Excel parser instantiated OpenAIEmbedding at module level, before env var was set
- **Fix:** Changed to lazy initialization pattern (init on first use)
- **Files modified:** apps/api/app/services/parsers/excel_parser.py
- **Verification:** Excel parsing works without startup error
- **Committed in:** d08674c

**4. [Rule 1 - Bug] Duplicate documents on re-upload**
- **Found during:** Task 2 (human verification)
- **Issue:** Uploading the same file twice created duplicate entries
- **Fix:** Backend checks for existing document with same filename and replaces it
- **Files modified:** apps/api/app/api/v1/documents.py
- **Verification:** Re-uploading same file updates existing entry
- **Committed in:** d08674c

**5. [Rule 1 - Bug] UI duplicate on document replacement**
- **Found during:** Task 2 (human verification)
- **Issue:** Frontend prepended replaced document instead of updating in place
- **Fix:** Updated state handler to update existing document entry in place
- **Files modified:** apps/web/app/documents/page.tsx
- **Verification:** Replaced document updates in list without duplicate
- **Committed in:** d08674c

---

**Total deviations:** 5 auto-fixed (5 bugs via Rule 1)
**Impact on plan:** All fixes were necessary for correct end-to-end functionality. No scope creep.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Document ingestion pipeline is complete end-to-end: upload -> parse -> chunk -> embed -> store -> display
- Phase 2 success criteria fully met: PDF, text, and Excel documents can be uploaded, parsed, and managed
- Ready for Phase 3 (RAG Query Engine) which will query the embedded chunks

---
*Phase: 02-document-ingestion*
*Completed: 2026-03-19*
