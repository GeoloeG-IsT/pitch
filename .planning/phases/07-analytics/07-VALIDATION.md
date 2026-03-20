---
phase: 7
slug: analytics
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 7.x (backend) / vitest (frontend — if configured) |
| **Config file** | `apps/api/pyproject.toml` |
| **Quick run command** | `cd apps/api && uv run pytest tests/ -x -q --timeout=10` |
| **Full suite command** | `cd apps/api && uv run pytest tests/ -v --timeout=30` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api && uv run pytest tests/ -x -q --timeout=10`
- **After every plan wave:** Run `cd apps/api && uv run pytest tests/ -v --timeout=30`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | ANLYT-01, ANLYT-02 | unit | `cd apps/api && uv run pytest tests/test_analytics_api.py -x -q` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | ANLYT-03 | unit | `cd apps/api && uv run pytest tests/test_notifications.py -x -q` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 2 | ANLYT-04 | unit | `cd apps/api && uv run pytest tests/test_analytics_api.py::test_question_log -x -q` | ❌ W0 | ⬜ pending |
| 07-02-02 | 02 | 2 | ANLYT-05 | unit | `cd apps/api && uv run pytest tests/test_analytics_api.py::test_engagement_flags -x -q` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/tests/test_analytics_api.py` — stubs for ANLYT-01, ANLYT-02, ANLYT-04, ANLYT-05
- [ ] `apps/api/tests/test_notifications.py` — stubs for ANLYT-03 (notification on pitch open)

*Existing pytest infrastructure and conftest.py cover shared fixtures.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Intersection Observer section tracking | ANLYT-02 | Browser-only API, cannot test in pytest | Open pitch viewer, scroll through sections, verify events appear in analytics_events table |
| sendBeacon flush on page leave | ANLYT-01, ANLYT-02 | Requires browser navigation event | Open pitch, navigate away, check analytics_events table for flushed batch |
| Sonner toast on investor open | ANLYT-03 | UI notification, requires two browser sessions | Open pitch as investor while founder dashboard is open, verify toast appears |
| Heatmap visualization | ANLYT-02 | Visual rendering check | Open analytics tab, verify bar chart renders with correct section proportions |
| Expandable investor row | ANLYT-01 | Visual interaction check | Click investor row, verify per-section breakdown and question log expand inline |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
