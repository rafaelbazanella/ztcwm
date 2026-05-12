---
phase: 19-internationalization-sweep
reviewed: 2026-05-12T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - src/scripts/i18n-audit.sh
  - src/package.json
status: concerns
findings:
  critical: 0
  warning: 1
  info: 4
  total: 5
severity_counts:
  critical: 0
  warning: 1
  info: 4
  total: 5
---

# Phase 19: Code Review Report

**Reviewed:** 2026-05-12
**Depth:** standard
**Files Reviewed:** 2
**Status:** concerns

## Summary

Reviewed the two files added by Phase 19: a re-runnable PT audit shell script (`src/scripts/i18n-audit.sh`) and the single new line in `src/package.json` that wires it as opt-in `audit:i18n`. The implementation is faithful to the LOCKED context decisions:

- D-03 Pass 1 accent class is encoded verbatim (`[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]`).
- D-03 Pass 2 token list contains 43 tokens (40 locked seeds + 3 RESEARCH additions: `carregando`, `enviar`, `selecionar`).
- D-06 hard gate is honored: no `prepare`, `preinstall`, `postinstall`, `precommit`, or `pretest` rows were introduced; `audit:i18n` value is exactly `bash scripts/i18n-audit.sh`.
- D-03 amendment locale fix (`LC_ALL=C.UTF-8`) is present on both grep invocations.
- Shell hygiene is solid: `set -u` only (intentional per RESEARCH § Pattern 1 — no `set -e`), `BASH_SOURCE[0]` resolution makes the script cwd-independent, all variable expansions are quoted, the `EXCLUDES` array is expanded with `"${EXCLUDES[@]}"`.

One Warning surfaced (regex correctness on the `configura[cç]` token, inherited from the LOCKED seed list but worth flagging because the LOCKED scope decision spans both CONTEXT.md and the script). Four Info-level notes are recorded for forward-compatibility and cross-platform awareness. Nothing in this phase blocks ship.

## Warnings

### WR-01: `configura[cç]` token never matches anything under `\b...\b` anchors

**File:** `src/scripts/i18n-audit.sh:27`
**Issue:** The Pass 2 alternation `\b(...|configura[cç]|...)\b` requires the matched token to be a complete word. `configura[cç]` matches the literal byte sequences `configurac` or `configuraç` only — but in Portuguese these strings always appear as prefixes (`configuração`, `configurações`, `configurações`), never standalone. The character following `c`/`ç` is always `a` (word char) or `õ` (word char in `C.UTF-8`), so the trailing `\b` never fires. The token is effectively dead and will never produce a hit.

This pattern is inherited verbatim from CONTEXT.md D-03 line 41, so the script is faithful to the LOCKED spec. The defect is in the LOCKED regex itself, not in the script's encoding of it. Flagged as Warning because the audit's I18N-01 coverage on the words `configuração`/`configurações` rests entirely on the Pass 1 accent class (which would catch `ç` and `ã`/`õ`) — Pass 2 contributes zero signal here. If a PT string ever appeared with ASCII-substituted accents (`configuracao`, `configuracoes`), neither pass would catch it.

**Fix:** Either (a) accept the LOCKED defect and document it in `19-AUDIT.md` § Pass 2 coverage notes (the accent-class pass is the safety net for accented PT); or (b) raise a follow-up to amend D-03 to use `configura[cç][aãoõ]` or `configura[cç]\w*` so the token covers the full word family including ASCII-substituted forms. The same family-prefix concern does NOT apply to the `a[cç][õo]es` token — that one ends in `es` and matches the plural `ações`/`acoes` correctly.

```bash
# Option (b) — covers configuração, configuracao, configurações, configuracoes
TOKEN_RE='\b(...|configura[cç][aãoõ]\w*|...)\b'
```

## Info

### IN-01: `LC_ALL=C.UTF-8` is not portable to BSD libc / older macOS

**File:** `src/scripts/i18n-audit.sh:32, 37`
**Issue:** The `C.UTF-8` locale ships with glibc (Linux) and modern macOS (12+) but is absent on FreeBSD / OpenBSD / older macOS. On those systems, `LC_ALL=C.UTF-8` is silently downgraded to `C` (single-byte) and the GNU grep 3.11 byte-class overlap with Unicode punctuation (em-dash, ellipsis, checkmarks) — the very bug commit 59a6549 was written to fix — reappears.

The project's documented dev environment is Linux (the gsd workflow runs on Linux per the env block), so this is not a regression today. Flagged as Info so the failure mode is documented for future contributors on non-glibc machines.

**Fix:** No code change needed; consider documenting "Linux / macOS 12+" as the supported audit-runtime in `19-AUDIT.md` § "Running the audit". Optionally, add a runtime probe:

```bash
if ! locale -a 2>/dev/null | grep -qi '^c\.utf-?8$'; then
    echo "warning: C.UTF-8 locale unavailable; falling back to C may misreport Unicode punctuation" >&2
fi
```

### IN-02: `anterior` token can false-positive against English medical / positional copy

**File:** `src/scripts/i18n-audit.sh:27`
**Issue:** Pass 2 runs case-insensitive (`grep -rEi`) and matches the token `anterior`. "Anterior" is also an English word (medical / spatial — "anterior cruciate ligament", "anterior surface"). In this codebase (ZeroTier network management) the word is extremely unlikely to appear, so the false-positive risk is theoretical. Flagged as Info only.

**Fix:** No action. If a future hit on `anterior` arises in an English context, document it in `19-AUDIT.md` § "Known false positives" rather than removing the token (per the LOCKED list authority).

### IN-03: Only `*.test.ts` excluded; no exclusion for `*.spec.ts` or `__tests__/`

**File:** `src/scripts/i18n-audit.sh:17`
**Issue:** D-02 excludes test files. The script implements this with `--exclude="*.test.ts"` only. The current codebase uses exclusively the `*.test.ts` convention (verified — zero `*.spec.ts` files in `src/`), so coverage is correct today. If a future contributor introduces `*.spec.ts` or a `__tests__/` directory (common Jest/Vitest convention), test-only PT strings (e.g. `'café'` style Unicode fixtures, per CONTEXT.md D-02 example) would leak into the audit and create false positives.

**Fix:** Either accept the current state (audit will surface false positives that can be triaged into `19-AUDIT.md`'s known-FP section), or add belt-and-suspenders exclusions:

```bash
EXCLUDES=(
    --include="*.ts"
    --include="*.html"
    --exclude="*.test.ts"
    --exclude="*.spec.ts"
    --exclude-dir="__tests__"
    --exclude-dir="dist"
    --exclude-dir="node_modules"
)
```

### IN-04: Pass 2 output is interleaved with Pass 1; no per-pass match count or summary

**File:** `src/scripts/i18n-audit.sh:31-39, 41-46`
**Issue:** Both passes always run (good — comprehensive report), and on a non-clean run the script emits `Audit FAILED — see hits above` without telling the operator which pass(es) flagged or how many hits per pass. For a developer tool this is acceptable, but on a large diff it costs a manual scroll-and-count.

**Fix:** No change required for v3.1. If usability becomes a concern, capture per-pass counts:

```bash
echo "Pass 1: accent class"
pass1_hits=$(LC_ALL=C.UTF-8 grep -rE "${ACCENT_RE}" "${SRC_ROOT}" "${EXCLUDES[@]}" | tee /dev/stderr | wc -l)
[ "${pass1_hits}" -gt 0 ] && hits=1

echo "Pass 2: PT token list"
pass2_hits=$(LC_ALL=C.UTF-8 grep -rEi "${TOKEN_RE}" "${SRC_ROOT}" "${EXCLUDES[@]}" | tee /dev/stderr | wc -l)
[ "${pass2_hits}" -gt 0 ] && hits=1
```

Note this adds `pipefail` considerations and changes the exit-code interaction with `grep` — would need careful test against the existing CONTEXT.md D-06 "no `set -e`" stance.

---

## Compliance Checklist (LOCKED constraints)

| Constraint | Source | Status |
|---|---|---|
| Pass 1 accent class `[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]` | D-03 | OK — line 23 |
| Pass 2 token list, 43 tokens incl. `carregando`/`enviar`/`selecionar` | D-03 + RESEARCH | OK — line 27 |
| `LC_ALL=C.UTF-8` prefix on both passes | D-03 amendment / 59a6549 | OK — lines 32, 37 |
| Audit OPT-IN (no `prepare`/`preinstall`/`postinstall`/`precommit`/`pretest`) | D-06 | OK — `src/package.json` has none |
| `audit:i18n` value exactly `bash scripts/i18n-audit.sh` | Spec | OK — line 17 |
| `set -u` only, no `set -e` | RESEARCH § Pattern 1 Notes | OK — line 6 |
| Script path `src/scripts/i18n-audit.sh` | D-05.1 | OK |
| Excludes: `*.test.ts`, `dist`, `node_modules` | D-02 within `src/` | OK — lines 14-20 |
| Exit `0` clean / `1` on PT match | D-05.1 | OK — lines 41-46 |
| Re-runnable, deterministic | D-05.1 | OK |

---

_Reviewed: 2026-05-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
