---
milestone: v3.1
name: Polish & i18n Cleanup
status: in-progress
progress:
  phases_total: 3
  phases_completed: 0
  plans_total: 2
  plans_completed: 2
started: 2026-05-04
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-04)

**Core value:** A secure, role-based admin interface where the ZeroTier auth token never leaves the server.
**Current focus:** Milestone v3.1 — Polish & i18n Cleanup (Phase 18 complete; Phase 19 next)

## Current Position

Phase: 18 — Member ZT Client Version (COMPLETE — both plans landed in working tree; user must commit Plan 02)
Plan: 2 of 2 in current phase
Status: Phase 18 done (pending commits for Plan 02); ready for Phase 19
Last activity: 2026-05-11 — Plan 18-02 UI render slice completed in working tree (network-detail.ts + tests). Commits NOT yet created by executor (sandbox blocked `git commit`); see 18-02-SUMMARY.md "Recommended commit sequence" for the three-commit sequence the user must run.

Progress: [███░░░░░░░] 33% (0/3 phases complete — Phase 18 working tree done, awaiting user commits to finalize)

## Performance Metrics

**Velocity:**
- Total plans completed: 2 (this milestone — 18-01 + 18-02; 18-02 working tree only, awaiting user commit)
- Average duration: ~33 min (18-01 ≈22 min; 18-02 ≈45 min — half of 18-02 spent diagnosing tool-layer escape-sequence collapse, see Decisions)
- Total execution time: ~67 min

| Phase-Plan | Duration | Tasks | Files Modified | Completed |
|------------|----------|-------|----------------|-----------|
| 18-01 | ~22 min | 2 | 3 | 2026-05-11 |
| 18-02 | ~45 min | 2 | 2 | 2026-05-11 (working tree; not yet committed) |

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

v3.1-specific decisions still pending until plan-phase:

- Phase 19: Strategy for the i18n sweep — pure inline-string replacement vs. light dictionary helper. (Out-of-Scope already excludes runtime locale switching.)
- Phase 20: Where exactly does `<zt-navbar>` move to in `src/app.ts` relative to `<div id="outlet">` and `<div class="brand">`?

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

Last session: 2026-05-11
Stopped at: Phase 18 working tree complete. Plan 18-02 edits to `src/pages/network-detail.ts` and `src/pages/network-detail.test.ts` are written but uncommitted because the environment sandbox blocked `git commit`. User must run the three-commit sequence in `.planning/phases/18-member-zt-client-version/18-02-SUMMARY.md` → "Recommended commit sequence" before advancing to Phase 19.
Resume file: .planning/phases/18-member-zt-client-version/18-02-SUMMARY.md (then proceed to `/gsd-research 19` for Phase 19)
