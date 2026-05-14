---
phase: 20-shell-users-page-regression-fixes
verified: 2026-05-14T21:56:57Z
status: gaps_found
score: 4/5 must-haves verified (1 blocked by CR-01 regression)
overrides_applied: 0
gaps:
  - truth: "Persistent <zt-navbar> renders CORRECTLY above the re-rendering page outlet across every authenticated user flow (Phase goal text 'renders correctly above a re-rendering page outlet'; SC #2 + SC #3 + SC #5)"
    status: partial
    reason: "Phase 20's LAYOUT-01 refactor introduces CR-01 (code-review BLOCKER): toggling theme from /settings leaves the persistent navbar's sun/moon icon and aria-label stuck on the previous value. Before Phase 20 the per-page navbar re-read localStorage on every mount, masking the bug; making the navbar persistent removes that side-effect-as-a-fix and exposes a real two-way-binding gap. The phase goal's 'renders correctly' is violated in the Settings -> any-page user flow. Phase 20's own implementation choices created this regression; SC #5 ('existing navbar, app, and users-page tests continue to pass') is satisfied numerically (685/685 pass) but no test exercises the Settings -> navbar theme propagation path."
    artifacts:
      - path: "src/pages/settings.ts"
        issue: "setTheme() at lines 77-90 writes to localStorage and sets the <zt-app> 'theme' attribute, but never calls app.toggleTheme() — so <zt-app>.theme @state and <zt-navbar>.currentTheme @state both stay out of sync with the visible theme. Confirmed via grep: 'toggleTheme' does not appear in settings.ts."
      - path: "src/components/navbar.ts"
        issue: "currentTheme @state (line 15) is read once at connectedCallback from localStorage (line 109) and is never observed afterwards. With persistent mounting (now), this initial read becomes the only read for the session unless the user clicks the navbar's own theme button."
      - path: "src/app.ts"
        issue: "<zt-navbar> bindings at line 137 only pass .title/.subtitle/show-logout — theme is not threaded down from <zt-app>.theme to <zt-navbar>.currentTheme. Single-source-of-truth is not enforced."
    missing:
      - "Either: (a) change settings.ts setTheme() to go through <zt-app> (e.g., conditionally call app.toggleTheme() when the resolved theme differs from app.currentTheme) so the @state-tracked theme on <zt-app> stays authoritative and the navbar re-reads via parent prop binding; OR (b) thread .currentTheme=${this.theme} from <zt-app>'s render template into <zt-navbar> and drop the localStorage read in navbar's connectedCallback — making CR-01 impossible by construction (IN-04 approach)."
      - "A new test in src/app.test.ts (or pages/settings.test.ts) that exercises 'change theme from Settings -> assert navbar icon/aria-label reflect the new theme'. Without this, the regression class CR-01 is not covered."
human_verification:
  - test: "Visual LAYOUT-02 alignment check"
    expected: "Open /dashboard in dev; verify the navbar's bottom border lines up pixel-for-pixel with the sidebar's <div class=\"brand\"> row's bottom border at the top of the viewport — no gap, no offset."
    why_human: "Pixel-level visual alignment cannot be asserted reliably in JSDOM (computed layout depends on a real browser layout engine). The geometry mirror (padding: 1rem 1.25rem + border-bottom: 1px solid var(--color-border)) matches sidebar.ts:36-37 byte-for-byte, but only a human viewing the rendered page can confirm SC #3 'no visible gap, offset, or shift'."
  - test: "Navbar persistence across route changes"
    expected: "Open /dashboard; observe connection-indicator state (Connected / Disconnected dot). Click sidebar links to navigate /networks -> /users -> /controllers. The navbar stays mounted (no flicker), the connection dot does not re-initialize (no 'pulse' animation on each nav), and the title/subtitle update smoothly per route."
    why_human: "SC #2 'navbar stays mounted across route changes' is a visual / state-continuity property. The 4 new app.test.ts tests assert visibility and event-driven title binding but cannot observe flicker or polling re-initialization on a real navigation sequence."
  - test: "CR-01 theme-toggle regression (BLOCKER reproduction)"
    expected: "Open /settings. Note the current sun/moon icon and aria-label in the navbar. Click 'Dark'/'Light' theme button in Settings. Expected (if CR-01 is fixed): navbar's theme icon and aria-label update IMMEDIATELY to reflect the new theme. Actual (current code, post-Phase-20): the icon stays on the previous value until the user clicks the navbar's own theme button."
    why_human: "Reproducing CR-01 requires an interactive theme-toggle flow against the persistent navbar in a real browser; the bug is induced by the navbar's localStorage-on-connect read pattern combined with Settings bypassing <zt-app>.toggleTheme(). JSDOM tests do not currently exercise this flow."
  - test: "Initial-render title-flash check (WR-02)"
    expected: "Hard-refresh on /dashboard (Cmd+R / Ctrl+F5). Observe whether the navbar paints with empty <div class=\"nav-title\"></div> for any visible duration before the route metadata populates. Expected (acceptable): no perceptible flash. Actual: there is one render pass with empty values between firstUpdated's initial paint and the post-resolution update — usually too fast to see, but possible on slow machines."
    why_human: "Whether the flash is visible to a human depends on the host's render speed; only a human can judge perceptibility."
deferred: []
re_verification: # No previous verification existed
human_verification_count: 4
review_findings:
  blockers: 1  # CR-01 (theme-toggle regression)
  warnings: 3  # WR-01 (listener-after-initRouter race), WR-02 (empty title flash), WR-03 (catch-all route metadata)
  info: 4      # IN-01..IN-04
---

# Phase 20: Shell & Users-Page Regression Fixes Verification Report

**Phase Goal:** "The app shell (navbar + brand) renders correctly above a re-rendering page outlet, and the Users-page action buttons regain their Lucide icon affordances that the v3.0 `.btn-*` standardization broke"

**Verified:** 2026-05-14T21:56:57Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (derived from ROADMAP Success Criteria + PLAN must_haves)

| #   | Truth (SC#) | Status | Evidence |
| --- | ----------- | ------ | -------- |
| 1   | SC #1: On /users, the edit / reset-password / delete action buttons each display their corresponding Lucide icon at 16x16 (sourced from lucide-static) | VERIFIED | `src/components/data-table.ts:6` imports `sharedStyles` from `'../styles/shared.js'`; `src/components/data-table.ts:33-35` static styles = [theme, sharedStyles, css\`...\`] (canonical Lit stack). `src/pages/users.test.ts:193-218` D-03 test drills page.shadowRoot -> data-table.shadowRoot -> button.btn-icon[], iterates Edit/Reset Password/Delete (indices 0-2), asserts getComputedStyle(svg).width === '16px' AND .height === '16px' per button. Test passes (33 files / 685 tests green; verified locally). Lucide SVGs Pencil/KeyRound/Trash2 already imported in `src/pages/users.ts`. |
| 2   | SC #2: `<zt-navbar>` is rendered outside `<div id="outlet">` (in `src/app.ts`); navigation re-renders only the page content; navbar stays mounted across route changes | VERIFIED | `src/app.ts:137` mounts `<zt-navbar .title=... .subtitle=... show-logout>` between `<main class="main-content">` and `<div id="outlet">` (correct location: outside the outlet, inside main, inside the non-login render branch). `src/app.ts:127-132` login/setup branch returns only outlet + toast (no navbar — D-06). `grep -rE "<zt-navbar" src/pages/` returns 0 — no per-page invocations remain. Single instance lives in <zt-app>'s shadow tree. |
| 3   | SC #3: Navbar vertically aligned with `<div class="brand">` at top of viewport — no gap/offset/shift | UNCERTAIN (geometry verified; visual alignment requires human) | `src/components/navbar.ts:23-33` :host uses `position: sticky; top: 0; z-index: 50; padding: 1rem 1.25rem; border-bottom: 1px solid var(--color-border)` — byte-for-byte mirror of sidebar.ts `.brand` row geometry (verified). `--navbar-height` removed from theme.ts (the dead token from before Phase 20). The geometry contract is enforced in code; SC #3's "no visible gap, offset, or shift" is a pixel-level visual property that requires browser rendering — routed to human verification. |
| 4   | SC #4: `.btn-*` system remains the standardization target; icons are added inside the existing button classes, not via bespoke styling | VERIFIED | Fix in `src/components/data-table.ts` is purely additive — `sharedStyles` (containing the existing `.btn-icon svg { 16px }` rule from `src/styles/shared.ts:103-106`) is imported into the data-table component, enabling the canonical `.btn-icon` rule to cross the shadow-DOM boundary. No bespoke per-cell styling; no new classes; users.ts action buttons retain their `<button class="btn-icon">` markup with unsafeSVG(Pencil/KeyRound/Trash2). |
| 5   | SC #5: Existing navbar/app/users-page tests continue to pass; new test coverage exists for the icon presence on each Users-page action button | PARTIAL — see gap | Full suite: 685 passed / 8 skipped / 33 files (verified locally — `npm test` exits 0; `tsc --noEmit` exits 0). New tests added: (a) `src/pages/users.test.ts:193-218` D-03 nested-shadow computed-style test covering all 3 action buttons; (b) `src/app.test.ts:140-260` "zt-app persistent navbar (LAYOUT-01)" describe block with 4 it() tests (navbar on /dashboard; not on /login; not on /setup; BLOCKER-1 synthetic-event title binding). HOWEVER: the new tests do NOT cover the Settings -> navbar theme propagation path, which is precisely where CR-01 manifests. SC #5's "new test coverage exists for the icon presence on each Users-page action button" is fully satisfied (D-03 covers all 3 buttons); SC #5's broader "tests continue to pass" is numerically satisfied but does not regression-cover the CR-01 user flow that Phase 20's own refactor introduced. |

**Score:** 4/5 truths fully verified; 1 partially verified due to CR-01 regression introduced by Phase 20's persistent-navbar refactor.

### Required Artifacts (from PLAN must_haves frontmatter, aggregated across 4 plans)

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `src/components/data-table.ts` | sharedStyles imported + inserted as 2nd element of static styles array | VERIFIED | Line 6: `import { sharedStyles } from '../styles/shared.js';`; lines 33-36: `static styles = [theme, sharedStyles, css\`...\`]`. Matches modal.ts canonical pattern byte-for-byte. |
| `src/pages/users.test.ts` | D-03 nested-shadow getComputedStyle test for all 3 action buttons | VERIFIED | Lines 193-218 contain the `it('Users-page action buttons render Lucide icons at 16x16 inside data-table shadow root (USERS-01 / D-03)')` test; iterates `for (let i = 0; i < 3; i++)`, drills 2 shadow roots, asserts both `.width === '16px'` and `.height === '16px'` per button. |
| `src/router/index.ts` | 10 authenticated routes with title/subtitle metadata; /login + /setup have NONE; networks/:id uses static 'Members and settings' | VERIFIED | Verified all 10 title/subtitle pairs present (dashboard/networks/networks-id/members/controllers/settings/logs/api/pending/users); `/login` (lines 60-66) and `/setup` (lines 53-59) carry no title/subtitle; `networks/:id` (lines 105-113) uses static `subtitle: 'Members and settings'` per D-07. `RouteMetadata` extension interface defined at lines 14-17; `Router<RouteMetadata>` generic instantiation at line 50 (key deviation from Plan 20-02's suggested `declare module` augmentation — see 20-02-SUMMARY's auto-fix; correct because Route is a type alias, not interface). |
| `src/components/navbar.ts` | :host CSS uses position: sticky; top: 0; padding: 1rem 1.25rem (matches .brand row) | VERIFIED | Lines 23-33 contain the exact target shape; `var(--navbar-height)` no longer appears (line 24 was the consumer). |
| `src/app.ts` | Persistent <zt-navbar> mount inside non-login branch + event-driven title/subtitle binding from event.detail.location.route (NOT Router.location) | VERIFIED | Line 6: `import './components/navbar.js';`. Lines 13-14: `@state routeTitle = ''; @state routeSubtitle = '';`. Lines 107-113: single `vaadin-router-location-changed` listener reads from `(e as CustomEvent).detail?.location?.route` — `grep -nE "Router\.location" src/app.ts` returns 0 matches. Line 137: `<zt-navbar .title=${this.routeTitle} .subtitle=${this.routeSubtitle} show-logout></zt-navbar>` inside the non-login branch only (lines 127-132 login branch has no navbar). |
| `src/app.test.ts` | 4 new tests covering navbar visibility gate + event-driven title binding | VERIFIED | Lines 140-260 contain `describe('zt-app persistent navbar (LAYOUT-01)')` with exactly 4 it() blocks: renders on /dashboard; NOT on /login; NOT on /setup; BLOCKER-1 regression guard via synthetic CustomEvent dispatch. |
| `src/styles/theme.ts` | --navbar-height token deleted | VERIFIED | `grep -rE "navbar-height" src/` returns 0 matches anywhere in source. |
| All 10 src/pages/*.ts files | Zero <zt-navbar> markup and zero navbar.js imports | VERIFIED | `grep -rE "<zt-navbar" src/pages/` returns 0; `grep -rE "import '\.\./components/navbar\.js'" src/pages/` returns 0; all 13 invocations + 10 imports removed. Margin-top wrappers preserved (Pattern D). |
| `src/components/navbar.ts` + `src/components/navbar.test.ts` | UNCHANGED in component identity (D-14 — component kept, only call sites removed) | VERIFIED | navbar.ts modified only at :host CSS block (Plan 20-03 Task 1); render template, lifecycle hooks, and component-level tests untouched. Component is still mounted — just once, by <zt-app>. |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `src/components/data-table.ts` | `src/styles/shared.ts` | static styles array inheritance | WIRED | `sharedStyles` imported (line 6) and present in static styles array (line 35). `.btn-icon svg { 16px }` rule from shared.ts:103-106 reaches the data-table shadow root, applies to parent-provided cell render callbacks. D-03 test exercises and passes (computed-style assertion). |
| `src/pages/users.test.ts` (D-03 it block) | `data-table.shadowRoot button.btn-icon svg` | Two-level shadow-root drill + getComputedStyle | WIRED | Test passes; iterates all 3 buttons; assertion is `expect(cs.width).toBe('16px')` AND `expect(cs.height).toBe('16px')`. |
| `src/router/index.ts` route metadata | `src/app.ts` persistent navbar | `Router.location.route.title / .subtitle` via vaadin-router-location-changed CustomEvent detail | WIRED | Router config carries title/subtitle on all 10 authenticated routes; <zt-app>'s listener at app.ts:107-113 reads `(e as CustomEvent).detail?.location?.route` (NOT `Router.location` — BLOCKER-1 pattern is absent: `grep -nE "Router\.location" src/app.ts` -> 0). Bindings at line 137 pass to navbar via Lit property binding. BLOCKER-1 regression guard test in app.test.ts:221-259 confirms end-to-end. |
| `src/app.ts` non-login render branch | `<zt-navbar>` element | Conditional inside `if (!this.isLoginPage)` branch | WIRED | Login branch (lines 127-132) returns only outlet + toast (no navbar — D-06); non-login branch (lines 133-142) renders the navbar between main and outlet. Tests at app.test.ts:186-219 verify visibility on /dashboard and absence on /login + /setup. |
| `src/components/navbar.ts` :host | `src/components/sidebar.ts` .brand row geometry | Identical padding + border-bottom values | WIRED (geometry mirror byte-for-byte; visual alignment routed to human verification) | navbar.ts:29 `padding: 1rem 1.25rem` matches sidebar.ts:36 byte-for-byte; navbar.ts:28 `border-bottom: 1px solid var(--color-border)` matches sidebar.ts:37. SC #3 visual gap/offset claim — see human_verification. |
| Settings page theme change | Persistent navbar theme icon/aria-label | (intended) `<zt-app>.toggleTheme()` -> `<zt-navbar>.currentTheme` re-read OR explicit prop binding | NOT_WIRED (CR-01) | settings.ts:77-90 setTheme() writes localStorage + setAttribute('theme', ...) but does NOT call app.toggleTheme(). navbar.ts:107-113 connectedCallback reads localStorage once. With the now-persistent navbar mount, the navbar's currentTheme stays stale after Settings-driven theme changes until the user clicks the navbar's own theme button. This is the regression Phase 20's LAYOUT-01 refactor introduced (pre-Phase-20 the per-page remount masked the bug). |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `<zt-app>` render `<zt-navbar .title=${this.routeTitle} .subtitle=${this.routeSubtitle}>` | `routeTitle`, `routeSubtitle` | vaadin-router-location-changed CustomEvent's `detail.location.route.title/.subtitle`, populated by `src/router/index.ts` route metadata | YES (after first event fires) | FLOWING — but with a known edge: on initial paint before the first event fires, both values are `''` (acceptable per Plan 20-03's "Edge case: when the page is the initial load" note; flagged as WR-02 in 20-REVIEW.md). |
| `<zt-data-table>` cell render -> `.btn-icon svg` | The CSS rule `.btn-icon svg { width: 16px; height: 16px }` from sharedStyles | `src/styles/shared.ts:103-106` (loaded via `import { sharedStyles } from '../styles/shared.js'` in data-table.ts:6) | YES | FLOWING — D-03 test runs `getComputedStyle(svg)` against actually-rendered DOM and asserts 16px width AND height for all 3 buttons; passes. |
| `<zt-navbar>` currentTheme @state -> sun/moon icon + aria-label | `currentTheme` (line 15) | `localStorage.getItem('zt-theme')` at `connectedCallback` (line 109); updated only on the navbar's own `handleThemeToggle` flow (lines 138-144) | PARTIAL — stale data when theme changes originate elsewhere | DISCONNECTED (CR-01) — after Settings page changes theme, the persistent navbar has no observer for the change; its currentTheme stays on the previous value until the user clicks the navbar's own theme button. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Full test suite passes | `cd src && npm test` | 685 passed / 8 skipped / 33 files | PASS |
| TypeScript type-check passes | `cd src && npx tsc --noEmit -p tsconfig.json` | exit 0 | PASS |
| No per-page <zt-navbar> markup remains | `grep -rE "<zt-navbar" src/pages/` | 0 matches | PASS |
| No dead navbar imports in pages | `grep -rE "import '\.\./components/navbar\.js'" src/pages/` | 0 matches | PASS |
| --navbar-height token deleted | `grep -rE "navbar-height" src/` | 0 matches | PASS |
| BLOCKER-1 `Router.location` pattern absent | `grep -nE "Router\.location" src/app.ts` | 0 matches | PASS |
| No stray Router import in app.ts | `grep -cE "^import.*Router.*from.*@vaadin/router" src/app.ts` | 0 | PASS |
| 10 route title fields + 10 subtitle fields | `grep -nE "title: '" src/router/index.ts \| grep -v subtitle \| wc -l` | 10 title + 10 subtitle | PASS |
| /login and /setup have no metadata | Inspection of lines 53-66 of router/index.ts | No title/subtitle on these routes | PASS |
| networks/:id uses static subtitle 'Members and settings' | router/index.ts:108-109 | confirmed | PASS |
| CR-01 reproduction (settings -> toggleTheme propagation) | `grep -c "toggleTheme" src/pages/settings.ts` | 0 matches — confirms settings.ts does NOT call app.toggleTheme() | FAIL (regression confirmed) |

### Requirements Coverage

PLAN frontmatter requirement IDs declared:
- Plan 20-01: USERS-01
- Plan 20-02: LAYOUT-01
- Plan 20-03: LAYOUT-01, LAYOUT-02
- Plan 20-04: LAYOUT-01

Aggregated phase requirements (per ROADMAP.md): USERS-01, LAYOUT-01, LAYOUT-02 — all 3 IDs covered by ≥1 plan. No orphans.

| Requirement | Source Plan(s) | Description | Status | Evidence |
| ----------- | -------------- | ----------- | ------ | -------- |
| USERS-01 | 20-01 | Users-page action buttons for edit, reset password, and delete display Lucide icons (via `lucide-static`), restoring the visual standard broken in the v3.0 `.btn-*` migration | SATISFIED | Truth 1 verified: data-table.ts imports sharedStyles; D-03 test passes for all 3 buttons; Pencil/KeyRound/Trash2 SVGs render at 16x16 with .btn-icon hover/disabled styling. |
| LAYOUT-01 | 20-02, 20-03, 20-04 | `<zt-navbar>` renders outside the page outlet (`<div id="outlet">`) so it stays mounted across navigation — page content alone re-renders on route change | NEEDS HUMAN (mount verified; persistence across routes is a behavioral / state-continuity property best confirmed in a real browser) | Truth 2 verified for structural mount; routed to human_verification[1] for the across-route state-continuity claim (navbar component instance persists, connection-indicator polling does not re-initialize, no flicker). CR-01 means the persistence has a known incorrectness in one user flow (Settings -> navbar theme). |
| LAYOUT-02 | 20-03 | Navbar aligns vertically with the brand logo container (`<div class="brand">`) at the top of the viewport — no gap, no offset | NEEDS HUMAN (geometry contract verified in code; visual alignment requires browser rendering) | Truth 3: navbar.ts:23-33 mirrors sidebar.ts:32-40 .brand padding + border-bottom byte-for-byte; routed to human_verification[0]. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| src/pages/settings.ts | 77-90 | setTheme() bypasses app.toggleTheme() and writes only to localStorage + DOM attribute; does not sync app's @state-tracked theme nor signal the persistent navbar | BLOCKER (CR-01) | Persistent navbar's sun/moon icon and aria-label stay stale after Settings-driven theme changes until the user clicks the navbar's own theme button. Phase-20-introduced regression — Phase 20's LAYOUT-01 refactor removed the per-page remount that previously masked this two-way-binding gap. |
| src/app.ts | 99-113 | `vaadin-router-location-changed` listener registered AFTER `initRouter(outlet)` returns | WARNING (WR-01) | Theoretical race: if Vaadin Router ever resolves routes synchronously, the first event would be missed and the navbar would render with empty title/subtitle until the next navigation. Synthetic-event test (app.test.ts:221) does not exercise this race. |
| src/app.ts | 13-14, 137 | `@state routeTitle = ''` / `routeSubtitle = ''` are empty strings on first paint; the navbar template unconditionally renders `<div class="nav-title">${this.title}</div>` | WARNING (WR-02) | Brief title-less flash on every full-page load of an authenticated route. Independent of WR-01: even if the listener catches the first event, there is one render pass with empty values between firstUpdated's render and the post-resolution update. |
| src/router/index.ts | 187-191 | `(.*)` catch-all wildcard has redirect but no title/subtitle metadata | WARNING (WR-03) | Vaadin Router may fire an intermediate `vaadin-router-location-changed` carrying the wildcard route as `location.route` (no title) before resolving the redirect; the listener would clear the navbar title to `''` momentarily. Observable when users hit an unknown path. |
| src/app.ts | 104-113 | Window-scoped listeners never removed | INFO (IN-01) | Production-harmless (<zt-app> is the root, lives for page lifetime); in tests every fixture<ZtApp>() leaks a fresh pair of window listeners. |
| src/app.test.ts | 221-259 | Synthetic event detail omits `detail.router`, `detail.location.pathname/params/search/hash` — only carries the minimal shape `detail.location.route.{title, subtitle}` | INFO (IN-02) | Future production change reading other fields on `detail.location` would pass the test while breaking production. |
| src/pages/dashboard.ts, network-detail.ts, networks.ts | (preexisting) | Manual `pushState + dispatchEvent('popstate')` instead of `Router.go(path)` | INFO (IN-03) | Preexisting code; persistent navbar makes the small timing gap visible (page content changes before navbar title updates). Not a Phase 20 regression. |
| src/components/navbar.ts | 15, 107-113, 138-144 | currentTheme read once at connectedCallback; not observed afterwards | INFO (IN-04) | Widens under persistent mounting — root cause of CR-01. Ideal fix: navbar accepts currentTheme as a `.property` binding from `<zt-app>` (single source of truth). |

### Human Verification Required

#### 1. Visual LAYOUT-02 alignment check

**Test:** Open `/dashboard` in dev (`npm run dev` then navigate). Inspect the top of the viewport.
**Expected:** The navbar's bottom border lines up pixel-for-pixel with the sidebar `<div class="brand">` row's bottom border — no gap, no offset, no shift. SC #3.
**Why human:** Pixel-level visual alignment depends on a real browser layout engine; JSDOM cannot reliably assert this. The geometry contract is enforced in code (navbar.ts:23-33 mirrors sidebar.ts:32-40 byte-for-byte), but the rendered alignment is what SC #3 actually requires.

#### 2. Navbar persistence across route changes

**Test:** Open `/dashboard`. Note the connection-indicator state (Connected / Disconnected dot). Navigate `/dashboard -> /networks -> /users -> /controllers -> /dashboard` via the sidebar.
**Expected:** Navbar stays mounted throughout (no flicker, no white frame), the connection-status dot does not reset to "checking pulse" on each nav (its @state survives because the component instance survives), and the title/subtitle update smoothly per route.
**Why human:** SC #2 "navbar stays mounted across route changes" is a state-continuity + visual property. The 4 new app.test.ts tests assert structural visibility and event-driven title binding, but cannot observe the absence of flicker or polling re-initialization on a real navigation sequence.

#### 3. CR-01 theme-toggle regression reproduction (BLOCKER)

**Test:** Open `/settings`. Note the current sun/moon icon and aria-label in the navbar (top-right). Click "Dark" or "Light" in the Settings page's Theme card (whichever differs from the current theme).
**Expected (if CR-01 is fixed):** Navbar's theme icon and aria-label update IMMEDIATELY to reflect the new theme.
**Actual (current code, post-Phase-20):** The page background and theme tokens flip correctly (because `<zt-app>` gets the new `theme` attribute), but the navbar's sun/moon icon and aria-label stay on the previous value until the user clicks the navbar's own theme button — which then re-syncs by routing through `app.toggleTheme()`.
**Why human:** Reproducing CR-01 requires an interactive theme-toggle flow against the persistent navbar in a real browser. No JSDOM test currently exercises this flow. This test is the BLOCKER acceptance gate — until the regression is fixed (or accepted via an override with stated rationale), Phase 20 does not fully ship "renders correctly above a re-rendering page outlet" per the goal text.

#### 4. Initial-render title-flash perceptibility (WR-02)

**Test:** Hard-refresh on `/dashboard` (Cmd+Shift+R / Ctrl+F5). Watch the navbar title region during the load.
**Expected (acceptable):** No perceptible flash of empty title before "Dashboard" / "Overview" populates.
**Actual:** One render pass with empty `routeTitle`/`routeSubtitle` occurs between firstUpdated's initial paint and the post-resolution update — usually <16ms, but possibly visible on slow machines or with throttled network.
**Why human:** Visibility threshold is subjective and device-dependent.

### Gaps Summary

Phase 20 ships **almost** the entire stated goal. The mechanical work — sharedStyles in data-table, 10 routes with title/subtitle metadata, persistent <zt-navbar> mounted once in <zt-app>, byte-for-byte sidebar `.brand` geometry mirror, deletion of 13 per-page navbar invocations + 10 imports + 1 dead CSS token + 1 stale page-level test, and 4 new app.test.ts tests including a BLOCKER-1 regression guard for the silently-undefined `Router.location` antipattern — is all in place and verified in code. USERS-01 is fully satisfied (D-03 test exercises all 3 action buttons with computed-style assertions). The full test suite passes (685/685; 8 skipped). TypeScript is clean.

**The single material gap is CR-01**, identified by the code reviewer and confirmed in this verification by reading `src/pages/settings.ts:77-90`: the Settings page's theme toggle writes to localStorage and sets the `<zt-app>` `theme` attribute, but never calls `<zt-app>.toggleTheme()`. Before Phase 20 this was masked because the per-page navbar's connectedCallback re-read localStorage on every route remount. Phase 20's LAYOUT-01 work eliminates that remount (which is desirable — it's the goal), exposing the two-way-binding gap. After toggling theme from Settings, the persistent navbar's sun/moon icon and aria-label stay on the previous value until the user clicks the navbar's own theme button.

Whether CR-01 counts as a gap against the **phase goal** ("renders correctly above a re-rendering page outlet") depends on interpretation:
- **Strict reading:** the navbar renders, mounts persistently, and aligns with the brand row in 95% of user flows. CR-01 is a regression in one specific cross-page flow (Settings -> theme). Phase 20's literal Success Criteria #1-#5 are all numerically satisfied.
- **Adversarial reading (the verifier's stance):** Phase 20's stated goal includes "renders **correctly**" — the navbar now renders incorrectly (wrong icon, wrong aria-label) in a specific user flow that is a direct consequence of LAYOUT-01's persistent mount. The phase's own architectural change introduces this regression, and SC #5 ("Existing navbar, app, and users-page tests continue to pass; new test coverage exists...") does not include test coverage for the Settings -> navbar propagation path even though the regression is created by Phase 20.

This verifier classifies CR-01 as a **gap** (truth 5 partial, truth 2 functionally incomplete in one flow). The phase should not be marked closed without either:
1. **Code fix** — change settings.ts setTheme() to route through `<zt-app>.toggleTheme()` (Option A in 20-REVIEW.md CR-01), OR thread `currentTheme` from `<zt-app>` to `<zt-navbar>` as a property binding (IN-04 / Option B; preferred — makes CR-01 impossible by construction);
2. **Plus a regression test** — assert that toggling theme from Settings updates the navbar's icon/aria-label, so this regression class is covered going forward;
3. OR a documented override in this VERIFICATION.md frontmatter with stated rationale (e.g., "CR-01 is accepted as a follow-up fix in Phase 21; v3.1 ships with the regression and a recorded BLOCKER ticket"). However, no Phase 21 currently exists in ROADMAP.md (v3.1 has 3 phases: 18, 19, 20), so this acceptance would defer the BLOCKER outside the milestone — undesirable for a polish/regression-fix milestone.

The three WARNINGs (WR-01 listener-after-initRouter race, WR-02 empty title flash, WR-03 catch-all route metadata) are real but lower-severity. WR-01 and WR-03 are cheap to fix and would harden the persistent-navbar surface. WR-02 has a known design trade-off (delay paint vs. accept brief empty title); the existing code chose the latter. The 4 INFO items (IN-01..IN-04) are quality-of-implementation observations; IN-04 in particular suggests the long-term right fix for CR-01.

---

_Verified: 2026-05-14T21:56:57Z_
_Verifier: Claude (gsd-verifier) Opus 4.7 (1M context)_
