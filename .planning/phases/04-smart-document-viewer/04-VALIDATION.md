---
phase: 4
slug: smart-document-viewer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest (backend) / TypeScript type-checking (frontend) |
| **Config file** | apps/api/pyproject.toml (pytest), apps/web/tsconfig.json (tsc) |
| **Quick run command** | `cd apps/api && pnpm test` / `cd apps/web && pnpm typecheck` |
| **Full suite command** | `pnpm test && pnpm typecheck` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api && pnpm test` + `cd apps/web && pnpm typecheck`
- **After every plan wave:** Run `pnpm test && pnpm typecheck`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | VIEW-01 | unit | `cd apps/api && uv run pytest tests/test_pitch_api.py -x` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | VIEW-01 | manual | Visual inspection in browser | N/A | ⬜ pending |
| 04-01-03 | 01 | 1 | VIEW-02 | manual | Browser DevTools responsive mode | N/A | ⬜ pending |
| 04-01-04 | 01 | 1 | VIEW-03 | manual | Visual comparison against UI-SPEC | N/A | ⬜ pending |
| 04-02-01 | 02 | 1 | QA-02 | manual | Click FAB, verify section context chip | N/A | ⬜ pending |
| 04-02-02 | 02 | 1 | QA-02 | unit | `cd apps/api && uv run pytest tests/test_pitch_api.py::test_scoped_query -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/tests/test_pitch_api.py` — stubs for VIEW-01 (pitch endpoint returns correct data) and QA-02 (scoped query)
- [ ] TypeScript types for PitchResponse, PitchChunk — ensures type safety in frontend

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Viewer renders section cards from chunk data | VIEW-01 | Visual rendering requires browser | Navigate to /pitch, verify cards render with correct content per section |
| Responsive layout at mobile/tablet/desktop | VIEW-02 | Layout behavior requires visual inspection | Use DevTools responsive mode at 375px, 768px, 1280px widths |
| Professional design matches UI-SPEC | VIEW-03 | Subjective visual quality assessment | Compare rendered viewer against UI-SPEC layout contract and color tokens |
| Q&A panel opens scoped to current section | QA-02 | Interaction flow requires browser | Click FAB, verify section context chip shows current section name |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
