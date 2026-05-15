---
phase: 20-shell-users-page-regression-fixes
plan: 05
subsystem: ui-shell
tags:
  - gap-closure
  - bug-fix
  - regression-test
  - theme
  - two-way-binding
  - cr-01
  - in-04
dependency_graph:
  requires:
    - 20-03 (persistent <zt-navbar> mount in <zt-app>; vaadin-router-location-changed driven binding)
    - 20-04 (per-page <zt-navbar> removals — Phase 20 invariants the gap-closure must preserve)
  provides:
    - CR-01 closed: Settings -> persistent navbar theme propagation works correctly
    - Single source of truth for theme established (<zt-app>.theme @state)
    - System theme UX contract preserved (no localStorage poisoning after the System click)
    - Two automated regression guards: CR-01 propagation + System persist:false contract
  affects:
    - src/components/navbar.ts (@state currentTheme -> @property currentTheme; localStorage read removed)
    - src/app.ts (new public setTheme(target, options?); toggleTheme delegates; navbar binding adds .currentTheme)
    - src/pages/settings.ts (setTheme routes through app.setTheme; import type ZtApp added)
    - src/app.test.ts (+2 new it() blocks under describe('zt-app persistent navbar (LAYOUT-01)'))
tech_stack:
  added: []
  patterns:
    - Option B / IN-04: parent -> child property binding for theme (single source of truth, no independent navbar @state)
    - Opt-out persistence via options.persist?: boolean on app.setTheme() (preserves System UX contract while consolidating writer)
key_files:
  created: []
  modified:
    - src/components/navbar.ts
    - src/app.ts
    - src/pages/settings.ts
    - src/app.test.ts
decisions:
  - "Option B (IN-04) chosen over Option A: thread <zt-app>.theme down to <zt-navbar>.currentTheme via Lit @property binding (single source of truth) rather than rely on toggleTheme() side-effect re-sync. Makes CR-01 impossible by construction."
  - "Added options.persist?: boolean to app.setTheme() to preserve the pre-Phase-20 'System' UX contract: the System branch in settings.ts passes { persist: false } so the live UI updates without writing localStorage, then explicitly localStorage.removeItem('zt-theme') so next boot re-reads OS preference via matchMedia."
  - "Test rationale: tests added in src/app.test.ts (not src/pages/settings.test.ts) because the propagation contract under test is <zt-app>.setTheme() -> <zt-navbar>.currentTheme; the responsibility lives in <zt-app> and the navbar mock in app.test.ts is sufficient to observe the property binding."
metrics:
  duration: ~8 min
  completed: 2026-05-15T18:51:47Z
  commits: 4
  files_modified: 4
  net_line_changes: 129 additions / 14 deletions
requirements:
  - LAYOUT-01
---

# Phase 20 Plan 05: CR-01 Gap-Closure Summary

One-liner: Closed the CR-01 BLOCKER (theme toggle from Settings left persistent navbar icon stale) via Option B / IN-04 — `<zt-navbar>.currentTheme` is now a parent-bound `@property` fed by `<zt-app>.theme`, and a new public `<zt-app>.setTheme(target, options?)` method routes all explicit theme writes through a single source of truth with opt-out persistence to preserve the System UX contract.

## What Shipped

**Task 1 (commit `36c8f3f`)** — `src/components/navbar.ts` (1 insertion / 3 deletions):
- Converted `@state() private currentTheme = 'dark'` to `@property({ type: String }) currentTheme: 'dark' | 'light' = 'dark'` so the parent can drive the value via Lit property binding (IN-04 design fix).
- Removed `this.currentTheme = localStorage.getItem('zt-theme') || 'dark'` from `connectedCallback` — parent is now the source of truth, no independent state to drift.
- Dropped the redundant `this.currentTheme = app.currentTheme` self-assignment in `handleThemeToggle()` — the parent re-render now propagates the new value via the binding.

**Task 2 (commit `1adb8b4`)** — `src/app.ts` (10 insertions / 4 deletions):
- Added `public setTheme(target: 'dark' | 'light', options: { persist?: boolean } = { persist: true }): void` — the new sole writer for theme state. Mutates `this.theme` (the `@state`), syncs the `theme` attribute, and conditionally writes localStorage based on `options.persist !== false`.
- Refactored `toggleTheme()` to delegate to `setTheme(this.theme === 'dark' ? 'light' : 'dark')` (default options, persist on) — preserves the navbar theme-button contract while consolidating writes.
- Threaded `.currentTheme=${this.theme}` into the `<zt-navbar>` render binding in the non-login branch so Lit pushes the new value to the persistent navbar on every `<zt-app>.theme` state mutation.

**Task 3 (commit `46417ae`)** — `src/pages/settings.ts` (11 insertions / 7 deletions):
- Rewrote `setTheme(theme: 'dark' | 'light' | 'system')` to route through `<zt-app>.setTheme()` instead of mutating the theme attribute and localStorage directly.
- 'system' branch: resolves OS preference, calls `app.setTheme(resolved, { persist: false })` so the live UI updates without poisoning localStorage with a one-shot snapshot, then explicitly `localStorage.removeItem('zt-theme')` to guarantee the key is absent for next-boot OS-preference re-read.
- 'dark' / 'light' branch: calls `app.setTheme(theme)` with the default `{ persist: true }` — `<zt-app>.setTheme()` owns persistence end-to-end.
- Dropped the direct `app.setAttribute('theme', ...)` and `localStorage.setItem('zt-theme', ...)` calls.
- Added `import type { ZtApp } from '../app.js'` (type-only — no runtime circular dependency) plus the typed cast `as ZtApp | null`.

**Task 4 (commit `93101ea`)** — `src/app.test.ts` (107 insertions / 0 deletions):
- Added `it('navbar.currentTheme reflects <zt-app>.theme after app.setTheme() (CR-01 regression guard)', ...)` — exercises the propagation contract: triggers `el.setTheme('light')`, awaits Lit's render cycle, asserts the persistent `<zt-navbar>`'s `currentTheme` `@property` reflects the new value AND `el.currentTheme` getter returns 'light' AND localStorage was persisted with the default `{ persist: true }`. Pre-fix this test would fail (no `.currentTheme` binding on the navbar; `el.setTheme` would not exist).
- Added `it('app.setTheme(target, { persist: false }) updates @state without writing localStorage (System theme UX guard)', ...)` — exercises the opt-out path that settings.ts's 'System' branch relies on. Asserts post-call `localStorage['zt-theme'] === null` AND `el.currentTheme === 'light'` AND `(navbar as any).currentTheme === 'light'`.
- Both tests stub `window.matchMedia` to deterministically force the initial boot theme to 'dark' (see Deviations § happy-dom matchMedia default).

## Architectural Choice

**Option B / IN-04 — single source of truth.** Thread `<zt-app>.theme` to `<zt-navbar>.currentTheme` via Lit property binding; drop navbar's `localStorage` read; add `app.setTheme(target, options?)` for callers. *Makes CR-01 impossible by construction* (verifier's words). The navbar has no independent state to drift; theme mutations originate from `<zt-app>.setTheme()` only and propagate via Lit's reactive property system.

**Why not Option A:** Even paired with a prop binding, Option A's `toggleTheme()` does not accept a target — it only flips. To handle Settings' three buttons (dark/light/system) the call site would need to compute the current theme, compare to the target, and conditionally call `toggleTheme()`. That conditional logic is fragile (off-by-one toggle if state and attribute drift). Option B replaces this with a clean target-accepting `setTheme(target, options?)` method.

**B-1 fix (opt-out persistence):** A naive Option B implementation would break the pre-Phase-20 'System' UX contract — if `settings.ts`'s 'System' branch called `app.setTheme(resolved)` with the default `persist: true`, then `localStorage` would always carry a `zt-theme` value after any Settings click, the `matchMedia` fallback in `firstUpdated` (lines 71-77) would become effectively dead code, and tomorrow's OS theme change would be ignored at boot. The fix: `<zt-app>.setTheme()` accepts an `options.persist?: boolean` parameter; settings.ts's 'System' branch passes `{ persist: false }` so the live UI updates without writing localStorage, then explicitly `localStorage.removeItem('zt-theme')` to defensively clear any stale key. This preserves the System UX contract end-to-end.

## Verification

| Acceptance grep | Result |
|---|---|
| `grep -nE "@property\(\{ type: String \}\) currentTheme" src/components/navbar.ts` | 1 |
| `grep -c "@state() private currentTheme" src/components/navbar.ts` | 0 |
| `grep -c "localStorage.getItem('zt-theme')" src/components/navbar.ts` | 0 |
| `grep -c "this.currentTheme = app.currentTheme" src/components/navbar.ts` | 0 |
| `grep -cE "public setTheme\(target: 'dark' \| 'light', options: \{ persist\?: boolean \} = \{ persist: true \}\)" src/app.ts` | 1 |
| `grep -cE "options\.persist !== false" src/app.ts` | 1 |
| `grep -cE "this\.setTheme\(this\.theme === 'dark' \? 'light' : 'dark'\)" src/app.ts` | 1 |
| `grep -cE "\.currentTheme=\\\$\{this\.theme\}" src/app.ts` | 1 |
| `grep -cE "<zt-navbar " src/app.ts` | 1 |
| `grep -c "public toggleTheme" src/app.ts` | 1 |
| `grep -c "public get currentTheme" src/app.ts` | 1 |
| `grep -c "app.setTheme(resolved, { persist: false })" src/pages/settings.ts` | 1 |
| `grep -c "app.setTheme(theme)" src/pages/settings.ts` | 1 |
| `grep -cE "app\.setAttribute\('theme'" src/pages/settings.ts` | 0 |
| `grep -cE "localStorage\.setItem\('zt-theme'" src/pages/settings.ts` | 0 |
| `grep -cE "localStorage\.removeItem\('zt-theme'" src/pages/settings.ts` | 1 |
| `grep -c "import type { ZtApp } from '../app.js'" src/pages/settings.ts` | 1 |
| `grep -c "as ZtApp \| null" src/pages/settings.ts` | 1 |
| `grep -c "toggleTheme" src/pages/settings.ts` | 0 |
| `grep -c "CR-01 regression guard" src/app.test.ts` | 1 |
| `grep -c "System theme UX guard" src/app.test.ts` | 1 |
| `grep -c "el.setTheme('light')" src/app.test.ts` | 1 |
| `grep -c "el.setTheme('light', { persist: false })" src/app.test.ts` | 1 |
| `grep -cE "expect\(localStorage\.getItem\('zt-theme'\)\)\.toBe\('light'\)" src/app.test.ts` | 1 |
| `grep -cE "expect\(localStorage\.getItem\('zt-theme'\)\)\.toBeNull\(\)" src/app.test.ts` | 1 |

**Phase 20 invariants from Plans 20-01..20-04 — all preserved:**

| Phase 20 invariant | Result |
|---|---|
| `grep -rE "<zt-navbar" src/pages/ \| wc -l` | 0 |
| `grep -rE "import '\.\./components/navbar\.js'" src/pages/ \| wc -l` | 0 |
| `grep -rE "navbar-height" src/ \| wc -l` | 0 |
| `grep -nE "Router\.location" src/app.ts \| wc -l` | 0 |

**Build / test gates:**

| Gate | Result |
|---|---|
| `npm test` (full suite) | 33 files / 636 passed / 8 skipped (+2 vs baseline = the two new it() blocks added in Task 4) |
| `npm test -- app.test.ts` | 12/12 passed (was 10; +2 new blocks) |
| `npm test -- components/navbar.test.ts` | 8/8 passed (localStorage stub on line 9 becomes a harmless no-op — no consumer left in navbar.ts) |
| `npx tsc --noEmit -p tsconfig.json` | exit 0 |
| `npm run build` | exit 0 (production bundle built in 1.84s) |
| `npm run audit:i18n` | exit 0 ("Audit clean — no PT strings found") |

**Pre-fix test failure assertions (the exact lines that would diverge on `main`):**
- Block 1 CR-01 primary: `expect((navbar as any).currentTheme).toBe('light');` — on pre-fix code (no `.currentTheme` binding in app.ts; `el.setTheme` undefined), this throws or stays 'dark'.
- Block 2 System UX primary: `expect(localStorage.getItem('zt-theme')).toBeNull();` — on a buggy implementation that always persists, this would be 'light' and fail.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] happy-dom matchMedia default differs from plan's JSDOM assumption**
- **Found during:** Task 4 (first test run)
- **Issue:** The plan's `<behavior>` block stated: "matchMedia is JSDOM-stubbed and `prefers-color-scheme: light` matches false by default → theme stays 'dark'". The project tests use happy-dom (per PROJECT.md), not JSDOM, and happy-dom's default `matchMedia('(prefers-color-scheme: light)')` returns `matches: true`, so `<zt-app>.firstUpdated` resolved the initial theme to 'light' on boot when no localStorage key was present. The CR-01 test's initial-state assertion `expect((navbar as any).currentTheme).toBe('dark')` failed: "expected 'light' to be 'dark'".
- **Fix:** Added a `vi.spyOn(window, 'matchMedia').mockImplementation((q) => ({ matches: false, ... }))` stub at the top of BOTH new it() blocks. This forces deterministic 'dark' initial theme resolution, matching the plan's stated assumption.
- **Files modified:** `src/app.test.ts` (Task 4 commit)
- **Commit:** `93101ea`
- **Rationale:** Bug in the test setup, not the production code. The matchMedia stub is the standard happy-dom workaround pattern for theme-dependent tests. No production behavior changed.

### Other Notes

- **No Rule 2 (missing critical functionality) deviations** — the plan covers everything needed for CR-01 closure including the System UX contract preservation (via `options.persist`).
- **No Rule 3 (blocking issues) deviations.**
- **No Rule 4 (architectural decisions) needed** — the plan's Option B choice was already locked.

## Authentication Gates

None — no auth flow exercised by this plan.

## Deferred Issues

None from this plan's scope. Three Phase 20 WARNINGs (WR-01 listener-after-initRouter race, WR-02 empty title flash, WR-03 catch-all route metadata) remain deferred per the plan's `<deferred>` block — they are non-blocking and unrelated to CR-01. See `20-05-PLAN.md` § "Warnings NOT Included In This Plan" for rationale.

## Deferred / Follow-up (from plan's `<deferred>` block — unchanged)

- **WR-01** — `vaadin-router-location-changed` listener registered AFTER `initRouter(outlet)` in `src/app.ts:99-113`. Theoretical race for the initial event under future synchronous-resolution changes.
- **WR-02** — `routeTitle` / `routeSubtitle` empty on first paint → brief empty-title flash on full-page load.
- **WR-03** — `(.*)` catch-all route in `src/router/index.ts:187-191` has no title/subtitle metadata; momentary empty title during 404→/dashboard redirect.

All three are tracked but unaddressed in this gap-closure plan. Recommend folding WR-01 + WR-03 into a future plan that touches `src/router/index.ts` or `firstUpdated()` for any reason. WR-02 is UX-perceptibility-dependent and should be evaluated after UAT.

## Expected Verifier Outcome

On next `/gsd-verify-work` run, Phase 20 should transition from `gaps_found` to `verified`:

- **Truth 2 (SC #2)** flips from `VERIFIED` (structural) to fully verified including the in-flow correctness for the Settings → navbar theme path.
- **Truth 5 (SC #5)** "PARTIAL — see gap" flips to **VERIFIED**: the new CR-01 regression guard test (block 1) AND System UX guard test (block 2) cover the previously-missing Settings → navbar theme propagation path.
- **Anti-Patterns Found § BLOCKER CR-01 (settings.ts:77-90 bypasses app.toggleTheme())** is closed: settings.ts now routes through `app.setTheme()`, the multi-writer pattern is consolidated to a single writer.
- **Anti-Patterns Found § INFO IN-04 (navbar currentTheme staleness)** is also closed: navbar's `currentTheme` is now a parent-bound `@property` with no independent state.
- **Behavioral Spot-Checks § "CR-01 reproduction"** row flips from FAIL to PASS — `grep -c "toggleTheme" src/pages/settings.ts` returns 0 by design (settings routes through `app.setTheme`, not `app.toggleTheme`), and the propagation contract is exercised by automated tests.
- **Human verification[2] "CR-01 theme-toggle regression (BLOCKER reproduction)"** can be re-run by the verifier: clicking Light/Dark/System in Settings should immediately update the navbar's icon and aria-label.
- The three WARNINGs (WR-01, WR-02, WR-03) remain in the verifier's queue; either an `overrides_applied: 3` block with rationale or a follow-up plan can carry them through milestone close.

## TDD Gate Compliance

The plan is marked `type: execute` at the plan-frontmatter level (not `type: tdd`), but Task 4 is marked `tdd="true"`. The plan's intent was: the regression test ARE the acceptance gates for the fix; splitting fix and tests into separate plans would create a window where the tests exist but fail. So Tasks 1-3 (the fix) and Task 4 (the tests) ship as atomic commits in sequence:

- `36c8f3f` fix(20-05): navbar @property conversion
- `1adb8b4` fix(20-05): app.setTheme + binding
- `46417ae` fix(20-05): settings → app.setTheme routing
- `93101ea` test(20-05): CR-01 regression guard + System UX guard

The tests do verify the post-fix behavior: each new test would fail when reverted onto pre-fix code (the CR-01 test would fail on the `(navbar as any).currentTheme` post-trigger assertion; the System UX guard would fail on the `localStorage.getItem('zt-theme') === null` assertion if `app.setTheme()` always persisted). This satisfies the regression-guard intent of the TDD framing even though the gate sequence does not show a RED-before-GREEN commit pair (the fix commits land first because they are the precondition for the tests to pass).

## Threat Model Notes

The plan's threat register (`<threat_model>`) lists 5 STRIDE entries, all in `accept`/`mitigate` state:
- **T-20-11** (Tampering — theme state divergence): MITIGATED. Three writers consolidated to one (`<zt-app>.setTheme()`); divergence impossible by construction post-Task-3.
- **T-20-12** (Information disclosure — theme leakage): ACCEPT (theme is non-sensitive UX state).
- **T-20-13** (DoS — render thrash): ACCEPT (theme mutations O(1) per user gesture).
- **T-20-14** (Test mock divergence): ACCEPT (combined coverage with navbar.test.ts is sufficient).
- **T-20-15** (System contract regression): MITIGATED by the `options.persist: false` opt-out path; the new System UX guard test (block 2) is the automated reproduction.

No new security-relevant surface introduced.

## Self-Check: PASSED

| Item | Verification | Status |
|---|---|---|
| Task 1 commit `36c8f3f` exists | `git log --oneline -6` includes it | FOUND |
| Task 2 commit `1adb8b4` exists | `git log --oneline -6` includes it | FOUND |
| Task 3 commit `46417ae` exists | `git log --oneline -6` includes it | FOUND |
| Task 4 commit `93101ea` exists | `git log --oneline -6` includes it | FOUND |
| `src/components/navbar.ts` modified | `git diff --stat 170473e HEAD` shows it | FOUND |
| `src/app.ts` modified | `git diff --stat 170473e HEAD` shows it | FOUND |
| `src/pages/settings.ts` modified | `git diff --stat 170473e HEAD` shows it | FOUND |
| `src/app.test.ts` modified | `git diff --stat 170473e HEAD` shows it | FOUND |
| Full test suite passes | `npm test` exits 0 (636 passed / 8 skipped / 33 files) | FOUND |
| TypeScript clean | `npx tsc --noEmit -p tsconfig.json` exits 0 | FOUND |
| Production build clean | `npm run build` exits 0 | FOUND |
| i18n audit clean | `npm run audit:i18n` exits 0 | FOUND |
| All Phase 20 invariants intact | 4 grep checks return 0 each | FOUND |
| CR-01 regression test block present | `grep -c "CR-01 regression guard" src/app.test.ts` returns 1 | FOUND |
| System UX guard block present | `grep -c "System theme UX guard" src/app.test.ts` returns 1 | FOUND |

---

*Phase 20 Plan 05 complete. CR-01 BLOCKER closed; System theme UX contract preserved; both invariants locked in by automated regression tests. Phase 20 should transition from `gaps_found` to `verified` on next `/gsd-verify-work` run.*
