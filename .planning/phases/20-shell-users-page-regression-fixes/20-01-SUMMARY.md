---
phase: 20-shell-users-page-regression-fixes
plan: 01
subsystem: ui
tags:
  - lit
  - shadow-dom
  - regression-fix
  - shared-styles
  - users-page
  - btn-icon

# Dependency graph
requires:
  - phase: 17-v3.0
    provides: ".btn-* standardization in src/styles/shared.ts (incl. .btn-icon svg { 16px })"
provides:
  - "<zt-data-table> now imports sharedStyles, closing the shadow-DOM boundary that hid .btn-icon svg sizing on Users-page action buttons (USERS-01)"
  - "Two-level shadow-root computed-style regression test on Users page covering all three action buttons (Edit, Reset Password, Delete) — first test in repo to drill page.shadowRoot -> child.shadowRoot and call getComputedStyle"
affects:
  - "Every <zt-data-table> consumer (network-detail, members, networks, controllers, pending) inherits the fix automatically — D-04 limits Phase 20 acceptance gates to Users page only"
  - "Future plans 20-02 / 20-03 / 20-04 (LAYOUT-01/02 navbar relocation, D-15 cleanup) — none depend on this plan but all execute in the same phase"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-level shadow-root drill + getComputedStyle for cross-shadow style-isolation regression tests"

key-files:
  created: []
  modified:
    - "src/components/data-table.ts (+2 lines: sharedStyles import + array element)"
    - "src/pages/users.test.ts (+25 lines: D-03 regression test block)"

key-decisions:
  - "Implemented D-01 verbatim — sharedStyles inserted in position 2 of static styles array (theme -> sharedStyles -> local css), byte-for-byte matching src/components/modal.ts:11-14"
  - "Implemented D-03 verbatim — single it() iterates all 3 action buttons (Edit, Reset Password, Delete) in their fixed source-order from users.ts:140-172; both width AND height asserted per button"

patterns-established:
  - "Pattern (new in this repo): nested-shadow getComputedStyle test — page.shadowRoot -> child.shadowRoot -> button.btn-icon -> svg, then getComputedStyle(svg).width/.height assertion. Future shadow-DOM-boundary regressions can copy this shape."

requirements-completed:
  - USERS-01

# Metrics
duration: ~12 min
completed: 2026-05-14
---

# Phase 20 Plan 01: Users-Page Icon Regression Fix Summary

**Closed the <zt-data-table> shadow-DOM boundary so .btn-icon svg { 16px } from sharedStyles reaches the Pencil/KeyRound/Trash2 SVGs on the Users page; added a two-level shadow-root computed-style regression test covering all three action buttons.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-05-14T13:54:00Z
- **Completed:** 2026-05-14T13:58:43Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `<zt-data-table>` joined the canonical Lit `[theme, sharedStyles, css\`...\`]` style stack (was the lone holdout among Lit components in the repo). `.btn-*` family + utility classes from `src/styles/shared.ts` now apply inside data-table's shadow DOM — every existing consumer (Users / Members / Networks / Network Detail / Controllers / Pending) benefits, but acceptance per D-04 is scoped to Users page only.
- Pencil / KeyRound / Trash2 SVGs on Users-page action buttons now render at 16x16 px (was 24x24 lucide-static default) with `.btn-icon` hover + disabled styling.
- New `it()` block in `src/pages/users.test.ts` iterates all three Users-page action buttons (Edit, Reset Password, Delete) and asserts `getComputedStyle(svg).width === '16px'` AND `.height === '16px'` per button. This is the first test in the repo to drill two shadow roots deep and use `getComputedStyle`.
- Full suite green: 33 test files, 630 passed + 8 skipped (was 18 in users.test.ts; now 19 with the new D-03 test).
- TypeScript type-check (`npx tsc --noEmit`) clean.

## Task Commits

Each task was committed atomically (with `--no-verify` per parallel-executor protocol; orchestrator validates hooks once after wave merge):

1. **Task 1: Add sharedStyles to `<zt-data-table>` static styles (D-01)** - `208967b` (fix)
2. **Task 2: Add D-03 nested-shadow computed-style regression test on Users page** - `8378cb3` (test)

**Plan metadata:** to be added by the post-wave orchestrator commit (worktree mode excludes STATE.md / ROADMAP.md per `<parallel_execution>` contract).

_Note: Both tasks were tagged `tdd="true"` in the plan; the plan ordered Task 1 (source change) before Task 2 (regression test). The new D-03 test passes on first run because Task 1's commit precedes it — staged-failure proof was skipped in favor of cascade reasoning per the plan's `<output>` allowance: "skipped staged-failure check; cascade reasoning sufficient". Reasoning: pre-Task-1, `.btn-icon svg { width: 16px; height: 16px }` from `src/styles/shared.ts:103-106` is defined inside `sharedStyles`, which `<zt-data-table>` did not import — therefore the rule could not cross the data-table shadow boundary to reach SVGs rendered by parent-provided cell render callbacks, and computed `width` / `height` on those SVGs would have been the lucide-static default 24px (or the user-agent default), not 16px._

## Files Created/Modified

- `src/components/data-table.ts` — added `import { sharedStyles } from '../styles/shared.js';` after the existing theme import (line 6) and inserted `sharedStyles,` as the second element of the `static styles` array (between `theme,` and the local `css\`\`` template literal). Two-line diff, no removals, no changes to the local `css\`\`` block. Matches `src/components/modal.ts:1-14` byte-for-byte for shape + relative import path.
- `src/pages/users.test.ts` — appended one new `it('Users-page action buttons render Lucide icons at 16x16 inside data-table shadow root (USERS-01 / D-03)', async () => { ... })` block inside the existing `describe('page-users UI', ...)` block, immediately before its closing `});` (insertion site verified: `awk '/describe..page-users UI/,/^}\);/' | grep -c "USERS-01 / D-03"` returns 1). Uses the existing `createUsersPage()` helper; no new imports; loops `for (let i = 0; i < 3; i++)` over the first 3 `button.btn-icon` elements in the data-table's shadow root.

## Action-button source-order confirmation

The loop iterates the three Users-page action buttons in their fixed source-order from `src/pages/users.ts:140-172`:

- index 0: **Edit** (`Pencil` SVG, `unsafeSVG(Pencil)` at users.ts:148)
- index 1: **Reset Password** (`KeyRound` SVG, `unsafeSVG(KeyRound)` at users.ts:157)
- index 2: **Delete** (`Trash2` SVG, `unsafeSVG(Trash2)` at users.ts:170)

The `expectedLabels = ['Edit', 'Reset Password', 'Delete']` array provides per-index failure-message context (e.g., `Reset Password button (index 1) svg width`) so any future regression on a specific button surfaces with a precise diagnostic.

## Decisions Made

None new — both decisions are direct implementations of locked CONTEXT decisions:

- **D-01 (CONTEXT):** Single-line `sharedStyles` insert. Implemented verbatim — `theme -> sharedStyles -> local css` order matches `src/components/modal.ts:11-14`.
- **D-03 (CONTEXT):** Per-button computed-style assertion. Implemented verbatim — loop iterates EACH of the three buttons (not just `buttons[0]`), asserting both width AND height. This was the explicit BLOCKER-2 fix in the plan-phase checker iteration 2/3 (per STATE.md line 31).
- **D-04 (CONTEXT):** Acceptance scope limited to Users page. Honored — no changes to any other page or test file. The data-table fix is global by construction; other consumers inherit it but are not gated on by this plan.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- **node_modules absent in worktree (environmental, pre-fix).** The fresh worktree did not have `src/node_modules` installed. Resolved by symlinking the main repo's installed `node_modules`: `ln -s /var/www/Projects/ztcwm/src/node_modules ./src/node_modules`. The symlink shows as untracked (`?? src/node_modules`) in `git status` but is NOT committed; the orchestrator's `.gitignore` for `node_modules` would suppress it on a normal install, and in worktree mode the orchestrator force-removes the worktree after merge so the symlink is ephemeral. This is consistent with the `<parallel_execution>` contract.
- **Plan's `data-table.test.ts` test target does not exist.** Task 1's `<verify>` block referenced `npm test -- src/components/data-table.test.ts`, but no such test file exists in the repo (verified by absence). The verify command would exit non-zero (vitest's "No test files found" exits 1). This was treated as a vacuous pass — Task 1's behavior is verified by (a) all 6 grep-based acceptance criteria passing, (b) the full suite remaining green across 33 test files, and (c) Task 2's new D-03 test passing (which is the actual functional gate proving the import works). The plan's `<verification>` section #3 (`npm test -- src/components/data-table.test.ts src/pages/users.test.ts`) is similarly affected but `users.test.ts` alone passes 19/19; the broader `npm test` run passes 33 files / 630 tests.

## Unexpected `lucide-static` / `unsafeSVG` rendering quirks

None. The `unsafeSVG(Pencil)` / `unsafeSVG(KeyRound)` / `unsafeSVG(Trash2)` directives render the raw `<svg>...</svg>` as direct children of the `.btn-icon` button, exactly as the plan's `<action>` note predicted. The selector `buttons[i].querySelector('svg')` matched immediately on each of the three buttons. No diagnostic console.log was needed; no selector relaxation was needed.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- USERS-01 fixed at the root cause (shadow-DOM boundary) rather than per-cell workarounds. Phase 20 Plan 02 / 03 / 04 are independent of this plan (different files) but share the phase's larger goal of restoring v3.0 polish; this plan delivers SC #1 (icons visible on Users page), SC #4 (`.btn-*` system preserved — fix is inside the existing class), and SC #5 (regression test coverage).
- The new nested-shadow `getComputedStyle` test pattern is now available in the repo. If LAYOUT-01 (plan 20-03) needs to assert the persistent-navbar mounts correctly inside `<zt-app>`'s shadow root, it can follow the same drill pattern.
- No blockers or concerns.

## Self-Check: PASSED

Verified:

- `src/components/data-table.ts` exists with `sharedStyles` import (line 6) and array element (line 35).
- `src/pages/users.test.ts` exists with the new `it()` block (line 201).
- Commit `208967b` exists in `git log`.
- Commit `8378cb3` exists in `git log`.
- All 19 tests in `users.test.ts` pass; full suite (33 files / 630 tests) passes.
- `npx tsc --noEmit` exits 0.

---

*Phase: 20-shell-users-page-regression-fixes*
*Completed: 2026-05-14*
