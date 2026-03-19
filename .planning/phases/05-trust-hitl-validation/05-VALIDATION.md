---
phase: 5
slug: trust-hitl-validation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest + pytest-asyncio |
| **Config file** | apps/api/pyproject.toml (implicit) |
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
| TRUST-01a | 01 | 1 | TRUST-01 | unit | `cd apps/api && uv run pytest tests/test_confidence.py -x` | ❌ W0 | ⬜ pending |
| TRUST-01b | 01 | 1 | TRUST-01 | unit | `cd apps/api && uv run pytest tests/test_confidence.py::test_tier_thresholds -x` | ❌ W0 | ⬜ pending |
| TRUST-01c | 01 | 1 | TRUST-01 | unit | `cd apps/api && uv run pytest tests/test_confidence.py::test_extract_llm_confidence -x` | ❌ W0 | ⬜ pending |
| TRUST-02a | 01 | 1 | TRUST-02 | integration | `cd apps/api && uv run pytest tests/test_query_api.py::test_low_confidence_queued -x` | ❌ W0 | ⬜ pending |
| TRUST-02b | 01 | 1 | TRUST-02 | integration | `cd apps/api && uv run pytest tests/test_query_api.py::test_high_confidence_auto_publish -x` | ❌ W0 | ⬜ pending |
| TRUST-03a | 02 | 1 | TRUST-03 | integration | `cd apps/api && uv run pytest tests/test_reviews_api.py::test_list_pending_reviews -x` | ❌ W0 | ⬜ pending |
| TRUST-03b | 02 | 1 | TRUST-03 | integration | `cd apps/api && uv run pytest tests/test_reviews_api.py::test_approve_review -x` | ❌ W0 | ⬜ pending |
| TRUST-03c | 02 | 1 | TRUST-03 | integration | `cd apps/api && uv run pytest tests/test_reviews_api.py::test_reject_requires_replacement -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/tests/test_confidence.py` — stubs for TRUST-01 (confidence calculation unit tests)
- [ ] `apps/api/tests/test_reviews_api.py` — stubs for TRUST-03 (review CRUD integration tests)
- [ ] Extend `apps/api/tests/test_query_api.py` — stubs for TRUST-02 (routing tests)

*Existing pytest + pytest-asyncio infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Confidence badge visual display (green/yellow/red) | TRUST-01 | Visual rendering requires browser | Open pitch viewer, ask question, verify badge color matches tier |
| "Being verified" placeholder animation | TRUST-02 | Animation timing requires visual | Ask low-confidence question, observe placeholder appears |
| Approved answer smooth replacement | TRUST-02 | WebSocket push + animation | Approve from dashboard, verify investor session updates |
| Inline edit UX in dashboard | TRUST-03 | Interactive editing requires browser | Click answer text, edit, verify Save & Approve flow |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
