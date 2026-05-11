---
milestone: v3.1
name: Polish & i18n Cleanup
status: in-progress
progress:
  phases_total: 3
  phases_completed: 1
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

Phase: 19 — Internationalization Sweep (context gathered; ready for planning)
Plan: 0 of TBD in current phase
Status: Phase 18 done; Phase 19 CONTEXT.md captured. Next: `/gsd-plan-phase 19`.
Last activity: 2026-05-11 — Phase 19 context captured. Scout found zero PT strings in `src/`; phase shaped as verify-and-close (audit script + manual walkthrough + audit report); fix-strategy fallback is pure inline replacement (closes STATE.md pending entry on dictionary-helper vs. inline).

Progress: [███░░░░░░░] 33% (1/3 phases complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 2 (this milestone — 18-01 + 18-02 both committed and verified)
- Average duration: ~33 min (18-01 ≈22 min; 18-02 ≈45 min — half of 18-02 spent diagnosing tool-layer escape-sequence collapse, see Decisions)
- Total execution time: ~67 min

| Phase-Plan | Duration | Tasks | Files Modified | Completed |
|------------|----------|-------|----------------|-----------|
| 18-01 | ~22 min | 2 | 3 | 2026-05-11 |
| 18-02 | ~45 min | 2 | 2 | 2026-05-11 |

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

- Phase 20: Where exactly does `<zt-navbar>` move to in `src/app.ts` relative to `<div id="outlet">` and `<div class="brand">`?

Phase 19 decisions captured in `.planning/phases/19-internationalization-sweep/19-CONTEXT.md` (2026-05-11):

- Phase 19 (D-01/D-02): Audit scope = I18N-01 surfaces + a11y metadata (aria-label, title, placeholder, alt); excludes console.*, fastify.log.*, tests, comments, .planning/, docs/.
- Phase 19 (D-03/D-04): Two-pass audit — automated grep (accent class + token list) plus manual page × role walkthrough on running app.
- Phase 19 (D-05/D-06/D-07): Three artifacts — `src/scripts/i18n-audit.sh` (re-runnable, opt-in), `19-AUDIT.md` (scope + commands + walkthrough sign-off + findings), closure note in `19-VERIFICATION.md`. NOT wired to CI (per OOS). No new `*.test.ts`.
- Phase 19 (D-08/D-09/D-10): Fix strategy if PT found = pure inline replacement (no dictionary helper, no `strings.ts`); replacement copy follows existing English conventions; `.TODO.md` not in audit scope.
- Phase 19 scout (2026-05-11): zero PT strings found in `src/` under D-01 filter; phase is shaped as verify-and-close.

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
Stopped at: Phase 19 context gathered. Decisions D-01..D-10 captured in `.planning/phases/19-internationalization-sweep/19-CONTEXT.md`. Codebase scout already confirmed zero Portuguese strings in `src/` — Phase 19 will deliver an audit script + audit report + closure note rather than translation diffs.
Resume file: .planning/phases/19-internationalization-sweep/19-CONTEXT.md (then proceed to `/gsd-plan-phase 19`)
