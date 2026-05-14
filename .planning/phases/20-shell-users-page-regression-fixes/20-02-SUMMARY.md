---
phase: 20-shell-users-page-regression-fixes
plan: 02
subsystem: ui
tags: [router, vaadin-router, metadata, route-config, typescript-generics]

# Dependency graph
requires:
  - phase: (none — fresh route-metadata foundation)
    provides: (n/a)
provides:
  - title/subtitle route metadata on all 10 authenticated routes in src/router/index.ts
  - RouteMetadata extension interface exported from src/router/index.ts (consumable by Plan 20-03)
  - Router<RouteMetadata> generic instantiation pattern for future route extensions
affects: [20-03 (persistent navbar mount in app.ts — consumes Router.location.route.title/.subtitle)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Vaadin Router 2.0.1 generic R-extension via Router<R> + Route<R, C> for typed custom route fields"

key-files:
  created: []
  modified:
    - src/router/index.ts

key-decisions:
  - "Used Vaadin Router's generic R-extension (Router<RouteMetadata>) instead of `declare module` augmentation because `Route` is a type alias, not an interface — augmentation does not merge into a type alias."
  - "All 10 title/subtitle strings copied byte-for-byte from each page's current <zt-navbar title=... subtitle=...> invocation (no rewording per UI-SPEC Copywriting Contract)."
  - "networks/:id uses the static D-07 subtitle 'Members and settings' — the dynamic ${this.networkId} stays in the page body."

patterns-established:
  - "Pattern: When extending Vaadin Router's Route with custom fields, define a local `interface RouteMetadata` and instantiate `Router<RouteMetadata>` (not `declare module '@vaadin/router' { interface Route { ... } }`)."

requirements-completed: [LAYOUT-01]

# Metrics
duration: ~4 min
completed: 2026-05-14
---

# Phase 20 Plan 02: Route Title/Subtitle Metadata Summary

**Route-metadata foundation for LAYOUT-01: 10 authenticated routes in `src/router/index.ts` gain `title` and `subtitle` string fields (typed via `Router<RouteMetadata>` generic extension) so Plan 20-03's persistent navbar can read them from `Router.location.route` on `vaadin-router-location-changed`.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-14T13:55:05Z
- **Completed:** 2026-05-14T13:58:45Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added `title` and `subtitle` string fields to all 10 authenticated route children of the `path: '/'` parent in `src/router/index.ts` (dashboard, networks, networks/:id, members, controllers, settings, logs, api, pending, users).
- Defined and exported a `RouteMetadata` extension interface (`{ title?: string; subtitle?: string }`) and instantiated `Router<RouteMetadata>` to satisfy TypeScript without weakening the strict mode.
- Preserved D-06: `/login` and `/setup` carry **no** metadata fields.
- Preserved D-07: `networks/:id` uses the static subtitle `'Members and settings'` — the dynamic network name continues to render in the page body.
- All 630 tests (33 files; 8 skipped) pass; `tsc --noEmit` exits 0.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add title/subtitle metadata to all 10 authenticated routes (D-05, D-07)** — `2a528d4` (feat)

## Files Created/Modified
- `src/router/index.ts` — +37 / -2 lines. Added `RouteMetadata` interface (8 lines including doc-comment), 20 metadata lines (10 routes × `title` + `subtitle`), and 2 generic type annotations (`Router<RouteMetadata>` in the return type and `new Router<RouteMetadata>(...)`).

## Decisions Made

- **Module augmentation vs. generic extension** — The plan's "Acceptable mitigation 2" suggested `declare module '@vaadin/router' { interface Route { title?: string; subtitle?: string } }`. This was attempted first but failed to type-check because Vaadin Router 2.0.1 declares `Route` as a `type` alias (`type Route<R, C> = ...`), not an `interface`. TypeScript module augmentation only merges into interfaces. Switched to the supported Vaadin Router pattern: a local `RouteMetadata` interface passed as the `R` generic to `Router<R>` and (transitively) `Route<R, C>`. This is the idiomatic API the library provides (see `RouteExtension<R, C>` in `@vaadin/router/dist/types.t.d.ts:118-137`, which spreads `& R` onto every route).
- **Output reporting per plan's `<output>` block:**
  - Was the module augmentation needed? **No** — the augmentation form (`declare module ...`) does not work because `Route` is a type alias. The generic-extension form (`Router<RouteMetadata>`) was used instead, which is the library's supported extension mechanism. Net: a single `RouteMetadata` interface + two type annotations are the type-safety mitigation.
  - Are `/login` and `/setup` untouched? **Yes** — confirmed via `awk` slice + `grep -c "title:"` returning 0 for both ranges.
  - Is the `networks/:id` subtitle the static `'Members and settings'` (D-07)? **Yes** — `grep -nE "subtitle: 'Members and settings'" src/router/index.ts` returns exactly one match on the `networks/:id` route entry; no `${this.networkId}` interpolation remains in the router (it stayed in `src/pages/network-detail.ts:665,680`, which Plan 20-03 will remove alongside the per-page `<zt-navbar>` invocations).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Generic-extension typing instead of module augmentation**
- **Found during:** Task 1 (TypeScript verification step)
- **Issue:** Plan suggested either (a) cast `children: [...] as Route[]` or (b) `declare module '@vaadin/router' { interface Route { title?: string; subtitle?: string } }`. Option (b) was attempted first and failed: `error TS2300: Duplicate identifier 'Route'`, because `Route` is exported as a generic `type` alias (`type Route<R, C> = ...`), not an `interface`. Module augmentation cannot merge into a `type` alias.
- **Fix:** Used Vaadin Router's first-class extension mechanism — declared a local `RouteMetadata` interface and instantiated `Router<RouteMetadata>` in `initRouter()`. The `RouteExtension<R, C>` internal type in `@vaadin/router/dist/types.t.d.ts:118-137` already spreads `& R`, so `title` / `subtitle` become valid fields on every route literal automatically. Cleaner than the cast option (preserves strict TypeScript checking on all route fields) and well-documented inline with a doc-comment explaining why module augmentation was not used.
- **Files modified:** `src/router/index.ts`
- **Verification:** `npx tsc --noEmit -p tsconfig.json` exits 0; full Vitest suite (630 tests across 33 files) passes.
- **Committed in:** `2a528d4` (Task 1 commit — single atomic commit covering both the metadata insertion and the typing approach, since they are interdependent edits in the same file).

---

**Total deviations:** 1 auto-fixed (1 blocking — TypeScript typing approach)
**Impact on plan:** Within scope — the plan explicitly anticipated this typing concern and pre-authorized two mitigations. The chosen mitigation is functionally equivalent to (b) but uses the library's documented generic-extension API rather than (b)'s structurally-incorrect interface merge. Plan 20-03 can consume `Router.location.route.title` / `.subtitle` exactly as the plan described — the generic typing makes those fields visible on every `Route<RouteMetadata, ...>` in the codebase, not just the literal in `setRoutes`.

## Issues Encountered

- **Worktree had no `node_modules`** — The fresh worktree did not contain installed dependencies; resolved by temporarily symlinking `src/node_modules` to the main worktree's installed dependencies (`/var/www/Projects/ztcwm/src/node_modules`) for the duration of type-check + test runs, then removed the symlink before committing. The symlink was never tracked.

## User Setup Required

None — pure config change.

## Next Phase Readiness

- **Ready for Plan 20-03 (Wave 2):** The persistent navbar in `src/app.ts` can now read `Router.location.route.title` / `.subtitle` directly. The `RouteMetadata` interface is exported from `src/router/index.ts` for type-safe consumption (Plan 20-03 may `import type { RouteMetadata } from './router/index.js'` if it wants to cast `Router.location.route` to a narrowed shape, though the generic typing already propagates through `Router.location.route`).
- **No blockers.** All foundation work for LAYOUT-01 is in place.

## Self-Check: PASSED

- File `src/router/index.ts` exists and contains the metadata (verified via `grep -cE "^[[:space:]]+title: '[A-Z]" src/router/index.ts` → 10, `grep -cE "^[[:space:]]+subtitle: '" src/router/index.ts` → 10).
- Commit `2a528d4` exists in `git log --oneline` (verified).
- `awk "/path: '\/setup'/,/^        \},/" src/router/index.ts | grep -c "title:"` → 0; same for `/login` → 0.
- `tsc --noEmit -p tsconfig.json` exits 0.
- `vitest run` → 630 passed, 8 skipped, 0 failed.

---
*Phase: 20-shell-users-page-regression-fixes*
*Completed: 2026-05-14*
