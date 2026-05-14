# Phase 20: Shell & Users-Page Regression Fixes - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-14
**Phase:** 20-shell-users-page-regression-fixes
**Areas discussed:** USERS-01 icon styling fix scope, LAYOUT-01 title/subtitle source, LAYOUT-02 unified header band height, Per-page navbar cleanup strategy

---

## USERS-01 icon styling fix scope

### Q1: Where should `.btn-icon` styling live so it works inside `<zt-data-table>` cells?

| Option | Description | Selected |
|--------|-------------|----------|
| data-table imports sharedStyles | One-line change: `static styles = [theme, sharedStyles, css...]`. Every cell render gets full `.btn-*` styling. Future data-table consumers inherit the fix. | ✓ |
| Inline just `.btn-icon` into data-table | Copy the rules from `shared.ts:82-106` into data-table local styles. Smallest blast radius, DRY violation. | |
| Refactor to slot-based actions | Parent fills cells via slots, rendering in parent shadow DOM. Cleanest, biggest scope. | |
| You decide | Defer to planner | |

**User's choice:** data-table imports sharedStyles (Recommended)
**Notes:** D-01. Diagnosed cause is the shadow-DOM boundary; this is the minimal correct fix.

### Q2: Icon-only with aria-label, or icon + text labels?

| Option | Description | Selected |
|--------|-------------|----------|
| Icon-only with aria-label/title | Matches current shape post v3.0 standardization. Compact action column. | ✓ |
| Icon + visible text label | More discoverable; wider column needed. | |
| Icon-only, padded larger | Bump `.btn-icon` padding for larger click target. | |

**User's choice:** Icon-only with aria-label/title (Recommended)
**Notes:** D-02. Restore the icons; don't redesign the UX.

### Q3: Test coverage shape for icon regression?

| Option | Description | Selected |
|--------|-------------|----------|
| Computed-style assertion | Assert SVG renders at 16×16. Catches THIS exact regression. | ✓ |
| Presence-only assertion | Assert `<svg>` present in DOM. Would NOT have caught the original break. | |
| Both — presence AND computed style | Two assertions per button. | |

**User's choice:** Computed-style assertion (Recommended)
**Notes:** D-03. The icons were already "present" in DOM; the regression was that styles failed to reach them. Computed-style is the right test shape.

### Q4: Fix scope — Users-page only, or all data-table consumers?

| Option | Description | Selected |
|--------|-------------|----------|
| Fix in data-table = global by construction | Data-table fix propagates automatically. No formal audit of other consumers. | |
| Scope strictly to Users-page | Treat deliverable as Users-page only. No audit of other data-tables. | ✓ |
| Audit + fix all data-table consumers | Grep + render + assert every data-table usage. Bigger scope. | |

**User's choice:** Scope strictly to Users-page
**Notes:** D-04. Acceptance gates apply only to Users-page; the data-table fix benefits other consumers as a side effect but is not formally audited here.

---

## LAYOUT-01 title/subtitle source

### Q1: Where does per-route title/subtitle come from after navbar moves to app.ts?

| Option | Description | Selected |
|--------|-------------|----------|
| Route metadata in router/index.ts | Add `title` + `subtitle` fields to each route. Single source of truth. | ✓ |
| Path→title map inside navbar | Navbar holds internal lookup. Self-contained but drift-prone. | |
| Pages dispatch CustomEvent | Pages emit events the navbar listens to. Timing-sensitive. | |
| Drop titles entirely | Thin top strip without titles. Loses orientation cue. | |

**User's choice:** Route metadata in router/index.ts (Recommended)
**Notes:** D-05. Declarative; routes are already a list.

### Q2: Navbar behavior on `/login` and `/setup`?

| Option | Description | Selected |
|--------|-------------|----------|
| Hide navbar entirely | Match current behavior; `isLoginPage` gate already exists. | ✓ |
| Stripped navbar without log-out/theme | Stripped shell for consistency. Adds complexity. | |
| Full navbar | Inconsistent (can't log out from login screen). | |

**User's choice:** Hide navbar entirely (Recommended)
**Notes:** D-06.

### Q3: Dynamic routes like `/networks/:id` — what does the title show?

| Option | Description | Selected |
|--------|-------------|----------|
| Static title from route metadata | `title: 'Network Detail'`, network name stays in page body. | ✓ |
| Dynamic title injected by page | Page sets title from fetched data. Flicker risk. | |
| No subtitle on dynamic routes | Static title, no subtitle. | |

**User's choice:** Static title from route metadata (Recommended)
**Notes:** D-07. Avoid timing-sensitive plumbing for this regression-fix phase.

### Q4: Connection-status indicator — persist or re-mount?

| Option | Description | Selected |
|--------|-------------|----------|
| Persist | Navbar mounts once; state survives nav. The actual LAYOUT-01 win. | ✓ |
| Re-mount per route | Defeats the purpose. | |

**User's choice:** Persist (Recommended)
**Notes:** D-08.

---

## LAYOUT-02 unified header band height

### Q1: Navbar height — match brand row exactly, or just top-aligned?

| Option | Description | Selected |
|--------|-------------|----------|
| Match brand row height exactly | Continuous horizontal header strip across sidebar+main. | ✓ |
| Top-aligned but natural height | Top edges align; height varies. Slight asymmetry. | |
| You decide | Defer to researcher. | |

**User's choice:** Match brand row height exactly (Recommended)
**Notes:** D-09. Literal match of user's "alinhado com a logo" intent.

### Q2: Bottom-border treatment?

| Option | Description | Selected |
|--------|-------------|----------|
| Same as brand: 1px solid --color-border | Symmetry; existing token. | ✓ |
| Shadow instead of border | New visual treatment. | |
| No separator | Cleanest, risks detached look. | |

**User's choice:** Same as brand: 1px solid --color-border (Recommended)
**Notes:** D-10.

### Q3: Sticky at top, or scrolls with page?

| Option | Description | Selected |
|--------|-------------|----------|
| Sticky / fixed at top | Always-accessible controls; matches sidebar. | ✓ |
| Scroll with page | Less code; loses always-accessible controls. | |

**User's choice:** Sticky / fixed at top (Recommended)
**Notes:** D-11.

### Q4: Responsive collapse on narrow viewports?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep desktop layout | ZTCWM is desktop-first; matches v3.0 intent. | ✓ |
| Collapse controls to icon-only | New responsive territory; scope creep. | |
| Hide navbar on mobile | Most aggressive; scope creep. | |

**User's choice:** Keep desktop layout (Recommended)
**Notes:** D-12.

---

## Per-page navbar cleanup strategy

### Q1: What happens to the 13 `<zt-navbar>` invocations across 11 pages?

| Option | Description | Selected |
|--------|-------------|----------|
| Delete every per-page `<zt-navbar>` | Remove element + import from every page. Tests update. | ✓ |
| Keep as no-ops | Defensive; carries dead code. | |
| Replace with `<zt-page-heading>` component | New page-heading component; doubles heading. | |

**User's choice:** Delete every per-page `<zt-navbar>` (Recommended)
**Notes:** D-13.

### Q2: Page tests that reference `zt-navbar` (e.g., `users.test.ts:196`)?

| Option | Description | Selected |
|--------|-------------|----------|
| Update tests to remove navbar assertions | Delete navbar queries from page tests; new `app.test.ts` asserts app-level navbar. | ✓ |
| Keep page tests, add new app-level test | Old tests fail until updated; flaky window. | |
| Migrate page tests to query app-rendered navbar | Complex test scaffolding. | |

**User's choice:** Update tests to remove navbar assertions (Recommended)
**Notes:** D-15.

### Q3: Pages rendering `<zt-navbar>` TWICE (dashboard / controllers / network-detail)?

| Option | Description | Selected |
|--------|-------------|----------|
| Clean all instances uniformly | Treat double-render as code-smell; remove both branches. | ✓ |
| Preserve loading-state navbar variant | Re-introduces page→navbar coupling. | |

**User's choice:** Clean all instances uniformly (Recommended)
**Notes:** D-16.

### Q4: Delete `src/components/navbar.ts` itself, or keep the component?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep the component, mounted in app.ts | Component file stays; tests stay; only per-page usages removed. | ✓ |
| Inline navbar markup into app.ts | Less indirection; bigger app.ts; loses test isolation. | |

**User's choice:** Keep the component, it gets mounted in app.ts (Recommended)
**Notes:** D-14.

---

## Claude's Discretion

- Exact lucide-static SVG fixture pattern for the regression test
- Whether to introduce a `--header-height` design token (deferred — see Deferred Ideas)
- Location of new `app.test.ts` (convention-conforming pick: `src/app.test.ts`)
- Exact wording of route-metadata `title` / `subtitle` strings (derive from current `<zt-navbar title=… subtitle=…>` invocations)

## Deferred Ideas

- `<zt-page-heading>` component for in-body page title — future polish phase
- `--header-height` design token — future polish phase if duplication causes friction
- Responsive collapse for navbar/sidebar — future "responsive overhaul" milestone
- Dynamic navbar title from page data on `/networks/:id` — future phase if richer top-strip context is desired

No reviewed-but-deferred todos (none matched Phase 20 scope).
