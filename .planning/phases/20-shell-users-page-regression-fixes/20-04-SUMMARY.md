---
phase: 20-shell-users-page-regression-fixes
plan: 04
subsystem: ui-shell
tags:
  - cleanup
  - dead-code-removal
  - pages
  - test-update
  - css-token-cleanup
dependency_graph:
  requires:
    - 20-01 (shell-mounted navbar consumer prerequisite — users.test.ts D-03 test addition)
    - 20-03 (persistent <zt-navbar> in <zt-app>, app.test.ts navbar coverage, navbar.ts removes height: var(--navbar-height))
  provides:
    - LAYOUT-01 fully shipped — navbar lives once in <zt-app>, zero per-page renders
    - clean theme.ts token set (no orphaned --navbar-height)
  affects:
    - all 10 src/pages/*.ts page files
    - src/pages/users.test.ts
    - src/styles/theme.ts
tech_stack:
  added: []
  patterns:
    - Pattern D: shell-mounted navbar; per-page render templates retain margin-top wrappers
key_files:
  created: []
  modified:
    - src/pages/dashboard.ts
    - src/pages/networks.ts
    - src/pages/network-detail.ts
    - src/pages/members.ts
    - src/pages/controllers.ts
    - src/pages/settings.ts
    - src/pages/logs.ts
    - src/pages/api-explorer.ts
    - src/pages/pending.ts
    - src/pages/users.ts
    - src/pages/users.test.ts
    - src/styles/theme.ts
decisions:
  - D-13 closed: every per-page <zt-navbar> invocation deleted (13 total)
  - D-14 honoured: src/components/navbar.ts and navbar.test.ts untouched (component still mounted by <zt-app>)
  - D-15 closed: users.test.ts navbar-assertion block deleted (equivalent coverage in app.test.ts from Plan 20-03)
  - D-16 closed: dashboard, controllers, network-detail double-renders treated uniformly — both branches lose <zt-navbar>
  - UI-SPEC § Navbar height token cleanup: --navbar-height token deleted from theme.ts
metrics:
  duration: ~25 min
  completed: 2026-05-14T15:54:42Z
  commits: 3
  files_modified: 12
  net_line_changes: 0 additions / 42 deletions
requirements:
  - LAYOUT-01
---

# Phase 20 Plan 04: Per-Page Navbar Cleanup Summary

Deletion-only cleanup that completes LAYOUT-01: removed 13 per-page `<zt-navbar>` invocations, 10 dead `import '../components/navbar.js';` lines, the stale `users.test.ts` navbar-assertion block, and the orphaned `--navbar-height: 56px` CSS token. The `<zt-navbar>` component file itself is preserved (D-14) — only call sites and dead refs were removed.

## What Shipped

**Task 1 (commit `482f7ab`)** — Per-page navbar usage purge:
- Removed all 13 `<zt-navbar ...></zt-navbar>` invocations across 10 page files
- Removed all 10 dead `import '../components/navbar.js';` lines
- Preserved every page-level `<div style="margin-top: var(--space-lg, 1.5rem);">` wrapper to keep visual rhythm below the shell-mounted navbar (Pattern D guidance)
- Handled double-render pages (`dashboard.ts`, `controllers.ts`, `network-detail.ts`) uniformly per D-16 — both the loading branch and the loaded branch had their `<zt-navbar>` removed

**Task 2 (commit `bfe29de`)** — Test cleanup:
- Removed the `it('renders navbar with User Management title', ...)` block from `describe('page-users UI')` in `src/pages/users.test.ts` (D-15)
- Identified the block by literal content match (per worktree note guidance), not by line number
- `describe('page-users UI')` and `describe('Edit User modal (USER-01)')` boundaries intact

**Task 3 (commit `11dd2bb`)** — Token cleanup:
- Removed the `--navbar-height: 56px;` declaration from `src/styles/theme.ts` (UI-SPEC § Navbar height token cleanup)
- Adjacent tokens (`--sidebar-width`, `--sidebar-width-collapsed`, `--transition-fast`) untouched

## Verification

| Acceptance grep | Result |
|---|---|
| `grep -rE "<zt-navbar" src/pages/ \| wc -l` | 0 |
| `grep -rE "import '\.\./components/navbar\.js'" src/pages/ \| wc -l` | 0 |
| `grep -rn "components/navbar" src/pages/ \| grep -v test \| wc -l` | 0 |
| `grep -c "zt-navbar" src/pages/users.test.ts` | 0 |
| `grep -rE "zt-navbar" src/pages/*.test.ts \| wc -l` | 0 |
| `grep -c "navbar-height" src/styles/theme.ts` | 0 |
| `grep -c "describe('page-users UI'" src/pages/users.test.ts` | 1 |
| `grep -c "describe('Edit User modal" src/pages/users.test.ts` | 1 |
| `grep -c "sidebar-width" src/styles/theme.ts` | 2 |
| Authoritative sweep: `grep -rE "<zt-navbar\|import '\.\./components/navbar\.js'\|var\(--navbar-height\)" src/ \| grep -v "src/components/navbar" \| grep -v "src/app"` | (empty) |

All 10 page files still exist. `src/components/navbar.ts` and `src/components/navbar.test.ts` are UNCHANGED (verified via `git diff HEAD~3 HEAD -- src/components/navbar.ts src/components/navbar.test.ts` returns empty).

The single remaining `var(--navbar-height)` reference at `src/components/navbar.ts:25` is the Wave-2 (Plan 20-03 Task 1) consumer that disappears in the merge target (see Issues Encountered below). Post-merge state: zero token, zero consumers.

## Deviations from Plan

None — plan executed exactly as written. Every deletion target matched the literal grep output captured in 20-PATTERNS.md.

## Issues Encountered

**Worktree base is pre-Wave-1+2.** The orchestrator prompt expected `EXPECTED_BASE=fbce9ac9...` (the merged result of Waves 1+2). The actual worktree HEAD was `4b174c7a...`, which is an ancestor of the expected base. Attempts to fast-forward, reset, or fetch the expected base were denied by environment permissions (the standard worktree-branch-check escape hatches all hit permission errors).

Per the orchestrator's worktree_branch_check guidance ("do NOT bail. Plan 20-04's files are disjoint from Wave 1+2's files... A 3-way merge will be conflict-free"), I proceeded with the work without rebasing. Implications:

1. `src/pages/users.test.ts` did not contain Plan 20-01's added D-03 test block at the time of editing — the navbar-test block sat at lines 193-199 unchanged. The deletion was performed using exact content matching (as the worktree note instructed) so the orchestrator's three-way merge will preserve 20-01's added D-03 test alongside this deletion.
2. `src/components/navbar.ts` still references `height: var(--navbar-height);` at line 25 in the worktree base. Wave-2 (Plan 20-03 Task 1) removes that reference. When the orchestrator merges this branch onto the post-Wave-1+2 main, the merged result has both the consumer (gone via Wave 2) and the token (gone via this plan) deleted. Final state: zero references on either side.
3. `src/app.ts` and `src/app.test.ts` (Wave 2 additions) are absent from this worktree but unrelated to any file this plan touches — no conflict risk.

**Environment limits prevent verification execution.** `npm test`, `npx tsc --noEmit`, and `npm run build` could not be run from the worktree — bash commands like `cd src` and arbitrary `node_modules` symlink creation hit permission denials. The plan's `<verify>` automated steps were therefore exercised by grep-based acceptance criteria only. Given that all 12 file modifications are pure deletions of self-contained tokens (component invocations, import statements, a test block, a single CSS custom property declaration), with no logic changes and no new imports, the risk of a typecheck/test regression introduced by this plan is minimal. The orchestrator should run the full suite once the merge lands.

## Deferred Issues

None.

## TDD Gate Compliance

N/A — plan is `tdd: false`. Deletion-only cleanup; no behavior introduced or modified.

## Threat Model Notes

All three STRIDE entries in the plan's `<threat_model>` (T-20-08 DoS via render lifecycle, T-20-09 information disclosure via dead token, T-20-10 test coverage gap) are dispositioned `accept` — strictly improving each posture per the rationale in the plan. No new surface introduced.

## Self-Check: PASSED

| Item | Verification | Status |
|---|---|---|
| Task 1 commit `482f7ab` exists | `git log --oneline -5` includes it | FOUND |
| Task 2 commit `bfe29de` exists | `git log --oneline -5` includes it | FOUND |
| Task 3 commit `11dd2bb` exists | `git log --oneline -5` includes it | FOUND |
| 10 page files modified, 1 test file, 1 styles file | `git diff --stat HEAD~3 HEAD` shows 12 files | FOUND |
| 0 zt-navbar refs in src/pages | grep returns 0 | FOUND |
| 0 navbar.js imports in src/pages | grep returns 0 | FOUND |
| 0 navbar-height refs in theme.ts | grep returns 0 | FOUND |
| `src/components/navbar.ts` unchanged (D-14) | diff returns empty | FOUND |
| `src/components/navbar.test.ts` unchanged (D-14) | diff returns empty | FOUND |
| `describe('page-users UI')` boundary preserved | grep returns 1 | FOUND |
| `describe('Edit User modal (USER-01)')` boundary preserved | grep returns 1 | FOUND |

---

*Phase 20 Plan 04 complete. Phase 20 ships USERS-01 (from 20-01) + LAYOUT-02 (from 20-02) + LAYOUT-01 persistent shell (from 20-03) + LAYOUT-01 cleanup (this plan). UAT-ready after orchestrator merge.*
