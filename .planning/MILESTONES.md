# Milestones: ZeroTier Controller Web Manager

Historical record of shipped milestones. Each entry summarizes scope, key accomplishments, decisions, and known debt. Full archives in `.planning/milestones/`.

---

## v3.1 — Polish & i18n Cleanup

**Shipped:** 2026-05-20
**Phases:** 18, 19, 20 (3 phases, 9 plans)
**Timeline:** 2026-05-04 → 2026-05-20 (16 days)
**Status:** ✅ Archived

### Stats

- **Phases:** 3 (Phase 18, 19, 20)
- **Plans:** 9 (2 + 2 + 5, including the 20-05 gap-closure plan)
- **Commits in range:** 80 (`6d7769c..cbc93dc`)
- **src/ deltas:** 23 files changed, +662 / -74 lines (net +588 lines of production + test code)
- **.planning/ deltas:** 45 files changed, +12006 / -26 lines (documentation-heavy milestone)
- **Test suite:** 33 files, 687 passing, 8 skipped (~25s) — +2 tests from baseline (20-05 CR-01 + System UX guards)
- **Known deferred items at close:** 7 (WR-01/02/03 + IN-05/06/07 from Phase 20, WR-01 from Phase 19)

### Key Accomplishments

1. **Member ZT client version visibility** (MEMBER-01/02) — Network detail screen now shows each member's installed ZeroTier client version inline next to the online status badge. Three-state matrix locked (online+known, online+unknown shows `· —`, offline absent). Wired through new `MemberWithPeer` view type and `memberService.listMembersWithPeers` parallel-fetch service method with graceful peer-fetch degrade.

2. **English-only UI verified end-to-end** (I18N-01/02) — Re-runnable two-pass grep audit script (`src/scripts/i18n-audit.sh`) with opt-in `audit:i18n` npm wiring proves zero Portuguese strings remain across the SPA and server response surfaces. 69-row Admin/Operator/Viewer/Unauthenticated walkthrough matrix locked in `19-AUDIT.md`.

3. **Users-page Lucide icons restored** (USERS-01) — `<zt-data-table>` now imports `sharedStyles` into its static styles, allowing `.btn-icon svg { 16px }` to cross the shadow-DOM boundary into per-cell renders. Edit/Reset/Delete action buttons regained their Pencil/KeyRound/Trash2 icons. Established nested-shadow `getComputedStyle` regression-test pattern.

4. **Persistent app shell with route-driven titles** (LAYOUT-01) — `<zt-navbar>` is now mounted once inside `<zt-app>`, surviving navigation. Route metadata (`title`/`subtitle`) on all 10 authenticated routes flows via the `vaadin-router-location-changed` event detail (NOT `Router.location` — that would have shipped silently broken). 13 per-page `<zt-navbar>` invocations + dead navbar.js imports + dead `--navbar-height` token deleted.

5. **Single-writer theme architecture** (LAYOUT-01 / CR-01 gap closure) — Consolidated theme writes to `<zt-app>.setTheme(target, options?)` with opt-out persistence. `<zt-navbar>.currentTheme` converted to parent-bound `@property`. Settings page reroutes through `app.setTheme()`. CR-01 BLOCKER (multi-writer drift causing navbar icon staleness after Settings click) closed by construction. Two regression tests in `app.test.ts` prevent recurrence.

6. **Navbar geometry pixel-locked to .brand row** (LAYOUT-02) — Three-commit fix sequence: `.nav-title-stack` height-locked at 28px with `overflow: hidden` (prevents Inter line-metric drift); `<zt-navbar>` `:host` padding reduced from `1rem` to `0.83rem` (closing fix determined empirically by reviewer in DevTools after static CSS analysis underestimated rendered sidebar geometry).

### Key Decisions

See `.planning/milestones/v3.1-ROADMAP.md` § Milestone Summary for the full list with outcomes. Notable items:

- **D-03 (Phase 19, ✓ Good with one amendment):** two-pass grep audit with explicit `LC_ALL=C.UTF-8` locale prefix — amendment from plain `LC_ALL=C` avoided 94 false positives from GNU grep 3.11 byte-class overlap with Unicode punctuation.
- **D-04 override (Phase 19, ⚠️ Revisit):** row-by-row walkthrough discipline overridden via `/gsd-next --force`; reviewer self-attested. Acceptable because automated audit script provided the evidence axis, but should not become routine.
- **Option B / IN-04 (Phase 20 gap closure, ✓ Good):** parent → child property binding for theme (single source of truth) chosen over toggleTheme side-effect re-sync. Makes CR-01 impossible by construction.
- **LAYOUT-02 fix path (⚠️ Revisit):** the byte-for-byte "geometry mirror" approach (navbar duplicates sidebar `.brand` padding) proved fragile — required three follow-up fixes. Future header-alignment work should consider a shared `--header-band-padding` token.

### Issues Deferred (carried forward)

| ID | Description | Fold-in Target |
|----|-------------|----------------|
| Phase 19 WR-01 | Dead `configura[cç]` token in audit script under `\b...\b` anchors | Re-open D-03 |
| Phase 20 WR-01 | `vaadin-router-location-changed` listener registered after `initRouter()` | Next plan touching `firstUpdated()` |
| Phase 20 WR-02 | Empty title-flash on first paint | UAT-confirmed not perceptible; remains deferred |
| Phase 20 WR-03 | Catch-all route lacks title/subtitle metadata | Next plan touching `src/router/index.ts` |
| Phase 20 IN-05 | Settings page button `active` state stale on navbar theme click | Follow-up if Settings gains additional theme-dependent UI |
| Phase 20 IN-06 | CR-01 test mocks navbar module; live binding intersection uncovered | Combined coverage with `navbar.test.ts` sufficient |
| Phase 20 IN-07 | `matchMedia` `vi.spyOn` not restored — test hygiene | Add `vi.restoreAllMocks()` to afterEach |

### Nyquist Coverage at Close

- Phase 18: VALIDATION.md missing
- Phase 19: VALIDATION.md exists (status: draft, `nyquist_compliant: false`)
- Phase 20: VALIDATION.md missing
- Accepted as debt — test suite passes (687 passing) but per-phase validation contract not formalized.

### Archive

- `.planning/milestones/v3.1-ROADMAP.md` — full phase details
- `.planning/milestones/v3.1-REQUIREMENTS.md` — requirements with outcomes
- `.planning/milestones/v3.1-MILESTONE-AUDIT.md` — final audit report (status: passed)

### Tag

`v3.1` — see `git show v3.1`

---

*MILESTONES.md created: 2026-05-20*
*Maintained by: /gsd-complete-milestone*
