# Phase 19: Internationalization Sweep - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Verify that every user-visible string in the SPA and every backend response message surfaced through the UI is in English, and lock that result with a re-runnable audit script + a manual page-by-role walkthrough sign-off. The phase delivers an audit artifact, not a translation campaign — the codebase scout (2026-05-11) found zero Portuguese strings in `src/`, so Phase 19 is shaped as **verify-and-close** with a fix-strategy fallback in case the deeper audit surfaces anything.

Requirements covered: **I18N-01** (every visible UI string in English), **I18N-02** (user-visible backend response messages in English).

</domain>

<decisions>
## Implementation Decisions

### Audit Scope

- **D-01:** Audit covers everything `I18N-01` enumerates **plus accessibility metadata**. Concretely the in-scope surfaces are:
  - Lit templates (`html\`…\``) in `src/pages/*.ts` and `src/components/*.ts`
  - Reactive `@property` / `@state` initial values that render as text (e.g. `empty-state.ts` `heading = 'No data'`, `data-table.ts` `emptyMessage = 'No data'`)
  - Toast messages (`toastService.success/.error/.info/.warning(...)` call sites across `src/`)
  - Log messages surfaced in the `logs` page (`logService.info/.warn/.error(...)` call sites)
  - Validation error strings returned by `src/server/auth/username.ts`, `src/server/auth/password.ts`, `src/server/routes/member-ip-validator.ts`
  - Server response bodies in `src/server/routes/*.ts` whose `error` / `message` / `details` fields are forwarded to the client (`auth.ts`, `setup.ts`, `users.ts`, `zt-proxy.ts`, `zt-proxy-helpers.ts`, `api.ts`)
  - Accessibility attributes that screen readers / tooltips render: `aria-label`, `aria-description`, `title`, `placeholder`, `alt`

- **D-02:** Audit **excludes** dev/ops-only text:
  - `console.log` / `console.warn` / `console.error` payloads
  - Structured `fastify.log.info(...)` audit-log message strings (e.g. `'username changed'`) — these are server logs, not UI-rendered
  - Comments and JSDoc (developer-facing only)
  - Test fixtures (`*.test.ts`) — `'café'` in `src/server/auth/username.test.ts` is a legitimate Unicode test seed, not user-visible
  - `.planning/`, `.docs/`, `docs/`, `README.md` — these can be in any language; Phase 19's scope is the running application, not project documentation (the `docs/` set is already English per v3.0 DOCS-01..06; PT-only prose lives in `.TODO.md` which is internal)

### Audit Methodology

- **D-03:** Two-pass audit:
  1. **Automated grep pass** against all D-01 surfaces (excluding D-02). Two regexes run in tandem:
     - PT accent class: `LC_ALL=C grep -rE "[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]" src/ --include="*.ts" --include="*.html"` minus the D-02 exclusions
     - PT token list: `\b(editar|excluir|salvar|cancelar|adicionar|aguarde|carregar|sair|entrar|voltar|pr[oó]ximo|anterior|pesquisar|buscar|mostrando|nenhum|vazio|confirmar|a[cç][õo]es|sucesso|aviso|usu[aá]rio|senha|pendente|conex[aã]o|inv[aá]lido|obrigat[oó]rio|falha|conectado|desconectado|rede|membro|gerenciar|administrador|configura[cç]|controlador|painel|in[íi]cio|recarregar|sincronizar)\b` against the same file set
  2. **Manual page-by-role walkthrough** using a checklist of every routed page × every role. Pages enumerated by `src/router/index.ts`: dashboard, networks, network-detail (incl. modals + chip editor), members, controllers, users (incl. Edit-User modal + Reset Password modal), pending, settings, logs, api-explorer, login, setup. Roles: Admin, Operator, Viewer (when route is reachable).

- **D-04:** Manual walkthrough is performed against the running dev server (`npm run dev` in `src/`) — not a static screenshot scrape — so toasts, error states, and modals are exercised by triggering their real code paths (e.g. submitting an invalid IP to fire the `validateIpAssignments` 400 message; submitting a duplicate username to fire the `'Username already exists'` 409). A walkthrough is "complete" only when every entry in the page × role × interaction matrix has been visually confirmed.

### Deliverable Shape

- **D-05:** Phase 19 produces three artifacts:
  1. **Re-runnable audit script** at `src/scripts/i18n-audit.sh` (shell — minimal deps, matches `src/` co-location convention). Exit code `0` on clean, `1` on any PT match. Script encodes the D-01 surfaces and D-02 exclusions verbatim. Exact shape (sh vs. node-ts, npm script wiring, exclusion list format) is plan-phase's call within these constraints.
  2. **Audit report** at `.planning/phases/19-internationalization-sweep/19-AUDIT.md` documenting: scope (D-01/D-02), methodology (D-03/D-04), the exact script invocation + output, the manual-walkthrough checklist with sign-off per page × role, and findings (expected: none).
  3. **Phase closure note** appended to `19-VERIFICATION.md` at phase-verify time linking the audit report and confirming I18N-01 / I18N-02 satisfied.

- **D-06:** The audit script is **NOT** wired into CI / package.json `test` / pre-commit. Out-of-Scope explicitly excludes "New CI guardrail test for English-only strings". The script lives as a developer-runnable tool only. Plan-phase MAY wire it as an opt-in npm script (e.g. `npm run audit:i18n`) — that does not constitute a CI guardrail.

- **D-07:** No new `*.test.ts` file is created for i18n. Existing tests stay green; if any test assertion happens to reference a PT string that gets replaced by D-08 fix, that test is updated in the same change (roadmap Phase 19 SC #4).

### Fix Strategy (Conditional)

- **D-08:** If the audit surfaces a Portuguese string, replace it with the English equivalent **inline at the call site** — Lit template literal, server route handler body, or validator return value. No new module, no central dictionary / `strings.ts` map. This matches the existing convention (no central string registry exists today, strings live next to the component or route handler that uses them) and the locked roadmap SC #3 ("strings remain inline literals").
- **D-09:** Replacement copy follows existing English conventions:
  - Imperative for buttons: `'Edit user'`, `'Delete'`, `'Save'`, `'Cancel'`, `'Continue'` (already used in `src/pages/setup.ts:441` `'Continue →'`)
  - Sentence-case for toasts: `'Network configuration updated'`, `'Failed to update network configuration'` (already used in `src/pages/network-detail.ts:451-456`)
  - Server validation errors stay short and noun-first: `'Username already exists'`, `'Invalid network ID format'` (already used in `src/server/routes/setup.ts`, `src/server/routes/zt-proxy.ts`)
- **D-10:** No `.TODO.md` edits in Phase 19. `.TODO.md` is internal authoring scratch (the original PT brief from the user) and is not user-visible; the i18n audit does not cover it.

### Claude's Discretion

- Exact shell vs. node-ts choice for the audit script — plan-phase weighs portability (sh) against type-safety / Vitest reuse (ts). Shell is the recommended baseline.
- Exact PT token list inside the script — plan-phase may extend D-03's seed list during research. Adding tokens is fine; removing tokens needs justification in the report.
- Walkthrough checklist format (markdown table vs. nested list) inside `19-AUDIT.md`.
- Whether to add `npm run audit:i18n` to `src/package.json` `scripts` — recommended yes (zero risk, opt-in, matches D-06).
- Order of script invocation vs. manual walkthrough during execution — both must complete before sign-off, order doesn't matter.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Phase Specs

- `.planning/ROADMAP.md` (Phase 19 row) — phase goal, requirements list (I18N-01, I18N-02), four success criteria
- `.planning/REQUIREMENTS.md` (I18N-01, I18N-02 in **Internationalization** section; **Out of Scope** table for locked exclusions like "i18n framework" and "CI guardrail test")
- `.planning/PROJECT.md` — milestone v3.1 framing, v3.0 Key Decisions table (theme/btn locks that constrain D-09 copy choices)
- `.planning/STATE.md` — flagged "Strategy for the i18n sweep — pure inline-string replacement vs. light dictionary helper" as the open v3.1 decision; this CONTEXT closes it via D-08
- `.TODO.md` — the user's original PT brief; line 3 (`# verificar todo o sistema para corrigir a localização do idioma, manter tudo em ingles.`) is the source of Phase 19's intent. **Not in audit scope per D-02.**

### Codebase Maps (already produced 2026-05-04)

- `.planning/codebase/STRUCTURE.md` — directory layout (in particular `src/pages/`, `src/components/`, `src/server/routes/`, `src/server/auth/` — the four directories that contain in-scope strings)
- `.planning/codebase/CONVENTIONS.md` § "Error Handling" (server-side validation pattern), § "Comments" (JSDoc with English copy as the existing norm), § "Web Component Patterns" (`@property` initial values are user-visible defaults)
- `.planning/codebase/INTEGRATIONS.md` — references to ZeroTier API responses that flow through `zt-proxy-helpers.ts` and surface as `ApiError.message` in the UI

### Code Surfaces in Scope (D-01)

**Frontend pages** (`src/pages/*.ts`):
- `dashboard.ts`, `networks.ts`, `network-detail.ts` (largest — 977 lines including modals), `members.ts`, `controllers.ts`, `users.ts`, `pending.ts`, `settings.ts`, `logs.ts`, `api-explorer.ts`, `login.ts`, `setup.ts`

**Frontend components** (`src/components/*.ts`):
- `badge.ts`, `data-table.ts` (`emptyMessage`), `empty-state.ts` (`heading`), `ip-chip-editor.ts`, `loading.ts`, `logo.ts`, `modal.ts`, `navbar.ts` (Connected/Disconnected text, aria-labels), `sidebar.ts` (nav labels), `stat-card.ts`, `toast.ts`

**Server route handlers** (`src/server/routes/*.ts`):
- `auth.ts`, `setup.ts`, `users.ts`, `zt-proxy.ts`, `zt-proxy-helpers.ts`, `member-ip-validator.ts`, `api.ts`

**Server auth validators** (`src/server/auth/*.ts`):
- `username.ts` (error strings), `password.ts` (error strings in `validatePasswordStrength`)

**Top-level shell**:
- `src/app.ts` (auth gate text if any), `src/router/index.ts` (no rendered text but route paths defined here)
- `src/index.html` (boot HTML)

### Code Surfaces Excluded (D-02)

- `src/**/*.test.ts` — all test files
- `src/services/*.ts` `console.*` calls (dev surface)
- `fastify.log.*` calls in `src/server/**` (server logs, not UI)
- JSDoc / inline comments in source

### Vendor Reference (offline)

- `.docs/zerotier-one/` — ZeroTier upstream docs (English-only; not in scope but referenced in case any string was mirrored from upstream)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **No existing string-registry / dictionary module.** `src/` has no `strings.ts`, no `i18n/` directory, no central message catalog — strings live inline next to their consumers. This is the convention D-08 preserves.
- **`toastService`** (`src/services/toast-service.ts`) — already typed with English `type` literals (`'success' | 'error' | 'warning' | 'info'`). All call sites pass English titles/descriptions today (verified during scout).
- **`logService`** (`src/services/log-service.ts`) — same pattern; English level names and English messages at call sites.
- **`ApiError`** (`src/types/zerotier.ts`) — surfaces server `message` / `body.message` / `body.error` strings into toasts via `HttpClient.handleResponse` (`src/api/http-client.ts:26-43`). Server response strings ARE user-visible through this path → I18N-02 hooks here.
- **Existing English copy patterns** observed during scout:
  - Imperative buttons: `'Continue →'`, `'Save'`, `'Cancel'`, `'Edit'`, `'Delete'`
  - Sentence-case toasts: `'Network configuration updated'`, `'Failed to update network configuration'`, `'Password updated successfully'`
  - Noun-first server errors: `'Username already exists'`, `'Invalid network ID format'`, `'ZeroTier controller not configured'`
  - Status-bar live text: `'Connected'` / `'Disconnected'` (`src/components/navbar.ts:190`)

### Established Patterns

- **Co-located strings** — every user-visible literal lives in the file that renders it. There is no precedent for moving strings out to a shared module; D-08 keeps this invariant.
- **Server-to-client error flow** — server responds `{ error: 'Foo' }` with HTTP 4xx → `HttpClient.handleResponse` packs into `ApiError.message` → page handler catches and calls `toastService.error('Failed to X', err.message)`. The English server string is what the user reads. I18N-02 verification therefore lives in `src/server/routes/*.ts` and `src/server/auth/*.ts`, not in the page-level catch handlers.
- **`aria-label` / `title` are user-visible** through assistive tech and native tooltips (`src/components/navbar.ts:174-184` already follows this for the log-out and theme-toggle buttons). They MUST be in the audit scope (D-01).
- **No CI test currently asserts string language.** `theme-audit.test.ts` and `docs-audit.test.ts` are the closest analogs (they ratchet token / docs invariants); a Phase 19 equivalent is explicitly Out-of-Scope per REQUIREMENTS.md.

### Integration Points

- **The audit script** (D-05.1) integrates into `src/scripts/` (a new directory, sibling to `src/api/`, `src/utils/`, etc.) or as a sibling of `src/server/dist/` — plan-phase locks the exact path. The `src/.gitignore` and `.eslintignore` may need updating depending on the choice.
- **`src/package.json`** — opt-in `npm run audit:i18n` script wires the audit into the developer workflow without adding it to `test` or `lint`.
- **`19-AUDIT.md`** lives next to `19-CONTEXT.md` in `.planning/phases/19-internationalization-sweep/`.
- **`STATE.md`** decision register — the pending entry "Strategy for the i18n sweep — pure inline-string replacement vs. light dictionary helper" is resolved by D-08 (pure inline). Plan-phase should reflect this when writing PLAN.md.
- **No backend changes** beyond editing any PT strings the audit surfaces (expected: none). No new routes, no schema migrations, no auth changes.

</code_context>

<specifics>
## Specific Ideas

- The user's original PT prompt for this phase, kept verbatim for grounding: `.TODO.md:3` — *"verificar todo o sistema para corrigir a localização do idioma, manter tudo em ingles."* ("check the whole system to correct the language localization, keep everything in English"). The verb is *verificar* — *verify* — which is exactly why D-05/D-06 shape the deliverable as an audit report rather than a translation diff.
- Scout result (run during this discuss session, 2026-05-11) found **zero** Portuguese strings inside `src/` after applying the D-01 surface filters. Single accent-class hit was `'café'` in `src/server/auth/username.test.ts:78`, a Unicode-in-username test fixture (D-02 excluded). This is why Phase 19 is shaped as verify-and-close with a fallback fix strategy (D-08) rather than the inverse.
- The walkthrough must be performed on the **running app**, not on a static dump. Some toasts (e.g. `'Failed to update network configuration'`, the 409 username collision messaging in the Edit-User modal) only render when the server's 4xx code path fires — a static grep alone won't surface a hypothetical PT string inside a rarely-triggered toast.

</specifics>

<deferred>
## Deferred Ideas

- **CI guardrail test for English-only strings** — would add a Vitest equivalent to `theme-audit.test.ts` that ratchets PT-string-zero in CI. Explicitly Out-of-Scope per REQUIREMENTS.md ("Could be added later; not requested for v3.1, and the i18n audit is a one-time sweep"). The audit script from D-05 is a strict superset of what such a test would do; promoting it to CI is a separate decision (likely a future v3.2+ phase if the project ever lands multi-language ambitions).
- **Multi-language support / runtime locale switching** — locked Out-of-Scope. Would require an i18n framework (i18next, lit-translate) and a central catalog (the dictionary helper rejected by D-08). Off the table for this milestone.
- **String-extraction tooling** (e.g. extracting all inline literals to a generated catalog for translator review) — premature; only valuable if/when the project decides on multi-language. Deferred until that decision is reconsidered.
- **Localizing `.TODO.md`** — out of scope. `.TODO.md` is internal authoring scratch and is not user-visible; the user is explicitly the author and uses PT freely there.

</deferred>

---

*Phase: 19-internationalization-sweep*
*Context gathered: 2026-05-11*
