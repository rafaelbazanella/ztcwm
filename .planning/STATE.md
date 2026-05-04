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
**Current focus:** Milestone v3.1 — Polish & i18n Cleanup (roadmap created, ready to plan Phase 18)

## Current Position

Phase: 18 — Member ZT Client Version (not started, planning pending)
Plan: —
Status: Awaiting `/gsd-plan-phase 18`
Last activity: 2026-05-04 — Roadmap drafted (3 phases, 7 requirements mapped)

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

v3.1-specific decisions to log as they emerge during planning:

- Phase 18: How is `version` propagated through the `Member` type and `memberService`? (Decision pending until plan-phase.)
- Phase 19: Strategy for the i18n sweep — pure inline-string replacement vs. light dictionary helper. (Decision pending; Out-of-Scope already excludes runtime locale switching.)
- Phase 20: Where exactly does `<zt-navbar>` move to in `src/app.ts` relative to `<div id="outlet">` and `<div class="brand">`? (Decision pending until plan-phase.)

### Roadmap Evolution

- Milestone v3.1 created (2026-05-04): Polish & i18n Cleanup. Sourced from `.TODO.md` (4 items: member ZT version, i18n audit, Users-page Lucide icons, navbar layout fix).
- Roadmap created (2026-05-04): 3 phases derived from 7 requirements. Phase 18 (member version), Phase 19 (i18n sweep), Phase 20 (shell + Users-page regression fixes). Phase numbering continues from Phase 17 of v3.0.

### Pending Todos

None yet — to be populated during plan-phase for Phase 18.

### Blockers/Concerns

None. All seven v3.1 requirements are well-scoped polish items with no external dependencies.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-05-04
Stopped at: Roadmap created (.planning/ROADMAP.md), traceability table populated, ready for `/gsd-plan-phase 18`
Resume file: .planning/ROADMAP.md
