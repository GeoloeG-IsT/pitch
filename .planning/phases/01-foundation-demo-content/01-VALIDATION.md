---
phase: 1
slug: foundation-demo-content
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-17
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest (Python) + vitest (TypeScript) |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `cd apps/api && uv run pytest tests/ -x` |
| **Full suite command** | `turbo test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `turbo test`
- **After every plan wave:** Run `turbo build && turbo test && supabase db reset`
- **Before `/gsd:verify-work`:** Full suite must be green + all demo content files exist in output directory
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | (infra) | smoke | `cd apps/web && pnpm build` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | (infra) | integration | `cd apps/api && uv run pytest tests/test_health.py -x` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | (infra) | integration | `supabase db reset` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | DEMO-01 | smoke | `uv run python content/build-all.py && test -f content/output/pitch-deck.pdf` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | DEMO-02 | smoke | `uv run python content/build-all.py && test -f content/output/financial-model.xlsx` | ❌ W0 | ⬜ pending |
| 01-02-03 | 02 | 1 | DEMO-03 | smoke | `uv run python content/build-all.py && ls content/output/*.pdf | wc -l` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/tests/test_health.py` — health endpoint integration test
- [ ] `apps/api/pyproject.toml` — needs pytest in dev dependencies
- [ ] `content/test_build.py` — smoke test that all content builds successfully
- [ ] Framework installs: `uv add --dev pytest` in api workspace

*Optional: `apps/web/vitest.config.ts` + `pnpm add -D vitest` in web (no frontend tests required for Phase 1)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pitch deck PDF has readable, styled slides | DEMO-01 | Visual quality requires human review | Open pitch-deck.pdf, verify 12-15 slides with headers, content, and consistent styling |
| Financial model has correct formulas | DEMO-02 | Formula correctness is semantic | Open financial-model.xlsx, verify TAM/SAM/SOM calculations and revenue projections |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
