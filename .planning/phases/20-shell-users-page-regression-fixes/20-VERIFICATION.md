---
phase: 20-shell-users-page-regression-fixes
verified: 2026-05-15T19:07:00Z
status: human_needed
score: 5/5 must-haves verified (CR-01 BLOCKER closed; LAYOUT-02 + persistence still require human visual check)
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5 must-haves verified (1 blocked by CR-01 regression)
  gaps_closed:
    - "Persistent <zt-navbar> renders CORRECTLY above the re-rendering page outlet (CR-01 closed): Settings -> navbar theme propagation now works by construction via Option B / IN-04 (single source of truth at <zt-app>.theme; navbar.currentTheme is parent-bound @property; settings.ts routes through app.setTheme(target, options?); two new regression tests in src/app.test.ts lock in CR-01 propagation + System UX persist:false contract)"
    - "SC #5 test-coverage gap closed: src/app.test.ts now contains 'CR-01 regression guard' (line 261) and 'System theme UX guard' (line 319) covering the Settings -> navbar theme propagation path that was previously uncovered"
  gaps_remaining: []
  regressions: []
  notes: |
    Plan 20-05 landed exactly as designed. 4 commits (36c8f3f navbar @property, 1adb8b4 app.setTheme + binding, 46417ae settings routing, 93101ea regression tests) plus the post-fix 20-REVIEW (1f7a6ae) confirms 0 BLOCKERS. Full suite passes (33 files / 687 passed / 8 skipped — exactly +2 vs the previous 685 baseline). TypeScript clean. All Phase 20 invariants from 20-01..20-04 preserved (0 per-page <zt-navbar>; 0 page navbar.js imports; 0 --navbar-height; 0 Router.location in app.ts). The single-writer theme contract is enforced in code (this.theme is mutated only in firstUpdated boot path and inside setTheme()).
human_verification:
  - test: "Visual LAYOUT-02 alignment check (carried forward from previous verification — geometry contract unchanged by 20-05)"
    expected: "Open /dashboard in dev (npm run dev); inspect the top of the viewport — the navbar's bottom border lines up pixel-for-pixel with the sidebar `<div class=\"brand\">` row's bottom border. No gap, no offset, no shift. SC #3."
    why_human: "Pixel-level visual alignment depends on a real browser layout engine; JSDOM/happy-dom cannot reliably assert this. The geometry contract is enforced in code (navbar.ts:23-33 mirrors sidebar.ts:32-40 byte-for-byte) but only a human can confirm the rendered alignment."
  - test: "Navbar persistence across route changes (carried forward — state-continuity is a visual property)"
    expected: "Open /dashboard. Note the connection-indicator state (Connected / Disconnected dot). Navigate /dashboard -> /networks -> /users -> /controllers -> /dashboard via the sidebar. Navbar stays mounted (no flicker, no white frame), connection-status dot does not reset to 'checking pulse' on each nav (its @state survives because the component instance survives), title/subtitle update smoothly per route."
    why_human: "SC #2 'navbar stays mounted across route changes' is a state-continuity + visual property. The 4 LAYOUT-01 tests in app.test.ts assert structural visibility and event-driven title binding but cannot observe flicker or polling re-initialization on a real navigation sequence."
  - test: "CR-01 theme-toggle FIX confirmation (previously the BLOCKER reproduction — now expected to PASS)"
    expected: "Open /settings. Note the current sun/moon icon and aria-label in the navbar (top-right). Click 'Dark' / 'Light' / 'System' in Settings. POST-FIX EXPECTED: navbar's theme icon and aria-label update IMMEDIATELY on each click — for Dark/Light, the chosen theme persists across reload; for System, the live theme matches OS preference AND DevTools shows localStorage['zt-theme'] is ABSENT after the click."
    why_human: "Plan 20-05's two new regression tests (CR-01 + System UX) automate the propagation contract at the @state / property-binding level, but the end-to-end UX confirmation (the navbar's actual rendered icon swaps in a real browser, no flicker, no double-paint) still warrants a one-time human pass before the phase is closed."
  - test: "Initial-render title-flash perceptibility (WR-02; carried forward from previous verification)"
    expected: "Hard-refresh on /dashboard (Cmd+Shift+R / Ctrl+F5). Watch the navbar title region during load. Expected (acceptable): no perceptible flash of empty title before 'Dashboard' / 'Overview' populates."
    why_human: "Visibility threshold is subjective and device-dependent. WR-02 is intentionally deferred (see deferred[] block)."
deferred:
  - truth: "WR-01: vaadin-router-location-changed listener registered AFTER initRouter(outlet) in src/app.ts:99-113 — theoretical race for the initial event under future synchronous-resolution changes"
    addressed_in: "Future plan (no current ticket; flagged for the next plan that touches src/app.ts firstUpdated() for any reason — recommended fold-in target)"
    evidence: "20-05-PLAN.md `<deferred>` block: 'WR-01... unrelated to CR-01; tightening the listener-registration order touches the same file as Task 2 but a different region, and the change is independent (listener-ordering ≠ theme-propagation). Splitting into a separate plan keeps each plan's change set crisp and the regression test narrow.' 20-REVIEW.md Re-Evaluation Summary: 'Deferred per 20-05 <deferred> block; not touched by the plan.'"
  - truth: "WR-02: routeTitle / routeSubtitle empty on first paint → brief empty-title flash on full-page load of an authenticated route"
    addressed_in: "Future plan (UX-perceptibility-dependent — should be evaluated after UAT)"
    evidence: "20-05-PLAN.md `<deferred>` block: 'WR-02 — UX-perceptibility-dependent (the verifier flagged it as \"usually too fast to see, but possible on slow machines\"). The mitigation (synchronous route-lookup helper at firstUpdated, or conditional rendering of the title block) is a design choice that should be reviewed against the UI-SPEC rather than rolled into a CR-01 gap-closure. Recommend a follow-up ticket if UAT human verification reports perceptible flash.' 20-REVIEW.md Re-Evaluation Summary: 'UNCHANGED. Deferred per 20-05 <deferred> block; not touched by the plan.'"
  - truth: "WR-03: (.*) catch-all route in src/router/index.ts:187-191 has no title/subtitle metadata; momentary empty title during 404→/dashboard redirect"
    addressed_in: "Future plan (folded into the next plan that touches src/router/index.ts; partial in-scope fix possible in src/app.ts:111-112 via defensive `!== undefined` guard)"
    evidence: "20-05-PLAN.md `<deferred>` block: 'WR-03 — observable only when users hit an unknown path before the redirect resolves. Cheap to fix (one config block edit), but the failure mode is in a different module from CR-01's fix and exercises a different code path. Recommend folding into the next plan that touches src/router/index.ts.' 20-REVIEW.md Re-Evaluation Summary: 'UNCHANGED (out of re-review scope for fix). src/router/index.ts not in scope.'"
review_findings:
  blockers: 0
  warnings: 3  # WR-01, WR-02, WR-03 — all carried forward, unchanged, deferred per 20-05 <deferred> block
  info: 5     # IN-01 (window listener leak), IN-02 (synthetic event shape), IN-03 (pushState pattern), IN-05 (new — Settings buttons stale on navbar click), IN-06 (new — CR-01 test doesn't exercise navbar @property chain), IN-07 (new — matchMedia spy not restored) — IN-04 was CLOSED by adoption as the 20-05 design strategy
---

# Phase 20: Shell & Users-Page Regression Fixes Verification Report (Re-Verification, Post-20-05 Gap Closure)

**Phase Goal:** "The app shell (navbar + brand) renders correctly above a re-rendering page outlet, and the Users-page action buttons regain their Lucide icon affordances that the v3.0 `.btn-*` standardization broke"

**Verified:** 2026-05-15T19:07:00Z
**Status:** human_needed (all programmatic must-haves PASS; only carried-forward visual/UAT items remain)
**Re-verification:** Yes — post-20-05 gap-closure re-run after the initial verification flagged CR-01 BLOCKER (2026-05-14T21:56:57Z)

## Goal Achievement

### Observable Truths (derived from ROADMAP Success Criteria + PLAN must_haves)

| #   | Truth (SC#) | Status | Evidence |
| --- | ----------- | ------ | -------- |
| 1   | SC #1: On /users, the edit / reset-password / delete action buttons each display their corresponding Lucide icon at 16x16 (sourced from lucide-static) | VERIFIED (carried forward from initial verification — no regression) | `src/components/data-table.ts:6` imports `sharedStyles` from `'../styles/shared.js'`; `data-table.ts:33-36` static styles = [theme, sharedStyles, css\`...\`] (canonical Lit stack — unchanged by 20-05). `src/pages/users.test.ts:193-216` D-03 test (USERS-01 / D-03) drills page.shadowRoot -> data-table.shadowRoot -> button.btn-icon[], iterates the 3 action buttons (Edit / Reset Password / Delete with labeled expectations), asserts `getComputedStyle(svg).width === '16px'` AND `.height === '16px'` per button. Full suite: 687 passed (was 685; +2 from 20-05's new CR-01 tests). |
| 2   | SC #2: `<zt-navbar>` is rendered outside `<div id="outlet">` (in `src/app.ts`); navigation re-renders only the page content; navbar stays mounted across route changes — INCLUDING correctness under cross-page state mutations (CR-01 closure) | VERIFIED (CR-01 closed) | Structural mount: `src/app.ts:143` mounts `<zt-navbar .title=${this.routeTitle} .subtitle=${this.routeSubtitle} .currentTheme=${this.theme} show-logout>` between `<main class="main-content">` and `<div id="outlet">` inside the non-login render branch (lines 139-148). Login branch (lines 133-138) renders only outlet + toast (no navbar — D-06). `grep -rE "<zt-navbar" src/pages/` returns 0 — no per-page invocations remain. Correctness under cross-page mutations (the CR-01 closure): the new `.currentTheme=${this.theme}` binding (added by 20-05 Task 2 Edit C) threads the app's @state-tracked theme to the navbar's @property. Settings.ts routes through `app.setTheme()` (20-05 Task 3) so cross-page theme changes propagate to the persistent navbar. Two new regression tests in src/app.test.ts (lines 261-317 CR-01 + 319-366 System UX) lock in both contracts. |
| 3   | SC #3: Navbar vertically aligned with `<div class="brand">` at top of viewport — no gap/offset/shift | UNCERTAIN (geometry verified in code; visual alignment requires human — routed to human_verification[0]) | `src/components/navbar.ts:23-33` `:host` uses `position: sticky; top: 0; z-index: 50; padding: 1rem 1.25rem; border-bottom: 1px solid var(--color-border)` — byte-for-byte mirror of sidebar's `.brand` row geometry. `--navbar-height` is removed from theme.ts (`grep -rE "navbar-height" src/` returns 0). Not touched by 20-05; geometry contract preserved. |
| 4   | SC #4: `.btn-*` system remains the standardization target; icons are added inside the existing button classes, not via bespoke styling | VERIFIED (carried forward; not touched by 20-05) | Data-table fix from 20-01 is purely additive — `sharedStyles` (containing the `.btn-icon svg { 16px }` rule from `src/styles/shared.ts:103-106`) crosses the shadow-DOM boundary into data-table. No bespoke per-cell styling; no new classes; users.ts action buttons retain their `<button class="btn-icon">` markup with `unsafeSVG(Pencil/KeyRound/Trash2)`. 20-05 did not modify any `.btn-*` styling. |
| 5   | SC #5: Existing navbar/app/users-page tests continue to pass; new test coverage exists for the icon presence on each Users-page action button AND for the Settings -> navbar theme propagation path | VERIFIED (CR-01 test-coverage gap closed) | Full suite: 33 files / 687 passed / 8 skipped (verified locally — `npm test` exits 0 in 25.47s). TypeScript: `npx tsc --noEmit -p tsconfig.json` exits 0. Test coverage layers: (a) USERS-01 D-03 nested-shadow computed-style test in `src/pages/users.test.ts:193-216`; (b) `src/app.test.ts` `describe('zt-app persistent navbar (LAYOUT-01)')` 4 original tests (visibility on /dashboard; absence on /login + /setup; BLOCKER-1 synthetic-event title binding) PLUS the 2 new 20-05 tests: 'navbar.currentTheme reflects <zt-app>.theme after app.setTheme() (CR-01 regression guard)' at line 261, and 'app.setTheme(target, { persist: false }) updates @state without writing localStorage (System theme UX guard)' at line 319. The previously-uncovered Settings -> navbar theme propagation path is now covered. `app.test.ts` total: 12 tests passed (was 10). |

**Score:** 5/5 truths verified for programmatic assertion; SC #3 requires human visual confirmation (carried forward as human_verification[0]).

### Required Artifacts (from PLAN must_haves frontmatter, aggregated across 5 plans including 20-05 gap-closure)

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/components/data-table.ts` | sharedStyles imported + inserted as 2nd element of static styles array (20-01) | VERIFIED | Line 6: `import { sharedStyles } from '../styles/shared.js';`; lines 33-36: `static styles = [theme, sharedStyles, css\`...\`]`. Unchanged by 20-05. |
| `src/pages/users.test.ts` | D-03 nested-shadow getComputedStyle test for all 3 action buttons (20-01) | VERIFIED | Lines 193-216 contain the test with labeled expectations (`expectedLabels = ['Edit', 'Reset Password', 'Delete']`) iterating `i = 0..2` and asserting BOTH `.width === '16px'` AND `.height === '16px'` per button. Unchanged by 20-05. |
| `src/router/index.ts` | 10 authenticated routes with title/subtitle metadata; /login + /setup have NONE; networks/:id uses static 'Members and settings' (20-02) | VERIFIED | All 10 title/subtitle pairs present (dashboard / networks / networks-id / members / controllers / settings / logs / api / pending / users). `/login` (lines 60-66) and `/setup` (lines 53-59) carry no metadata; `networks/:id` (lines 105-113) uses static `subtitle: 'Members and settings'` per D-07. `Router<RouteMetadata>` generic instantiation at line 49. Unchanged by 20-05. |
| `src/components/navbar.ts` | :host CSS matches .brand geometry; `currentTheme` is a parent-bound `@property` (20-03 + 20-05) | VERIFIED (post-20-05 fix) | Lines 23-33 carry the byte-for-byte .brand-row geometry mirror. Line 15: `@property({ type: String }) currentTheme: 'dark' \| 'light' = 'dark';` — the converted decorator (20-05 Task 1 Edit A; `grep -c "@state() private currentTheme" src/components/navbar.ts` returns 0; `grep -c "localStorage.getItem('zt-theme')" src/components/navbar.ts` returns 0 — the boot-time read is removed; `grep -c "this.currentTheme = app.currentTheme" src/components/navbar.ts` returns 0 — the redundant self-assignment in handleThemeToggle is gone). |
| `src/app.ts` | Persistent <zt-navbar> mount inside non-login branch; event-driven title/subtitle binding from event.detail.location.route (NOT Router.location); NEW: public setTheme(target, options) with opt-out persistence; .currentTheme binding on navbar (20-03 + 20-05) | VERIFIED (post-20-05 fix) | Line 6: `import './components/navbar.js';`. Lines 13-14: `@state routeTitle = ''; @state routeSubtitle = '';`. Lines 107-113: single `vaadin-router-location-changed` listener reads from `(e as CustomEvent).detail?.location?.route` (`grep -nE "Router\.location" src/app.ts` returns 0). NEW from 20-05: Lines 116-122: `public setTheme(target: 'dark' \| 'light', options: { persist?: boolean } = { persist: true })` with `if (options.persist !== false) localStorage.setItem('zt-theme', this.theme)` — exact match to the plan's signature/body. Lines 124-126: `toggleTheme()` delegates to `setTheme()`. Line 143: `<zt-navbar .title=${this.routeTitle} .subtitle=${this.routeSubtitle} .currentTheme=${this.theme} show-logout></zt-navbar>` — the new `.currentTheme` property binding is present inside the non-login branch only (login branch lines 133-138 has no navbar). |
| `src/pages/settings.ts` | setTheme() routes through app.setTheme() (NOT direct attribute/localStorage mutation); 'system' branch passes { persist: false } AND removeItem; import type { ZtApp } (20-05) | VERIFIED (post-20-05 fix) | Line 6: `import type { ZtApp } from '../app.js';` (type-only, no runtime circular dep). Lines 78-94 contain the rewritten `setTheme()`: hoisted `app = document.querySelector('zt-app') as ZtApp \| null`; 'system' branch (lines 80-87) calls `app.setTheme(resolved, { persist: false })` THEN `localStorage.removeItem('zt-theme')` (preserving the pre-Phase-20 System UX contract); 'dark'/'light' branch (lines 88-93) calls `app.setTheme(theme)` with the default persistence. Direct mutations are gone: `grep -cE "app\.setAttribute\('theme'" src/pages/settings.ts` returns 0; `grep -cE "localStorage\.setItem\('zt-theme'" src/pages/settings.ts` returns 0. `grep -c "toggleTheme" src/pages/settings.ts` returns 0 — settings routes through `app.setTheme`, not `app.toggleTheme`. |
| `src/app.test.ts` | Existing 4 LAYOUT-01 tests intact; NEW: 2 regression tests for CR-01 propagation + System UX persist:false contract (20-05) | VERIFIED (post-20-05) | Existing tests at lines 186-259 preserved. NEW tests at lines 261-317 ('CR-01 regression guard') and 319-366 ('System theme UX guard'). Both stub `window.matchMedia` (lines 273-282 and 328-337) to force deterministic 'dark' initial theme resolution under happy-dom (the executor's auto-fix for a Rule 1 bug — happy-dom default differed from the plan's JSDOM assumption; documented in 20-05-SUMMARY.md § Deviations / Auto-fixed Issues #1). app.test.ts total: 12/12 passing (was 10/10). |
| `src/styles/theme.ts` | --navbar-height token deleted (20-04) | VERIFIED | `grep -rE "navbar-height" src/` returns 0. Unchanged by 20-05. |
| All 10 src/pages/*.ts files | Zero <zt-navbar> markup and zero navbar.js imports (20-04) | VERIFIED | `grep -rE "<zt-navbar" src/pages/` returns 0; `grep -rE "import '\.\./components/navbar\.js'" src/pages/` returns 0. Unchanged by 20-05. |
| `src/components/navbar.ts` + `src/components/navbar.test.ts` | Component file kept (D-14); navbar.test.ts continues to pass with 20-05's @property conversion (the localStorage stub becomes a harmless no-op) | VERIFIED | Component file remains the sole navbar source. `npm test -- src/components/navbar.test.ts` reports 8/8 passing within the full-suite run. |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `src/components/data-table.ts` | `src/styles/shared.ts` | static styles array inheritance | WIRED (carried forward; unchanged by 20-05) | sharedStyles imported (line 6) and present in static styles array (line 35). |
| `src/pages/users.test.ts` (D-03 it block) | `data-table.shadowRoot button.btn-icon svg` | Two-level shadow-root drill + getComputedStyle | WIRED (unchanged) | Test passes; iterates all 3 buttons; assertions cover width AND height. |
| `src/router/index.ts` route metadata | `src/app.ts` persistent navbar | `event.detail.location.route.title / .subtitle` via vaadin-router-location-changed CustomEvent detail | WIRED (carried forward) | App listener reads from `(e as CustomEvent).detail?.location?.route` (not `Router.location`); bindings at line 143 pass to navbar via Lit property binding. |
| `src/app.ts` non-login render branch | `<zt-navbar>` element | Conditional inside `if (!this.isLoginPage)` branch | WIRED (carried forward) | Tests at app.test.ts:186-218 verify visibility on /dashboard and absence on /login + /setup. |
| `src/components/navbar.ts` :host | `src/components/sidebar.ts` .brand row geometry | Identical padding + border-bottom values | WIRED (geometry mirror byte-for-byte; visual alignment routed to human_verification[0]) | navbar.ts:29 `padding: 1rem 1.25rem` matches sidebar.ts byte-for-byte; navbar.ts:28 `border-bottom: 1px solid var(--color-border)` likewise. Unchanged by 20-05. |
| **Settings page theme change** | **Persistent navbar theme icon/aria-label** | **`<page-settings>.setTheme()` -> `<zt-app>.setTheme(target, options?)` -> mutates @state-tracked `this.theme` -> Lit re-renders the render template -> `.currentTheme=${this.theme}` binding pushes the new value to `<zt-navbar>.currentTheme` @property -> navbar's icon + aria-label + title re-render** | **WIRED (CR-01 CLOSED post-20-05)** | **End-to-end propagation contract verified by code AND tests. settings.ts:78-94 contains `app.setTheme(resolved, { persist: false })` (line 85) for the 'system' branch AND `app.setTheme(theme)` (line 91) for the 'dark'/'light' branch. app.ts:116-122 implements `setTheme()` as the single writer of `this.theme` @state + attribute + (conditionally) localStorage. app.ts:143 contains the `.currentTheme=${this.theme}` Lit binding on the persistent navbar. navbar.ts:15 declares `currentTheme` as a parent-bound `@property` (no independent @state to drift; no localStorage read in connectedCallback). The new regression test at src/app.test.ts:261-317 (CR-01 regression guard) exercises the full propagation: triggers `el.setTheme('light')`, asserts `(navbar as any).currentTheme === 'light'`, `el.currentTheme === 'light'`, and `localStorage.getItem('zt-theme') === 'light'`. The companion test at lines 319-366 (System theme UX guard) verifies that `setTheme('light', { persist: false })` mutates state and the navbar property without writing localStorage.** |
| `<zt-app>.setTheme(target, { persist: false })` | localStorage key `'zt-theme'` (must stay null for next-boot OS-preference re-read) | `if (options.persist !== false)` guard inside setTheme; explicit `localStorage.removeItem('zt-theme')` in settings.ts 'system' branch | WIRED (System UX contract preserved post-20-05) | app.ts:119 guards the write with `if (options.persist !== false) localStorage.setItem(...)`. settings.ts:87 explicitly `localStorage.removeItem('zt-theme')` after the System branch's call. The System UX guard test (app.test.ts:319-366) asserts `expect(localStorage.getItem('zt-theme')).toBeNull()` after the call, locking in the contract. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `<zt-app>` render `<zt-navbar .title=${this.routeTitle} .subtitle=${this.routeSubtitle} .currentTheme=${this.theme}>` | `routeTitle`, `routeSubtitle`, **`theme`** | `routeTitle`/`routeSubtitle`: from `vaadin-router-location-changed` CustomEvent's `detail.location.route.title/.subtitle` populated by `src/router/index.ts` route metadata. **`theme` (NEW data flow added by 20-05)**: written by `<zt-app>.setTheme(target, options?)` (single writer). Read by Lit during render and pushed into `<zt-navbar>.currentTheme` @property via the binding at app.ts:143. | YES | FLOWING — both the original event-driven title/subtitle flow AND the new state-driven theme flow are now wired end-to-end. The CR-01 fix added the third binding (`.currentTheme`) and made the navbar's @property the consumer, eliminating the previous data disconnect. |
| `<zt-data-table>` cell render -> `.btn-icon svg` | CSS rule `.btn-icon svg { width: 16px; height: 16px }` from sharedStyles | `src/styles/shared.ts:103-106` loaded via `import { sharedStyles } from '../styles/shared.js'` in data-table.ts:6 | YES | FLOWING — D-03 test runs `getComputedStyle(svg)` against actually-rendered DOM and asserts 16px width AND height for all 3 buttons. |
| `<zt-navbar>` currentTheme @property -> sun/moon icon + aria-label + title | `currentTheme` (line 15, now `@property`, parent-bound) | `<zt-app>.theme` @state via Lit property binding at app.ts:143 (`.currentTheme=${this.theme}`); no independent localStorage read in connectedCallback (removed by 20-05 Task 1 Edit B) | YES | FLOWING — single source of truth at `<zt-app>.theme`; navbar derives via parent binding. CR-01's previous DISCONNECTED status is closed: there is no longer an independent navbar @state to drift. The CR-01 regression guard test (app.test.ts:261-317) exercises this exact data flow and asserts the property value post-setTheme. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Full test suite passes | `cd src && npm test` | 33 files / 687 passed / 8 skipped (+2 from 20-05 vs the prior 685 baseline) | PASS |
| TypeScript type-check passes | `cd src && npx tsc --noEmit -p tsconfig.json` | exit 0 | PASS |
| app.test.ts isolated | `cd src && npm test -- app.test.ts` | 12/12 passed (was 10; +2 new CR-01 tests in describe('zt-app persistent navbar (LAYOUT-01)')) | PASS |
| No per-page <zt-navbar> markup | `grep -rE "<zt-navbar" src/pages/ \| wc -l` | 0 | PASS |
| No dead navbar imports in pages | `grep -rE "import '\.\./components/navbar\.js'" src/pages/ \| wc -l` | 0 | PASS |
| --navbar-height token deleted | `grep -rE "navbar-height" src/ \| wc -l` | 0 | PASS |
| BLOCKER-1 `Router.location` pattern absent | `grep -nE "Router\.location" src/app.ts \| wc -l` | 0 | PASS |
| **CR-01 fix landed: navbar.currentTheme is @property** | `grep -nE "@property\(\{ type: String \}\) currentTheme" src/components/navbar.ts` | 1 (line 15: `@property({ type: String }) currentTheme: 'dark' \| 'light' = 'dark';`) | PASS |
| **CR-01 fix landed: old @state currentTheme removed from navbar** | `grep -c "@state() private currentTheme" src/components/navbar.ts` | 0 | PASS |
| **CR-01 fix landed: navbar localStorage read removed** | `grep -c "localStorage.getItem('zt-theme')" src/components/navbar.ts` | 0 | PASS |
| **CR-01 fix landed: app.setTheme exists with options.persist signature** | `grep -cE "public setTheme\(target: 'dark' \| 'light', options: \{ persist\?: boolean \} = \{ persist: true \}\)" src/app.ts` | 1 | PASS |
| **CR-01 fix landed: app.setTheme opt-out persistence guard** | `grep -cE "options\.persist !== false" src/app.ts` | 1 | PASS |
| **CR-01 fix landed: toggleTheme delegates to setTheme** | `grep -nE "this\.setTheme\(this\.theme === 'dark' \? 'light' : 'dark'\)" src/app.ts` | 1 (line 125) | PASS |
| **CR-01 fix landed: .currentTheme binding on persistent navbar** | `grep -cE "\.currentTheme=\\\$\{this\.theme\}" src/app.ts` | 1 | PASS |
| **CR-01 fix landed: settings routes 'system' branch through app.setTheme with persist:false** | `grep -c "app.setTheme(resolved, { persist: false })" src/pages/settings.ts` | 1 | PASS |
| **CR-01 fix landed: settings routes 'dark'/'light' branch through app.setTheme** | `grep -c "app.setTheme(theme)" src/pages/settings.ts` | 1 | PASS |
| **CR-01 fix landed: settings no longer mutates app theme attribute directly** | `grep -cE "app\.setAttribute\('theme'" src/pages/settings.ts` | 0 | PASS |
| **CR-01 fix landed: settings no longer writes localStorage directly** | `grep -cE "localStorage\.setItem\('zt-theme'" src/pages/settings.ts` | 0 | PASS |
| **CR-01 fix landed: settings 'system' branch still removes localStorage key (System UX contract)** | `grep -cE "localStorage\.removeItem\('zt-theme'" src/pages/settings.ts` | 1 | PASS |
| **CR-01 fix landed: ZtApp type-only import (no runtime circular dep)** | `grep -c "import type { ZtApp } from '../app.js'" src/pages/settings.ts` | 1 | PASS |
| **CR-01 fix landed: settings never calls toggleTheme** | `grep -c "toggleTheme" src/pages/settings.ts` | 0 | PASS |
| **CR-01 fix landed: regression test block present (CR-01)** | `grep -c "CR-01 regression guard" src/app.test.ts` | 1 | PASS |
| **CR-01 fix landed: System UX guard test present** | `grep -c "System theme UX guard" src/app.test.ts` | 1 | PASS |
| **CR-01 fix landed: CR-01 test exercises new setTheme(target) public method** | `grep -c "el.setTheme('light')" src/app.test.ts` | 1 | PASS |
| **CR-01 fix landed: System UX test exercises persist:false opt-out** | `grep -c "el.setTheme('light', { persist: false })" src/app.test.ts` | 1 | PASS |
| **CR-01 fix landed: CR-01 persistence assertion writes 'light' under default persist** | `grep -cE "expect\(localStorage\.getItem\('zt-theme'\)\)\.toBe\('light'\)" src/app.test.ts` | 1 | PASS |
| **CR-01 fix landed: System UX assertion confirms localStorage absent under persist:false** | `grep -cE "expect\(localStorage\.getItem\('zt-theme'\)\)\.toBeNull\(\)" src/app.test.ts` | 1 | PASS |
| Single-writer theme contract: `this.theme` mutated only in boot + setTheme | `grep -nE "this\.theme = " src/app.ts` | 3 matches at lines 73, 75, 117 — boot (`saved` branch), boot (`matchMedia` branch), setTheme — exactly the expected single-writer surface | PASS |

### Requirements Coverage

PLAN frontmatter requirement IDs declared (aggregated across 5 plans):
- Plan 20-01: USERS-01
- Plan 20-02: LAYOUT-01
- Plan 20-03: LAYOUT-01, LAYOUT-02
- Plan 20-04: LAYOUT-01
- Plan 20-05: LAYOUT-01 (gap closure)

Phase 20 requirement IDs per ROADMAP.md § Phase 20: USERS-01, LAYOUT-01, LAYOUT-02 — all 3 IDs covered by ≥1 plan. No orphans (REQUIREMENTS.md maps the same 3 IDs to Phase 20 and no others).

| Requirement | Source Plan(s) | Description (per REQUIREMENTS.md) | Status | Evidence |
| ----------- | -------------- | --------------------------------- | ------ | -------- |
| USERS-01 | 20-01 | Users-page action buttons for **edit**, **reset password**, and **delete** display Lucide icons (via lucide-static), restoring the visual standard broken in the v3.0 `.btn-*` migration | SATISFIED | Truth 1 verified: data-table.ts imports sharedStyles; D-03 test passes for all 3 buttons (16x16 width AND height); Pencil/KeyRound/Trash2 SVGs render with .btn-icon hover/disabled styling. |
| LAYOUT-01 | 20-02, 20-03, 20-04, **20-05** | `<zt-navbar>` renders outside the page outlet (`<div id="outlet">`) so it stays mounted across navigation — page content alone re-renders on route change | SATISFIED — programmatic; persistence-across-routes routed to human_verification[1] | Truth 2 verified for structural mount AND for cross-page state-mutation correctness (CR-01 closed): the persistent navbar's `<zt-app>.theme`-bound `currentTheme` @property updates correctly when theme is changed from Settings (previously the BLOCKER). State-continuity across navigation (no flicker, polling not re-initialized) remains a state/visual property routed to human_verification[1]. |
| LAYOUT-02 | 20-03 | Navbar aligns vertically with the brand logo container (`<div class="brand">`) at the top of the viewport — no gap, no offset | NEEDS HUMAN | Truth 3: navbar.ts:23-33 mirrors sidebar's `.brand` padding + border-bottom byte-for-byte; visual alignment routed to human_verification[0]. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| ~~src/pages/settings.ts~~ | ~~77-90~~ | ~~setTheme() bypasses app.toggleTheme()~~ | **~~BLOCKER (CR-01)~~ CLOSED — see Re-Evaluation Summary** | **20-05 routes settings.ts:78-94 through `app.setTheme()`; the multi-writer pattern is consolidated to a single writer (`<zt-app>.setTheme()`). Settings no longer mutates the theme attribute or localStorage directly. CR-01 is closed by construction.** |
| src/app.ts | 99-113 | `vaadin-router-location-changed` listener registered AFTER `initRouter(outlet)` returns | WARNING (WR-01) — DEFERRED per 20-05 `<deferred>` block | Theoretical race for the initial event under future synchronous-resolution changes. Untouched by 20-05; recommended fold-in target: the next plan that touches firstUpdated() for any reason. |
| src/app.ts | 13-14, 143 | `@state routeTitle = ''` / `routeSubtitle = ''` are empty strings on first paint; the navbar template unconditionally renders `<div class="nav-title">${this.title}</div>` | WARNING (WR-02) — DEFERRED per 20-05 `<deferred>` block | Brief title-less flash on full-page load. UX-perceptibility-dependent; routed to human_verification[3]. |
| src/router/index.ts | 187-191 | `(.*)` catch-all wildcard has redirect but no title/subtitle metadata | WARNING (WR-03) — DEFERRED per 20-05 `<deferred>` block | Vaadin Router may fire an intermediate `vaadin-router-location-changed` carrying the wildcard route as `location.route` (no title) before resolving the redirect. Partial in-scope fix possible in src/app.ts:111-112 via defensive `!== undefined` guard. |
| src/app.ts | 104-113 | Window-scoped listeners never removed | INFO (IN-01) | Now slightly worsened by 20-05 — two more `fixture<ZtApp>` calls in the new tests = two more pairs of leaked listeners per file run (12 pairs total). Production-harmless (<zt-app> is the root, lives for page lifetime). |
| src/app.test.ts | 221-259 | Synthetic event detail omits `detail.router`, `detail.location.pathname/params/search/hash` | INFO (IN-02) — unchanged by 20-05 | Future production change reading other fields on `detail.location` would pass this test while breaking production. |
| src/pages/dashboard.ts, network-detail.ts, networks.ts | (preexisting) | Manual `pushState + dispatchEvent('popstate')` instead of `Router.go(path)` | INFO (IN-03) — out of re-review scope; not in 20-05 file scope | Preexisting code; not a Phase 20 regression. |
| ~~src/components/navbar.ts~~ | ~~15, 107-113, 138-144~~ | ~~currentTheme read once at connectedCallback; not observed afterwards~~ | **~~INFO (IN-04)~~ CLOSED — adopted as the 20-05 design strategy (Option B)** | **20-05 converted navbar.currentTheme to `@property` (line 15), removed the localStorage read in connectedCallback, and dropped the redundant self-assignment in handleThemeToggle. IN-04 is closed by adoption.** |
| **(NEW) src/pages/settings.ts** | **10, 73-76** | **Settings page `<page-settings>.currentTheme` @state is seeded ONCE from localStorage at connectedCallback; the Settings button's "active" class can go stale if a user toggles theme via the navbar while on /settings** | **INFO (IN-05) — NEW; symmetric counterpart to CR-01 in the navbar->settings direction; non-blocking UX glitch on one specific surface; routes auto-recover on re-mount (any navigation away/back)** | Recoverable by any navigation; INFO severity rationale per 20-REVIEW IN-05. Would warrant a follow-up if Settings gains additional theme-dependent UI that does not self-recover. |
| **(NEW) src/app.test.ts** | **13, 261-317** | **`vi.mock('./components/navbar.js', () => ({}))` means the navbar module is mocked to `{}` and `<zt-navbar>` is an un-upgraded HTMLElement during the CR-01 regression test; Lit's `.currentTheme=${this.theme}` binding still sets the JS property but the navbar's `@property` reactive system and re-render trigger are NOT exercised** | **INFO (IN-06) — NEW; mock-divergence risk** | The mock means the `<zt-app>` half of the propagation is exercised; the `<zt-navbar>` `@property` chain is covered by src/components/navbar.test.ts's separate 8 tests. Combined coverage is sufficient for CR-01 closure but the intersection ("does the live <zt-app> -> <zt-navbar> @property binding cause a render in the real navbar?") is uncovered. |
| **(NEW) src/app.test.ts** | **273-282, 328-337** | **`vi.spyOn(window, 'matchMedia').mockImplementation(...)` inside the it() blocks; describe-level beforeEach uses `vi.clearAllMocks()` (clears call history, not implementations) and afterEach restores only window.location; the matchMedia stub persists across tests** | **INFO (IN-07) — NEW; test hygiene** | Currently harmless because both new tests install the same stub implementation; would become fragile under future test ordering or test churn. Fix: add `vi.restoreAllMocks()` to afterEach. |

### Human Verification Required

#### 1. Visual LAYOUT-02 alignment check (carried forward from previous verification — geometry contract unchanged by 20-05)

**Test:** Open `/dashboard` in dev (`npm run dev` then navigate). Inspect the top of the viewport.
**Expected:** The navbar's bottom border lines up pixel-for-pixel with the sidebar `<div class="brand">` row's bottom border — no gap, no offset, no shift. SC #3.
**Why human:** Pixel-level visual alignment depends on a real browser layout engine; JSDOM/happy-dom cannot reliably assert this. The geometry contract is enforced in code (navbar.ts:23-33 mirrors sidebar.ts:32-40 byte-for-byte), but only a human can confirm the rendered alignment.

#### 2. Navbar persistence across route changes (carried forward — state-continuity is a visual property)

**Test:** Open `/dashboard`. Note the connection-indicator state (Connected / Disconnected dot). Navigate `/dashboard -> /networks -> /users -> /controllers -> /dashboard` via the sidebar.
**Expected:** Navbar stays mounted throughout (no flicker, no white frame), the connection-status dot does not reset to "checking pulse" on each nav (its @state survives because the component instance survives), and the title/subtitle update smoothly per route.
**Why human:** SC #2 "navbar stays mounted across route changes" is a state-continuity + visual property. The 4 original LAYOUT-01 tests in app.test.ts plus the 2 new 20-05 tests assert structural visibility, event-driven title binding, and theme propagation — but cannot observe the absence of flicker or polling re-initialization on a real navigation sequence.

#### 3. CR-01 theme-toggle FIX confirmation (previously the BLOCKER reproduction — now expected to PASS)

**Test:** Open `/settings`. Note the current sun/moon icon and aria-label in the navbar (top-right). Click "Dark", "Light", or "System" in the Settings page's Theme card.
**Expected (post-fix — what should happen now):**
- Dark/Light click: navbar's theme icon and aria-label update IMMEDIATELY to the new theme; page background flips correctly; `localStorage['zt-theme']` reflects the click (verify in DevTools).
- System click: navbar reflects the resolved OS preference; page background flips; `localStorage['zt-theme']` is ABSENT in DevTools (so a future OS theme change is honored at next boot).
- Hard refresh after System click: theme matches live OS preference (toggle OS preference between refreshes to confirm the matchMedia fallback path).
**Why human:** Plan 20-05's two new regression tests (CR-01 + System UX) automate the propagation contract at the `@state` and property-binding level, but the end-to-end UX confirmation (the actual rendered icon swap in a real browser, no flicker, no double-paint, the localStorage state visible in DevTools) is the closing acceptance gate. This test was the BLOCKER reproduction in the previous verification; it is now expected to PASS.

#### 4. Initial-render title-flash perceptibility (WR-02; carried forward from previous verification)

**Test:** Hard-refresh on `/dashboard` (Cmd+Shift+R / Ctrl+F5). Watch the navbar title region during the load.
**Expected (acceptable):** No perceptible flash of empty title before "Dashboard" / "Overview" populates.
**Actual:** One render pass with empty `routeTitle`/`routeSubtitle` occurs between firstUpdated's initial paint and the post-resolution update — usually <16ms, possibly visible on slow machines or under throttled network.
**Why human:** Visibility threshold is subjective and device-dependent. WR-02 is intentionally deferred (see deferred[] block).

### Gaps Summary

Plan 20-05 lands the CR-01 gap closure exactly as designed. The Option B / IN-04 single-source-of-truth refactor consolidates theme writes to `<zt-app>.setTheme(target, options?)` (the sole writer of `<zt-app>.theme` `@state`), threads the value to `<zt-navbar>` via a parent-bound `@property` plus the `.currentTheme=${this.theme}` Lit binding at app.ts:143, and reroutes settings.ts through `app.setTheme()` with `{ persist: false }` opt-out on the 'system' branch to preserve the pre-Phase-20 System UX contract.

**Programmatic must-haves: 5/5 VERIFIED.**

- Truth 1 (USERS-01 icons at 16x16) — unchanged from previous verification, still passing.
- Truth 2 (persistent navbar mounts and renders CORRECTLY across pages, including under cross-page theme mutations) — previously partial due to CR-01; **now fully verified.** The 20-05 fix closes the Settings -> navbar propagation gap by construction (Lit `@property` binding, not side-effect re-sync); the regression test at app.test.ts:261-317 is the automated reproduction guard, and the System UX guard at lines 319-366 prevents accidental B-1 anti-pattern regression.
- Truth 3 (LAYOUT-02 geometry) — UNCERTAIN-programmatic, routed to human_verification[0] (the geometry contract is byte-for-byte mirrored in code; visual alignment is a real-browser property).
- Truth 4 (`.btn-*` system unchanged) — unchanged; verified.
- Truth 5 (test coverage) — previously PARTIAL because the Settings -> navbar theme propagation path was uncovered; **now fully verified.** The CR-01 regression guard and System UX guard tests are the missing coverage; both pass under the full suite (33 files / 687 passed / 8 skipped).

**Three WARNINGs carried forward as DEFERRED (per 20-05 `<deferred>` block):**

- WR-01 (listener-after-initRouter race) — unrelated to CR-01; recommended fold-in target for the next plan that touches `firstUpdated()`.
- WR-02 (empty title flash on first paint) — UX-perceptibility-dependent; deferred to UAT.
- WR-03 (catch-all route metadata gap) — out of re-review scope; cheap fix possible in app.ts:111-112 via defensive guard.

**Two pre-existing INFO items closed:**

- IN-04 (navbar currentTheme staleness) — closed by adoption as the 20-05 design strategy (Option B).
- CR-01 (was the BLOCKER) — closed by construction.

**Three new INFO items surfaced by post-fix re-review (none blocking):**

- IN-05 (Settings buttons stale on navbar theme click) — symmetric to CR-01 in the opposite direction; non-blocking UX glitch; auto-recovers on navigation.
- IN-06 (CR-01 test does not exercise the live navbar `@property` chain because the navbar module is mocked) — combined coverage with navbar.test.ts is sufficient for CR-01 closure; the intersection (live binding through the real navbar) is uncovered.
- IN-07 (`matchMedia` `vi.spyOn` not restored in the two new tests) — test hygiene; currently harmless but fragile.

**No regressions detected.** All Phase 20 invariants from Plans 20-01..20-04 still hold (0 per-page `<zt-navbar>`, 0 page navbar.js imports, 0 `--navbar-height` token, 0 `Router.location` in app.ts). The single-writer theme contract is enforced in code: `this.theme` is mutated only in `firstUpdated` (boot path) and inside `setTheme()` — verified by `grep -nE "this\.theme = " src/app.ts` returning exactly 3 lines (73, 75, 117).

**Status: human_needed** rather than `verified` because four human_verification items remain — three carried forward unchanged from the previous verification (visual alignment, navbar persistence-across-routes, WR-02 perceptibility) plus the CR-01 theme-toggle FIX-confirmation pass (the previous BLOCKER reproduction, now expected to PASS in a real browser). The programmatic score is 5/5 must-haves verified; the phase is ready for the closing human pass and milestone close once UAT confirms the four items.

---

_Verified: 2026-05-15T19:07:00Z_
_Verifier: Claude (gsd-verifier) Opus 4.7 (1M context)_
