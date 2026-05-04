# Coding Conventions

**Analysis Date:** 2026-05-04

## Naming Patterns

**Files:**
- Source files use `kebab-case.ts` (e.g., `network-service.ts`, `http-client.ts`, `ip-chip-editor.ts`, `session-store.ts`)
- Test files mirror source name with `.test.ts` suffix and live next to the source (`badge.ts` → `badge.test.ts`)
- Server migrations are numbered: `001-create-migrations.ts`, `002-create-users.ts`, `003-create-zt-config.ts`, `004-username-collate-nocase.ts` (`src/server/migrations/`)
- HTML/CSS-only files do not exist — all styling is co-located in `*.ts` Lit `css` templates
- Barrel files are `index.ts` per directory (`src/components/index.ts`, `src/services/index.ts`, `src/utils/index.ts`, `src/api/index.ts`, `src/types/index.ts`)

**Components (Lit web components):**
- Custom-element tag: `zt-{name}` for shell/atomic components (`zt-app`, `zt-badge`, `zt-sidebar`, `zt-toast-container`, `zt-data-table`, `zt-ip-chip-editor`)
- Page components: `page-{name}` (`page-dashboard`, `page-networks`, `page-network-detail`, `page-users`, `page-api-explorer`, `page-logs`, `page-pending`, `page-settings`)
- Setup/login pages keep `zt-` prefix: `zt-setup-page`, `zt-login-page`
- Class names: `Zt{PascalCase}` for `zt-` elements (`ZtBadge`, `ZtSidebar`, `ZtApp`, `ZtDataTable`); `Page{PascalCase}` for pages (`PageUsers`)
- Always declare in `HTMLElementTagNameMap` at the bottom of the component file:
  ```typescript
  declare global {
      interface HTMLElementTagNameMap {
          'zt-badge': ZtBadge;
      }
  }
  ```

**Functions:**
- `camelCase` for all functions (`hashPassword`, `validateUsername`, `concurrentMap`, `filterMembers`, `cidrToRange`, `formatTimestamp`)
- Boolean-returning helpers prefer `is*` / `has*` / `can*` prefixes (`isIPv4`, `hasAdmin`, `hasZtConfig`, `isZtConfiguredViaEnv`, `canAccessApiExplorer`, `canCreateNetwork`)
- Private methods use leading underscore only when there's a public/private pair on the same class (`UserService._fetch` paired with `getCurrentUser`); otherwise rely on the TypeScript `private` modifier

**Variables:**
- `camelCase` for locals/parameters
- `SCREAMING_SNAKE_CASE` for module-level constants (`BCRYPT_COST`, `USERNAME_PATTERN`, `MIN_LENGTH`, `ROLE_LEVELS`, `ALGORITHM`, `IV_LENGTH`, `AUTH_TAG_LENGTH`, `THEME_KEY`, `DEFAULT_CONFIG`, `VALID_ROLES`, `PUBLIC_PATHS`, `STRUCTURAL_EXCEPTION_CLASSES`)
- Lit reactive properties use `camelCase` directly on the class (`@property() variant`, `@state() private currentPath`)

**Types/Interfaces:**
- `PascalCase` (`Member`, `Network`, `NetworkListResponse`, `ApiError`, `AppConfig`, `CurrentUser`, `UserRole`, `ToastOptions`, `ToastEntry`, `Migration`, `PasswordValidationResult`, `UsernameValidationResult`, `DataTableColumn`, `ZtConfig`)
- Inline string-literal unions are preferred over enums (`type UserRole = 'admin' | 'operator' | 'viewer'`, `type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral'`, `type MemberFilterTab = 'all' | 'authorized' | 'pending'`)
- Discriminated-union return types for validators (`{ ok: true } | { ok: false; error: string }` in `src/server/auth/username.ts`)

## Code Style

**Formatting (`src/.prettierrc`):**
- 4-space indent (`tabWidth: 4`)
- Single quotes (`singleQuote: true`)
- Required semicolons (`semi: true`)
- Trailing commas everywhere (`trailingComma: 'all'`)
- Print width 100 (`printWidth: 100`)
- Always-parens for arrow params (`arrowParens: 'always'`)
- Bracket spacing on (`bracketSpacing: true`)

**Linting (`src/eslint.config.js`):**
- Flat config, ESLint 9
- Extends `js.configs.recommended` + `eslint-config-prettier` (Prettier disables conflicting stylistic rules)
- TypeScript via `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin`
- Lit-specific rules via `eslint-plugin-lit`
- Hard-enforced rules: `indent: ['error', 4]`, `semi: ['error', 'always']`, `quotes: ['error', 'single']`
- `@typescript-eslint/no-unused-vars` with `argsIgnorePattern: '^_'` — unused args must be prefixed with `_` (`_context`, `_err`)
- `@typescript-eslint/parameter-properties: 'error'`
- Ignored paths: `dist/`, `node_modules/`, `vite.config.ts`
- Run with `npm run lint` (`eslint . --ext .ts`)

**TypeScript (`src/tsconfig.json`, `src/server/tsconfig.json`):**
- `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `noFallthroughCasesInSwitch: true`
- Client targets ES2021 with DOM lib; server targets ES2022 with Node lib
- ESM throughout (`"type": "module"` in `src/package.json`)
- `experimentalDecorators: true` and `useDefineForClassFields: false` on the client (Lit decorator compatibility)
- All relative imports MUST end with `.js` extension even when the source file is `.ts` — required by NodeNext / bundler-resolution ESM (e.g., `import { theme } from '../styles/theme.js'`, `import './badge.js'`)

## Import Organization

**Order observed across the codebase:**
1. Third-party packages (`lit`, `lit/decorators.js`, `@vaadin/router`, `bcryptjs`, `fastify`, `better-sqlite3`, `@fastify/*`, `lucide-static`)
2. Node built-ins (`node:crypto`, `node:fs`, `node:path`, `node:url`, `os`, `path`, `fs`, `url`, `crypto`)
3. Relative imports (`../styles/theme.js`, `../api/http-client.js`, `./password.js`)
4. Type-only imports use `import type` and are usually grouped at the end of a section (`import type { ApiError } from '../types/index.js'`, `import type Database from 'better-sqlite3'`, `import type { FastifyPluginAsync } from 'fastify'`)
5. Side-effect-only imports (component registrations) appear near the top of `app.ts` and pages: `import './components/sidebar.js'`, `import '../components/logo.js'`

**Path Aliases:**
- Vite alias `@` → `.` (project root) is configured in `src/vite.config.ts` but NOT used in source — all imports use relative paths
- No TypeScript `paths` mapping is configured

## Error Handling

**Client (browser):**
- Custom typed error shape via `ApiError` interface (`src/types/zerotier.ts`) — `{ status, message, body? }`
- `HttpClient.handleResponse` (`src/api/http-client.ts`) throws an `ApiError` literal for any non-OK response, prefers `body.message`, then `body.error`, then `response.statusText`, finally `HTTP {status}` — falls back gracefully when `response.json()` rejects
- Errors are propagated from services up to the LitElement; pages typically `try { … } catch { toastService.error(…) }`
- Auth interceptor in `src/app.ts` (`installAuthInterceptor`) wraps `window.fetch` and redirects to `/login` on 401 for `/api/*` paths (excluding `/api/auth/login` and `/api/setup/`)

**Service-fallback pattern:**
- `NetworkService.listNetworks` and `MemberService.listMembers` (`src/services/network-service.ts`, `src/services/member-service.ts`) call the unstable bulk endpoint inside `try`, and on any throw fall back to fetching IDs + per-resource details concurrently via `concurrentMap(ids, fn, 5)`
- Empty `catch {}` blocks are used deliberately when failure is non-actionable (e.g., `try { await fetch('/api/setup/status') } catch (_) {}` in `src/router/index.ts`)

**Server (Fastify):**
- Use `@fastify/sensible` registered first in `src/server/index.ts` for standard error helpers
- Validation errors: `return reply.code(400).send({ error: '<message>', details?: [...] })` — see `src/server/routes/setup.ts`, `src/server/routes/users.ts`
- Auth/permission errors: `reply.code(401)` for missing session, `reply.code(403)` for RBAC failures, `reply.code(404)` for missing resources, `reply.code(409)` for unique-constraint violations
- DB unique-constraint detection by string match: `if (err.message?.includes('UNIQUE constraint')) return reply.code(409).send({ error: 'Username already exists' })`
- Unexpected errors are re-thrown so Fastify's default error handler logs and returns 500
- `try` blocks in callback-style stores (`SQLiteSessionStore`) wrap synchronous DB calls and forward via `callback(err as Error)`

## Async Patterns

**Promises everywhere:**
- All I/O is `async`/`await`; no raw `.then` chains except inside Lit reactive lifecycle hooks
- Service methods return typed `Promise<T>` (e.g., `async getNetwork(id: string): Promise<Network>`)
- `concurrentMap` in `src/utils/concurrency.ts` is the project's bounded-concurrency primitive — fail-fast (first rejection cancels remaining workers), preserves input order, defaults to limit 5 in callers

**Lit lifecycle:**
- `firstUpdated()` and `connectedCallback()` are the canonical async-init hooks; awaited fetches are fired here, with state assignments triggering a Lit re-render
- Avoid blocking the constructor; defer to `firstUpdated`

**State caching:**
- `UserService` (`src/services/user-service.ts`) and `checkSetupStatus` (`src/router/index.ts`) cache the in-flight Promise in a private field to dedupe concurrent calls

## Logging

**Client:** uses `console.log` / `console.warn` / `console.error` sparingly. No frontend logging framework.

**Server (Fastify):** uses the built-in pino logger (`src/server/index.ts` configures `level: isDev ? 'info' : 'warn'`).

**Structured audit-log pattern:**
- For security-relevant events the log call passes an event object first, message string second:
  ```typescript
  fastify.log.info(
      { event: 'user.username.changed', actorId, targetId, oldUsername, newUsername },
      'username changed',
  );
  ```
- Tests use `vi.spyOn(app.log, 'info')` and `expect.objectContaining({ event: 'user.username.changed' })` to assert audit entries (see `src/server/routes/users.test.ts`)

## Comments

**JSDoc:**
- Used on public/exported functions to document non-obvious behavior, ZeroTier API quirks, or design decisions referenced by short codes (D-04, D-10, D-11, D-17, SESS-02, etc.)
- Example: `src/utils/helpers.ts` `filterMembers` and `isIPv4`, `src/server/auth/username.ts` `validateUsername`, `src/utils/concurrency.ts` `concurrentMap`
- No `@param`/`@returns` ceremony — TypeScript types carry the contract; comments explain *why*

**Inline comments:**
- Numbered or bulleted setup steps in `src/server/index.ts` (`// 1. Cookie parsing`, `// 2. Rate limiting`, etc.)
- Reference design-decision codes (`// per D-03, SESS-02`, `// (D-11)`, `// per Plan 14-03`) — these tie code to the planning docs in `.planning/`
- Section dividers in test files use Unicode box-drawing for visual scanning: `// ─── GET /api/users ──────────────────────────────────────────────────────`
- Locked-allow-list constants are tagged `// LOCKED` (`src/styles/theme-audit.test.ts`) to flag that any change requires updating the spec doc

## Function Design

**Size:** small, focused — most service methods are 1–10 lines. The longest free function (`generateTemporaryPassword` in `src/server/routes/users.ts`) is ~10 lines.

**Parameters:** prefer positional for ≤3 args, named-object for richer payloads. Validation routines accept `unknown` and narrow internally (`validateUsername(name: unknown)`).

**Return values:**
- Discriminated unions for fallible-but-not-exceptional validation (`UsernameValidationResult = { ok: true } | { ok: false; error: string }`)
- `null` for "not found" lookups (`getZtConfig`, `cidrToRange`, `getCurrentUser`)
- Throw for unexpected/transport failures (HttpClient → `ApiError`)

## Module Design

**Exports:**
- Named exports only — no `export default` outside Vite/Vitest config files
- Services export both the class and a singleton instance: `export class NetworkService { … }; export const networkService = new NetworkService();` — consumers use the singleton; the class is exported so tests can instantiate fresh copies (see `src/services/network-service.test.ts`)
- Components export the class for type-only reuse (`export class ZtBadge extends LitElement`) and register the custom element via `@customElement` decorator side-effect

**Barrel Files:**
- `src/components/index.ts` — registers all components by side-effect imports (`import './sidebar.js'`)
- `src/services/index.ts` — re-exports all service singletons
- `src/utils/index.ts` — re-exports utility functions
- `src/api/index.ts` — re-exports `httpClient` and `HttpClient`
- `src/types/index.ts` — re-exports types from `zerotier.ts`

## Web Component Patterns

**LitElement structure (canonical layout, see `src/components/badge.ts`, `src/app.ts`):**
1. Imports
2. Module-level types/constants
3. `@customElement('tag-name')` decorator + `export class XxxYyy extends LitElement`
4. Reactive properties: `@property({ type: ... })` (public, attribute-reflected) and `@state() private` (internal)
5. `static styles = [theme, css\`...\`]` — always include the `theme` (and `lightTheme`/`resetStyles` where applicable) tokens array first
6. Lifecycle (`firstUpdated`, `connectedCallback`, `disconnectedCallback`)
7. Public methods → private methods → `render()`
8. `declare global { interface HTMLElementTagNameMap { ... } }` at the very bottom

**Styling:**
- Always reference CSS custom properties from `src/styles/theme.ts` (`var(--color-bg-primary)`, `var(--space-md)`, `var(--font-size-sm)`)
- Literal color values are forbidden outside `src/styles/theme.ts` and the MIRROR-fenced block in `src/index.html` — enforced by `src/styles/theme-audit.test.ts`
- Action `<button>`s must carry a `.btn-*` class or be in the locked structural-exception allow-list (`src/styles/theme-audit.test.ts`)

**Events:** custom events are `kebab-case` (`ip-change`, `vaadin-router-location-changed`); fired via `this.dispatchEvent(new CustomEvent('ip-change', { detail: { ips } }))`

## Validation Patterns

**Client-side, input form validation:**
- Inline regex / length checks inside the page component (`src/pages/login.ts`, `src/pages/setup.ts`)
- `<form novalidate>` on auth forms — custom error rendering only (no native browser validation)

**Server-side validation:**
- Centralized helpers: `src/server/auth/password.ts` `validatePasswordStrength`, `src/server/auth/username.ts` `validateUsername`, `src/server/routes/member-ip-validator.ts` `validateIpAssignments`
- Routes call the helper, branch on the result, and `reply.code(400).send({ error })` on failure
- `setup.ts` historically duplicated username regex inline — centralization to `validateUsername` is the canonical pattern; new routes should reuse it

## Authentication & Authorization

**RBAC:**
- Three roles: `'admin' | 'operator' | 'viewer'` with numeric levels in `ROLE_LEVELS = { admin: 3, operator: 2, viewer: 1 }`
- Server-side: `hasPermission(actualRole, minRole)` and `getMinRole(method, path)` in `src/server/auth/rbac.ts`
- Client-side: `userService.hasRole(minRole)` and convenience methods (`canCreateNetwork`, `canEditNetwork`, `canDeleteNetwork`, `canAccessApiExplorer`) in `src/services/user-service.ts`
- "Last admin" guard via `isLastAdmin(db)` blocks demoting/deleting the only remaining admin

**CSRF:**
- Token endpoint `/api/csrf-token`; client `HttpClient` lazily fetches and caches the token, then sends `X-CSRF-Token` header on POST/DELETE
- Server middleware in `src/server/index.ts` validates on all mutating `/api/*` requests except `/api/auth/login`, `/api/auth/logout`, `/api/setup/*`

**Crypto:**
- bcryptjs at cost 12 for password hashing (`src/server/auth/password.ts`)
- AES-256-GCM via `node:crypto` for encrypted ZT auth tokens at rest (`src/server/db/zt-config.ts`)

---

*Convention analysis: 2026-05-04*
