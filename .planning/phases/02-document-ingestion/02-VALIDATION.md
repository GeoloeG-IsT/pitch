---
phase: 2
slug: document-ingestion
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 7.x |
| **Config file** | apps/api/pyproject.toml or "none — Wave 0 installs" |
| **Quick run command** | `cd apps/api && uv run pytest tests/ -x -q` |
| **Full suite command** | `cd apps/api && uv run pytest tests/ -v` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api && uv run pytest tests/ -x -q`
- **After every plan wave:** Run `cd apps/api && uv run pytest tests/ -v`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | INGEST-01, INGEST-02, INGEST-03 | integration | `uv run pytest tests/test_parsers.py` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | INGEST-04 | integration | `uv run pytest tests/test_node_mapper.py` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | MGMT-01, MGMT-02 | API | `uv run pytest tests/test_documents_api.py` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 2 | MGMT-01 | integration | `uv run pytest tests/test_ingestion.py` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/tests/conftest.py` — shared fixtures (Supabase test client, demo file fixtures)
- [ ] `apps/api/tests/test_parsers.py` — stubs for INGEST-01, INGEST-02, INGEST-03 (PDF, markdown, Excel parsers)
- [ ] `apps/api/tests/test_node_mapper.py` — stubs for INGEST-04 (structure preservation)
- [ ] `apps/api/tests/test_ingestion.py` — stubs for ingestion pipeline integration
- [ ] `apps/api/tests/test_documents_api.py` — stubs for MGMT-01, MGMT-02 (CRUD + re-upload)
- [ ] pytest + LlamaIndex deps — if not in current dependencies

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Upload progress indication | MGMT-01 | Visual UX | Upload a file, verify progress bar/spinner displays |
| Document list organization | MGMT-01 | Visual UX | Upload multiple files, verify list view is browsable |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
