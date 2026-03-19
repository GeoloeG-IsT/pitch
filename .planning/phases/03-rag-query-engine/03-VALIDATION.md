---
phase: 3
slug: rag-query-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest + pytest-asyncio |
| **Config file** | apps/api/pyproject.toml (minimal) |
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
| 03-01-01 | 01 | 1 | QA-01 | integration | `cd apps/api && uv run pytest tests/test_query_api.py -x` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | QA-01 | unit | `cd apps/api && uv run pytest tests/test_retrieval.py -x` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | QA-01 | unit | `cd apps/api && uv run pytest tests/test_retrieval.py::test_reranking -x` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | QA-03 | unit | `cd apps/api && uv run pytest tests/test_retrieval.py::test_cross_document -x` | ❌ W0 | ⬜ pending |
| 03-01-05 | 01 | 1 | QA-04 | integration | `cd apps/api && uv run pytest tests/test_query_api.py::test_websocket_stream -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_query_api.py` — stubs for QA-01 (REST endpoint), QA-04 (WebSocket streaming)
- [ ] `tests/test_retrieval.py` — stubs for QA-01 (vector search + reranking), QA-03 (cross-document)
- [ ] `tests/conftest.py` — mock fixtures for Cohere rerank API and AsyncOpenAI streaming
- [ ] WebSocket test client setup (httpx + `TestClient.websocket_connect()`)
- [ ] Migration: `00003_queries_table.sql` with `match_chunks` RPC function

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Token-by-token streaming feels real-time in browser | QA-04 | Visual/UX assessment | Open browser, ask question, verify tokens appear incrementally (not as a block) |
| Cross-document citations are coherent and natural | QA-03 | Prose quality assessment | Ask "How does the revenue model support the market size claims?" — verify answer references both Pitch Deck and Financial Model |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
