---
milestone: v3.1
name: Polish & i18n Cleanup
status: planning
progress:
  phases_total: 3
  phases_completed: 0
  plans_total: 0
  plans_completed: 0
started: 2026-05-04
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-04)

**Core value:** A secure, role-based admin interface where the ZeroTier auth token never leaves the server.
**Current focus:** Milestone v3.1 — Polish & i18n Cleanup (Phase 18 UI-SPEC approved, ready to plan)

## Current Position

Phase: 18 — Member ZT Client Version (CONTEXT.md + UI-SPEC.md ready)
Plan: —
Status: Awaiting `/gsd-plan-phase 18 --skip-research`
Last activity: 2026-05-08 — Phase 18 UI-SPEC approved (6/6 dimensions PASS, zero recommendations)

Progress: [░░░░░░░░░░] 0% (0/3 phases complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 0 (this milestone)
- Average duration: —
- Total execution time: —

**Recent Trend:**
- Trend: New milestone, no execution data yet

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

v3.1-specific decisions still pending until plan-phase:

- Phase 19: Strategy for the i18n sweep — pure inline-string replacement vs. light dictionary helper. (Out-of-Scope already excludes runtime locale switching.)
- Phase 20: Where exactly does `<zt-navbar>` move to in `src/app.ts` relative to `<div id="outlet">` and `<div class="brand">`?

### Roadmap Evolution

- Milestone v3.1 created (2026-05-04): Polish & i18n Cleanup. Sourced from `.TODO.md` (4 items: member ZT version, i18n audit, Users-page Lucide icons, navbar layout fix).
- Roadmap created (2026-05-04): 3 phases derived from 7 requirements. Phase 18 (member version), Phase 19 (i18n sweep), Phase 20 (shell + Users-page regression fixes). Phase numbering continues from Phase 17 of v3.0.
- Phase 18 UI-SPEC approved (2026-05-08): visual contract locked — single new token `--space-xs`, single muted color, mono font for version literal, anchor verified at `network-detail.ts:519-523` (existing `<zt-badge>` preserved as status anchor; researcher noted CONTEXT prose described a dot-prefix but the real render is the badge — UI-SPEC honors intent of D-01/D-03 without re-deciding).

### Pending Todos

None yet — to be populated during plan-phase for Phase 18.

### Blockers/Concerns

None. All seven v3.1 requirements are well-scoped polish items with no external dependencies.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-05-08
Stopped at: Phase 18 UI-SPEC approved (6/6 dimensions PASS); ready for `/gsd-plan-phase 18 --skip-research`
Resume file: .planning/phases/18-member-zt-client-version/18-UI-SPEC.md
