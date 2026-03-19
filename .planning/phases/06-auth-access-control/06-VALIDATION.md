---
phase: 6
slug: auth-access-control
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 7.x (backend), vitest (frontend — if added) |
| **Config file** | apps/api/pyproject.toml (pytest section) |
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
| 06-01-01 | 01 | 1 | AUTH-01 | integration | `uv run pytest tests/test_auth.py -k signup_login` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | AUTH-02 | integration | `uv run pytest tests/test_auth.py -k role_permissions` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | AUTH-03 | integration | `uv run pytest tests/test_share.py -k generate_link` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 2 | AUTH-04 | integration | `uv run pytest tests/test_share.py -k revoke_access` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/tests/test_auth.py` — stubs for AUTH-01, AUTH-02
- [ ] `apps/api/tests/test_share.py` — stubs for AUTH-03, AUTH-04
- [ ] `apps/api/tests/conftest.py` — shared fixtures (Supabase test client, auth helpers)

*Existing pytest infrastructure covers framework installation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| OAuth login flow (Google/GitHub/LinkedIn) | AUTH-01 | Requires real OAuth provider redirect | 1. Click OAuth button 2. Complete provider flow 3. Verify redirect to /dashboard |
| Token link anonymous access | AUTH-03 | Requires browser session with no auth cookie | 1. Generate share link 2. Open in incognito 3. Verify pitch viewer loads |
| Access revocation immediate effect | AUTH-04 | Requires two browser sessions | 1. Open pitch via token link 2. Revoke from dashboard 3. Refresh investor browser — verify "access expired" |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
