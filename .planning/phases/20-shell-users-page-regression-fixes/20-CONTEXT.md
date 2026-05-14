# Phase 20: Shell & Users-Page Regression Fixes - Context

**Gathered:** 2026-05-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Three regressions surfaced after v3.0 ship, scoped together because they all sit on the same UI substrate:

1. **USERS-01** — Users-page action buttons (`edit` / `reset password` / `delete`) regained their `.btn-icon` class in the v3.0 standardization but lost visible icon affordances. Root cause is a shadow-DOM boundary: the buttons render inside `<zt-data-table>` cells (which has its own shadow root), but `<zt-data-table>` does NOT import `sharedStyles`, so `.btn-icon svg { width: 16px; height: 16px; ... }` from `src/styles/shared.ts:82-106` never reaches the Pencil/KeyRound/Trash2 SVGs that are already imported and rendered via `unsafeSVG` in `src/pages/users.ts:148/157/170`. The icons fall back to lucide-static's default 24px black-on-transparent state with no hover/disabled styling.

2. **LAYOUT-01** — `<zt-navbar>` is currently rendered inside each page (11 pages, 13 invocations total — `dashboard`/`controllers`/`network-detail` render it twice each, the others once). Result: the navbar unmounts and re-mounts on every route change, losing internal `@state` (e.g., the connection-status indicator polls) and visually flickering. The fix is to mount `<zt-navbar>` ONCE at the app shell level so it stays alive across navigation.

3. **LAYOUT-02** — When the navbar lives in `app.ts`, it must align vertically with the sidebar's `.brand` row at the top of the viewport. The brand row is in `src/components/sidebar.ts:32-40`: `padding: 1rem 1.25rem; border-bottom: 1px solid var(--color-border);` — roughly 49px tall. The navbar should match this height so sidebar+main read as one continuous horizontal header band.

Phase 20 ships these three regression fixes plus the test coverage required by SC #5. No new UI capabilities; no scope creep beyond the regressions and the shadow-DOM root-cause fix in `<zt-data-table>`.

</domain>

<decisions>
## Implementation Decisions

### USERS-01 — Icon styling fix scope

- **D-01:** `.btn-icon` styling reaches the Users-page action buttons by making `<zt-data-table>` (`src/components/data-table.ts`) import `sharedStyles` (from `src/styles/shared.ts`). Single-line change in the `static styles = [...]` array. Every data-table cell render gets full `.btn-*` styling automatically. Future data-table consumers inherit the fix for free; no per-cell workarounds.
- **D-02:** Users-page action buttons remain icon-only — Pencil / KeyRound / Trash2 each inside a `.btn-icon` button with `aria-label` + `title` for screen-reader / hover-tooltip accessibility. This matches the current shape (post v3.0 standardization). No icon-plus-text label redesign; no padding bump.
- **D-03:** Regression test for icon presence uses a **computed-style assertion** — after rendering `<zt-users-page>` and locating the action buttons inside the shadow-DOM tree (page → data-table → button), assert the computed `width` / `height` of each `<svg>` is `16px` (the value `.btn-icon svg` enforces). This catches the actual regression (shadow-DOM-boundary preventing the styling) and any future regression where styles fail to apply. Presence-only assertion would NOT have caught the original break.
- **D-04:** Fix is **scoped strictly to Users-page** for verification purposes. We do NOT audit every other `<zt-data-table>` consumer (network-detail, members, networks, etc.). The data-table fix is global by construction — adding `sharedStyles` to the component's static styles fixes every consumer — but the deliverable's acceptance gates apply only to the Users-page action buttons.

### LAYOUT-01 — Title/subtitle source after moving navbar

- **D-05:** Per-route title/subtitle comes from **route metadata** in `src/router/index.ts`. Each route definition gets new fields:
  ```ts
  { path: 'dashboard', component: 'page-dashboard', title: 'Dashboard', subtitle: 'Overview', action: ... }
  ```
  The persistent navbar listens to `vaadin-router-location-changed` (already used in `src/app.ts:104-106`), reads `Router.location.route` to extract `title` and `subtitle` fields, and re-renders. Single source of truth in the router config; declarative; matches Vaadin Router's data-on-route extension pattern.
- **D-06:** On the unauthenticated routes `/login` and `/setup`, the navbar is **hidden entirely**. `app.ts` already gates render via `isLoginPage` — same gate applies to the new persistent navbar. Login/setup remain shell-less.
- **D-07:** For dynamic routes like `/networks/:id`, the route metadata holds a **static title** (e.g., `title: 'Network Detail', subtitle: 'Members and settings'`). The actual network name remains in the page-level heading (current behavior — network name appears inside `network-detail.ts`'s page body, not in the top strip). No dynamic title injection from page data; no flicker during load.
- **D-08:** The navbar's connection-status indicator (`Connected` / `Disconnected`) **persists** across route changes. Its internal `@state` survives because the navbar is mounted once and never remounted during navigation. This is one of the actual wins of LAYOUT-01 — the polling/state does not re-initialize on every nav.

### LAYOUT-02 — Unified header band height

- **D-09:** Navbar matches the brand row's height **exactly** — `padding: 1rem 1.25rem; border-bottom: 1px solid var(--color-border);` (the same values as `.brand` in `src/components/sidebar.ts:32-40`). Result: one continuous horizontal header strip across sidebar+main. Literally matches the user's intent: "alinhado com a div que contém a logo do projeto".
- **D-10:** Navbar uses the **same bottom-border treatment** as brand: `border-bottom: 1px solid var(--color-border)`. No box-shadow alternative, no borderless variant. Token already exists; symmetry across sidebar+main.
- **D-11:** Navbar is **sticky at top of viewport** — matches the sidebar's `position: fixed; top: 0; left: 0` behavior (see `sidebar.ts:23-28`). The navbar uses `position: sticky` or equivalent fixed positioning so it stays at the top of `.main-content` during page scroll. Log-out + theme toggle + connection indicator remain always-accessible.
- **D-12:** **No responsive collapse** for narrow viewports. ZTCWM is a desktop admin tool (matches v3.0 design intent; sidebar already does not collapse responsively). No mobile-specific behavior added in this phase.

### Per-page navbar cleanup strategy

- **D-13:** Delete every per-page `<zt-navbar>` invocation. All 13 instances across 11 page files removed: `dashboard.ts` (×2), `networks.ts` (×1), `network-detail.ts` (×2), `members.ts` (×1), `controllers.ts` (×2), `settings.ts` (×1), `logs.ts` (×1), `api-explorer.ts` (×1), `pending.ts` (×1), `users.ts` (×1). Also remove the corresponding `import '../components/navbar.js';` line from each page file. Pages become leaner; no dead code.
- **D-14:** **Keep the `<zt-navbar>` component file** (`src/components/navbar.ts`) and its tests (`src/components/navbar.test.ts`). The component is still rendered — just once, by `<zt-app>`. The render template moves from "every page" to "app.ts conditional on authenticated route". Component test isolation stays intact; no inlining of navbar markup into `app.ts`.
- **D-15:** **Update tests to remove navbar assertions from page tests.** Any test that does `el.shadowRoot!.querySelector('zt-navbar')` (currently `users.test.ts:196` — there may be more across `pages/*.test.ts`) gets the navbar query removed or repointed. Move any "navbar presence" assertion to a new `app.test.ts` test that proves `<zt-app>` renders `<zt-navbar>` when authenticated and hides it on `/login`/`/setup`.
- **D-16:** **Treat double-render pages uniformly.** `dashboard.ts`, `controllers.ts`, `network-detail.ts` each render `<zt-navbar>` twice (presumably one for the loading branch, one for the loaded branch). After D-13, neither branch needs `<zt-navbar>`. No "preserve loading-state navbar variant" carve-out; the navbar's content does not depend on page load state.

### Claude's Discretion

- Exact lucide-static SVG import pattern for the test (the regression test will need to construct the same SVG strings as `users.ts` already does; planner picks whether to dedupe via a fixture or inline).
- Whether to add a CSS custom property `--header-height` for the shared brand/navbar height (currently both implicitly equal `1rem 1.25rem + 1px border`). If the planner sees value, fine; otherwise hardcoded matching values are acceptable since this is a regression fix, not a redesign.
- Test file location for the new `app.test.ts` (if it doesn't already exist) — `src/app.test.ts` or under a `src/__tests__/` directory; planner picks per existing project convention (`src/components/*.test.ts` and `src/pages/*.test.ts` are co-located, so `src/app.test.ts` is the convention-conforming pick).
- Exact wording/style of route-metadata `title` / `subtitle` strings beyond the obvious mapping (e.g., `dashboard → 'Dashboard' / 'Overview'`, `networks → 'Networks' / 'All ZeroTier networks'`, etc.). Planner derives from current per-page values where possible (the strings already exist inside each page's `<zt-navbar title=... subtitle=...>` call).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` § Users Page, § Layout — USERS-01, LAYOUT-01, LAYOUT-02 definitions and acceptance criteria
- `.planning/ROADMAP.md` § Phase 20 — phase goal + 5 Success Criteria (especially SC #4 `.btn-*` lock and SC #5 new test coverage requirement)
- `.planning/PROJECT.md` line 80 (`.btn-*` standardization decision), line 107 (no new web component — adopt class system), line 118 (stack: lucide-static)

### Existing code (read in this order)
- `src/styles/shared.ts:82-106` — `.btn-icon` / `.btn-icon:hover` / `.btn-icon:disabled` / `.btn-icon svg` definitions (the styles that must reach data-table's shadow DOM)
- `src/components/data-table.ts:1-30` — current `static styles` array (missing `sharedStyles`); the one-line change site for D-01
- `src/components/data-table.ts:211-244` — `renderCell` + `render` (where parent-provided render callbacks execute inside data-table's shadow DOM)
- `src/pages/users.ts:140-172` — current Users-page action button markup (Pencil / KeyRound / Trash2 inside `.btn-icon` buttons with aria-label + title)
- `src/pages/users.ts:1-13` — imports (sharedStyles + lucide-static SVGs)
- `src/components/navbar.ts:1-50` — navbar component API (`title`, `subtitle`, `showLogout` props)
- `src/components/navbar.ts:160-200` — current render template (title + subtitle + log-out + theme toggle + connection indicator)
- `src/app.ts:1-143` — current shell render (no navbar; only `<zt-sidebar>` + `<main><div id="outlet">`); `isLoginPage` gate; auth interceptor; `vaadin-router-location-changed` listener
- `src/components/sidebar.ts:21-40` — sidebar position + `.brand` row CSS (the LAYOUT-02 reference: `top: 0; position: fixed; padding: 1rem 1.25rem; border-bottom: 1px solid var(--color-border)`)
- `src/router/index.ts:34-161` — Vaadin Router route definitions (LAYOUT-01 D-05 modifies each route to add `title` + `subtitle` fields)
- `src/router/index.ts:7-32` — `checkSetupStatus` / `checkAuth` helpers (already used by `app.ts`)

### Pages that currently render `<zt-navbar>` (13 invocations to delete per D-13)
- `src/pages/dashboard.ts` (×2)
- `src/pages/networks.ts` (×1)
- `src/pages/network-detail.ts` (×2)
- `src/pages/members.ts` (×1)
- `src/pages/controllers.ts` (×2)
- `src/pages/settings.ts:95`
- `src/pages/logs.ts` (×1)
- `src/pages/api-explorer.ts` (×1)
- `src/pages/pending.ts:199`
- `src/pages/users.ts:523`

### Tests touching navbar (D-15 update targets)
- `src/pages/users.test.ts:196` — `el.shadowRoot!.querySelector('zt-navbar')` (confirmed by grep)
- `src/components/navbar.test.ts` — component-level tests; keep as-is (component still exists per D-14)
- Other `pages/*.test.ts` files — planner must grep for `zt-navbar` references and update similarly

### v3.0 constraints carried forward (locked, not for re-decision)
- `.planning/PROJECT.md` § "Key Decisions" — `.btn-*` is the standardization target (Phase 20 must work INSIDE this system, not replace it — SC #4)
- v3.0 D-theme: `data-theme` boot attribute + MIRROR-fenced literal block is sole permitted home for hex literals; Phase 20 must NOT introduce new literal hex colors outside this constraint
- Phase 19 i18n closure: all new copy added in Phase 20 (e.g., route metadata `title` / `subtitle` strings) MUST be English; Phase 19's `npm run audit:i18n` script will catch any PT regression on re-run
- `.planning/REQUIREMENTS.md` Out-of-Scope: replacing `lucide-static` with a different icon library; sidebar layout/structure changes

### Codebase maps (consulted during scout)
- `.planning/codebase/ARCHITECTURE.md` — component hierarchy (root `<zt-app>` → `<zt-sidebar>` + `<main>` + `<zt-toast-container>` shell pattern)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`sharedStyles` from `src/styles/shared.ts`** — already imported by 30+ components; contains `.btn-*` family + utility classes. D-01 makes `<zt-data-table>` join the consumer list.
- **`<zt-navbar>` component (`src/components/navbar.ts`)** — already has `title`, `subtitle`, `showLogout` props + connection indicator + theme toggle + log-out button. No new component needed; D-14 keeps it and just changes WHERE it mounts.
- **`vaadin-router-location-changed` event** — already used by `src/app.ts:104-106` to update `currentPath`. The persistent navbar uses the same event for D-05 title/subtitle updates from `Router.location.route`.
- **`isLoginPage` getter in `src/app.ts:43-45`** — already gates whether the full shell renders vs only the outlet. Same gate controls D-06 navbar visibility.
- **`Pencil`, `KeyRound`, `Trash2` from `lucide-static`** — already imported in `src/pages/users.ts:4` and rendered via `unsafeSVG`. No new icon imports needed.

### Established Patterns
- **`.btn-icon` button class** — `padding: 0.4rem; border-radius: var(--radius-sm); background: transparent; border: none; color: var(--color-text-secondary); transition: all var(--transition-fast)` + `svg { width: 16px; height: 16px }` for nested SVG. This is the project's standard icon-button shape.
- **Lit `static styles = [theme, sharedStyles, css\`...\`]`** — the pattern every page/component uses. D-01 extends `<zt-data-table>` to this same pattern (currently `static styles = [theme, css\`...\`]` — adding `sharedStyles` in position 2).
- **Page-level title heading inside page body** — pages like `network-detail.ts` already have their own H1/H2-style page heading IN their body, separate from `<zt-navbar>`'s title. After D-13/D-05, the top-strip title becomes a static route-derived label; the in-body page heading (dynamic network name etc.) stays where it is.
- **`@state` survives only when component instance survives** — re-mounting a Lit component creates a fresh `@state`. This is exactly why LAYOUT-01 matters: navbar's connection-status state needs the navbar instance to persist across nav. Once `<zt-navbar>` mounts in `<zt-app>` (which itself never unmounts), state survives.

### Integration Points
- **`src/app.ts:119-135`** — render method. Add `<zt-navbar>` between `<main class="main-content">` opener and `<div id="outlet">`, INSIDE the `if (!this.isLoginPage)` branch. Sticky positioning so it stays at top of `.main-content`.
- **`src/components/data-table.ts:32`** — `static styles = [theme, css\`...\`]` becomes `static styles = [theme, sharedStyles, css\`...\`]`. One-line change. Import `sharedStyles from '../styles/shared.js'` at the top.
- **`src/router/index.ts:38-156`** — every route gets `title` + `subtitle` fields (except `/setup` and `/login` per D-06). Strings derived from current per-page `<zt-navbar title=... subtitle=...>` invocations to preserve exact copy.
- **Test scaffolding** — `app.test.ts` either created new or extended. Asserts: `<zt-navbar>` renders inside `<zt-app>` shadow DOM when path is `/dashboard`; does NOT render when path is `/login`; navbar's title/subtitle reflects the current route's metadata.

</code_context>

<specifics>
## Specific Ideas

- The icon regression test asserts **computed style at 16×16px** specifically — not just SVG presence. This is the assertion that would have caught the original regression. Implementation: render `<zt-users-page>`, drill into the shadow-DOM tree (`page.shadowRoot` → `<zt-data-table>` → `dataTable.shadowRoot` → `.btn-icon svg`), call `getComputedStyle(svg).width === '16px'` for each Pencil/KeyRound/Trash2 button.
- Route-metadata title strings should preserve EXACT copy from each page's current `<zt-navbar title=... subtitle=...>` calls. Planner greps for `<zt-navbar` invocations and copies the literal strings into the corresponding route in `src/router/index.ts` — no rewording, no reinterpretation. (Quick reference grep target: `grep -rE '<zt-navbar[^>]*title=' src/pages/`.)
- After D-13, `import '../components/navbar.js';` lines in each page file become dead imports — planner must delete those alongside the `<zt-navbar>` tags.
- The navbar's existing `position` / sticky behavior (if any) currently comes from being rendered inside a per-page template; after D-11 it gets fixed-top behavior at the `app.ts` level. Planner must check whether `navbar.ts` has its own `:host { position: ... }` style and decide whether to keep, modify, or move that to `app.ts`.

</specifics>

<deferred>
## Deferred Ideas

- **`<zt-page-heading>` component for in-body page title.** Optional refactor: extract the in-body page heading (currently inline in each page) into its own component. Not in Phase 20 scope; could be its own v3.2 polish phase if visual consistency review surfaces inconsistencies.
- **`--header-height` design token.** Currently both `.brand` and navbar will use the same hardcoded `padding: 1rem 1.25rem` + 1px border. A design-token refactor (`--header-row-height` or `--header-padding-block`) would let future tweaks update both atomically. Phase 20 scope is the regression fix, not the tokenization; revisit in a future polish phase if the duplication becomes friction.
- **Responsive collapse for navbar / sidebar.** ZTCWM is desktop-first; mobile support has been explicitly out-of-scope across v1.0–v3.0. Surface in a future "responsive overhaul" milestone if mobile adoption becomes a goal.
- **Dynamic navbar title from page data (e.g., real network name on `/networks/:id`).** D-07 chose static route-metadata title. If users later want richer top-strip context, revisit via a controlled mechanism (probably a `Router.location.route.data` slot the page populates after fetch completes); keep this scoped to a future phase to avoid timing-sensitive plumbing in this regression fix.

### Reviewed Todos (not folded)
None — no pending todos matched Phase 20 scope.

</deferred>

---

*Phase: 20-shell-users-page-regression-fixes*
*Context gathered: 2026-05-14*
