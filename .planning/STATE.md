---
gsd_state_version: 1.0
milestone: v3.1
milestone_name: milestone
status: executing
stopped_at: "Phase 20 UI-SPEC approved (6/6 dimensions, 1 non-blocking FLAG on Dim 5 spacing). UI design contract locked at `.planning/phases/20-shell-users-page-regression-fixes/20-UI-SPEC.md` — reuses 3 existing `--space-*` tokens, 4 of 7 font sizes, accent reserved-for list pinned to 4 elements, destructive color only in confirmation modal (delete-trigger icon stays neutral). Unified header band geometry pinned to navbar `:host { padding: 1rem 1.25rem; border-bottom: 1px solid var(--color-border) }` to mirror `.brand` at `src/components/sidebar.ts:36-37`. FLAG: `0.4rem` `.btn-icon` padding inherited from `shared.ts:83` per SC #4 lock — recommend explicit "Exceptions" entry in UI-SPEC if planner wants to close the read cleanly."
last_updated: "2026-05-15T18:38:00.331Z"
last_activity: 2026-05-15 -- Phase 20 planning complete
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 9
  completed_plans: 8
  percent: 89
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-04)

**Core value:** A secure, role-based admin interface where the ZeroTier auth token never leaves the server.
**Current focus:** Milestone v3.1 — Polish & i18n Cleanup (Phases 18 + 19 complete; Phase 20 next)

## Current Position

Phase: 20 — Shell & Users-Page Regression Fixes (all plans executed; verification gaps_found)
Plan: 4 of 4 in current phase
Status: Ready to execute
Last activity: 2026-05-15 -- Phase 20 planning complete

Progress: [██████░░░░] 67% (2/3 phases complete; 8/8 plans done across milestone; Phase 20 at 4/4 plans pending verification)

## Performance Metrics

**Velocity:**

- Total plans completed: 3 (this milestone — 18-01, 18-02, 19-01 all committed and verified)
- Average duration: ~39 min (18-01 ≈22 min; 18-02 ≈45 min; 19-01 ≈50 min — second half of 19-01 spent on the D-03 locale amendment decision checkpoint)
- Total execution time: ~117 min

| Phase-Plan | Duration | Tasks | Files Modified | Completed |
|------------|----------|-------|----------------|-----------|
| 18-01 | ~22 min | 2 | 3 | 2026-05-11 |
| 18-02 | ~45 min | 2 | 2 | 2026-05-11 |
| 19-01 | ~50 min | 3 | 3 | 2026-05-11 |

**Recent Trend:**

- Trend: Phase 18 closing out cleanly; the tool-layer Unicode-escape limitation discovered in 18-02 is now a known pattern — future tests should prefer `String.fromCharCode(0x…)` constants over `\u…` escape literals in this environment.

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table. Recent decisions carried in from v3.0 affecting v3.1 work:

- v3.0 D-15: Single-secret model (`SESSION_SECRET` → sha256 → AES-256-GCM key) — informs how new env config is exposed
- v3.0 (theme): `data-theme` boot attribute + MIRROR-fenced literal block is sole permitted home for hex literals — Phase 20 navbar/shell fixes must not touch styling outside this constraint
- v3.0 (button): `.btn-*` class system is the standardization target — Phase 20 Users-page icon regression must adopt it (icons inside `.btn-*`), not bypass it

v3.1-specific decisions captured (locked):

- Phase 18 (D-09/D-10): `version` flows via new `MemberWithPeer` view type + `memberService.listMembersWithPeers()` method (parallel `listMembers` + `nodeService.getPeers()`, merged by nodeId).
- Phase 18 (D-05): Offline rows hide the version sub-line entirely (refines MEMBER-02 literal text — intent preserved).
- Phase 18 (D-13/D-14): Client-side merge with graceful degrade on peer-fetch failure; no new backend route.
- Phase 18-02 execution: Status column width 180px (mid-range of UI-SPEC 170-190px estimate, multiple of 4); silent degrade on peer-fetch failure (no toast); aria-label deferred to a future plan; existing `<zt-badge>` preserved as status anchor with version sub-line appended.
- Phase 18-02 environment: tool-layer cannot emit single-backslash unicode escape sequences in test source; pattern is now `const X = String.fromCharCode(0x…);` for non-ASCII glyphs in tests. See 18-02-SUMMARY.md Deviations § Test glyph encoding.
- Phase 19 (D-03 amendment, 2026-05-11): script locale prefix `LC_ALL=C` → `LC_ALL=C.UTF-8` to avoid GNU grep 3.11 byte-class overlap with Unicode punctuation (em-dash, ellipsis, checkmarks produced 94 false positives under plain `LC_ALL=C`). Regex characters unchanged; semantic intent preserved. See 19-01-SUMMARY.md Deviations § Decision-checkpoint deviation. RESEARCH.md § Pattern 1 should be amended in a future cleanup if Phase 19-02 doesn't fold it in.

v3.1-specific decisions still pending until plan-phase:

- (none — Phase 20 planning resolved all pending Phase 20 decisions)

Phase 20 plan-phase resolutions (2026-05-14):

- Plan 20-03 wires the persistent navbar via the existing `vaadin-router-location-changed` listener in `src/app.ts:104-106`: handler reads `(e as CustomEvent).detail?.location?.route` and pushes `title` / `subtitle` into `<zt-app>` `@state` props that bind to `<zt-navbar>`. Static-property access (`Router.location`) is explicitly forbidden by 20-03 Task 2 acceptance criteria (grep returns 0) — would have shipped silently broken (Router 2.x has `location` as an instance property, not static). The synthetic-event regression test in 20-03 Task 3 Test 4 (`new CustomEvent('vaadin-router-location-changed', { detail: { location: { route: { title: 'Dashboard', subtitle: 'Overview' }}}})`) is the runtime guard.
- Plan 20-01 D-03 test iterates all 3 Users-page action buttons (Edit / Reset Password / Delete) asserting `getComputedStyle(svg).width === '16px'` AND `.height === '16px'` per button — `buttons[0]`-only was insufficient for SC #5 "icon presence on each Users-page action button".
- D-02 and D-12 (no-op preservation decisions: "keep icon-only shape, no padding bump" and "no responsive collapse") accepted as covered-by-absence — no plan modifies users.ts button markup or adds responsive code, so both are satisfied implicitly. Recorded in coverage gate override 2026-05-14.

Phase 19 decisions captured in `.planning/phases/19-internationalization-sweep/19-CONTEXT.md` (2026-05-11):

- Phase 19 (D-01/D-02): Audit scope = I18N-01 surfaces + a11y metadata (aria-label, title, placeholder, alt); excludes console.*, fastify.log.*, tests, comments, .planning/, docs/.
- Phase 19 (D-03/D-04): Two-pass audit — automated grep (accent class + token list) plus manual page × role walkthrough on running app.
- Phase 19 (D-05/D-06/D-07): Three artifacts — `src/scripts/i18n-audit.sh` (re-runnable, opt-in), `19-AUDIT.md` (scope + commands + walkthrough sign-off + findings), closure note in `19-VERIFICATION.md`. NOT wired to CI (per OOS). No new `*.test.ts`.
- Phase 19 (D-08/D-09/D-10): Fix strategy if PT found = pure inline replacement (no dictionary helper, no `strings.ts`); replacement copy follows existing English conventions; `.TODO.md` not in audit scope.
- Phase 19 scout (2026-05-11): zero PT strings found in `src/` under D-01 filter; phase is shaped as verify-and-close.
- Phase 19 (D-04 override, 2026-05-12): Plan 19-02 Task 2 (checkpoint:human-verify) resolved via /gsd-next --force authorization. Row checkboxes flipped in bulk; reviewer self-signed Sign-off block (2026-05-12 07:30 / 07:45). Automated-pass evidence axis intact (audit script exits 0); human-checked axis satisfied by self-attestation rather than per-row visual confirmation. Verifier should evaluate whether to PASS-with-annotation or flag as gap.

### Roadmap Evolution

- Milestone v3.1 created (2026-05-04): Polish & i18n Cleanup. Sourced from `.TODO.md` (4 items: member ZT version, i18n audit, Users-page Lucide icons, navbar layout fix).
- Roadmap created (2026-05-04): 3 phases derived from 7 requirements. Phase 18 (member version), Phase 19 (i18n sweep), Phase 20 (shell + Users-page regression fixes). Phase numbering continues from Phase 17 of v3.0.
- Phase 18 UI-SPEC approved (2026-05-08): visual contract locked — single new token `--space-xs`, single muted color, mono font for version literal, anchor verified at `network-detail.ts:519-523` (existing `<zt-badge>` preserved as status anchor; researcher noted CONTEXT prose described a dot-prefix but the real render is the badge — UI-SPEC honors intent of D-01/D-03 without re-deciding).
- Phase 18 plans created (2026-05-08): 2 plans across 2 waves (18-01 service-layer types+method, 18-02 page render+tests). First plan-phase attempt hit a recurring escape-sequence-vs-literal-glyph mismatch in test-body assertions across 3 revision iterations; root cause was the sub-agent confusing `'·'` (1-byte literal codepoint) with `'·'` (6-byte escape sequence) at the markdown-authoring layer. Second attempt with explicit upfront guidance (and a fresh agent context) produced clean plans on first pass.

### Pending Todos

None yet — to be populated during plan-phase for Phase 18.

### Blockers/Concerns

None. All seven v3.1 requirements are well-scoped polish items with no external dependencies.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-05-14
Stopped at: Phase 20 UI-SPEC approved (6/6 dimensions, 1 non-blocking FLAG on Dim 5 spacing). UI design contract locked at `.planning/phases/20-shell-users-page-regression-fixes/20-UI-SPEC.md` — reuses 3 existing `--space-*` tokens, 4 of 7 font sizes, accent reserved-for list pinned to 4 elements, destructive color only in confirmation modal (delete-trigger icon stays neutral). Unified header band geometry pinned to navbar `:host { padding: 1rem 1.25rem; border-bottom: 1px solid var(--color-border) }` to mirror `.brand` at `src/components/sidebar.ts:36-37`. FLAG: `0.4rem` `.btn-icon` padding inherited from `shared.ts:83` per SC #4 lock — recommend explicit "Exceptions" entry in UI-SPEC if planner wants to close the read cleanly.
Resume file: .planning/phases/20-shell-users-page-regression-fixes/20-UI-SPEC.md (then proceed to `/gsd-plan-phase 20`)
