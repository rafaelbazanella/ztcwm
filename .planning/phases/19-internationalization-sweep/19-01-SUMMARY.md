---
phase: 19-internationalization-sweep
plan: 01
subsystem: tooling
tags: [i18n, audit, bash, grep, npm, locale]

# Dependency graph
requires:
  - phase: 19-internationalization-sweep
    provides: "D-01..D-10 locked decisions (CONTEXT.md), 43-token PT regex + script body spec (RESEARCH.md), per-task verification map (VALIDATION.md), pattern catalogue (PATTERNS.md)"
provides:
  - "Re-runnable PT-string audit script at src/scripts/i18n-audit.sh (executable 0755, two-pass grep: accent class + 43-token regex)"
  - "Opt-in npm wiring (audit:i18n) in src/package.json — NOT chained into test/lint/build/install (D-06)"
  - "Captured verbatim audit run output at 19-01-AUDIT-RUN.txt — final exit=0 banner for Plan 19-02 to paste into 19-AUDIT.md § Automated Pass"
  - "Empirical confirmation that current src/ tree has zero Portuguese strings under D-01/D-02 filters (audit exits 0)"
affects: [19-02, future-phase-19-style-i18n-sweeps]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-pass grep audit with honest exit codes (set -u, no set -e — preserves grep's no-match exit 1 as a success signal in the script's wrapped boolean)"
    - "Explicit-locale grep prefix (LC_ALL=C.UTF-8) for repeatable matching across host environments where the default LANG varies"
    - "Opt-in npm script for developer tooling (audit:* row, never wired into install/CI hooks)"

key-files:
  created:
    - "src/scripts/i18n-audit.sh"
    - ".planning/phases/19-internationalization-sweep/19-01-AUDIT-RUN.txt"
    - ".planning/phases/19-internationalization-sweep/19-01-SUMMARY.md"
  modified:
    - "src/package.json (scripts.audit:i18n added; no other rows touched)"

key-decisions:
  - "D-03 regex body locked verbatim from RESEARCH.md § Pattern 1 (43-token list including the three RESEARCH additions carregando/enviar/selecionar)"
  - "D-06 honored — audit:i18n is opt-in only; no prepare/preinstall/postinstall/precommit/pretest hook added; test/lint/build/start byte-unchanged"
  - "D-03 AMENDMENT (2026-05-11, user-approved Option B at decision checkpoint): script locale prefix changed from `LC_ALL=C` to `LC_ALL=C.UTF-8`. The two locale-prefix bytes are the only deviation from the verbatim-locked body — the regex characters themselves (ACCENT_RE + TOKEN_RE), excludes array, pass-order, exit-code semantics, and D-06 comment are all unchanged"

patterns-established:
  - "Locale-explicit grep for cross-host repeatability: `LC_ALL=C.UTF-8 grep -rE ...` instead of the default LANG — works on GNU grep 3.x (Linux) and BSD grep (macOS) identically, no continuation-byte surprises"
  - "Audit working artifact + summary handoff: the captured run output file (19-01-AUDIT-RUN.txt) is committed under docs(19) and lives in the phase directory so the next plan can paste it verbatim without re-running"

requirements-completed: [I18N-01, I18N-02]

# Metrics
duration: ~50min (incl. checkpoint resolution)
completed: 2026-05-11
---

# Phase 19 Plan 01: i18n Audit Tooling Summary

**Re-runnable PT-string audit script (43-token PT regex + accent-class pass) wired as opt-in `npm run audit:i18n`, exits 0 against current src/ tree — confirms zero Portuguese strings remain.**

## Performance

- **Duration:** ~50 min (T1+T2 by prior agent; T3 initially exit=1 false positives, decision checkpoint resolved via Option B locale amendment, re-run exit=0 by continuation agent)
- **Started:** 2026-05-11 (T1 commit 5ed7dca at 14:18:32 -0400)
- **Completed:** 2026-05-11 (final docs commit after vitest re-verification)
- **Tasks:** 3 of 3 complete
- **Files modified:** 2 created (script + capture file) + 1 modified (package.json)

## Accomplishments

- Audit script (`src/scripts/i18n-audit.sh`, 0755, 46 lines) installs the two-pass D-03 regex set: Pass 1 enumerated accent class `[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]`, Pass 2 the 43-token PT list — both invoked with `LC_ALL=C.UTF-8 grep -rE[i]` against `${SRC_ROOT}` with the D-02 excludes array (`*.ts`, `*.html` include; `*.test.ts` exclude; `dist`, `node_modules` exclude-dir).
- `audit:i18n` npm row added as the **last** entry in `src/package.json scripts` — `bash scripts/i18n-audit.sh` (relative path from `src/`). D-06 hard gate honored: no `prepare`/`preinstall`/`postinstall`/`precommit`/`pretest` hook added; `test`/`lint`/`build`/`start`/`dev`/`dev:server`/`dev:client`/`preview`/`format`/`test:watch` rows byte-unchanged.
- Captured verbatim run output at `.planning/phases/19-internationalization-sweep/19-01-AUDIT-RUN.txt` — contains BOTH the diagnostic exit=1 run (94 false-positive byte-overlap hits under `LC_ALL=C`) AND the post-fix exit=0 run (zero hits, "Audit clean" banner). Plan 19-02 pastes the second half (from the second npm banner through `exit=0`) into 19-AUDIT.md § Automated Pass.
- Empirical confirmation: zero Portuguese strings remain in `src/` under the D-01 surface filter + D-02 exclusion set. The D-08 inline-replacement fallback did NOT need to fire for any real PT string.
- Existing vitest suite (33 files, 680 tests + 8 skipped) remained green throughout — no regression introduced by the tooling slice.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create src/scripts/i18n-audit.sh** — `5ed7dca` (`chore(scripts): add i18n audit script (Phase 19 / I18N-01 / I18N-02)`)
2. **Task 2: Wire opt-in audit:i18n npm row** — `1c82907` (`chore(package): wire opt-in audit:i18n npm script (Phase 19, D-06 compliant)`)
3. **Task 3 — D-03 amendment (Option B applied)** — `59a6549` (`fix(scripts): use C.UTF-8 locale for i18n audit`)
4. **Task 3 — capture run output** — `498d908` (`docs(19): capture i18n audit run output for plan 19-02 consumption`)

**Plan metadata commit:** see final docs(19) commit completing this plan in the metadata-bundle commit (covers STATE.md + ROADMAP.md + this SUMMARY.md).

## Files Created/Modified

- `src/scripts/i18n-audit.sh` (CREATED, 0755) — Re-runnable two-pass audit. Pass 1 = accent class. Pass 2 = 43-token PT regex. Both use `LC_ALL=C.UTF-8 grep -rE[i]` for cross-host repeatable matching.
- `src/package.json` (MODIFIED) — One row inserted after `test:watch`: `"audit:i18n": "bash scripts/i18n-audit.sh"`. All other scripts rows byte-unchanged; dependencies/devDependencies untouched.
- `.planning/phases/19-internationalization-sweep/19-01-AUDIT-RUN.txt` (CREATED) — Verbatim invocation capture (two runs: exit=1 diagnostic + exit=0 final). Hand-off artifact for Plan 19-02.

## Decisions Made

- **Locale prefix amendment (D-03 sub-decision, user-approved 2026-05-11):** Both grep lines use `LC_ALL=C.UTF-8` instead of the originally-spec'd `LC_ALL=C`. Rationale: GNU grep 3.11 under `LC_ALL=C` treats the explicit-char bracket class `[á…Ç]` as a byte class, so the UTF-8 continuation bytes of those characters become individually matchable — every em-dash (`—` = `0xE2 0x80 0x94`), ellipsis (`…` = `0xE2 0x80 0xA6`), and checkmark (`✓` = `0xE2 0x9C 0x93`) in the codebase matched as a false positive (94 hits). `C.UTF-8` preserves the explicit-locale lock (still deterministic, not host-LANG-dependent) while letting grep treat input as UTF-8 codepoints, restoring the intended PT-character matching. Verified empirically: a probe string `'usuário inválido'` still matches under C.UTF-8; non-PT punctuation no longer matches.
- **Capture file committed** (rather than left as a working-tree artifact, which the original plan said was also acceptable) — committed for two reasons: (1) Plan 19-02 needs to read it from a deterministic git-tracked path, (2) the diagnostic exit=1 first half is valuable evidence-of-investigation for future regex tweaks to D-03.

## Deviations from Plan

### Auto-fixed Issues

None — no Rule 1/2/3 deviations during T1 and T2 (the script was written verbatim from RESEARCH § Pattern 1 and the npm row was placed exactly per PATTERNS.md).

### Decision-checkpoint deviation (Rule 4 — escalated, user-resolved)

**1. [Rule 4 - Decision Checkpoint] D-03 regex/locale interaction bug surfaced as 94 false positives on first audit run**

- **Found during:** Task 3 (initial `cd src && npm run audit:i18n` invocation)
- **Issue:** Audit exited 1 with 94 grep hits in Pass 1, but inspection showed every hit was a Unicode punctuation character (em-dash `—`, ellipsis `…`, checkmark `✓`) — not actual Portuguese text. Pass 2 (token regex, `\b(editar|…)\b`) returned zero matches, confirming the codebase has no real PT tokens. Root cause: GNU grep 3.11's `LC_ALL=C` byte-mode treats the explicit accent bracket class as 26 single-byte alternations, which happen to coincide with the leading and continuation bytes of common UTF-8 punctuation glyphs present throughout the codebase.
- **Why escalated:** The plan's D-08 fallback path was scoped for "real PT strings need inline replacement" — but here the hits were NOT real PT, they were a host-grep/regex interaction artifact. Fixing this requires modifying the LOCKED D-03 script body (a script-spec change), which the deviation-rule framework treats as architectural (Rule 4: ask). The continuation agent paused and returned a structured decision checkpoint with three options: (A) keep `LC_ALL=C` and add a Unicode-punctuation exclude regex, (B) change `LC_ALL=C` → `LC_ALL=C.UTF-8`, (C) replace the bracket class with explicit alternation `(á|à|â|…)`.
- **User decision:** Option B (`LC_ALL=C` → `LC_ALL=C.UTF-8`). Minimum-byte amendment to the LOCKED body, preserves explicit-locale determinism, restores intended Unicode semantics.
- **Fix applied:** Two-line edit to `src/scripts/i18n-audit.sh` (lines 32 and 37, the two `if LC_ALL=C grep …` lines). No regex characters changed.
- **Files modified:** `src/scripts/i18n-audit.sh` (2 lines changed: `LC_ALL=C` → `LC_ALL=C.UTF-8` on Pass 1 and Pass 2 grep invocations).
- **Verification:**
  - `grep -c 'LC_ALL=C.UTF-8 grep -rE' src/scripts/i18n-audit.sh` returns `2`
  - `grep -c 'LC_ALL=C grep -rE' src/scripts/i18n-audit.sh` returns `0`
  - `bash -n src/scripts/i18n-audit.sh` exits 0 (syntax still valid)
  - `cd src && npm run audit:i18n; echo $?` prints `0`
  - Captured run output last line is `exit=0`; banner `Audit clean — no PT strings found in src/ under D-01/D-02 filters.` present
  - `cd src && npm test` exits 0 (33 files passed, 680 tests passed, 8 skipped)
- **Committed in:** `59a6549` (fix commit) + `498d908` (captured run output)
- **Action item for future phases:** The 19-RESEARCH.md § Pattern 1 script body was specified with `LC_ALL=C`. If any future phase re-derives or copies that script, prefer `LC_ALL=C.UTF-8` to avoid re-discovering this interaction. RESEARCH.md should be amended in a separate cleanup commit (or via Phase 19 close-out plan 19-02 may opt to fold this into its own amendment).

---

**Total deviations:** 1 user-resolved (Rule 4 — decision-checkpoint, locale prefix amendment to the LOCKED D-03 script body)
**Impact on plan:** The two-byte amendment is the minimum deviation needed to make the audit produce correct results on this host. Regex characters and 43-token list are byte-unchanged from RESEARCH § Pattern 1. No additional scope crept in — no helper functions, no extra excludes, no I18N framework adds.

## Issues Encountered

- **94-hit false-positive surprise (T3 first run):** Resolved via the decision-checkpoint flow described above. Root cause is a documented GNU grep behavior under `LC_ALL=C`, not a bug in the regex spec; the spec's intent was Unicode-aware matching, the byte-mode interaction is the host-specific quirk.

## Self-Check

PASSED. Verification of each plan `<verification>` item:

| # | Check | Command | Result |
|---|-------|---------|--------|
| 1 | Script present + executable | `test -f src/scripts/i18n-audit.sh && test -x src/scripts/i18n-audit.sh` | exits 0 |
| 2 | Valid bash | `bash -n src/scripts/i18n-audit.sh` | exits 0 |
| 3 | audit:i18n npm row wired | `node -e "process.exit(require('./src/package.json').scripts['audit:i18n']==='bash scripts/i18n-audit.sh' ? 0 : 1)"` | exits 0 |
| 4 | D-06 test/lint/build unchanged | `node -e "const p=require('./src/package.json'); process.exit(p.scripts.test==='vitest run' && p.scripts.lint==='eslint . --ext .ts' && p.scripts.build==='tsc && vite build && tsc -p server/tsconfig.json' ? 0 : 1)"` | exits 0 |
| 5 | D-06 no install/CI hook | `node -e "const p=require('./src/package.json'); process.exit((p.scripts.prepare||p.scripts.preinstall||p.scripts.postinstall||p.scripts.precommit||p.scripts.pretest)?1:0)"` | exits 0 |
| 6 | Audit clean exit 0 | `cd src && npm run audit:i18n; echo $?` | prints `0` |
| 7 | Vitest still green | `cd src && npm test` | exits 0 (33 files passed, 680 tests passed, 8 skipped) |
| 8 | Capture file + exit=0 line | `tail -1 .planning/phases/19-internationalization-sweep/19-01-AUDIT-RUN.txt` | `exit=0` |

Additional D-03 amendment verifications:
- `grep -c "LC_ALL=C.UTF-8 grep -rE" src/scripts/i18n-audit.sh` = `2`
- `grep -c "LC_ALL=C grep -rE" src/scripts/i18n-audit.sh` = `0`
- AUDIT-RUN.txt `exit=` line count = `2` (first `exit=1` diagnostic, second `exit=0` final)
- "Audit clean" banner present in AUDIT-RUN.txt: confirmed

All eight `<verification>` block items in 19-01-PLAN.md pass.

## Hand-off note for Plan 19-02

When 19-02 populates `19-AUDIT.md § Automated Pass — Script Invocation`, paste the SECOND half of `.planning/phases/19-internationalization-sweep/19-01-AUDIT-RUN.txt` — specifically the region from the **second** `> ztcwm@1.0.0 audit:i18n` npm banner through the final `exit=0` line. This is the canonical clean-run output:

```
> ztcwm@1.0.0 audit:i18n
> bash scripts/i18n-audit.sh

Pass 1: accent class
Pass 2: PT token list
Audit clean — no PT strings found in src/ under D-01/D-02 filters.
exit=0
```

The **first** half of the file (the exit=1 run with 94 false-positive hits under the original `LC_ALL=C` prefix) is diagnostic context only — it documents why the D-03 amendment was needed. Do NOT embed the first half in `19-AUDIT.md`; link to it from a footnote in the audit report's Deviations / Methodology Notes section if relevant.

Plan 19-02 should also note in its own `<context>` block that the script body now uses `LC_ALL=C.UTF-8` (not `LC_ALL=C` as originally specified in RESEARCH.md § Pattern 1), and reference this SUMMARY's Deviations section + commit `59a6549` for the rationale.

## Next Phase Readiness

- Plan 19-01 complete. Plan 19-02 (audit report + 69-row page-by-role walkthrough sign-off) can begin.
- The audit script is empirically validated as exit-0 against the current src/ tree, satisfying both I18N-01 (frontend templates / aria-labels surface) and I18N-02 (server route response strings surface) at the automated-pass level. Plan 19-02 still needs to add the manual walkthrough sign-off (running app, page-by-role check).
- No blockers. No deferred items from this plan.

---
*Phase: 19-internationalization-sweep*
*Completed: 2026-05-11*
