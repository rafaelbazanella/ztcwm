# Retrospective: ZeroTier Controller Web Manager

Living retrospective. Each shipped milestone gets a section below. Cross-milestone trends accumulate at the bottom.

---

## Milestone: v3.1 — Polish & i18n Cleanup

**Shipped:** 2026-05-20
**Phases:** 3 | **Plans:** 9 (incl. 1 gap-closure)
**Timeline:** 16 days

### What Was Built

- Member ZT client version visible on the network-detail page (`MemberWithPeer` view type, `memberService.listMembersWithPeers`, three-state render matrix, graceful peer-fetch degrade)
- End-to-end English-only verification (`src/scripts/i18n-audit.sh` + opt-in `audit:i18n` npm row + 69-row walkthrough matrix)
- Users-page Lucide icons restored (`sharedStyles` imported into `<zt-data-table>` shadow DOM; nested-shadow `getComputedStyle` regression-test pattern established)
- Persistent app shell: `<zt-navbar>` mounted once in `<zt-app>`, surviving navigation; 13 per-page invocations + dead imports + dead `--navbar-height` token deleted
- Single-writer theme architecture: `<zt-app>.setTheme(target, options?)` with opt-out persistence; navbar `currentTheme` parent-bound `@property` (CR-01 closed by construction)
- Navbar geometry pixel-locked to sidebar `.brand` row (three-commit fix sequence: stacked-content height + `.nav-title-stack` height-lock + `:host` padding tune)

### What Worked

- **Pre-phase scouts** — Phase 19's pre-phase codebase scan proved zero PT strings remained in `src/` BEFORE planning, which let the planner shape Phase 19 as verify-and-close instead of a translation campaign. Saved ~2x effort.
- **Decision checkpoints with execution feedback** — Phase 19's D-03 locale-prefix amendment (LC_ALL=C → LC_ALL=C.UTF-8) was caught at runtime via the captured audit run output before reaching verification. The fact that the plan-phase encoded "capture verbatim audit run" as a deliverable made the amendment visible at the right moment.
- **Gap-closure plans as first-class** — Phase 20's CR-01 BLOCKER was closed via a dedicated 20-05 plan (Option B / IN-04) rather than tacked onto an existing plan. Kept the change set crisp and the regression tests narrow; the executor could verify each commit in isolation.
- **Conventional Commits with scope** — making `<type>(scope): subject` mandatory let the milestone-close stats (`git diff 6d7769c..HEAD`) cleanly separate src/ (23 files, +662 lines) from planning docs (45 files, +12,006 lines). Without the scope discipline this number would have been opaque.
- **UAT after verification** — even when programmatic verification passed (Phase 20 had `human_needed` not `gaps_found`), running the 4-test human walkthrough surfaced a real residual ~3.2px LAYOUT-02 gap that static CSS analysis had missed. Two-tier verification (programmatic → UAT) caught what either alone would not.

### What Was Inefficient

- **Static CSS analysis underestimated rendered geometry** — the LAYOUT-02 diagnostic agent's hypothesis (`min-height` allows growth past 28px via Inter line metrics → switch to `height + overflow: hidden`) was a defensible improvement but not the closing fix. The actual closing piece was reducing `:host` padding from `1rem` to `0.83rem`, determined empirically by the user in DevTools. Lesson: visual-alignment debugging needs browser-measurement context, not just static rule inspection.
- **The byte-for-byte "geometry mirror" approach is fragile** — Phase 20-03 documented mirroring `navbar :host` to `sidebar .brand` "byte-for-byte". That mirror has now drifted twice (8f622f1 + f979081 follow-up fixes). The recurring failure suggests a shared `--header-band-padding` token (or shared CSS rule) would be the structural fix, not better discipline.
- **D-04 walkthrough override** — overriding the row-by-row walkthrough discipline via `/gsd-next --force` saved time on a verify-and-close phase where the automated audit had already proven the negative space, but the override is now precedent. Future overrides need a clear "automated axis already covers this" justification or they erode the human-axis evidence.
- **Nyquist coverage drift** — none of the three v3.1 phases produced a finalized `*-VALIDATION.md` (Phase 19 has draft; Phase 18 and 20 missing). The test suite passed (687/687), but the per-phase validation contract is informal. Should be tightened in v3.2 or accepted as the established norm.

### Patterns Established

- **Nested-shadow `getComputedStyle` regression test** — `users.test.ts:193-216` drills `page.shadowRoot → data-table.shadowRoot → button.btn-icon → svg`, then asserts `getComputedStyle(svg).width === '16px'` AND `.height === '16px'`. First test in the repo to cross two shadow boundaries. Future shadow-DOM-boundary regressions can copy this shape.
- **Two-pass grep audit with explicit locale prefix** — `LC_ALL=C.UTF-8 grep -rE ...` (instead of the default LANG) works on GNU grep 3.x (Linux) and BSD grep (macOS) identically. Pattern documented in 19-PATTERNS.md.
- **`<zt-app>` as theme single-writer** — `<zt-app>.setTheme(target, options?)` consolidates theme writes; consumers (settings.ts) call the method; passive consumers (`<zt-navbar>`) bind to `<zt-app>.theme` via Lit `@property`. Pattern is the antidote to the multi-writer drift that produced CR-01.
- **`Router<R>` generic for typed Vaadin Router metadata** — instead of `declare module '@vaadin/router' { interface Route { ... } }` (which fails because `Route` is a type alias, not an interface), declare a local `interface RouteMetadata` and instantiate `Router<RouteMetadata>`. Pattern documented in `src/router/index.ts`.

### Key Lessons

1. **Visual alignment debugging needs browser context.** Static CSS rule inspection systematically underestimates rendered geometry (font metrics, browser layout quirks). Future header/alignment work should include a "measure in DevTools" loop, not just compute from declared values.
2. **Avoid the byte-for-byte mirror anti-pattern.** When two surfaces must agree on a measurement, share the measurement (token, mixin, helper) rather than re-declaring it on both sides. The recurrence of the LAYOUT-02 drift across multiple fix attempts is the symptom.
3. **Multi-writer state is the source of CR-01-class bugs.** When a value flows through multiple writers (settings.ts → localStorage; navbar reads localStorage; app reads localStorage), drift is inevitable. Consolidate to a single writer + property-binding consumers.
4. **Pre-phase scouts pay off.** A 20-minute scout before discuss-phase saved Phase 19 from running as a translation campaign instead of verify-and-close. The pattern: before locking phase shape, grep/measure the actual codebase against the stated assumptions.
5. **Two-tier verification (programmatic → UAT) catches what either alone would miss.** Programmatic tests pass and humans miss subtle drift; humans pass and tests miss `as any` evasions. Both are needed; sequencing them (program first, human second) keeps the human pass focused on what only humans can verify.

### Cost Observations

- Phase 18: ~67 minutes total execution (18-01 ≈22 min, 18-02 ≈45 min)
- Phase 19: ~100 minutes total execution including the decision-checkpoint amendment
- Phase 20: ~74 minutes execution across 5 plans (20-01 ≈12 min, 20-02 ≈4 min, 20-03 ≈25 min, 20-04 ≈25 min, 20-05 ≈8 min)
- UAT closure: ~3 commits over the 2026-05-19/20 window
- Total milestone execution: ~241 minutes of plan execution time, against 16 calendar days

---

## Cross-Milestone Trends

*To populate as additional milestones close.*
