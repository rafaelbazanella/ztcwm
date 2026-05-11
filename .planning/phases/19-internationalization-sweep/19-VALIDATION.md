---
phase: 19
slug: internationalization-sweep
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-11
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Mirrors `19-RESEARCH.md § Validation Architecture` — see that section for derivation.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 + @open-wc/testing-helpers 3.0.1 + happy-dom 20.8.9 |
| **Config file** | `src/vitest.config.ts` (happy-dom env) |
| **Quick run command** | `cd src && npm test` |
| **Full suite command** | `cd src && npm test` (single suite — no separate full run) |
| **Estimated runtime** | ~10 seconds (~671 tests) |

The audit script itself is NOT a vitest test (D-06 / D-07). "Did the audit pass?" is answered by:

1. `src/scripts/i18n-audit.sh` exits 0 (encodes D-01 surfaces + D-02 exclusions + D-03 regexes).
2. `cd src && npm test` stays green (SC #4).
3. Every row in `19-AUDIT.md` walkthrough matrix has a checked checkbox.

---

## Sampling Rate

- **After every task commit:** Run `cd src && npm test` (existing suite stays green, ~10s).
- **After every plan wave:** Run `cd src && npm test && cd src && npm run audit:i18n` (existing suite + the audit added in this phase, once the npm-script row is wired).
- **Before `/gsd-verify-work`:** Full suite green + `npm run audit:i18n` exit 0 + every walkthrough row in `19-AUDIT.md` checked.
- **Max feedback latency:** ~10 seconds (vitest), ~2 seconds (audit script grep pass).

---

## Per-Task Verification Map

> Filled in by the planner once PLAN.md task IDs are assigned. The mapping below is the requirement-level scaffold consumed by gsd-plan-checker (Dimension 8 — Nyquist).

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| I18N-01 | Every visible UI string in the SPA (Lit templates, modals, toasts, button labels, table headers, empty states, aria-labels, placeholders, titles, alts) is English | audit-script + manual walkthrough | `cd src && npm run audit:i18n` + walkthrough sign-off in `19-AUDIT.md` | ❌ W0 — `src/scripts/i18n-audit.sh` + `19-AUDIT.md` created during Phase 19 |
| I18N-02 | Every user-visible backend response message (`error` / `message` / `details` in `src/server/routes/*.ts`, validator return values in `src/server/auth/*.ts` + `src/server/routes/member-ip-validator.ts`) is English | audit-script + manual walkthrough | `cd src && npm run audit:i18n` (covers route + validator source) + walkthrough rows that exercise 4xx code paths | ❌ W0 — same files as I18N-01 |
| ROADMAP SC #1 | Equivalent to I18N-01 | audit + manual | (as above) | (as above) |
| ROADMAP SC #2 | Equivalent to I18N-02 | audit + manual | (as above) | (as above) |
| ROADMAP SC #3 | No new i18n framework; inline literals only | static review | Inspect `src/package.json` diff — must not gain `i18next` / `lit-translate` / equivalent dep | N/A (manual review) |
| ROADMAP SC #4 | Existing vitest suite stays green | unit + integration | `cd src && npm test` | ✅ existing |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/scripts/i18n-audit.sh` — the audit script (D-05.1)
- [ ] `.planning/phases/19-internationalization-sweep/19-AUDIT.md` — the audit report (D-05.2)
- [ ] `src/package.json` `scripts."audit:i18n"` entry — opt-in npm wiring (D-06 discretion)

**No new test files** — D-07 forbids them. Existing tests stay green per SC #4.

**Framework install:** none — `bash` and `grep` are system tools already present on dev machines.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Page-by-role walkthrough on the running dev server | I18N-01, I18N-02 | Some toasts (4xx code paths, modal collisions) only render when triggered against a live server — static grep alone won't surface a hypothetical PT string inside a rarely-fired toast (D-04) | Run `cd src && npm run dev`. For every row in the `19-AUDIT.md § Walkthrough Matrix` (page × role × interaction), exercise the listed trigger and visually confirm every rendered string is English. Sign off by checking the row's checkbox. |
| No-new-i18n-framework gate (SC #3) | I18N-01, I18N-02 | Static — `src/package.json` diff inspection; no automated grep encodes "no new framework added" cleanly | Inspect `src/package.json` change vs. main. Confirm no new dependency in `dependencies` / `devDependencies` matches `i18next` / `lit-translate` / `formatjs` / `lingui` / similar locale-runtime libraries. |

---

## Validation Sign-Off

- [ ] All tasks have automated verify (`npm test`, `npm run audit:i18n`, or grep-checkable acceptance criteria) or Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (audit script, audit report, npm-script row)
- [ ] No watch-mode flags in any task command
- [ ] Feedback latency < 15 s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
