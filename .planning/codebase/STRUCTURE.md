# Codebase Structure

**Analysis Date:** 2026-05-04

## Directory Layout

```
ztcwm/
├── .claude/                                # Claude Code workspace settings (not source)
│   └── settings.local.json
├── .docs/                                  # Vendor reference docs (zerotier-one, ztncui)
├── .planning/                              # GSD planning + codebase maps (this file lives here)
│   ├── codebase/
│   ├── config.json
│   └── PROJECT.md
├── data/                                   # Project-level data (gitignored runtime artefacts)
├── docs/                                   # Project documentation (api-reference, architecture, development)
├── src/                                    # ALL application source
│   ├── .env.example                        # Documented env-var template
│   ├── .gitignore
│   ├── .prettierrc                         # Prettier config (4-space, single quotes)
│   ├── eslint.config.js                    # Flat ESLint config + lit plugin
│   ├── index.html                          # SPA entry HTML (loaded by Vite)
│   ├── main.ts                             # SPA bootstrap (one-line `import './app.js'`)
│   ├── app.ts                              # `<zt-app>` Lit root + pre-router auth gate
│   ├── package.json                        # Dependencies + npm scripts
│   ├── package-lock.json
│   ├── tsconfig.json                       # Frontend TS config (DOM + ES2021 + bundler)
│   ├── vite.config.ts                      # Vite dev server + build output
│   ├── vitest.config.ts                    # Vitest (happy-dom env)
│   ├── app.test.ts                         # Top-level app shell test
│   │
│   ├── api/                                # HTTP transport layer (client-side)
│   │   ├── http-client.ts                  # Fetch wrapper for `/api/zt` + CSRF cache
│   │   ├── http-client.test.ts
│   │   └── index.ts                        # Re-exports `httpClient`, `HttpClient`
│   │
│   ├── components/                         # Reusable Lit UI primitives
│   │   ├── badge.ts / badge.test.ts
│   │   ├── data-table.ts                   # Sortable/selectable/editable table
│   │   ├── empty-state.ts
│   │   ├── ip-chip-editor.ts / .test.ts    # In-table chip editor for member IPs
│   │   ├── loading.ts
│   │   ├── logo.ts
│   │   ├── modal.ts
│   │   ├── navbar.ts / navbar.test.ts
│   │   ├── sidebar.ts / sidebar.test.ts
│   │   ├── stat-card.ts
│   │   ├── toast.ts                        # `<zt-toast-container>` listener for toastService
│   │   └── index.ts                        # Side-effect imports (registers all custom elements)
│   │
│   ├── data/                               # SQLite database files (gitignored)
│   │   ├── ztcwm.db
│   │   ├── ztcwm.db-shm
│   │   └── ztcwm.db-wal
│   │
│   ├── pages/                              # One Lit element per route — lazy-loaded
│   │   ├── api-explorer.ts / .test.ts      # Admin/operator-only ZT API explorer
│   │   ├── controllers.ts
│   │   ├── dashboard.ts
│   │   ├── login.ts / login.test.ts
│   │   ├── logs.ts                         # Renders logService entries
│   │   ├── members.ts                      # All-networks member roll-up
│   │   ├── network-detail.ts / .test.ts    # Largest page (977 lines) — network + members editor
│   │   ├── networks.ts / networks.test.ts
│   │   ├── pending.ts                      # Pending member authorizations
│   │   ├── settings.ts
│   │   ├── setup.ts / setup.test.ts        # First-run wizard (admin + ZT config)
│   │   └── users.ts / users.test.ts        # Admin-only user management
│   │
│   ├── router/                             # Vaadin Router config + auth helpers
│   │   ├── index.ts                        # `initRouter`, `checkSetupStatus`, `checkAuth`
│   │   └── index.test.ts
│   │
│   ├── server/                             # Fastify backend (separate tsconfig + dist)
│   │   ├── index.ts                        # Bootstrap, plugin order, hook order, route registration
│   │   ├── tsconfig.json                   # Server TS config (Node ES2022 + NodeNext)
│   │   ├── auth/                           # Auth primitives (no HTTP coupling)
│   │   │   ├── password.ts / .test.ts      # bcrypt hash/compare + strength validator
│   │   │   ├── rbac.ts / rbac.test.ts      # Role hierarchy + getMinRole + isLastAdmin
│   │   │   ├── session-store.ts / .test.ts # Custom SQLite session store
│   │   │   └── username.ts / .test.ts      # Username regex validator
│   │   ├── db/                             # Persistence wiring
│   │   │   ├── index.ts / index.test.ts    # `initDatabase` (WAL + migrations)
│   │   │   ├── migrator.ts / .test.ts      # Sequential transactional migrator
│   │   │   └── zt-config.ts / .test.ts     # AES-256-GCM encrypt/decrypt of ZT auth token
│   │   ├── migrations/                     # Numbered, ordered SQL-as-TS migrations
│   │   │   ├── 001-create-migrations.ts
│   │   │   ├── 002-create-users.ts
│   │   │   ├── 003-create-zt-config.ts
│   │   │   └── 004-username-collate-nocase.ts
│   │   ├── routes/                         # FastifyPluginAsync route groups
│   │   │   ├── api.ts                      # `/health`
│   │   │   ├── auth.ts                     # `/auth/login`, `/auth/logout`, `/auth/me`, `/csrf-token`
│   │   │   ├── member-ip-validator.ts / .test.ts  # Pure IP validation helper
│   │   │   ├── setup.ts / setup.test.ts    # `/setup/status|admin|zt-config|test-connection`
│   │   │   ├── users.ts / users.test.ts    # Admin user mgmt + change-password
│   │   │   ├── zt-proxy-helpers.ts         # ztFetch + error translation
│   │   │   └── zt-proxy.ts / .test.ts      # `/api/zt/*` typed routes + admin wildcard
│   │   └── dist/                           # tsc build output for production (gitignored)
│   │
│   ├── services/                           # Client singletons (one concern each)
│   │   ├── log-service.ts                  # In-memory log ring buffer + listeners
│   │   ├── member-service.ts / .test.ts
│   │   ├── network-service.ts / .test.ts
│   │   ├── node-service.ts
│   │   ├── toast-service.ts                # Toast queue (max 3, auto-dismiss)
│   │   ├── user-service.ts / .test.ts      # Current-user cache + role checks
│   │   └── index.ts                        # Re-exports every singleton
│   │
│   ├── styles/                             # Lit `css` design tokens + shared styles
│   │   ├── theme.ts                        # `theme`, `lightTheme`, `resetStyles` (CSS vars)
│   │   ├── theme-audit.test.ts             # Tokens-stay-in-sync test
│   │   ├── theme-contrast.test.ts          # WCAG contrast assertions
│   │   ├── shared.ts                       # `.card`, `.btn`, etc.
│   │   └── index.ts                        # Re-exports
│   │
│   ├── tests/                              # Cross-cutting test files (not co-located)
│   │   └── docs-audit.test.ts              # Verifies docs/ stays in sync with source
│   │
│   ├── types/                              # Shared TS interfaces
│   │   ├── zerotier.ts                     # ControllerStatus, Network, Member, Peer, ApiError, …
│   │   └── index.ts                        # `export * from './zerotier.js'`
│   │
│   └── utils/                              # Pure helpers (no DOM/Fastify dependencies)
│       ├── concurrency.ts                  # `concurrentMap` worker pool
│       ├── concurrency.test.ts
│       ├── config.ts                       # Theme preference (localStorage)
│       ├── config.test.ts
│       ├── helpers.ts                      # filterMembers, isIPv4, cidrToRange, copyToClipboard
│       ├── helpers.test.ts
│       └── index.ts
│
├── .gitignore
├── .initial-prompt.md                      # Original project brief
├── .TODO.md
├── copilot-instructions.md
└── README.md
```

## Directory Purposes

**`src/`:**
- Purpose: Single source root for both frontend and backend (no monorepo split)
- Contains: Top-level entry files (`main.ts`, `app.ts`, `index.html`, `server/index.ts`), config (`vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `eslint.config.js`, `.prettierrc`), and all subsystem subdirectories
- Key files: `src/main.ts`, `src/app.ts`, `src/server/index.ts`

**`src/api/`:**
- Purpose: Client-side HTTP transport for the ZT proxy
- Contains: `HttpClient` class wrapping `fetch` with CSRF + cookies + typed errors
- Key files: `src/api/http-client.ts`

**`src/components/`:**
- Purpose: Reusable Lit UI primitives shared across pages
- Contains: One `@customElement` per file, paired `*.test.ts`, plus `index.ts` for side-effect registration
- Key files: `src/components/data-table.ts`, `src/components/sidebar.ts`, `src/components/modal.ts`, `src/components/toast.ts`

**`src/pages/`:**
- Purpose: Top-level routed views — one Lit element per route
- Contains: `*.ts` page module + co-located `*.test.ts`; some pages (`network-detail`, `setup`, `users`) are large enough that route-specific helpers live alongside them
- Key files: `src/pages/dashboard.ts`, `src/pages/network-detail.ts`, `src/pages/setup.ts`, `src/pages/users.ts`

**`src/router/`:**
- Purpose: Vaadin Router routing table + auth/setup gate helpers
- Contains: `initRouter`, `checkSetupStatus`, `checkAuth`, `resetSetupCache`
- Key files: `src/router/index.ts`

**`src/services/`:**
- Purpose: Client-side singletons that own cross-page state and wrap API calls
- Contains: One service class per concern, all exported as ready instances
- Key files: `src/services/index.ts` (canonical re-export point)

**`src/server/`:**
- Purpose: Fastify HTTP server, auth, persistence — lives under `src/` but builds to its own `dist/` via its own `tsconfig.json`
- Contains: Entry, route plugins, auth primitives, db wiring, migrations
- Key files: `src/server/index.ts`, `src/server/tsconfig.json`

**`src/server/routes/`:**
- Purpose: HTTP route plugins, one `FastifyPluginAsync` per concern
- Contains: `api.ts` (health), `auth.ts`, `setup.ts`, `users.ts`, `zt-proxy.ts` (+ `zt-proxy-helpers.ts`, `member-ip-validator.ts`)
- Key files: `src/server/routes/zt-proxy.ts`

**`src/server/auth/`:**
- Purpose: Auth primitives reusable from any route
- Contains: `password.ts` (bcrypt + strength), `rbac.ts` (role hierarchy + `getMinRole`), `session-store.ts` (custom SQLite session store), `username.ts` (regex validator)
- Key files: `src/server/auth/rbac.ts`, `src/server/auth/session-store.ts`

**`src/server/db/`:**
- Purpose: SQLite open + migrate + ZT config encryption helpers
- Contains: `index.ts::initDatabase`, `migrator.ts::runMigrations`, `zt-config.ts` (AES-256-GCM)
- Key files: `src/server/db/index.ts`, `src/server/db/zt-config.ts`

**`src/server/migrations/`:**
- Purpose: Numbered, ordered schema migrations
- Contains: `NNN-description.ts` files exporting `up(db)` and `down(db)`
- Key files: All four are required to construct the schema

**`src/styles/`:**
- Purpose: Single source of CSS tokens and shared component styles
- Contains: `theme.ts` (CSS vars for dark + light), `shared.ts` (`.card`, `.btn`), `theme-audit.test.ts` and `theme-contrast.test.ts` for invariants
- Key files: `src/styles/theme.ts`, `src/styles/shared.ts`

**`src/types/`:**
- Purpose: Shared TypeScript interfaces describing the ZT API and app config
- Contains: `zerotier.ts` (Network, Member, Peer, ApiError, …) re-exported via `index.ts`
- Key files: `src/types/zerotier.ts`

**`src/utils/`:**
- Purpose: Pure helpers with no DOM or Fastify imports — usable from either side
- Contains: `concurrency.ts`, `helpers.ts` (IP/CIDR/filter helpers), `config.ts` (theme preference)
- Key files: `src/utils/helpers.ts`, `src/utils/concurrency.ts`

**`src/tests/`:**
- Purpose: Cross-cutting tests that don't belong next to any single source file
- Contains: `docs-audit.test.ts`
- Key files: `src/tests/docs-audit.test.ts`

**`data/` and `src/data/`:**
- Purpose: Runtime SQLite database files
- Contains: `ztcwm.db`, `ztcwm.db-wal`, `ztcwm.db-shm`
- Key files: Path resolved by `process.env.ZTCWM_DB_PATH ?? resolve(process.cwd(), 'data/ztcwm.db')` (`src/server/db/index.ts:9`)

**`docs/`:**
- Purpose: Project-facing documentation
- Contains: `api-reference.md`, `architecture.md`, `development.md`, plus a test-only `test-migration.db`
- Key files: `docs/api-reference.md`, `docs/architecture.md`

**`.docs/`:**
- Purpose: Vendor / upstream reference material kept locally for offline inspection
- Contains: `zerotier-one/`, `ztncui/`
- Key files: Reference only — never imported

**`.planning/`:**
- Purpose: GSD command artefacts (codebase maps, project notes)
- Contains: `codebase/` (this directory), `PROJECT.md`, `config.json`
- Key files: `.planning/PROJECT.md`

## Key File Locations

**Entry Points:**
- `src/index.html` — SPA HTML; loads `main.ts` as a module
- `src/main.ts` — One-liner that imports `./app.js` (kept tiny so HMR works cleanly)
- `src/app.ts` — `<zt-app>` Lit root, pre-router auth/setup gate, fetch 401 interceptor
- `src/server/index.ts` — Fastify bootstrap

**Configuration:**
- `src/package.json` — Dependencies, npm scripts (`dev`, `dev:server`, `dev:client`, `build`, `start`, `test`, `lint`, `format`)
- `src/tsconfig.json` — Frontend TS config (target ES2021, lib DOM, moduleResolution bundler, decorators on)
- `src/server/tsconfig.json` — Server TS config (target ES2022, moduleResolution NodeNext, excludes `*.test.ts`)
- `src/vite.config.ts` — Vite dev port 3001, `/api` proxy → `localhost:3000`, build to `dist/`
- `src/vitest.config.ts` — Vitest config (uses happy-dom)
- `src/.prettierrc` — Formatting rules
- `src/eslint.config.js` — Flat ESLint config with `eslint-plugin-lit`
- `src/.env.example` — Documented env vars (`PORT`, `NODE_ENV`, `SESSION_SECRET`, `COOKIE_SECURE`, `ZTCWM_DB_PATH`, `ZTCWM_ZT_URL`, `ZTCWM_ZT_TOKEN`)

**Core Logic (frontend):**
- `src/router/index.ts` — Routing table + `checkAuth` / `checkSetupStatus`
- `src/api/http-client.ts` — `httpClient` singleton, CSRF cache, `ApiError` shaping
- `src/services/index.ts` — Re-exports every client service singleton

**Core Logic (backend):**
- `src/server/index.ts` — Plugin/hook ordering (numbered comments 1–11)
- `src/server/routes/zt-proxy.ts` — All ZT-proxied endpoints (typed + wildcard)
- `src/server/routes/zt-proxy-helpers.ts` — `ztFetch` + error translation
- `src/server/auth/rbac.ts` — Single source of truth for role hierarchy
- `src/server/db/zt-config.ts` — Encrypted ZT auth token storage

**Testing:**
- `src/**/*.test.ts` — Co-located unit tests (Vitest + happy-dom + @open-wc/testing-helpers)
- `src/tests/docs-audit.test.ts` — Cross-cutting docs sync test
- `src/server/db/migrator.test.ts` — Migration runner test (uses ephemeral DBs)

## Naming Conventions

**Files:**
- All TypeScript source: `kebab-case.ts` (e.g. `network-service.ts`, `zt-proxy-helpers.ts`)
- Tests: co-located `kebab-case.test.ts` next to the unit under test
- Page components: `kebab-case.ts` named after the route (`dashboard.ts`, `network-detail.ts`, `api-explorer.ts`)
- Migrations: `NNN-description.ts` with three-digit zero-padded sequence (`001-create-migrations.ts` … `004-username-collate-nocase.ts`)
- Config files: tool default names (`tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `.prettierrc`)

**Directories:**
- All lowercase, single-word where possible (`api`, `pages`, `services`, `utils`, `types`, `styles`, `router`, `server`, `migrations`)
- Feature subdirs are flat — no further nesting inside `pages/`, `components/`, `services/`, `routes/`

**Custom-element tags:**
- App shell: `zt-app`
- Pages: `page-<route>` (`page-dashboard`, `page-network-detail`, `page-users`)
- Reusable components: `zt-<name>` (`zt-sidebar`, `zt-data-table`, `zt-modal`, `zt-toast-container`)

**Classes:**
- Lit elements: `Pt + ScreamingPascal` for pages (`PageDashboard`, `PageNetworkDetail`) and `Zt + ScreamingPascal` for shells/components (`ZtApp`, `ZtSidebar`, `ZtDataTable`)
- Services: `FooService` paired with `export const fooService = new FooService()` (`NetworkService` / `networkService`)
- Server route plugins: `fooRoutes` constants typed as `FastifyPluginAsync`

## Where to Add New Code

**New SPA route / page:**
- Page: `src/pages/<route>.ts` exporting `@customElement('page-<route>')`
- Route entry: append to the `children` array in `src/router/index.ts:67` with `action: async () => { await import('../pages/<route>.js'); }` (use `.js` import suffix even for `.ts` source — required by ESM bundler resolution)
- Sidebar nav (if user-facing): add an entry in `src/components/sidebar.ts`
- Test: co-located `src/pages/<route>.test.ts`

**New reusable component:**
- File: `src/components/<name>.ts` exporting `@customElement('zt-<name>')`
- Register: add `import './<name>.js';` to `src/components/index.ts`
- Test: co-located `src/components/<name>.test.ts`
- Styles: import `theme` (and `sharedStyles` if applicable) from `src/styles/`

**New ZT-proxied endpoint (typed):**
- Add a `fastify.<method>(...)` block inside `src/server/routes/zt-proxy.ts` (numbered comment block style); validate IDs with `NETWORK_ID_RE` / `NODE_ID_RE`
- Add a method on the matching service in `src/services/<x>-service.ts` that calls `httpClient.<method>(path)`
- Add types in `src/types/zerotier.ts` if a new shape is involved
- Test: `src/server/routes/zt-proxy.test.ts` for the proxy + `src/services/<x>-service.test.ts` for the client wrapper

**New non-ZT API endpoint (auth, users, setup, internal):**
- Choose the right plugin: `src/server/routes/auth.ts`, `src/server/routes/users.ts`, `src/server/routes/setup.ts`, or create a new plugin under `src/server/routes/` and register it in `src/server/index.ts` after the existing route registrations
- Use raw `fetch('/api/...')` from a service or page (do NOT extend `HttpClient`, which is reserved for `/api/zt`)

**New database table or schema change:**
- File: `src/server/migrations/<NNN>-<description>.ts` with `up(db)` and `down(db)` exports
- Register: append to the `migrations` array in `src/server/db/migrator.ts:14`
- Test: include scenarios in `src/server/db/migrator.test.ts`
- Helpers: prefer adding a typed access module under `src/server/db/` (see `zt-config.ts` as reference)

**New auth primitive:**
- Add to `src/server/auth/<name>.ts` with co-located `*.test.ts`
- Consume via `import` in route plugins; if it requires per-request data, decorate `FastifyInstance` in `src/server/index.ts`

**New shared util:**
- Pure (no DOM, no Fastify): `src/utils/<name>.ts` + co-located test
- Re-export through `src/utils/index.ts` if it should be part of the public utility surface
- Server-only: keep under `src/server/` instead

**New design token / shared style:**
- Add CSS variable to `src/styles/theme.ts` (BOTH dark and light blocks) — `theme-audit.test.ts` enforces parity
- If the same hex appears at boot time before Lit hydrates, also update the `MIRROR-START` block in `src/index.html:33`
- Reusable class: add to `src/styles/shared.ts`

**New service singleton:**
- File: `src/services/<name>-service.ts` with `class XService { … }` and trailing `export const xService = new XService();`
- Add to `src/services/index.ts` re-exports
- Test: co-located `src/services/<name>-service.test.ts`

## Special Directories

**`src/server/dist/`:**
- Purpose: Build output of `tsc -p server/tsconfig.json`
- Generated: Yes (by `npm run build`)
- Committed: No (in `.gitignore`)

**`src/data/`:**
- Purpose: Default location of `ztcwm.db` when running from `src/`
- Generated: Yes (created at first server boot; path overridable via `ZTCWM_DB_PATH`)
- Committed: No (the `.db`, `.db-wal`, `.db-shm` files are gitignored runtime state)

**`docs/test-migration.db`:**
- Purpose: Test fixture for migrator tests
- Generated: Yes (recreated by tests)
- Committed: Test fixture only

**`.docs/`:**
- Purpose: Vendored upstream documentation (zerotier-one, ztncui) for offline reference
- Generated: No
- Committed: Yes — read-only reference, never imported by source

**`.planning/`:**
- Purpose: GSD planning workspace
- Generated: Yes (by GSD commands)
- Committed: Per project preference

---

*Structure analysis: 2026-05-04*
