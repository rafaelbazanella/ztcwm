# Phase 19: Internationalization Sweep - Research

**Researched:** 2026-05-11
**Domain:** Static-text audit of a TypeScript + Lit SPA + Fastify backend; deliverable is a shell audit script + manual walkthrough report
**Confidence:** HIGH

## Summary

Phase 19 is a **verify-and-close** sweep, not a translation campaign. The discuss-phase scout (2026-05-11) already ran the D-03 grep regexes over `src/` and found zero Portuguese strings under the D-01/D-02 filters; this researcher re-ran both regexes during research and reproduced that result (the only hits are inside `*.test.ts` files which D-02 excludes). The phase therefore ships three artifacts — a re-runnable shell audit script at `src/scripts/i18n-audit.sh`, a manual walkthrough sign-off at `.planning/phases/19-internationalization-sweep/19-AUDIT.md`, and a phase-closure note appended to `19-VERIFICATION.md` at verify time — with a fallback inline-replacement fix strategy (D-08) that never has to fire.

Every locked decision in CONTEXT.md is honored verbatim. The script must encode the D-03 regexes character-for-character, must exclude the D-02 surfaces (tests, `console.*`, `fastify.log.*`, comments, `.planning/`, `docs/`, `.TODO.md`), must be re-runnable with exit `0` on clean / exit `1` on any PT hit, and must NOT be wired into `test` / `lint` / `prepare` (D-06). The walkthrough must drive the running dev server (`npm run dev`) to exercise toast and 4xx error paths that a static grep cannot see.

**Primary recommendation:** Write `src/scripts/i18n-audit.sh` as a **POSIX `bash` script** (not `sh`, not `node-ts`) using GNU-grep-compatible `-rE` invocations with `--include` / `--exclude` flags, surface the existing CONTEXT D-03 regexes unchanged, append exactly three runtime-discovered tokens to the seed list (justified below), and wire it as an opt-in `npm run audit:i18n` script in `src/package.json`. Author `19-AUDIT.md` from the skeleton in §"Audit Report Template" of this document. Drive the manual walkthrough from the page × role × interaction matrix in §"Walkthrough Matrix".

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Audit Scope (D-01, D-02):**
- **D-01:** Audit covers everything I18N-01 enumerates **plus accessibility metadata** — Lit templates, `@property` / `@state` text defaults, toast/log call sites, server route validators, server response `error` / `message` / `details` fields, `aria-label`, `aria-description`, `title`, `placeholder`, `alt`.
- **D-02:** Audit **excludes** `console.log/warn/error` payloads, `fastify.log.*` audit-log message strings, comments and JSDoc, `*.test.ts` fixtures (`'café'` in `username.test.ts:78` is a legitimate Unicode test seed, not user-visible), and `.planning/` / `.docs/` / `docs/` / `README.md` / `.TODO.md`.

**Audit Methodology (D-03, D-04):**
- **D-03:** Two-pass — automated grep using two regexes (PT accent class + PT token list) run against the D-01 surface set minus D-02 exclusions, then manual page-by-role walkthrough on the running dev server. Regex text is locked verbatim.
  - Accent class: `LC_ALL=C grep -rE "[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]" src/ --include="*.ts" --include="*.html"`
  - Token list: `\b(editar|excluir|salvar|cancelar|adicionar|aguarde|carregar|sair|entrar|voltar|pr[oó]ximo|anterior|pesquisar|buscar|mostrando|nenhum|vazio|confirmar|a[cç][õo]es|sucesso|aviso|usu[aá]rio|senha|pendente|conex[aã]o|inv[aá]lido|obrigat[oó]rio|falha|conectado|desconectado|rede|membro|gerenciar|administrador|configura[cç]|controlador|painel|in[íi]cio|recarregar|sincronizar)\b`
- **D-04:** Manual walkthrough is performed against `npm run dev` (Fastify + Vite), exercising real 4xx code paths to fire toasts and modals. Walkthrough is "complete" only when every page × role × interaction row in the matrix has been visually confirmed.

**Deliverables (D-05, D-06, D-07):**
- **D-05:** Three artifacts —
  1. `src/scripts/i18n-audit.sh` — re-runnable shell script, exit `0` on clean / exit `1` on any PT match.
  2. `.planning/phases/19-internationalization-sweep/19-AUDIT.md` — scope + methodology + script invocation + output + walkthrough sign-off + findings.
  3. Phase-closure note appended to `19-VERIFICATION.md` at phase-verify time linking the audit report and confirming I18N-01 / I18N-02 satisfied.
- **D-06:** Script is NOT wired into CI / `test` / pre-commit. Opt-in `npm run audit:i18n` is OK (zero risk, matches developer workflow).
- **D-07:** No new `*.test.ts` for i18n. Existing tests stay green; if a test asserts a PT string that D-08 replaces, the test is updated in the same change.

**Fix Strategy (D-08, D-09, D-10):**
- **D-08:** If any PT string surfaces — replace inline at the call site (Lit template, route handler body, or validator return value). No central `strings.ts`, no dictionary helper, no i18n framework.
- **D-09:** Replacement copy follows existing conventions — imperative buttons (`'Edit'`, `'Save'`, `'Cancel'`, `'Delete'`, `'Continue →'`), sentence-case toasts (`'Network configuration updated'`, `'Failed to update network configuration'`), noun-first server errors (`'Username already exists'`, `'Invalid network ID format'`).
- **D-10:** No `.TODO.md` edits.

### Claude's Discretion

- Exact shell flavor for the audit script — `sh` baseline acceptable; **this research recommends `bash`** with a `#!/usr/bin/env bash` shebang (rationale in §"Audit Script Shape").
- PT token list inside the script — D-03 seeds it; this research adds **three tokens** (`carregando`, `enviar`, `selecionar`) with justification below. No tokens removed.
- Walkthrough checklist format — this research recommends a single markdown table (one row per page × role × interaction) inside `19-AUDIT.md`.
- Whether to wire `npm run audit:i18n` — yes, recommended. Zero risk under D-06.
- Order of script invocation vs. manual walkthrough — both must complete before sign-off, order doesn't matter.

### Deferred Ideas (OUT OF SCOPE)

- CI guardrail test for English-only strings (would be a vitest equivalent of `theme-audit.test.ts`) — explicitly Out-of-Scope per `REQUIREMENTS.md` and CONTEXT.md.
- Multi-language support / runtime locale switching — locked Out-of-Scope.
- String-extraction tooling (generated catalog for translator review) — premature.
- Localizing `.TODO.md` — author authoring scratch, not user-visible.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| I18N-01 | Every visible UI string in the SPA (components, pages, modals, toasts, error messages, button labels, table headers, empty states) is in English — no remaining Portuguese strings | Audit covers `src/components/*.ts`, `src/pages/*.ts`, `src/app.ts`, `src/index.html`, plus `aria-label` / `title` / `placeholder` / `alt` metadata (§"PT Token List" verifies seed is sufficient; §"Audit Script Shape" encodes the surface set; §"Walkthrough Matrix" exercises every routed page) |
| I18N-02 | User-visible backend response messages (validation errors, audit-log lines surfaced in the UI) are in English | Audit covers `src/server/routes/*.ts` `error` / `message` / `details` payloads (verified 36 of 36 quoted `error: '...'` literals are already English) and `src/server/auth/username.ts` + `src/server/auth/password.ts` validator return values (verified all error strings are English). `fastify.log.*` is excluded per D-02 — those are server-side audit logs, not UI-rendered. The path through which server strings reach the user is `HttpClient.handleResponse` → `ApiError.message` → page `catch` → `toastService.error(...)` (`src/api/http-client.ts:24-46`); §"Risk Surfaces & Landmines" documents this in full. |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| PT-string detection (static text) | Repo-tooling (shell) | — | The audit script lives outside the running app; it operates on source files at rest. Shell + GNU grep is the right primitive — zero new runtime deps, portable across dev environments. |
| PT-string detection (runtime-only text) | Manual walkthrough (browser × dev server) | — | Toasts, 4xx error bodies, and modal heading interpolations only render when a code path fires. The walkthrough exercises those paths against `npm run dev` (Fastify backend + Vite SPA dev server). |
| Inline fix (frontend) | Browser / SPA | — | If a PT string surfaces in a Lit template, replacement happens in-place in the `.ts` file — D-08 forbids extraction to a shared module. |
| Inline fix (backend) | API / Backend | — | If a PT string surfaces in a `reply.code(...).send({ error: ... })` payload or a validator return value, replacement happens in the route handler / validator. The HTTP response surface is what the user sees through `ApiError.message`. |
| Walkthrough trigger fabrication | Browser (manual) | API / Backend | Some interactions need both tiers: e.g., to fire `'IP address is outside the network's managed routes'`, the walkthrough types an out-of-route IP in the chip editor (browser) and the server validator (`member-ip-validator.ts:142`) emits the string (backend). |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| GNU grep (or compatible) | system | Static-text search with `-rE` / `--include` / `--exclude` | Universally available on dev machines (Linux, macOS, WSL). Already used in the locked D-03 regex commands. `[VERIFIED: 2026-05-11 ran D-03 regexes against src/ — exit 0 with only test-file hits]` |
| bash | 3.2+ | Script host | Universally available; `#!/usr/bin/env bash` portable across Linux + macOS. `[VERIFIED: macOS 3.2 and Linux 5.x support all features used]` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ripgrep (`rg`) | any | Faster grep alternative | Optional fallback. **Not used in the locked script** — D-03 regex commands name `grep` explicitly. Recommend the script use `grep` so its behavior matches the CONTEXT regex text 1:1. `[VERIFIED: rg 14.1.1 present on the researcher's machine but is not a dependency we want to introduce]` |
| Node.js (already a project dep) | ≥20 | `npm run audit:i18n` host | Already required by the project (`tsx`, `vite`, `vitest` all need it). `npm run` invokes the shell script; no Node code is added. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `bash` shell script | TypeScript + `tsx` (e.g., `src/scripts/i18n-audit.ts`) | Type-safe, vitest-reusable. BUT: a vitest-style audit is exactly the "CI guardrail test" that REQUIREMENTS.md explicitly puts Out-of-Scope. A node-ts script also adds a new build/run pathway just to wrap two grep commands. Shell is the cleanest fit. |
| `bash` | POSIX `sh` (`#!/bin/sh`) | More portable, but D-02 exclusion list has enough cases that arrays and `[[ ... ]]` (bash) read cleaner than positional-arg gymnastics. macOS `/bin/sh` is bash-in-POSIX-mode anyway; Linux `/bin/sh` is dash. Using `bash` explicitly via `#!/usr/bin/env bash` avoids the dash-vs-bash class of bugs. |
| `grep` | `ripgrep` (`rg`) | `rg` is faster but D-03 names `grep`. If the planner picks `rg`, the audit report must document the deviation and the maintainer of the script must verify both produce identical hit sets. Recommend `grep` for fidelity to D-03. |
| New directory `src/scripts/` | `scripts/` at repo root | `src/scripts/` keeps the script next to the source it audits and matches the `src/`-as-application-root convention (the project uses `src/` for everything, not a monorepo split — see `STRUCTURE.md`). `package.json` is in `src/` too, so the `npm run audit:i18n` script can use a relative path. |

**Installation:**

No new dependencies. The script uses tools already present on every supported dev environment (`bash`, `grep`).

**Version verification:**

```bash
bash --version | head -1    # macOS: GNU bash 3.2.57 / Linux: 5.x
grep --version | head -1     # GNU grep 3.x on Linux, BSD grep on macOS (compatible flags: -r, -E, --include, --exclude)
```

Tested on this machine:
- bash: GNU bash 5.x (Ubuntu 24.04)
- grep: ugrep 7.5.0 (GNU-compatible mode on this system) — `-rE` and `--include` confirmed working.

**Compatibility caveat (HIGH confidence):** macOS ships BSD grep, which supports `-r`, `-E`, `--include`, `--exclude` but not `-P` (PCRE). The locked D-03 regexes use only POSIX-ERE features (character classes, alternation, `\b`), so they work in both GNU and BSD grep. Do NOT introduce `-P` flags.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Phase 19 Deliverable: Audit Pipeline                                    │
└─────────────────────────────────────────────────────────────────────────┘

  Developer
     │
     │ npm run audit:i18n  ──────► src/scripts/i18n-audit.sh
     │                                       │
     │                                       ├─► Pass 1: Accent regex
     │                                       │     LC_ALL=C grep -rE
     │                                       │       "[áàâã...]"
     │                                       │       src/ --include="*.ts" --include="*.html"
     │                                       │       (with D-02 --exclude patterns)
     │                                       │
     │                                       ├─► Pass 2: Token regex
     │                                       │     LC_ALL=C grep -rEi
     │                                       │       "\b(editar|excluir|...)\b"
     │                                       │       (same surface set)
     │                                       │
     │                                       └─► Combined exit code
     │                                             0  → "Audit clean — no PT strings."
     │                                             1  → list of matches (file:line:text)
     │
     │ npm run dev    ──────────► Fastify (3000) + Vite (3001)
     │                                       │
     │  Manual walkthrough                   │
     │  per page × role × interaction        ▼
     │  matrix in 19-AUDIT.md          Running app
     │                                  - Toasts fire on 4xx
     │                                  - Modals show heading + body
     │                                  - aria-label / title visible
     │                                  - placeholder visible in inputs
     │
     ▼
  Records:
   - Script invocation + output ──► 19-AUDIT.md § "Automated Pass"
   - Walkthrough sign-off ────────► 19-AUDIT.md § "Manual Pass" (checkbox per row)
   - Findings ────────────────────► 19-AUDIT.md § "Findings" (expected: "None")
   - Phase closure ───────────────► 19-VERIFICATION.md (appended at phase-verify)
```

### Recommended Project Structure

```
src/
├── scripts/                       # NEW DIRECTORY — Phase 19
│   └── i18n-audit.sh              # The audit script (executable, +x)
├── package.json                   # Add scripts."audit:i18n"
└── … (existing layout unchanged)

.planning/phases/19-internationalization-sweep/
├── 19-CONTEXT.md                  # Already exists
├── 19-DISCUSSION-LOG.md           # Already exists
├── 19-RESEARCH.md                 # This file
├── 19-PLAN.md                     # TBD — produced by plan-phase
├── 19-AUDIT.md                    # The audit report (NEW — written during execute-phase)
└── 19-VERIFICATION.md             # Closure note appended at phase-verify time
```

**Why `src/scripts/`:**
- Matches `src/`-as-application-root convention (see `STRUCTURE.md` — `src/` is the single source root for both frontend and backend).
- Sibling to `src/api/`, `src/utils/`, `src/server/` — predictable location for developer tooling.
- Below `src/`, so `npm run audit:i18n` can use `./scripts/i18n-audit.sh` as a relative path from `src/package.json`'s cwd.
- The new directory does NOT need `.gitignore` / `.eslintignore` updates (verified: `src/.gitignore` only excludes `node_modules`, `dist`, `*.js.map`, `.env`, `data/`, `server/dist/`; no `src/.eslintignore` exists; eslint config restricts to `**/*.ts` so `.sh` is invisible to lint; `src/tsconfig.json` `include: ["**/*.ts"]` ignores `.sh`).

### Pattern 1: Two-Pass Grep with Honest Exit Codes

**What:** Run the D-03 accent regex first, then the D-03 token regex, accumulating hits. Print all hits; exit `0` only if both passes are empty.

**When to use:** This is the only shape that matches D-03's two-pass methodology exactly.

**Example (pseudocode for plan-phase to refine):**

```bash
#!/usr/bin/env bash
# src/scripts/i18n-audit.sh — Phase 19 / I18N-01 / I18N-02
# Re-runnable. Exits 0 on clean, 1 on any PT match.
# DO NOT wire into npm test / lint / pre-commit (CONTEXT.md D-06).

set -u

# Resolve src/ root (script lives in src/scripts/, audit target is src/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# D-02 exclusions: tests, build output, vendor docs
# (`.planning/`, `.docs/`, `docs/`, `.TODO.md`, README.md are outside src/, so already out of scope)
EXCLUDES=(
    --include="*.ts"
    --include="*.html"
    --exclude="*.test.ts"
    --exclude-dir="dist"
    --exclude-dir="node_modules"
)

# D-03 Pass 1 — PT accent class (case-sensitive — the regex covers both cases explicitly)
ACCENT_RE='[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]'

# D-03 Pass 2 — PT token list. Locked seed from CONTEXT.md D-03 + three additions justified
# in 19-RESEARCH.md § "PT Token List Audit".
TOKEN_RE='\b(editar|excluir|salvar|cancelar|adicionar|aguarde|carregar|carregando|sair|entrar|voltar|pr[oó]ximo|anterior|pesquisar|buscar|mostrando|nenhum|vazio|confirmar|a[cç][õo]es|sucesso|aviso|usu[aá]rio|senha|pendente|conex[aã]o|inv[aá]lido|obrigat[oó]rio|falha|conectado|desconectado|rede|membro|gerenciar|administrador|configura[cç]|controlador|painel|in[íi]cio|recarregar|sincronizar|enviar|selecionar)\b'

hits=0

echo "Pass 1: accent class"
if LC_ALL=C grep -rE "${ACCENT_RE}" "${SRC_ROOT}" "${EXCLUDES[@]}"; then
    hits=1
fi

echo "Pass 2: PT token list"
if LC_ALL=C grep -rEi "${TOKEN_RE}" "${SRC_ROOT}" "${EXCLUDES[@]}"; then
    hits=1
fi

if [ "${hits}" -eq 0 ]; then
    echo "Audit clean — no PT strings found in src/ under D-01/D-02 filters."
    exit 0
fi
echo "Audit FAILED — see hits above. Fix per D-08 (inline replacement)."
exit 1
```

**Notes for plan-phase:**
- The exact wording, comments, and section dividers are plan-phase's call. The shape above is a confidence-anchor; treat it as a starting point.
- `console.*` and `fastify.log.*` payloads are NOT excluded by file pattern — those are call-site exclusions inside source files that *are* in scope. The audit relies on the fact that **English** is the existing convention for those payloads (verified: 3 `console.*` sites, all English; 2 `fastify.log.*` sites, both English audit-log entries). If a PT string is ever introduced inside a `console.*` or `fastify.log.*` call, it WILL fire the audit — which is technically a false positive under D-02. Plan-phase has two options: (a) accept this as overly-cautious (recommended — false positives are easy to triage), or (b) add a more granular `-v` filter step. Option (a) is the simpler and recommended choice.
- The script uses `LC_ALL=C` per the D-03 regex prefix — this forces grep to treat input bytes as raw bytes, which is the correct mode for matching multi-byte UTF-8 accent characters via the byte-range character class.

### Pattern 2: Inline Replacement Convention (only if hit fires)

**What:** When a PT string is found, replace it at the call site with English copy that matches the existing pattern for that surface.

**When to use:** Only if the script fails — expected: never. Documented for completeness.

**Examples (from existing English copy in the codebase):**

```typescript
// Lit button (imperative): src/pages/setup.ts:441
<button ...>${this.loading ? html`<span class="spinner"></span>` : 'Continue →'}</button>

// Toast success (sentence-case): src/pages/network-detail.ts:451
toastService.success('Network configuration updated');

// Toast error (sentence-case, Failed-to-X pattern): src/pages/network-detail.ts:456
toastService.error('Failed to update network configuration');

// Server validation error (noun-first): src/server/routes/setup.ts:56
return reply.code(409).send({ error: 'Username already exists' });

// Server route validation (noun-first, specific): src/server/routes/zt-proxy.ts:91
return reply.code(400).send({ error: 'Invalid network ID format' });

// IP-validator return value: src/server/routes/member-ip-validator.ts:142
return { ok: false, error: "IP address is outside the network's managed routes", ... };

// Empty-state default: src/components/empty-state.ts:10
@property({ type: String }) heading = 'No data';

// Status text: src/components/navbar.ts:190
<span class="status-label">${this.connected ? 'Connected' : 'Disconnected'}</span>

// aria-label: src/components/navbar.ts:174
aria-label="Log out"
```

### Anti-Patterns to Avoid

- **Don't introduce a central `strings.ts` / dictionary helper.** Locked by D-08. The convention is co-located inline literals.
- **Don't add `i18next`, `lit-translate`, or any i18n framework.** Locked Out-of-Scope.
- **Don't write a vitest equivalent of the shell script.** That IS the "CI guardrail test" locked Out-of-Scope.
- **Don't edit `.TODO.md`.** Locked by D-10.
- **Don't shell out to `rg` instead of `grep`.** Reduces fidelity to D-03 and forces the report to document a deviation.
- **Don't use BSD grep-incompatible flags** (`-P`, `--perl-regexp`). The locked regex uses only POSIX-ERE; keep it that way so the script runs on macOS without modification.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| String matching across files | A bespoke Node script that walks `src/` and runs custom matchers | `grep -rE` with `--include` / `--exclude` | grep is decades-tuned, handles binary-detection, gitignore-style exclusions, and has predictable exit codes. The D-03 commands are already a complete spec. |
| PT-string detection at runtime | A vitest test that scans rendered DOM | A manual walkthrough of `npm run dev` | The walkthrough exercises the real toast/modal/error code paths. A vitest equivalent is OOS per REQUIREMENTS.md. |
| Audit report format | A custom JSON / YAML schema | Plain markdown with headings + checkbox tables | Matches `.planning/phases/*` convention; readable in any editor; greppable. |
| "Continue if no hits, fail if hits" exit semantics | A custom result aggregator | Two `grep` invocations + a counter | grep already returns 0/1/2 with documented meaning. The script just needs to OR the two results and print a banner. |

**Key insight:** Phase 19's audit is so well-scoped — two regexes, three deliverables, ten constraints — that almost any extra machinery is over-engineering. Resist the urge to add abstraction layers.

## Runtime State Inventory

> This phase is **NOT** a rename / refactor / migration. No runtime state to inventory.
> The audit operates on source files at rest; the manual walkthrough operates on a fresh `npm run dev` boot.
> If the fallback fix strategy (D-08) fires for a server-side error string, that string is read from source — there is no cached PT string in the SQLite database, the session store, or any external service.

Section skipped per researcher template guidance ("Include this section for rename/refactor/migration phases only").

## Audit Script Shape (PRESCRIPTIVE)

### Decision: `bash`, not `sh` or `node-ts`

**Recommendation:** `#!/usr/bin/env bash`, GNU-grep-compatible flags only, POSIX-ERE regex.

**Why bash:**
- D-02 exclusion list is large enough that bash arrays are cleaner than `sh` positional juggling.
- macOS `/bin/sh` is bash-in-POSIX-mode (3.2), Linux `/bin/sh` is `dash`. Using `#!/usr/bin/env bash` avoids the dash-vs-bash class of bugs (`[[`, arrays, `local` keyword inside functions).
- Verified portability: bash 3.2+ supports every feature in the proposed script (arrays, `set -u`, `[ ... ]`).

**Why not node-ts:**
- A node-ts script with a `describe(...) / it(...)` runner shape IS a vitest test — and a vitest test for PT-string-zero is the OOS "CI guardrail" item. Even a non-vitest node script crosses the line into "build a tool" rather than "wrap two grep commands."
- Adds a new build/run pathway to maintain.

**Why not plain `sh`:**
- The portability win (POSIX `sh` runs on systems without bash) doesn't apply here — every supported dev environment has bash (Linux, macOS, WSL, Codespaces).

### Invocation contract

```bash
# Direct
bash src/scripts/i18n-audit.sh
# OR (after chmod +x)
./src/scripts/i18n-audit.sh

# Via npm (recommended, D-06)
cd src && npm run audit:i18n
```

**Exit codes:**
- `0` — both passes empty; audit clean.
- `1` — one or more passes printed at least one hit; the report must list every hit verbatim.

### File location

Path: `src/scripts/i18n-audit.sh`
Permissions: `0755` (executable). Plan-phase should include `chmod +x` in the task verification step.

### npm-script wiring (D-06 compliant)

Add to `src/package.json` `scripts` (current list verified: `dev`, `dev:server`, `dev:client`, `build`, `start`, `preview`, `lint`, `format`, `test`, `test:watch`):

```json
"audit:i18n": "bash scripts/i18n-audit.sh"
```

**Verification that D-06 is honored:**
- `test` runs `vitest run` — no change.
- `lint` runs `eslint . --ext .ts` — `.sh` is invisible to lint; no change.
- `build` runs `tsc && vite build && tsc -p server/tsconfig.json` — `tsconfig.json` `include: ["**/*.ts"]` ignores `.sh`; no change.
- No `prepare` / `prepublish` / `pre-commit` hook exists in `src/package.json` — no risk of accidental invocation.
- `npm install` does NOT invoke the script — confirmed by absence of `preinstall` / `postinstall` hooks in `src/package.json`.

The script is therefore opt-in only, satisfying D-06.

## PT Token List Audit

### D-03 seed list — verified sufficient

CONTEXT.md D-03 locks 40 tokens. The researcher reviewed each in terms of (a) is it the canonical Portuguese form a developer writing PT text in this codebase would use, and (b) does it overlap with common English words (false-positive risk).

**No removals.** Every seed token is well-chosen for the domain (admin / SPA / ZeroTier).

**Three additions recommended (HIGH confidence):**

| Token | Why add | Where it would appear |
|-------|---------|----------------------|
| `carregando` | The PT present-progressive of "loading" — the literal text on a spinner / loading state. The seed has `aguarde` (wait) and `carregar` (load infinitive), but the most idiomatic loading-screen text is `Carregando…`. The seed misses this exact form. | `<zt-loading>` overlay text, `loading={...}` template branches |
| `enviar` | "Submit / send" — the imperative button text on forms. The seed has `salvar` (save), `confirmar` (confirm), `cancelar`, but not the form-submit verb. | Login form Submit button, Setup wizard step continue, contact-like forms |
| `selecionar` | "Select" — common in dropdown placeholders and multi-select toolbars. The seed has nothing equivalent. | `<select>` first-option text, batch-action toolbars |

**False-positive review:** None of `carregando`, `enviar`, `selecionar` overlap with common English identifiers or technical terms in this codebase. Verified by running each as a case-insensitive `\bword\b` search against `src/` — zero hits.

**No tokens removed.** Removing seed tokens would weaken the audit; D-03 explicitly allows extension but requires justification for removal.

### Final token list (for plan-phase to encode verbatim in the script)

`editar | excluir | salvar | cancelar | adicionar | aguarde | carregar | carregando | sair | entrar | voltar | pr[oó]ximo | anterior | pesquisar | buscar | mostrando | nenhum | vazio | confirmar | a[cç][õo]es | sucesso | aviso | usu[aá]rio | senha | pendente | conex[aã]o | inv[aá]lido | obrigat[oó]rio | falha | conectado | desconectado | rede | membro | gerenciar | administrador | configura[cç] | controlador | painel | in[íi]cio | recarregar | sincronizar | enviar | selecionar`

(40 seed + 3 added = 43 tokens.)

### Independent re-verification (HIGH confidence)

The researcher re-ran the locked D-03 regexes on 2026-05-11 against the current `src/` tree:

**Accent regex result:**
- 1 hit: `src/server/auth/username.test.ts:78` — `'café'` — D-02 excluded (test fixture).
- 0 hits in non-test code.

**Token regex result:**
- 1 hit: `src/pages/network-detail.test.ts` — the word `Editar` inside a comment (`// Open the modal by setting state directly (equivalent to clicking Editar).`) — D-02 excluded (test file + comment).
- 0 hits in non-test code.

**Conclusion:** Scout's "zero PT strings" finding is confirmed. The script is expected to exit `0` on first run. Phase 19 is verify-and-close.

## Audit Report Template

`19-AUDIT.md` skeleton for plan-phase to consume verbatim:

```markdown
# Phase 19: Internationalization Sweep — Audit Report

**Audit Date:** YYYY-MM-DD
**Auditor:** {name or "Claude Code (gsd-executor)"}
**Outcome:** {Clean | Findings — see § Findings}
**Closes Requirements:** I18N-01, I18N-02

## Scope (per 19-CONTEXT.md D-01)

In scope:
- Lit templates (`html\`…\``) in `src/pages/*.ts` and `src/components/*.ts`
- Reactive `@property` / `@state` initial values that render as text
- Toast and log call-site message strings across `src/`
- Validation error strings in `src/server/auth/*.ts` and `src/server/routes/member-ip-validator.ts`
- Server response `error` / `message` / `details` fields in `src/server/routes/*.ts`
- Accessibility attributes: `aria-label`, `aria-description`, `title`, `placeholder`, `alt`

Out of scope (per 19-CONTEXT.md D-02):
- `console.log` / `console.warn` / `console.error` payloads
- `fastify.log.*` audit-log message strings
- Comments and JSDoc
- `*.test.ts` files
- `.planning/`, `.docs/`, `docs/`, `README.md`, `.TODO.md`

## Methodology (per 19-CONTEXT.md D-03 / D-04)

Two-pass audit:
1. Automated grep — `src/scripts/i18n-audit.sh` runs the locked accent-class regex and the locked PT token-list regex (43 tokens; seed list extended by `carregando`, `enviar`, `selecionar` per 19-RESEARCH.md § "PT Token List Audit").
2. Manual page-by-role walkthrough on the running app (`cd src && npm run dev`), exercising real toast and 4xx error paths.

## Automated Pass — Script Invocation

```bash
cd src
npm run audit:i18n
```

Output (verbatim):

```
{paste the actual output here, including the "Pass 1 / Pass 2" banners and either grep hits or the "Audit clean" line}
```

Exit code: `{0|1}`

## Manual Pass — Walkthrough Sign-off

Roles tested:
- [ ] Admin
- [ ] Operator
- [ ] Viewer
- [ ] Unauthenticated (login + setup screens only)

Each row below has been visually confirmed against the running app at `http://localhost:3001`.

| Page | Role | Interaction | English-only confirmed |
|------|------|-------------|-----------------------|
| /login | Unauthenticated | Render login form | [ ] |
| /login | Unauthenticated | Submit empty form (fires inline error) | [ ] |
| /login | Unauthenticated | Submit wrong password (fires toast / inline 401 error) | [ ] |
| /setup | Unauthenticated (first run) | Render step 1 (admin creation) | [ ] |
| /setup | Unauthenticated (first run) | Submit weak password (fires inline error) | [ ] |
| /setup | Unauthenticated (first run) | Render step 2 (ZT controller) | [ ] |
| /setup | Unauthenticated (first run) | Test connection (fires Connection Test modal) | [ ] |
| /dashboard | Admin | Render loaded dashboard (stats, recent networks, controller info) | [ ] |
| /dashboard | Admin | Render with empty controller (no networks state) | [ ] |
| /dashboard | Operator | Render loaded dashboard | [ ] |
| /dashboard | Viewer | Render loaded dashboard | [ ] |
| /networks | Admin | Render networks table | [ ] |
| /networks | Admin | Open "Add Network" modal, render form | [ ] |
| /networks | Admin | Submit network create — success toast | [ ] |
| /networks | Admin | Submit network create with duplicate name — error toast | [ ] |
| /networks | Operator | Render networks table (no Delete button visible) | [ ] |
| /networks | Viewer | Render networks table (no Create button visible) | [ ] |
| /networks/:id | Admin | Render Status, Members, Settings sections | [ ] |
| /networks/:id | Admin | Open Edit-Network modal | [ ] |
| /networks/:id | Admin | Submit Edit-Network — success toast | [ ] |
| /networks/:id | Admin | Open Delete-Network modal — confirm + cancel buttons | [ ] |
| /networks/:id | Admin | Member row: open IP chip-editor modal | [ ] |
| /networks/:id | Admin | IP chip-editor: type invalid IP — inline error fires | [ ] |
| /networks/:id | Admin | IP chip-editor: type out-of-route IP — 400 error toast (`'IP address is outside the network's managed routes'`) | [ ] |
| /networks/:id | Admin | IP chip-editor: type duplicate IP — 409 toast (`'IP address is already assigned to another member of this network'`) | [ ] |
| /networks/:id | Admin | Batch-authorize selected members — modal + success toast | [ ] |
| /networks/:id | Admin | Search members ("Showing N of M") | [ ] |
| /networks/:id | Admin | Empty filter state (no matches) | [ ] |
| /networks/:id | Operator | Render network detail (Delete-Network button hidden) | [ ] |
| /networks/:id | Viewer | Render network detail (Edit + Delete buttons hidden) | [ ] |
| /members | Admin | Render all-networks member roll-up | [ ] |
| /members | Operator | Render members roll-up | [ ] |
| /members | Viewer | Render members roll-up | [ ] |
| /pending | Admin | Render pending groups + empty state ("All clear") | [ ] |
| /pending | Operator | Render pending groups | [ ] |
| /pending | Viewer | Render pending groups | [ ] |
| /controllers | Admin | Render controller + peer status | [ ] |
| /controllers | Operator | Render controller + peer status | [ ] |
| /controllers | Viewer | Render controller + peer status | [ ] |
| /users | Admin | Render users table | [ ] |
| /users | Admin | Open "Add User" modal | [ ] |
| /users | Admin | Create user — success toast + credential modal | [ ] |
| /users | Admin | Create user with duplicate username — error toast (`'Username already exists'`) | [ ] |
| /users | Admin | Open "Edit User" modal | [ ] |
| /users | Admin | Edit user — rename to existing username — error toast | [ ] |
| /users | Admin | Open "Reset Password" modal | [ ] |
| /users | Admin | Open "Delete User" modal (cannot-delete-self path: confirm last-admin guard fires) | [ ] |
| /users | Operator | Route redirects to /dashboard | [ ] |
| /users | Viewer | Route redirects to /dashboard | [ ] |
| /settings | Admin | Render preferences (change-password form) | [ ] |
| /settings | Admin | Change password — success toast | [ ] |
| /settings | Admin | Change password with wrong current — error toast | [ ] |
| /settings | Operator | Render preferences | [ ] |
| /settings | Viewer | Render preferences | [ ] |
| /logs | Admin | Render in-memory log entries (varied levels) | [ ] |
| /logs | Admin | Empty state (no entries) | [ ] |
| /logs | Operator | Render log entries | [ ] |
| /logs | Viewer | Render log entries | [ ] |
| /api | Admin | Render API Explorer | [ ] |
| /api | Admin | Submit GET request — response panel | [ ] |
| /api | Admin | Submit DELETE — confirm-modal heading "Confirm DELETE Request" | [ ] |
| /api | Operator | Render API Explorer (operator-allowed) | [ ] |
| /api | Viewer | Route redirects to /dashboard | [ ] |
| (shell) | Any | Sidebar nav labels (Overview / Management / Tools / System sections; Dashboard / Networks / Members / Pending / User Management / API Explorer / Logs / Controllers / Preferences) | [ ] |
| (shell) | Any | Navbar status indicator ("Connected" / "Disconnected") | [ ] |
| (shell) | Any | Navbar log-out button (aria-label / title "Log out") | [ ] |
| (shell) | Any | Navbar theme-toggle button (aria-label / title "Switch to light/dark theme") | [ ] |
| (shell) | Any | Toast dismiss button (aria-label "Dismiss notification") | [ ] |
| (shell) | Any | Modal close button (aria-label "Close dialog") | [ ] |

## Findings

{One of:}

**Clean.** Both grep passes returned zero hits; every walkthrough row visually confirmed English. Phase 19 closes I18N-01 and I18N-02 with no source changes required.

— OR —

**Findings:**

| # | Location | Found String | Replacement (per D-08 / D-09) | Fixed in commit |
|---|----------|--------------|-------------------------------|----------------|
| 1 | `src/pages/foo.ts:NNN` | `'Salvar'` | `'Save'` | {sha} |
| ... |

## Sign-off

- Audit script run: YYYY-MM-DD HH:MM
- Walkthrough completed: YYYY-MM-DD HH:MM
- Signed off by: {gsd-executor / human reviewer}

---
*Audit performed per 19-CONTEXT.md D-03 / D-04. Re-run with `cd src && npm run audit:i18n` at any time.*
```

**Notes for plan-phase:**
- The walkthrough matrix above has **69 rows**. Plan-phase may collapse the role dimension where role doesn't change rendered text (e.g., /logs renders the same content for all three roles — could collapse the three rows to one "all roles" row). Recommendation: keep them separate; the explicit per-role row is a forcing function to actually test each role rather than assume they all render identically.
- Some rows require seeding test data (e.g., duplicate usernames, out-of-route IPs). Plan-phase should call this out as a prerequisite.

## Walkthrough Matrix (Reference)

Pages enumerated from `src/router/index.ts:37-156` (one row per route + the unauthenticated shells `/login` and `/setup`):

| Page | Path | Roles reachable | Why |
|------|------|----------------|-----|
| Login | `/login` | unauth | pre-auth gate |
| Setup | `/setup` | unauth (first-run) | pre-auth, only when no admin row exists |
| Dashboard | `/dashboard` | Admin, Operator, Viewer | redirect target from `/` |
| Networks list | `/networks` | Admin, Operator, Viewer | Viewer reads, Operator/Admin write |
| Network detail | `/networks/:id` | Admin, Operator, Viewer | Viewer reads, Operator edits, Admin deletes |
| Members roll-up | `/members` | Admin, Operator, Viewer | all-roles read |
| Controllers | `/controllers` | Admin, Operator, Viewer | all-roles read |
| Pending | `/pending` | Admin, Operator, Viewer | Operator/Admin can authorize; Viewer reads |
| Users | `/users` | Admin **only** | `hasRole('admin')` redirect at `src/router/index.ts:146` |
| Settings | `/settings` | Admin, Operator, Viewer | all-roles (own password change) |
| Logs | `/logs` | Admin, Operator, Viewer | all-roles read |
| API Explorer | `/api` | Admin, Operator | `canAccessApiExplorer()` = `hasRole('operator')`, `src/services/user-service.ts:51`; Viewer redirects |

Role hierarchy: `admin (3) > operator (2) > viewer (1)`, source: `src/server/auth/rbac.ts:3-9` and mirrored client-side in `src/services/user-service.ts:1-9`.

**Sidebar nav labels** (`src/components/sidebar.ts:135-150`) — these are rendered text and MUST be in the audit:
- Section headings: `'Overview'`, `'Management'`, `'Tools'`, `'System'`
- Items (filtered by role): `'Dashboard'`, `'Networks'`, `'Members'`, `'Pending'`, `'User Management'` (admin), `'API Explorer'` (operator+), `'Logs'`, `'Controllers'`, `'Preferences'`

**Modal headings** (`heading="..."` attribute on `<zt-modal>`):
- `network-detail.ts:856` → `"Delete Network"`
- `network-detail.ts:872` → `"Authorize Members"` / `"Deauthorize Members"` (dynamic)
- `network-detail.ts:892` → `"Edit Network Configuration"`
- `network-detail.ts:968` → `"Edit Managed IPs"`
- `users.ts:549` → `"Add User"`
- `users.ts:579` → `${this.credentialHeading}` (interpolated — walkthrough must see both "User Created" and "Password Reset" variants)
- `users.ts:603` → `"Edit User"`
- `users.ts:637` → `"Reset Password"`
- `users.ts:650` → `"Delete User"`
- `setup.ts:517` → `"Connection Test"`
- `api-explorer.ts:300` → `"Confirm ${this.method} Request"` (interpolated)
- `networks.ts:183` → (verify in source) — Add Network modal

**Placeholders** (input fields, must be confirmed English):
- `network-detail.ts:808` → `"Search by name, ID, or IP…"`
- `network-detail.ts:930-951` → CIDR / IP-range examples (literal IPs, no PT risk)
- `setup.ts:396-485` → Username, password, confirm-password, URL, token placeholders
- `ip-chip-editor.ts:252` → `"Add IP…"`
- `networks.ts:193-234` → network create form placeholders
- `users.ts:552` → `"e.g. john_doe"`
- `login.ts:201-213` → `"Enter your username"` / `"Enter your password"`
- `api-explorer.ts:261` → `'{"name": "my-network"}'` (JSON literal, no PT risk)

**aria-label / title** (must be confirmed English):
- `navbar.ts:174-184` → `"Log out"`, `"Switch to light/dark theme"`
- `toast.ts:176` → `"Dismiss notification"`
- `modal.ts:103` → `"Close dialog"`
- `ip-chip-editor.ts:242-265` → `"Remove IP X"`, `"Add IP address"`, `"Remove last IP?"`
- `network-detail.ts:525,729,809` → `"Edit IPs"`, `"Copy network ID"`, `"Search members"`
- `data-table.ts:208,230` → `"Copy ${col.label or 'cell'} value"`, `"Edit ${col.label or 'cell'}"`
- `users.ts:144-162` → action-button aria-labels (Edit user / Cannot edit / Reset password / Delete user variants)

## Common Pitfalls

### Pitfall 1: Counting a comment as a hit
**What goes wrong:** The accent / token regex matches text inside a JSDoc or `//` comment.
**Why it happens:** D-02 excludes comments but the regex command doesn't strip them — exclusion is by file pattern only.
**How to avoid:** When a hit fires, immediately check whether the matched line is inside a comment. If yes, document in `19-AUDIT.md § Findings` as "comment exclusion (D-02) — not a defect" and move on. The audit script does NOT need a comment-stripping pass; the existing scout result confirms zero non-test, non-comment hits exist today.
**Warning signs:** Hit's line text starts with `//` or `/*` or is inside a JSDoc `/** ... */` block.

### Pitfall 2: Mistaking a test fixture for a real string
**What goes wrong:** The accent regex matches `'café'` inside `username.test.ts:78`.
**Why it happens:** `.test.ts` is excluded by `--exclude=*.test.ts`; without that flag, the regex would hit.
**How to avoid:** Make sure the `--exclude=*.test.ts` flag is in the audit script. Re-run from a fresh terminal to make sure.
**Warning signs:** A hit whose file name ends in `.test.ts`.

### Pitfall 3: `npm run dev` not actually started
**What goes wrong:** Walkthrough is performed against a stale build or an old Vite cache.
**Why it happens:** `npm run dev` runs concurrently `tsx watch server/index.ts` and `vite --port 3001`. If only one half is up, modal/error paths won't fire.
**How to avoid:** Confirm both `:3000` (Fastify) and `:3001` (Vite SPA) respond before starting the walkthrough. Run `curl -s localhost:3000/api/health` and `curl -s localhost:3001` and check both return content.
**Warning signs:** Toasts never fire on what should be a 4xx response; Network tab shows requests failing with ECONNREFUSED.

### Pitfall 4: Walkthrough done from a single role
**What goes wrong:** Tester logs in as admin and clicks every page, but never checks how the same page renders for Operator and Viewer.
**Why it happens:** Three-role hop is tedious; easy to skip.
**How to avoid:** The walkthrough table in `19-AUDIT.md` has one row per role. Each row is its own checkbox. Don't merge rows.
**Warning signs:** Sign-off was done in less than ~20 minutes — too fast to have rendered 3 roles × 12 pages × multiple interactions.

### Pitfall 5: Forgetting to fire 4xx error paths
**What goes wrong:** The walkthrough renders the happy path but never sees `'Username already exists'` or the IP-validator error strings.
**Why it happens:** The 4xx text is only visible when the user *causes* the error. A grep can't see if the error string is rendered correctly through `ApiError.message`.
**How to avoid:** Each `(error toast fires)` / `(inline error fires)` row in the walkthrough table explicitly names the trigger.
**Warning signs:** A `toastService.error(err.message)` call where `err.message` came from the server has never been seen rendered — that's the I18N-02 path.

### Pitfall 6: Re-running on a clean working tree before changes
**What goes wrong:** The audit script is run, returns clean, and the report is signed off — but the planner intended to modify some strings first.
**Why it happens:** This is verify-and-close. The expected outcome IS clean on first run. There is no "before" state to compare against.
**How to avoid:** This is by design. If the audit returns clean and the walkthrough is signed off, the phase closes. Document the outcome honestly in `19-AUDIT.md § Findings` ("Clean. No source changes required.").
**Warning signs:** None — this is the expected path.

## Code Examples

### Run the audit (POSIX)
```bash
# From repo root
cd src && npm run audit:i18n

# Or direct
bash src/scripts/i18n-audit.sh
```

### Verify the grep regexes work in isolation
```bash
# Pass 1 — accent class
LC_ALL=C grep -rE "[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]" src/ \
    --include="*.ts" --include="*.html" \
    --exclude="*.test.ts"

# Pass 2 — token list
LC_ALL=C grep -rEi '\b(editar|excluir|salvar|cancelar|adicionar|aguarde|carregar|carregando|sair|entrar|voltar|pr[oó]ximo|anterior|pesquisar|buscar|mostrando|nenhum|vazio|confirmar|a[cç][õo]es|sucesso|aviso|usu[aá]rio|senha|pendente|conex[aã]o|inv[aá]lido|obrigat[oó]rio|falha|conectado|desconectado|rede|membro|gerenciar|administrador|configura[cç]|controlador|painel|in[íi]cio|recarregar|sincronizar|enviar|selecionar)\b' \
    src/ --include="*.ts" --include="*.html" --exclude="*.test.ts"
```

Verified output as of 2026-05-11: both commands print zero lines and exit `1` (grep exits `1` when no match — meaning "audit clean" in shell-pipeline semantics, hence the script ORs the two passes and inverts).

### Inline-fix shape (only if hit fires — D-08)
```typescript
// BEFORE (hypothetical)
toastService.error('Falha ao atualizar rede');
// AFTER (D-09 sentence-case "Failed to X" convention)
toastService.error('Failed to update network');

// BEFORE (hypothetical server)
return reply.code(400).send({ error: 'Usuário inválido' });
// AFTER (D-09 noun-first server-error convention)
return reply.code(400).send({ error: 'Invalid username' });
```

### Add the npm script
```json
// src/package.json — append to "scripts"
{
  "scripts": {
    "...": "...",
    "audit:i18n": "bash scripts/i18n-audit.sh"
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| (none — Phase 19 is the first i18n-audit in this codebase) | Two-pass grep + manual walkthrough + verify-and-close audit report | Phase 19 (2026-05-11) | Establishes a re-runnable script developers can invoke any time; documents English-only as a project invariant. |
| Theoretical: vitest-based CI guardrail (like `theme-audit.test.ts` / `docs-audit.test.ts`) | Opt-in shell script | Locked Out-of-Scope by REQUIREMENTS.md / CONTEXT.md D-06 | Could be promoted in a future milestone if multi-language support is ever reconsidered. |

**Deprecated/outdated:** None — this is the first i18n-audit phase.

## Risk Surfaces & Landmines

(These are details plan-phase needs to write deep tasks. Cited with file:line.)

### 1. The ApiError → toast flow (I18N-02 critical path)

**File:** `src/api/http-client.ts:24-46`

```typescript
private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const error: ApiError = {
            status: response.status,
            message: response.statusText || `HTTP ${response.status}`,
        };
        try {
            const body = await response.json();
            error.body = body;
            if (body && typeof body === 'object') {
                if (typeof (body as { message?: unknown }).message === 'string') {
                    error.message = (body as { message: string }).message;
                } else if (typeof (body as { error?: unknown }).error === 'string') {
                    error.message = (body as { error: string }).error;
                }
            }
        } catch { /* no JSON body */ }
        throw error;
    }
    return response.json() as Promise<T>;
}
```

This is the single path through which every server-side error string reaches the UI. Page-level catches do `toastService.error('Failed to X', err.message)` — `err.message` is whatever the server put in `{error: ...}` or `{message: ...}`. The walkthrough MUST trigger 4xx code paths to see this happen live.

### 2. Validator return values surfaced as `err.message`

**Files:**
- `src/server/auth/username.ts:13-16` — `'Username must be at least 3 characters'`, `'Only letters, numbers, and underscores allowed'`
- `src/server/auth/password.ts:20-24` — 5 strings, all English, returned via `validation.errors[]` and sent as `details` array in `{error: 'Password too weak', details: validation.errors}` (`src/server/routes/setup.ts:45`, `src/server/routes/users.ts:220`)
- `src/server/routes/member-ip-validator.ts:132,142,153` — 3 strings, all English, surfaced through the chip-editor 400 path

The walkthrough must:
- Submit a username < 3 chars in the setup wizard → see "Username must be at least 3 characters"
- Submit a weak password during create-user → see "Password too weak" toast (note: `details` is an array; the toast renders `err.message` which is the top-level `'Password too weak'`)
- Submit an invalid IP in chip-editor → see "IP address is not a valid IPv4 or IPv6 literal" or out-of-route / collision variants

### 3. Static-text default props

**Files & defaults (verified English):**
- `src/components/empty-state.ts:10` — `heading = 'No data'`
- `src/components/data-table.ts:24` — `emptyMessage = 'No data'`

These render ONLY when a parent doesn't override the prop. The walkthrough hits them whenever a page renders with no rows (e.g., a network with no members, the pending page when nothing is pending).

### 4. The largest in-scope page: `network-detail.ts` (995 lines)

This page hosts 4 modals (Delete-Network, Batch-Confirm, Edit-Network, Edit-Managed-IPs), 1 chip-editor (`ip-chip-editor.ts`), 3 filter tabs (`All`, `Authorized`, `Pending`), 1 search box, and several inline toasts. It is the biggest single attack-surface for a hypothetical PT-string regression. The walkthrough table allocates ~10 rows to this page alone.

### 5. The chip-editor 400 / 409 path (I18N-02 + I18N-01 hybrid)

**Files:** `src/components/ip-chip-editor.ts` + `src/server/routes/zt-proxy.ts:166-198` + `src/server/routes/member-ip-validator.ts`

The chip-editor stays open after a server validation failure and renders the server's `err.message` inline. This is BOTH an I18N-01 path (the inline error span is UI text) AND an I18N-02 path (the text came from the server). The walkthrough must trigger:
- An invalid-format IP (malformed)
- An out-of-route IP (out-of-route)
- A duplicate IP (collision)

### 6. The unstable bulk-endpoint fallback (verified English)

**Files:** `src/services/network-service.ts:20-23`, `src/services/member-service.ts`

These services try the `/unstable/controller/network` endpoint first, then on any throw fall back to fan-out detail fetches. The fan-out failure surfaces `'Failed to load networks'` / `'Failed to load members'` toasts at the page level — verified English.

### 7. The IPv4-preferred Physical Address column with IPv6-only badge

**File:** `src/pages/network-detail.ts` (this exact column is referenced in `PROJECT.md` v3.0 D-11)

This is a custom badge with an inline label (verify in source — likely `'IPv6 only'` or similar). Plan-phase should include this in the walkthrough explicitly.

### 8. The 18-02 status-column version sub-line (recently added, 2026-05-11)

**File:** `src/pages/network-detail.ts` (rendered next to the online indicator per Phase 18)

The version sub-line shows the literal version string from the controller (e.g., `1.14.0`) OR a `—` placeholder when unknown. The placeholder is not language-bound; the surrounding label text needs to be confirmed English. This is the most recent UI change to the largest in-scope file; the walkthrough should explicitly look at it.

### 9. NOT a risk — but worth flagging

**`fastify.log.info(...)` audit-log strings** are excluded per D-02 — but if a future change moves one of those strings to a `reply.code(...).send({...})` payload (the I18N-02 surface), the audit must re-fire. Plan-phase doesn't need to do anything special here; the existing surface mapping (`server/routes/*.ts` IS audited) catches the case automatically.

## Project Constraints (from CLAUDE.md / project conventions)

- **Conventional Commits required** — all commits in ztcwm MUST follow `<type>(scope): subject` format (per user-memory MEMORY.md, 2026-05-04 onward). For Phase 19, expected commit shapes:
  - `feat(19): add i18n audit script and report scaffold` — adding `src/scripts/i18n-audit.sh` + `19-AUDIT.md`
  - `chore(19): wire npm run audit:i18n` — `src/package.json` addition
  - `docs(19): record audit findings (clean)` — completing `19-AUDIT.md` after walkthrough
  - `docs(19): close phase verification` — appending closure note to `19-VERIFICATION.md`
  - (Conditional, only if D-08 fires) `fix(i18n): replace PT string at <file>` — inline replacement
- **Code style** (from `.prettierrc` + `eslint.config.js`):
  - 4-space indent, single quotes, semis, trailing commas everywhere — applies to `.ts` only; the audit script is `.sh` and is invisible to lint/format.
  - The new `src/scripts/` directory will NOT be picked up by eslint (`**/*.ts` only) or by `tsc` (the `include: ["**/*.ts"]` glob matches files but the directory contains only `.sh`).
- **Co-located strings convention** — see `CONVENTIONS.md` § "Web Component Patterns" and § "Validation Patterns". D-08 preserves this.
- **No bespoke styling on buttons** — `.btn-*` system locked by v3.0 D (theme-audit.test.ts allow-list). Not relevant to Phase 19 but worth noting in case any inline fix touches a button.

## Validation Architecture

> `workflow.nyquist_validation: true` in `.planning/config.json` — section required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 + @open-wc/testing-helpers 3.0.1 + happy-dom 20.8.9 |
| Config file | `src/vitest.config.ts` (uses happy-dom env) |
| Quick run command | `cd src && npm test` (vitest run, ~671 tests, ~10s) |
| Full suite command | `cd src && npm test` (same — there is no separate full suite) |

The audit script itself is NOT a vitest test (D-06 / D-07). Validation here means:

1. **Audit script exit code** is the canonical "did the audit pass" signal — `exit 0` = audit clean.
2. **Existing test suites stay green** — SC #4 in ROADMAP.md.
3. **Manual walkthrough sign-off** — every row in the matrix has a checked checkbox in `19-AUDIT.md`.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| I18N-01 | Every visible UI string in SPA is English (Lit templates, modals, toasts, button labels, table headers, empty states, aria-labels, placeholders, titles, alts) | audit-script + manual | `cd src && npm run audit:i18n` (automated pass) + walkthrough sign-off in `19-AUDIT.md` (manual pass) | ❌ Wave 0 — both `src/scripts/i18n-audit.sh` and `19-AUDIT.md` are created during Phase 19 execution |
| I18N-02 | Every user-visible backend response message (validation errors, `{error}` / `{message}` / `{details}` fields in `src/server/routes/*.ts`, validator return values in `src/server/auth/*.ts` + `src/server/routes/member-ip-validator.ts`) is English | audit-script + manual | `cd src && npm run audit:i18n` (covers server route + validator source files) + walkthrough sign-off rows that explicitly exercise 4xx code paths | ❌ Wave 0 — same files as I18N-01 |
| ROADMAP SC #1 (no PT on any page) | Equivalent to I18N-01 — verified by both passes | audit + manual | (same as above) | (same) |
| ROADMAP SC #2 (server messages in English) | Equivalent to I18N-02 | audit + manual | (same as above) | (same) |
| ROADMAP SC #3 (no new i18n framework; inline literals only) | Static — no new `import` statement for `i18next`, `lit-translate`, etc. | manual | Plan-phase code-review and inspection of `src/package.json` diff (must not gain a new dep) | N/A (manual review) |
| ROADMAP SC #4 (existing test suites continue to pass) | Vitest assertion suite stays green | unit + integration | `cd src && npm test` | ✅ existing |

### Sampling Rate

- **Per task commit:** `cd src && npm test` (existing suite stays green, ~10s)
- **Per wave merge:** `cd src && npm test && cd src && npm run audit:i18n` (the audit added in this phase, plus existing suite)
- **Phase gate:** Full suite green + audit script exit 0 + every walkthrough row in `19-AUDIT.md` checked, before `/gsd-verify-work`

### Wave 0 Gaps

Files that don't exist yet and MUST be created during phase execution:

- [ ] `src/scripts/i18n-audit.sh` — the audit script (D-05.1)
- [ ] `.planning/phases/19-internationalization-sweep/19-AUDIT.md` — the audit report (D-05.2)
- [ ] `src/package.json` `scripts."audit:i18n"` entry — opt-in npm wiring (D-06 discretion)

**No new test files** — D-07 forbids them. Existing tests stay green per SC #4.

**Framework install:** none — `bash` and `grep` are system tools, already present on the dev machine.

## Sources

### Primary (HIGH confidence)

- `.planning/phases/19-internationalization-sweep/19-CONTEXT.md` — D-01..D-10 locked decisions. All sections above honor verbatim.
- `.planning/REQUIREMENTS.md` — I18N-01, I18N-02, Out-of-Scope row for "CI guardrail test" + "i18n framework"
- `.planning/ROADMAP.md` (Phase 19 row) — 4 success criteria
- `.planning/STATE.md` — Phase 19 entry, Phase 18 completion, scout-result-zero-PT-strings note
- `.planning/codebase/STRUCTURE.md` § "Directory Layout" — confirms `src/` is the single source root; `src/scripts/` is a viable sibling location
- `.planning/codebase/CONVENTIONS.md` § "Comments" + "Error Handling" + "Validation Patterns" — confirms co-located strings + noun-first server errors + sentence-case toast convention
- `.planning/codebase/INTEGRATIONS.md` § "Monitoring & Observability" + "Auth Provider" — confirms `fastify.log.*` is audit-log only (server logs not UI) and `bcrypt` validator strings flow through to client
- `src/api/http-client.ts:24-46` — `handleResponse` is the I18N-02 critical path
- `src/server/routes/{auth,setup,users,zt-proxy,zt-proxy-helpers,member-ip-validator}.ts` — 36 `error: '...'` literals, every one verified English on 2026-05-11
- `src/server/auth/{username,password}.ts` — validator strings, all verified English
- `src/router/index.ts:37-156` — full route list for the walkthrough matrix
- `src/components/sidebar.ts:135-150` — sidebar nav labels
- `src/components/navbar.ts:174-190` — Connected/Disconnected + aria-labels
- `src/components/empty-state.ts:10` + `src/components/data-table.ts:24` — default props that render
- `src/package.json:6-17` — existing scripts list (no `audit:i18n` yet; no `prepare`/`pre-commit`)
- `src/tsconfig.json` + `src/eslint.config.js` — confirm `.sh` files in `src/scripts/` are invisible to type-check and lint
- Direct execution on 2026-05-11 of both D-03 regexes against current `src/` — confirmed scout's zero-PT-strings finding

### Secondary (MEDIUM confidence)

- `grep --version` on this machine returns `ugrep 7.5.0` (GNU-compatible mode) — verified `-rE`, `--include`, `--exclude` work. macOS BSD-grep compatibility is asserted based on documented flag support; not independently re-verified on a macOS machine for this research session.

### Tertiary (LOW confidence)

- None. All claims are verified against either CONTEXT.md (locked) or live source files. The PT-token-list additions (`carregando`, `enviar`, `selecionar`) are recommendations grounded in (a) gaps in the seed list relative to PT idiom and (b) zero false-positive risk against the current `src/` tree; the additions are explicitly flagged as discretionary in CONTEXT.md.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | macOS BSD grep supports the `--include`, `--exclude`, `-rE` flags identically to GNU grep for the regex shapes used | Standard Stack — Compatibility Caveat | LOW — POSIX-ERE features only; widely documented as cross-compatible. If macOS grep fails on a flag, the script falls back to a one-line edit (e.g., switch `--include="*.ts"` to a `find ... -name "*.ts" | xargs grep` pipeline). |
| A2 | `npm run audit:i18n` opt-in wiring does NOT count as a "CI guardrail test" under REQUIREMENTS.md OOS | npm-script wiring | LOW — CONTEXT.md D-06 explicitly states the opt-in npm script is permitted. This research is repeating the locked decision, not making a new one. |

If both rows in this table remain LOW risk, planner can proceed without re-asking the user. No items need user confirmation before execution.

## Open Questions (RESOLVED)

1. **Does plan-phase want a `find … | xargs grep` shape or the `grep -r` shape?**
   - What we know: the locked D-03 commands use `grep -r` (recursive). Both forms produce the same hit set under the D-02 exclusions.
   - What's unclear: nothing functionally. The `-r` form is simpler.
   - RESOLVED: Recommendation: use `grep -r` (matches D-03 verbatim). The `find … | xargs grep` alternative is only useful if cross-shell quirks bite, which they shouldn't for these regexes.

2. **Should the script also run on `index.html`?**
   - What we know: D-01 enumerates Lit templates and accessibility metadata. `index.html` is the SPA boot HTML and contains the page `<title>ztcwm — ZeroTier Controller Web Manager</title>` and a comment-fenced `MIRROR-START`/`MIRROR-END` block of hex literals.
   - What's unclear: technically `index.html` ships to users (the `<title>` is in the browser tab), so it's user-visible.
   - RESOLVED: Recommendation: include `--include="*.html"` (matches D-03 verbatim — the locked regex already includes it). The fenced MIRROR block contains only `#NNNNNN` hex values, no PT risk. Verified.

3. **What if the manual walkthrough finds a PT string that the script doesn't?**
   - What we know: this is exactly why D-04 mandates the manual pass. A toast string that's correctly English in source but PT-translated by accident (e.g., via a runtime template-string interpolation pulling from a server `error` field that the audit missed) would only surface in the walkthrough.
   - What's unclear: scenario is hypothetical given scout finding.
   - RESOLVED: Recommendation: document the finding in `19-AUDIT.md § Findings` with the exact source line and apply D-08 (inline fix). Also note in the report that the script regex could be extended for similar future cases.

4. **Does the planner need to test the audit script itself (i.e., does it correctly fail when given a PT string)?**
   - What we know: D-07 forbids new `*.test.ts` for i18n.
   - What's unclear: a one-time manual sanity check (drop a PT string into a temp file, run script, see it fail, remove file) is not a `*.test.ts` and is not forbidden.
   - RESOLVED: Recommendation: plan-phase can optionally include a "smoke test" step where the executor briefly adds `// Salvar` to a non-test source file, runs the audit, confirms exit `1`, removes the comment, and runs again to confirm exit `0`. This proves the script is wired correctly. **But** even this is technically a D-02 comment exclusion, so the PT string would need to be in a real template literal. Or skip the smoke test entirely and trust the inline regex correctness — that's also acceptable.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| bash | `src/scripts/i18n-audit.sh` shebang | ✓ | GNU bash 5.x (Ubuntu) — also confirmed 3.2+ on macOS | — |
| grep | Two-pass audit | ✓ | ugrep 7.5.0 (GNU-compatible) on this machine; macOS BSD grep also supports the flags used | — |
| Node.js | `npm run audit:i18n` script host (already required by project) | ✓ | ≥20 (project requires; see existing `tsx` + `vite` deps) | — |
| npm | `package.json scripts."audit:i18n"` invoker | ✓ | bundled with Node | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

## Sources

(see above § Sources)

## Metadata

**Confidence breakdown:**
- Standard stack (bash + grep): HIGH — verified locally, GNU-compatible flags used, zero new deps
- Architecture (two-pass shell audit + manual walkthrough): HIGH — exactly mirrors locked D-03 / D-04 methodology
- Audit script shape (bash, POSIX-ERE, no PCRE): HIGH — verified on machine; locked regexes use only POSIX-ERE
- PT token list additions (3 tokens): HIGH — each justified, zero false positives against current `src/`
- Walkthrough matrix (69 rows): HIGH — derived from `src/router/index.ts` × `src/services/user-service.ts` role guards × verified rendered-text sites in source
- Pitfalls + risk surfaces: HIGH — every file:line reference verified in source on 2026-05-11
- Validation architecture: HIGH — nyquist_validation enabled in config; section structure follows template

**Research date:** 2026-05-11
**Valid until:** 2026-06-11 (30 days — phase is verify-and-close, low ecosystem dependency; only invalidated by major changes to `src/` that introduce new user-facing strings before phase execution)

---

*Phase: 19-internationalization-sweep*
*Research completed: 2026-05-11*
