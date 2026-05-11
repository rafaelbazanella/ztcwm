# Phase 19: Internationalization Sweep - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 19-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-11
**Phase:** 19-internationalization-sweep
**Areas discussed:** Audit scope, Audit methodology, Deliverable shape, Fix strategy fallback

**Scout finding shown to the user before discussion (informed every choice below):** No Portuguese strings detected in `src/` via `LC_ALL=C` accent-class grep or unaccented PT-token regex. Only PT-bearing files in repo are `.TODO.md` (original brief, not user-visible) and `.planning/phases/18-…/18-CONTEXT.md` (quotes `.TODO.md`). Phase 19 reshaped as **verify-and-close** rather than translation diff.

---

## Audit scope

| Option | Description | Selected |
|--------|-------------|----------|
| Spec-literal + a11y metadata (Recommended) | I18N-01 surfaces (templates, modals, toasts, error messages, button labels, table headers, empty states) + I18N-02 (backend response messages surfaced via UI) + `aria-label`, `title`, `placeholder`, `alt`. Screen-reader text is visible-to-users in the real sense. | ✓ |
| Spec-literal only | Only what I18N-01/02 literally enumerate — rendered text + backend response messages. Skips a11y metadata. Narrower; risks shipping a 'Voltar' in an aria-label. | |
| Spec-literal + a11y + dev surfaces | Above + `console.*` payloads + structured `fastify.log.*` audit-log message strings. Strictest; expands diff scope into dev/ops text. | |

**User's choice:** Spec-literal + a11y metadata.
**Notes:** Maps to D-01 (in-scope) and D-02 (out-of-scope: console.*, fastify.log.*, comments/JSDoc, tests, .planning/, docs/).

---

## Audit methodology

| Option | Description | Selected |
|--------|-------------|----------|
| Automated grep + manual page walkthrough (Recommended) | Two passes — regex sweep (accent class + token list) across all scope surfaces, plus running-app walkthrough by page × role. | ✓ |
| Automated grep only | Trust regex to catch everything. Misses un-grep-able items like English-spelled PT cognates or stale copy. | |
| Manual walkthrough only | Eyeballs only. Slowest; high miss rate on rarely-rendered states (e.g. specific 4xx toasts). | |

**User's choice:** Automated grep + manual page walkthrough.
**Notes:** Maps to D-03 (script + checklist) and D-04 (walkthrough is against the running dev server, not screenshots — every page × role × interaction must be visually confirmed).

---

## Deliverable shape

| Option | Description | Selected |
|--------|-------------|----------|
| Audit report + re-runnable script + manual checklist (Recommended) | `src/scripts/i18n-audit.sh` (exit 0 / 1) + `19-AUDIT.md` (scope, command, walkthrough sign-off, findings). Not wired to CI (Out-of-Scope), but developer-rerunnable pre-release. | ✓ |
| Audit report only | Single doc — scope, methodology, walkthrough sign-off, findings. No script. If PT resurfaces later there's nothing to rerun. | |
| Phase-closure note in PROJECT/STATE only | Append a short paragraph saying "I18N-01/02 verified clean on 2026-05-11." Minimal paper trail; no re-runnability. | |

**User's choice:** Audit report + re-runnable script + manual checklist.
**Notes:** Maps to D-05 (three artifacts: script + audit report + closure note in 19-VERIFICATION.md), D-06 (script NOT wired into CI; opt-in `npm run audit:i18n` permitted), D-07 (no new `*.test.ts` file).

---

## Fix strategy fallback

| Option | Description | Selected |
|--------|-------------|----------|
| Pure inline replacement (Recommended) | Edit the literal in place where it lives — Lit template, server route handler, validator. No new module, no map. Matches existing convention and locked roadmap SC #3 ('strings remain inline literals'). | ✓ |
| Tiny dictionary helper | Add a `src/strings.ts` const map (e.g. `MSG = { editUser: 'Edit user' }`) and reference keys from components. Establishes a seam for hypothetical future i18n; reads as 'i18n framework lite'. | |

**User's choice:** Pure inline replacement.
**Notes:** Maps to D-08 (inline replacement only), D-09 (replacement copy follows existing English conventions: imperative buttons, sentence-case toasts, noun-first server errors), D-10 (`.TODO.md` not edited — it's internal authoring scratch). Closes the STATE.md pending entry "Strategy for the i18n sweep — pure inline-string replacement vs. light dictionary helper".

---

## Claude's Discretion

- Shell vs. node-ts choice for the audit script — plan-phase weighs portability (sh) against type-safety / Vitest reuse (ts). Shell is the recommended baseline (D-05.1).
- Exact PT token list inside the script — plan-phase may extend D-03's seed list; additions are free, removals need justification in the report.
- Walkthrough checklist format inside `19-AUDIT.md` (markdown table vs. nested list).
- Whether to wire an opt-in `npm run audit:i18n` script in `src/package.json` (recommended yes; zero risk, matches D-06).
- Order of script invocation vs. manual walkthrough during execution.

## Deferred Ideas

- **CI guardrail test for English-only strings** — explicitly Out-of-Scope per REQUIREMENTS.md; the Phase 19 audit script is a developer tool only. Reconsider in a future milestone if multi-language support ever moves on the roadmap.
- **Multi-language support / runtime locale switching** — locked Out-of-Scope (no i18n framework).
- **String-extraction tooling for translator review** — premature; deferred until multi-language is reconsidered.
- **Localizing `.TODO.md`** — internal authoring scratch, not user-visible; out of scope.
