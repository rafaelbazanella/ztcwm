# Roadmap: ZeroTier Controller Web Manager — v3.1

**Milestone:** v3.1 — Polish & i18n Cleanup
**Created:** 2026-05-04
**Granularity:** standard
**Coverage:** 7/7 v3.1 requirements mapped

## Goal

Resolve regressions and UX gaps surfaced after v3.0: surface ZT client version per member, standardize all visible text to English, restore Lucide icons on Users-page actions, and lift the navbar out of the page outlet so it aligns with the brand logo.

## Phases

- [x] **Phase 18: Member ZT Client Version** - Surface each member's installed ZeroTier client version next to the online indicator on the network-detail screen, with a neutral placeholder when unknown (working tree complete 2026-05-11; awaits user commit for plan 02)
- [ ] **Phase 19: Internationalization Sweep** - Standardize every visible UI string and user-facing backend message to English
- [ ] **Phase 20: Shell & Users-Page Regression Fixes** - Restore Lucide icons on Users-page action buttons, lift the navbar out of the routed outlet, and align it with the brand logo

## Phase Details

### Phase 18: Member ZT Client Version
**Goal**: Network operators can see, at a glance, which ZeroTier client version each member is running alongside its online status — and never see `undefined`/`null`/spinner states for members the controller has not reported a version for
**Depends on**: Nothing (first phase of v3.1)
**Requirements**: MEMBER-01, MEMBER-02
**Success Criteria** (what must be TRUE):
  1. On the network-detail page, every member row shows the ZT client version next to the online/offline indicator
  2. When the controller has not reported a version for a member (offline / unknown), the version cell renders a neutral placeholder (e.g. `—`) instead of `undefined`, `null`, or a perpetual spinner
  3. The version field is wired through `Member` types and `memberService` rather than hand-rolled in the page component (no `as any` shortcut)
  4. The existing members-list rendering, search/filter, and IP chip-editor flows continue to pass their tests after the column addition
**Plans**: 2 plans
  - [x] 18-01-PLAN.md — Types + memberService.listMembersWithPeers + service tests (service-side slice; Wave 1) — completed 2026-05-11 (commits: e78696a, 726d5d4, 75c027d, 97aad9e)
  - [x] 18-02-PLAN.md — network-detail Status column version sub-line + page tests (UI slice; Wave 2) — completed 2026-05-11 (working tree only; commits pending user action — see 18-02-SUMMARY.md)
**UI hint**: yes

### Phase 19: Internationalization Sweep
**Goal**: Every user-visible string in the application — front-end pages, components, modals, toasts, errors, and backend response messages surfaced in the UI — is in English, eliminating the Portuguese/English mix that lingered from earlier milestones
**Depends on**: Nothing (independent of Phase 18; can run in parallel conceptually)
**Requirements**: I18N-01, I18N-02
**Success Criteria** (what must be TRUE):
  1. A reader using the SPA in any logged-in role sees no Portuguese strings on any page (dashboard, networks, network-detail, members, controllers, users, pending, settings, logs, api-explorer, login, setup) or in any modal, toast, button label, table header, or empty state
  2. User-visible backend response messages (validation errors, audit-log lines surfaced via the UI) read as English in the rendered toast/inline error
  3. No new i18n framework is introduced — strings remain inline literals (per Out-of-Scope: no runtime locale switching)
  4. Existing test suites continue to pass after the string sweep (test assertions referencing prior copy are updated in the same change)
**Plans**: TBD
**UI hint**: yes

### Phase 20: Shell & Users-Page Regression Fixes
**Goal**: The app shell (navbar + brand) renders correctly above a re-rendering page outlet, and the Users-page action buttons regain their Lucide icon affordances that the v3.0 `.btn-*` standardization broke
**Depends on**: Nothing (independent of Phases 18 and 19; ordered last so the i18n sweep doesn't churn the same files mid-fix)
**Requirements**: USERS-01, LAYOUT-01, LAYOUT-02
**Success Criteria** (what must be TRUE):
  1. On `/users`, the **edit**, **reset password**, and **delete** action buttons each display their corresponding Lucide icon (sourced from `lucide-static`) in addition to their label, matching the visual standard used elsewhere in the app
  2. `<zt-navbar>` is rendered outside `<div id="outlet">` (in `src/app.ts`), so navigation between routes re-renders only the page content — the navbar stays mounted across route changes
  3. The navbar is vertically aligned with `<div class="brand">` at the top of the viewport — no visible gap, offset, or shift when navigating between routes
  4. The `.btn-*` system remains the standardization target (icons are added inside the existing button classes, not via bespoke styling)
  5. Existing navbar, app, and users-page tests continue to pass; new test coverage exists for the icon presence on each Users-page action button
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 18. Member ZT Client Version | 2/2 | Complete (Plan 02 awaiting user commit) | 2026-05-11 (working tree) |
| 19. Internationalization Sweep | 0/0 | Not started | - |
| 20. Shell & Users-Page Regression Fixes | 0/0 | Not started | - |

## Dependencies

- Phase 18 → no dependencies
- Phase 19 → no dependencies
- Phase 20 → no dependencies

All three phases are independent in code terms. The chosen order (18 → 19 → 20) puts the well-scoped feature add (member version) first, the broadest-touching sweep (i18n) second, and the shell/UI regression fixes last so the i18n sweep does not churn the same files mid-fix.

## Coverage

| Requirement | Phase |
|-------------|-------|
| MEMBER-01 | Phase 18 |
| MEMBER-02 | Phase 18 |
| I18N-01 | Phase 19 |
| I18N-02 | Phase 19 |
| USERS-01 | Phase 20 |
| LAYOUT-01 | Phase 20 |
| LAYOUT-02 | Phase 20 |

**Coverage:** 7/7 v3.1 requirements mapped — no orphans, no duplicates.

---
*Roadmap created: 2026-05-04*
*Last updated: 2026-05-11 — Phase 18 complete (working tree); user must commit Plan 02 per 18-02-SUMMARY.md before advancing to Phase 19*
