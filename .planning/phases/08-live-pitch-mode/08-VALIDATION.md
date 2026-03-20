---
phase: 8
slug: live-pitch-mode
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest (backend), vitest or manual (frontend) |
| **Config file** | apps/api/pyproject.toml (pytest section) |
| **Quick run command** | `cd apps/api && uv run pytest tests/ -x -q` |
| **Full suite command** | `cd apps/api && uv run pytest tests/ -x` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api && uv run pytest tests/ -x -q`
- **After every plan wave:** Run `cd apps/api && uv run pytest tests/ -x`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | LIVE-01 | unit | `cd apps/api && uv run pytest tests/test_sessions.py -x` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | LIVE-01 | unit | `cd apps/api && uv run pytest tests/test_sessions.py -x` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 2 | LIVE-02 | manual | Manual: open /present, verify question feed | ❌ | ⬜ pending |
| 08-02-02 | 02 | 2 | LIVE-01, LIVE-02 | integration | `cd apps/api && uv run pytest tests/test_sessions.py tests/test_query_api.py -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_sessions.py` — stubs for LIVE-01 (session lifecycle, investor join, session end)
- [ ] `tests/test_query_api.py` — extend with live-mode routing tests for LIVE-02

*Existing test infrastructure (pytest, conftest.py, httpx) covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| LIVE banner visible on investor pitch viewer | LIVE-01 | Visual UI element | 1. Start live session 2. Open /pitch as investor 3. Verify red LIVE banner at top |
| Presenter view question feed updates in real-time | LIVE-02 | WebSocket real-time visual | 1. Open /present as founder 2. Ask question as investor 3. Verify question appears within 2s |
| Approve/Edit/Override actions publish to investor | LIVE-02 | End-to-end WebSocket flow | 1. Approve answer in presenter 2. Verify investor sees answer replace placeholder |
| Connected investor count and names in presenter header | LIVE-02 | Visual + WebSocket state | 1. Connect 2 investors 2. Verify count shows "2" with names in dropdown |

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
