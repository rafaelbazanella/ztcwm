# Phase 19: Internationalization Sweep — Pattern Map

**Mapped:** 2026-05-11
**Files analyzed:** 5 (2 always-create + 3 conditional-modify) plus 1 always-modify (`src/package.json`)
**Analogs found:** 6 / 6 (every surface has a real precedent in the codebase; one — the new `src/scripts/` shell — has only a partial-match precedent and is documented as such)

> **Inputs:** `.planning/phases/19-internationalization-sweep/19-CONTEXT.md` (D-01..D-10 LOCKED), `19-RESEARCH.md` (`#!/usr/bin/env bash` recommendation, npm-script wiring text `"audit:i18n": "bash scripts/i18n-audit.sh"`, 69-row walkthrough matrix, 43-token regex).
> **Out of scope (D-10):** `.TODO.md` — no analogs sourced from there.
> **Locked locations (D-05):** No alternative paths proposed; the script lives at `src/scripts/i18n-audit.sh`, the report at `.planning/phases/19-internationalization-sweep/19-AUDIT.md`.

## File Classification

| File (relative to repo root) | Action | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|---|
| `src/scripts/i18n-audit.sh` | CREATE | script (dev-tooling) | entry point (stdout + exit code) | `.docs/zerotier-one/update_controllers.sh` (vendored upstream `bash` script with arg-handling + arrayed loop) | **partial** — only `.sh` siblings in the repo are vendored ZeroTier ops scripts; no in-repo `src/`-tree precedent for a developer audit script. Cite for shebang and overall shape only. |
| `.planning/phases/19-internationalization-sweep/19-AUDIT.md` | CREATE | doc (phase artifact) | output report | `.planning/phases/18-member-zt-client-version/18-VERIFICATION.md` (closest *report-shape* analog: structured frontmatter, scope tables, sign-off section) plus `19-RESEARCH.md` § "Audit Report Template" (the **prescribed** skeleton) | **exact** for skeleton (RESEARCH provides it verbatim); **role-match** for frontmatter/sign-off precedent (18-VERIFICATION) |
| `src/package.json` (modify) | MODIFY | config | inline patch (one new key) | existing `scripts` block at lines 6-17 — sibling entries: `"test": "vitest run"`, `"lint": "eslint . --ext .ts"`, `"format": "prettier --write ..."` | **exact** — same JSON shape, same key style |
| `src/pages/*.ts` (conditional, only if D-08 fires) | MODIFY | source (Lit page) | inline patch (string literal at call site) | `src/pages/network-detail.ts:451,456` (toast Success/Error pair) — sentence-case English copy convention; `src/pages/setup.ts:441` (button label `'Continue →'`) — imperative button convention | **exact** — same surfaces D-09 anchors |
| `src/components/*.ts` (conditional) | MODIFY | source (Lit web component) | inline patch (`@property` default + Lit template literal) | `src/components/empty-state.ts:10` (`@property heading = 'No data'`); `src/components/data-table.ts:24` (`@property emptyMessage = 'No data'`); `src/components/navbar.ts:174,190` (`aria-label="Log out"` + `'Connected' / 'Disconnected'` status) | **exact** — covers the three component patterns D-01 enumerates (`@property` text default, Lit template body, `aria-label` / `title` accessibility) |
| `src/server/routes/*.ts` (conditional) | MODIFY | source (Fastify route handler) | inline patch (response body `error` / `details` field) | `src/server/routes/setup.ts:31,37,40,45,56,69,79,82` (noun-first English error literals); `src/server/routes/zt-proxy.ts:72,91,...` (`'Invalid network ID format'` / `'Invalid member ID format'`); `src/server/routes/member-ip-validator.ts:142` (validator return value: `error: "IP address is outside the network's managed routes"`) | **exact** — three D-01 surfaces (route handler `reply.code(...).send({ error })`, validator return object, multi-field response with `details`) |
| `src/server/auth/*.ts` (conditional) | MODIFY | source (validator) | inline patch (validator error string return) | `src/server/auth/username.ts`, `src/server/auth/password.ts` (CONTEXT lists these as in-scope; their existing English literals are the convention the audit verifies) | **role-match** — same file family; researcher confirmed all current returns are already English |

## Pattern Assignments

### `src/scripts/i18n-audit.sh` (script, entry point)

**Analog (shebang / structure only):** `.docs/zerotier-one/update_controllers.sh`

**Why this is only a partial match:** No in-repo `src/`-tree shell scripts exist today. The two `.sh` files in the repo (`cycle_controllers.sh`, `update_controllers.sh`) are vendored upstream ZeroTier ops scripts; they are not maintained by this project. **Treat as a precedent for shell-script *shape* only** — shebang, `set` flags, argument validation idiom. The **canonical specification** for `i18n-audit.sh` is `19-RESEARCH.md` § "Audit Script Shape (PRESCRIPTIVE)" lines 313-367 and § "Pattern 1: Two-Pass Grep with Honest Exit Codes" lines 192-241.

**Shebang pattern** (`.docs/zerotier-one/update_controllers.sh:1`):
```bash
#!/usr/bin/env bash
```
Use this exact shebang. RESEARCH § "Decision: `bash`, not `sh` or `node-ts`" (lines 315-330) locks the `bash`-not-`sh` choice; CONTEXT D-05.1 leaves shell flavor to plan-phase discretion within that constraint.

**Argument-validation idiom** (`.docs/zerotier-one/update_controllers.sh:3-8`):
```bash
if [ -z "$1" ]
then
    echo "Usage: $0 <docker_tag> <k8s_namespace>"
    echo "    k8s_namesapce is set to default if not specified"
    exit 1
fi
```
The new script takes **no arguments** (CONTEXT D-05.1 — re-runnable, exit 0/1). This excerpt is purely structural — confirms `[ -z ... ]` + `exit 1` is the established repo idiom.

**Core pattern — two-pass grep with honest exit codes** (from `19-RESEARCH.md` § "Pattern 1", lines 192-241, prescriptive skeleton):
```bash
#!/usr/bin/env bash
# src/scripts/i18n-audit.sh — Phase 19 / I18N-01 / I18N-02
# Re-runnable. Exits 0 on clean, 1 on any PT match.
# DO NOT wire into npm test / lint / pre-commit (CONTEXT.md D-06).

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

EXCLUDES=(
    --include="*.ts"
    --include="*.html"
    --exclude="*.test.ts"
    --exclude-dir="dist"
    --exclude-dir="node_modules"
)

ACCENT_RE='[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]'
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

**Hard constraints (planner MUST preserve):**
- `LC_ALL=C` prefix on both grep calls (CONTEXT D-03 + RESEARCH line 246).
- Accent regex character class **byte-identical** to CONTEXT D-03 (44-codepoint sequence above).
- Token regex contains all 40 CONTEXT D-03 seed tokens **plus** exactly three RESEARCH additions (`carregando`, `enviar`, `selecionar`).
- POSIX-ERE only — no `-P` / `--perl-regexp` (RESEARCH "Compatibility caveat", line 114).
- Permissions `0755` (chmod +x).

**Error handling pattern:** Two-tier — `set -u` traps undefined-variable bugs at run time; `hits=0/1` aggregator + final `exit ${hits}` is the only error-flow mechanism. Grep's own exit codes (0 = match, 1 = no match) are inverted from the script's semantic (1 = audit fail), which is why the `if grep ...; then hits=1; fi` wrapper exists. No `set -e` — would mask the no-match path (grep exits 1 when clean).

---

### `.planning/phases/19-internationalization-sweep/19-AUDIT.md` (doc, output report)

**Primary analog:** `19-RESEARCH.md` § "Audit Report Template" (lines 411-564) — this **IS** the skeleton; copy it verbatim, then fill in.

**Secondary analog (frontmatter / sign-off shape):** `.planning/phases/18-member-zt-client-version/18-VERIFICATION.md:1-8`

**Frontmatter pattern** (from `18-VERIFICATION.md:1-8`):
```markdown
---
phase: 18-member-zt-client-version
verified: 2026-05-11T00:00:00Z
status: passed
score: 4/4 success criteria verified
overrides_applied: 0
requirements_satisfied: [MEMBER-01, MEMBER-02]
---
```
For 19-AUDIT.md, adapt to the audit-report semantics (RESEARCH skeleton uses a simpler heading-style preamble with `**Audit Date:**`, `**Auditor:**`, `**Outcome:**`, `**Closes Requirements:**` — see RESEARCH lines 414-420). **Prefer the RESEARCH skeleton's heading-preamble form** over a YAML frontmatter; the verifier-style YAML belongs in `19-VERIFICATION.md` (a separate file per CONTEXT D-05.3) at phase-close time, not in `19-AUDIT.md`.

**Core skeleton (copy verbatim from RESEARCH lines 413-564):** Section order is `# Title` → `Scope` → `Methodology` → `Automated Pass — Script Invocation` → `Manual Pass — Walkthrough Sign-off` (69-row table) → `Findings` → `Sign-off`. Walkthrough table is the 69-row matrix at RESEARCH lines 469-540 — paste it; do not re-derive.

**Findings table shape (D-08 fallback)** (RESEARCH lines 549-555):
```markdown
| # | Location | Found String | Replacement (per D-08 / D-09) | Fixed in commit |
|---|----------|--------------|-------------------------------|----------------|
| 1 | `src/pages/foo.ts:NNN` | `'Salvar'` | `'Save'` | {sha} |
```

**Expected outcome (RESEARCH § "Independent re-verification", lines 397-407):** `Clean.` block fires, table is empty / replaced by the "Clean" prose.

---

### `src/package.json` (config, inline patch — single key addition)

**Analog:** `src/package.json:6-17` itself (existing scripts block — pattern is "add a JSON sibling to the existing `scripts` object").

**Existing scripts block** (`src/package.json:6-17`):
```json
"scripts": {
    "dev": "concurrently -k -n server,client -c blue,green \"tsx watch server/index.ts\" \"vite --port 3001 --open false\"",
    "dev:server": "tsx watch server/index.ts",
    "dev:client": "vite --port 3001",
    "build": "tsc && vite build && tsc -p server/tsconfig.json",
    "start": "NODE_ENV=production node server/dist/index.js",
    "preview": "vite preview",
    "lint": "eslint . --ext .ts",
    "format": "prettier --write \"**/*.{ts,html,css,json}\"",
    "test": "vitest run",
    "test:watch": "vitest"
},
```

**Patch shape** (locked by RESEARCH line 357):
```json
"audit:i18n": "bash scripts/i18n-audit.sh"
```

**Placement:** Append as the last entry (after `"test:watch"`). Indentation matches the existing 4-space style. **No trailing comma** before the closing `}` (JSON, not JSON5). Add a comma to the previous line (`"test:watch": "vitest"`).

**Why this preserves D-06 (NOT wired into CI):**
- `test`, `lint`, `build`, `start` are byte-unchanged.
- No `prepare` / `preinstall` / `postinstall` / `pre-commit` hook exists in `src/package.json` (verified — RESEARCH lines 360-365).
- The script is invoked **only** when a developer types `npm run audit:i18n` (D-06 compliant).

---

### `src/pages/*.ts` (conditional — only if D-08 fires)

**Status:** RESEARCH § "Independent re-verification" (lines 397-407) confirms zero non-test-file PT hits — this path is expected to be a no-op. Patterns below are the **inline replacement** convention for the fallback case.

**Analog 1 — toast success/error pair:** `src/pages/network-detail.ts:450-457`

```typescript
            await networkService.updateNetwork(this.networkId, update);
            toastService.success('Network configuration updated');
            logService.info(`Updated network ${this.networkId} configuration`);
            this.showEditNetwork = false;
            await this.loadData();
        } catch (err) {
            toastService.error('Failed to update network configuration');
            logService.error('Failed to update network config', String(err));
```

**Patterns to copy from this analog:**
- **Sentence-case toasts**, no trailing punctuation (`'Network configuration updated'`, not `'Network configuration updated.'`).
- **`Failed to <verb>` pattern** for error toasts (`'Failed to update network configuration'`).
- **Co-located string** — the literal lives at the call site; no helper, no constant, no central file. This is the D-08-locked convention.
- **`logService.*` parallel** — log message mirrors the toast wording but is not user-visible per D-02; do not change `logService.*` strings as part of the i18n audit unless they happen to be PT.

**Analog 2 — imperative button label:** `src/pages/setup.ts:436-442`

```typescript
                <button
                    class="btn btn-primary"
                    ?disabled=${!this._isStep2Valid() || this.loading}
                    @click=${() => this._handleStep2Continue()}
                >
                    ${this.loading ? html`<span class="spinner"></span>` : 'Continue →'}
                </button>
```

**Patterns to copy:**
- **Imperative form** (`'Continue →'`, `'Save'`, `'Cancel'`, `'Edit'`, `'Delete'` — D-09).
- **Loading-state ternary** — when `this.loading`, render a spinner; otherwise the label literal. PT replacement happens **only on the literal branch** — never on the spinner span.
- Glyph (`→`, `←`) preserved as-is on language change (it's not language-coded).

**Diff shape (if PT surfaces — hypothetical example):**
```diff
-                    ${this.loading ? html`<span class="spinner"></span>` : 'Continuar →'}
+                    ${this.loading ? html`<span class="spinner"></span>` : 'Continue →'}
```
One-line replacement at the literal; no surrounding code, no import changes, no test update *unless* a test asserted on the PT string (D-07: "if any test assertion happens to reference a PT string that gets replaced, that test is updated in the same change").

---

### `src/components/*.ts` (conditional)

**Three sub-patterns under this surface (D-01 enumerated):**

**Sub-pattern A — `@property` default text:** `src/components/empty-state.ts:6-11`

```typescript
@customElement('zt-empty-state')
export class ZtEmptyState extends LitElement {
    @property({ type: String }) icon = '';
    @property({ type: String }) svgIcon = '';
    @property({ type: String }) heading = 'No data';
    @property({ type: String }) message = '';
```

Companion: `src/components/data-table.ts:24` — `@property({ type: String }) emptyMessage = 'No data';`

**Pattern:** User-visible default lives directly on the `@property` initializer line. Replacement diff is a single-line edit.

**Sub-pattern B — inline ternary template text:** `src/components/navbar.ts:188-191`

```typescript
                <div class="status-indicator">
                    <div class="status-dot ${this.connected ? 'connected' : 'disconnected'} ${this.checking ? 'pulse' : ''}"></div>
                    <span class="status-label">${this.connected ? 'Connected' : 'Disconnected'}</span>
                </div>
```

**Pattern:** Status strings inline in a ternary expression inside `${...}` interpolation. Replacement touches the two literals — not the class-name strings (`'connected'` / `'disconnected'` are CSS hooks, not user text).

**Sub-pattern C — accessibility attribute literal:** `src/components/navbar.ts:170-187`

```typescript
                ${this.showLogout ? html`
                    <button
                        class="btn-icon"
                        @click=${this._handleLogout}
                        aria-label="Log out"
                        title="Log out"
                    >
                        <span class="icon">${unsafeSVG(LogOut)}</span>
                    </button>
                ` : ''}
                <button
                    class="btn-icon"
                    @click=${this.handleThemeToggle}
                    aria-label=${this.currentTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                    title=${this.currentTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                >
```

**Pattern:** `aria-label` and `title` are paired — same string in both attributes (assistive tech reads `aria-label`; sighted users see `title` tooltip). A11y metadata IS user-visible and IS in scope per D-01.

**Replacement rule (across all three sub-patterns):** Single-line literal swap, English copy per D-09 (imperative for verbs, sentence-case for short status text, exact-cased nouns for tooltips).

---

### `src/server/routes/*.ts` (conditional)

**Two sub-patterns under this surface:**

**Sub-pattern D — `reply.code(...).send({ error })` (single field):** `src/server/routes/setup.ts:30-46,56`

```typescript
        if (hasAdmin(fastify.db)) {
            return reply.code(403).send({ error: 'Setup already completed' });
        }

        const { username, password } = request.body;

        if (!username || username.length < 3) {
            return reply.code(400).send({ error: 'Username must be at least 3 characters' });
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return reply.code(400).send({ error: 'Only letters, numbers, and underscores allowed' });
        }

        const validation = validatePasswordStrength(password);
        if (!validation.valid) {
            return reply.code(400).send({ error: 'Password too weak', details: validation.errors });
        }
        // ...
                return reply.code(409).send({ error: 'Username already exists' });
```

Companion (same shape): `src/server/routes/zt-proxy.ts:72,91,105,114,123,132,135,144,147` — every entry is `return reply.code(400).send({ error: 'Invalid network ID format' })` or `'Invalid member ID format'` (noun-first, terse, English).

**Pattern (D-09):**
- **Noun-first, terse** error strings (`'Username already exists'`, `'Invalid network ID format'`, `'Setup already completed'`).
- HTTP code semantics: 400 = validation, 403 = permission/lockout, 409 = conflict (preserved on replacement).
- The two-field form `{ error: '...', details: validation.errors }` is the established pattern when a validator returns a structured error list (`details` is in scope per D-01; `validation.errors` is recursively in scope when those errors are user-visible strings from `password.ts`).

**Sub-pattern E — validator return object (not a `reply.send` directly):** `src/server/routes/member-ip-validator.ts:140-146`

```typescript
        const inRoute = network.routes.some((r) => ipInCidr(ip, r.target));
        if (!inRoute) {
            return {
                ok: false,
                error: "IP address is outside the network's managed routes",
                invalidIp: ip,
                reason: 'out-of-route',
            };
        }
```

**Pattern:**
- Validator returns a discriminated `{ ok: boolean; error?: string; reason?: string }` object.
- The `error` field is what surfaces through `ApiError.message` in the toast (RESEARCH § "Risk Surfaces & Landmines"; CONTEXT line 144).
- Use **double-quotes** when the string contains a single-quote / apostrophe (`network's`) — established style; do not escape into single-quoted form.
- `reason` is a machine-readable enum (e.g. `'out-of-route'`, `'collision'`) — **NOT** in scope per D-01 (not rendered as text; only used for branching in callers).

**Diff shape (if PT surfaces in a route handler — hypothetical):**
```diff
-            return reply.code(400).send({ error: 'Nome de usuário deve ter no mínimo 3 caracteres' });
+            return reply.code(400).send({ error: 'Username must be at least 3 characters' });
```
Single-line literal swap inside the `send()` argument; HTTP code unchanged; surrounding control flow unchanged.

---

### `src/server/auth/*.ts` (conditional)

**Files in scope (CONTEXT lines 106-108):** `src/server/auth/username.ts`, `src/server/auth/password.ts` (specifically the `validatePasswordStrength` return value).

**Analog:** The same noun-first validator-return pattern as `member-ip-validator.ts:142` (sub-pattern E above). The CONTEXT-canonical references for `username.ts` / `password.ts` confirm their existing strings are already English (RESEARCH § "I18N-02 verification" — "verified all error strings are English"). No code excerpt loaded — these files would only change under D-08 fallback, which is not expected to fire.

**Pattern (inherits from sub-pattern E):** Validator returns `{ valid: boolean, errors: string[] }` (or analogous discriminated shape). The `errors` array flows into `details: validation.errors` on the route response (see `setup.ts:45` analog above), then to the client via `ApiError`. Replacement copy follows D-09 noun-first style.

## Shared Patterns

### Convention: Co-located inline literals (no central dictionary)

**Source:** `src/` — entire codebase. There is **no** `strings.ts`, no `i18n/` directory, no central catalog. Verified by RESEARCH scout (CONTEXT line 131): "No existing string-registry / dictionary module."

**Apply to:** All conditional-modify files (every PT-to-EN replacement under D-08).

**Rule:** When replacing a PT string, the English copy lives at the same line and in the same expression where the PT string lived. **Do NOT** create a shared module, a constants file, or any indirection (D-08 locked).

### Convention: D-09 copy style

**Source:** existing English literals across `src/pages/`, `src/components/`, `src/server/routes/` (cited above).

**Apply to:** every D-08 replacement.

| Surface | Style | Anchor |
|---|---|---|
| Button label (frontend) | Imperative, short, no period | `'Continue →'` (`src/pages/setup.ts:441`), `'Save'`, `'Cancel'`, `'Delete'`, `'Edit'` |
| Toast success (frontend) | Sentence-case, declarative, no period | `'Network configuration updated'` (`src/pages/network-detail.ts:451`) |
| Toast error (frontend) | `Failed to <verb>` pattern, no period | `'Failed to update network configuration'` (`src/pages/network-detail.ts:456`) |
| Server error response (`error` field) | Noun-first, terse, no period | `'Username already exists'` (`src/server/routes/setup.ts:56`), `'Invalid network ID format'` (`src/server/routes/zt-proxy.ts:91`) |
| Server validator return (`error` field) | Sentence-form, double-quoted if apostrophe present | `"IP address is outside the network's managed routes"` (`src/server/routes/member-ip-validator.ts:142`) |
| `@property` text default | Bare noun, sentence-case | `heading = 'No data'` (`src/components/empty-state.ts:10`), `emptyMessage = 'No data'` (`src/components/data-table.ts:24`) |
| `aria-label` + `title` (paired) | Imperative or descriptive, same string in both attrs | `aria-label="Log out" title="Log out"` (`src/components/navbar.ts:174-175`) |
| Status text (ternary) | Single-word state, capitalised | `${this.connected ? 'Connected' : 'Disconnected'}` (`src/components/navbar.ts:190`) |

### Convention: Test-update rule (D-07)

**Source:** CONTEXT D-07; no analog code excerpt needed — this is a procedural rule.

**Apply to:** any conditional modify under D-08.

**Rule:** If a `*.test.ts` happens to assert on a PT string that gets replaced, that test is updated in the same commit. **NO** new `*.test.ts` files are created for i18n (CONTEXT D-07, RESEARCH lines 35-36). The audit deliverable is the audit report + script, not a CI test.

### Convention: D-06 — script is NOT wired into CI

**Source:** CONTEXT D-06; RESEARCH lines 352-367.

**Apply to:** `src/package.json` modification only.

**Rule:** Adding `"audit:i18n": "bash scripts/i18n-audit.sh"` to the `scripts` block is the **only** wiring change. **Do NOT**:
- add the audit to `test` (would break D-06).
- add a `prepare` / `pre-commit` hook.
- add a vitest `*.test.ts` equivalent (locked Out of Scope by REQUIREMENTS.md and CONTEXT deferred-ideas).
- chain `audit:i18n` into `build` or `lint`.

### Convention: Conventional Commits (from user memory)

**Source:** user's auto-memory rule "all commits in ztcwm must follow `<type>(scope): subject` format from 2026-05-04 onward". Phase 18 task commits demonstrate the pattern (`feat(types)`, `test(member-service)`, `feat(member-service)` per `18-01-SUMMARY.md` lines 73-77).

**Apply to:** every Phase 19 commit.

**Suggested scopes for Phase 19:**
- `chore(scripts)` or `build(scripts)` — the `i18n-audit.sh` creation
- `chore(package)` — the `audit:i18n` npm-script entry
- `docs(19)` or `docs(audit)` — the `19-AUDIT.md` write
- `fix(<area>)` — only if D-08 fires (e.g. `fix(network-detail): replace PT toast string`)

## No Analog Found

| File | Role | Data Flow | Why No Strong Match |
|---|---|---|---|
| `src/scripts/i18n-audit.sh` (partial-only) | script (developer tool) | entry point | The repo has zero in-`src/` shell scripts today. The two `.sh` files at `.docs/zerotier-one/*.sh` are vendored upstream code — they validate the `#!/usr/bin/env bash` shebang choice and `[ -z ]` + `exit 1` argv idiom but are not a structural template for an audit. **Mitigation:** RESEARCH § "Audit Script Shape" lines 313-367 + § "Pattern 1" lines 192-241 IS the canonical prescription; the planner should treat RESEARCH as the spec, not search further for an analog. |

All other files have **exact** or **role-match** analogs documented above.

## Metadata

**Analog search scope:**
- `src/pages/*.ts` (toast + button patterns)
- `src/components/*.ts` (`@property` default, ternary template text, `aria-label`)
- `src/server/routes/*.ts` (`reply.code(...).send({ error })`)
- `src/server/routes/member-ip-validator.ts` (validator return object)
- `src/package.json` (scripts block)
- `.planning/phases/18-*/18-VERIFICATION.md` (closest report-shape analog)
- `.docs/zerotier-one/*.sh` (only `.sh` siblings in the repo)

**Searches that returned no in-repo result (justifying "No Analog Found"):**
- `find . -maxdepth 4 -type d -name "scripts" → only .docs/zerotier-one/ci/scripts` (vendored).
- `find . -name "*.sh" not in node_modules, not in .docs → 0 files`.

**Out-of-scope per CONTEXT D-10:** `.TODO.md` — not consulted; no analogs sourced.

**Files NOT pattern-mapped (already exist, no changes expected):**
- `19-CONTEXT.md`, `19-DISCUSSION-LOG.md`, `19-RESEARCH.md`, `19-VALIDATION.md` (the four pre-existing Phase 19 planning artifacts).
- `19-VERIFICATION.md` — written at phase-verify time per CONTEXT D-05.3, not at plan/execute time; outside Phase 19 execute-plan scope.

**Pattern extraction date:** 2026-05-11.

---

## PATTERN MAPPING COMPLETE
