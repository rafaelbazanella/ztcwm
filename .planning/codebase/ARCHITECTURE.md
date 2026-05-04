<!-- refreshed: 2026-05-04 -->
# Architecture

**Analysis Date:** 2026-05-04

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                          Browser (SPA)                               │
│                                                                      │
│   `src/index.html` → `src/main.ts` → `<zt-app>` (`src/app.ts`)       │
│                                                                      │
│   ┌──────────────┐  ┌──────────────────┐  ┌──────────────────────┐   │
│   │  Sidebar     │  │ Vaadin Router    │  │ Toast / Modal        │   │
│   │ `components/ │  │ `src/router/     │  │ `components/toast.ts`│   │
│   │  sidebar.ts` │  │  index.ts`       │  │ `components/modal.ts`│   │
│   └──────────────┘  └────────┬─────────┘  └──────────────────────┘   │
│                              │ lazy-imports                          │
│                              ▼                                        │
│   ┌──────────────────────────────────────────────────────────────┐   │
│   │  Page components (Lit) — `src/pages/*.ts`                    │   │
│   │  dashboard, networks, network-detail, members, controllers,  │   │
│   │  settings, logs, api-explorer, pending, login, setup, users  │   │
│   └──────────────────────────────────────────────────────────────┘   │
│                              │ uses                                  │
│                              ▼                                        │
│   ┌──────────────────────────────────────────────────────────────┐   │
│   │  Client services (singletons) — `src/services/*.ts`          │   │
│   │  networkService, memberService, nodeService, userService,    │   │
│   │  logService, toastService                                    │   │
│   └──────────────────────────────────────────────────────────────┘   │
│                              │ HTTP via                              │
│                              ▼                                        │
│   ┌──────────────────────────────────────────────────────────────┐   │
│   │  HttpClient — `src/api/http-client.ts`                       │   │
│   │  CSRF token cache + `credentials: 'include'` cookies         │   │
│   └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │ fetch /api/* (same origin)
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  Fastify backend — `src/server/index.ts`             │
│                                                                      │
│   onRequest hook  → CSRF enforcement (mutating /api/*)               │
│   preHandler hook → first-run gate + auth gate (session.userId)      │
│                                                                      │
│   Route plugins (registered with `/api` prefix):                     │
│   ┌──────────────────────┐  ┌────────────────────────────────────┐   │
│   │ setupRoutes          │  │ authRoutes                         │   │
│   │ `routes/setup.ts`    │  │ `routes/auth.ts`                   │   │
│   └──────────────────────┘  └────────────────────────────────────┘   │
│   ┌──────────────────────┐  ┌────────────────────────────────────┐   │
│   │ apiRoutes (health)   │  │ usersRoutes (admin user mgmt)      │   │
│   │ `routes/api.ts`      │  │ `routes/users.ts`                  │   │
│   └──────────────────────┘  └────────────────────────────────────┘   │
│   ┌──────────────────────────────────────────────────────────────┐   │
│   │ ztProxyRoutes — `routes/zt-proxy.ts` (prefix `/api/zt`)      │   │
│   │   RBAC preHandler → typed routes → wildcard (admin only)     │   │
│   │   Helpers: `routes/zt-proxy-helpers.ts`,                     │   │
│   │            `routes/member-ip-validator.ts`                   │   │
│   └──────────────────────────────────────────────────────────────┘   │
└────────┬─────────────────────────────────┬──────────────────────────┘
         │                                 │
         ▼                                 ▼
┌────────────────────────────┐   ┌────────────────────────────────────┐
│  SQLite (better-sqlite3)   │   │ ZeroTier Controller (HTTP)         │
│  `data/ztcwm.db` (WAL)     │   │ X-ZT1-Auth header                  │
│  `server/db/index.ts`      │   │ URL+token from `zt_config` table   │
│                            │   │   (AES-256-GCM encrypted)          │
│  Tables:                   │   │ Helper: `routes/zt-proxy-          │
│   - migrations             │   │          helpers.ts::ztFetch`      │
│   - users                  │   └────────────────────────────────────┘
│   - sessions               │
│   - zt_config              │
└────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| App shell | Mount Lit root, install fetch 401 interceptor, pre-router auth/setup gate, theme toggle | `src/app.ts` |
| Router | Vaadin Router config, lazy page imports, per-route auth/role guards | `src/router/index.ts` |
| HttpClient | `GET/POST/DELETE` to `/api/zt`, CSRF token fetch+cache, `ApiError` shaping | `src/api/http-client.ts` |
| Network service | List/get/create/update/delete networks; `/unstable` fast path with concurrent-fallback | `src/services/network-service.ts` |
| Member service | List/get/update members; authorize/deauthorize; `id`/`nodeId` normalization | `src/services/member-service.ts` |
| Node service | Node status and peer queries | `src/services/node-service.ts` |
| User service | Cache current user, role checks (`hasRole`, `canEditNetwork`, etc.) | `src/services/user-service.ts` |
| Log service | In-memory ring buffer (500 entries) + listener pub/sub | `src/services/log-service.ts` |
| Toast service | Queue (max 3), auto-dismiss, listener pub/sub | `src/services/toast-service.ts` |
| Server bootstrap | Fastify create, plugin order, hook order, route registration, dev/prod branch | `src/server/index.ts` |
| Database init | Open SQLite, set WAL/foreign-keys, run migrations | `src/server/db/index.ts` |
| Migrator | Sequential migrations table; transactional `up` for unapplied entries | `src/server/db/migrator.ts` |
| ZT config store | AES-256-GCM encrypt/decrypt of ZT auth token using `SESSION_SECRET`-derived key | `src/server/db/zt-config.ts` |
| Session store | Custom `SQLiteSessionStore` (sid/session/expires_at/created_at) with absolute 24h cap | `src/server/auth/session-store.ts` |
| Password | bcrypt (cost 12) hash/compare + strength validator | `src/server/auth/password.ts` |
| Username | Single-source-of-truth username validator | `src/server/auth/username.ts` |
| RBAC | `getMinRole(method,path)` + `hasPermission` + `isLastAdmin` | `src/server/auth/rbac.ts` |
| ZT proxy | Method/role gate → typed routes (validated IDs) → wildcard catch-all (admin) | `src/server/routes/zt-proxy.ts` |
| ZT fetch helper | Decrypt config, attach `X-ZT1-Auth`, AbortSignal timeout, error translation | `src/server/routes/zt-proxy-helpers.ts` |
| IP validator | Member IP assignment validation (route-fit + collision detection, IPv4/IPv6) | `src/server/routes/member-ip-validator.ts` |

## Pattern Overview

**Overall:** Layered SPA (Lit web components) with a thin Fastify BFF that proxies the ZeroTier controller HTTP API. Same-origin cookies + CSRF token + server-side session store. SQLite is the single persistence target (users, sessions, encrypted ZT config).

**Key Characteristics:**
- Zero JS framework on the client beyond Lit + Vaadin Router; pages are lazy-imported per route
- Backend is a pure proxy/auth shell — no business state lives server-side except auth/config
- Pre-route auth gating is duplicated client-side (`src/app.ts::firstUpdated`) and server-side (preHandler hook in `src/server/index.ts`); the server is authoritative
- ZT auth token is encrypted at rest with AES-256-GCM keyed off `SESSION_SECRET` (`src/server/db/zt-config.ts`)
- All client services are exported as ready-made singletons from `src/services/index.ts`
- All Lit components/pages own their styles via `static styles = [theme, sharedStyles, css\`…\`]`

## Layers

**Presentation (Lit web components):**
- Purpose: Render UI, capture user input, dispatch service calls
- Location: `src/pages/`, `src/components/`, `src/styles/`
- Contains: `@customElement` classes extending `LitElement`, custom-element tag declarations, scoped CSS
- Depends on: `src/services/*`, `src/types/*`, `src/utils/*`, `src/styles/theme.ts`, `src/styles/shared.ts`
- Used by: Vaadin Router (lazy imports inside `src/router/index.ts` route `action`s)

**Routing:**
- Purpose: URL → page mapping + per-route auth/role guards
- Location: `src/router/index.ts`
- Contains: `initRouter`, `checkSetupStatus`, `checkAuth`, route table with `action` thunks
- Depends on: `@vaadin/router`, `src/services/user-service.ts` (role checks for `/users`, `/api`)
- Used by: `src/app.ts::firstUpdated`

**Client services (singletons):**
- Purpose: Encapsulate API calls + cross-page state (current user, log buffer, toast queue)
- Location: `src/services/`
- Contains: One class per concern, exported instance at module bottom (`export const networkService = new NetworkService()`)
- Depends on: `src/api/http-client.ts` (HTTP services) or `fetch` directly (auth-style endpoints in `user-service.ts`)
- Used by: Pages (`src/pages/*.ts`) and `src/router/index.ts`

**HTTP client:**
- Purpose: Single `/api/zt` access point with CSRF + cookies + typed `ApiError`
- Location: `src/api/http-client.ts`
- Contains: `HttpClient` class with `get/post/delete`, module-level CSRF cache, `handleResponse<T>`
- Depends on: `src/types/zerotier.ts` (`ApiError`)
- Used by: `network-service.ts`, `member-service.ts`, `node-service.ts`

**Server entry / middleware pipeline:**
- Purpose: Boot Fastify, decorate `db` and `sessionSecret`, install hooks, register routes, dev-proxy or static-serve branch
- Location: `src/server/index.ts`
- Contains: Numbered registration order (1–11), `onRequest` CSRF hook, two `preHandler` hooks (first-run gate, auth gate), shutdown handlers
- Depends on: All `src/server/routes/*.ts`, `src/server/db/index.ts`, `src/server/auth/session-store.ts`
- Used by: `tsx watch` (dev), `node server/dist/index.js` (prod)

**HTTP route plugins:**
- Purpose: Group endpoints by concern; each is a `FastifyPluginAsync` registered with a prefix
- Location: `src/server/routes/`
- Contains: `apiRoutes` (health), `authRoutes` (login/logout/me/csrf-token), `setupRoutes` (first-run wizard), `usersRoutes` (admin user mgmt + change-password), `ztProxyRoutes` (typed ZT proxy + admin wildcard)
- Depends on: `src/server/auth/*`, `src/server/db/zt-config.ts`, `src/server/routes/zt-proxy-helpers.ts`, `src/server/routes/member-ip-validator.ts`
- Used by: `src/server/index.ts`

**Persistence:**
- Purpose: SQLite (better-sqlite3) for users, sessions, ZT config, and applied migrations
- Location: `src/server/db/`, `src/server/migrations/`
- Contains: `initDatabase`, `runMigrations`, `zt-config.ts` (encrypt/decrypt), four numbered migrations
- Depends on: `better-sqlite3`, `node:crypto`
- Used by: Decorated as `fastify.db` in `src/server/index.ts`

## Data Flow

### Primary Request Path — viewer reads networks

1. Page mounts. `src/pages/networks.ts:60` calls `networkService.listNetworks()`.
2. `src/services/network-service.ts:20` calls `httpClient.get('/unstable/controller/network')`.
3. `src/api/http-client.ts:48` does `fetch('/api/zt/unstable/controller/network', { credentials: 'include' })`.
4. Browser sends same-origin cookie (`connect.sid`); GET requires no CSRF token (skipped at `src/server/index.ts:69`).
5. Fastify session plugin loads session via `SQLiteSessionStore.get` (`src/server/auth/session-store.ts:36`); `request.session.userId` is populated.
6. Auth `preHandler` (`src/server/index.ts:105`) lets the request through (path is under `/api/zt`, session has userId).
7. `ztProxyRoutes` `preHandler` (`src/server/routes/zt-proxy.ts:26`) calls `getMinRole('GET', '/unstable/controller/network')` → `viewer`, passes.
8. Route handler at `src/server/routes/zt-proxy.ts:222` calls `proxy(...)` → `ztFetch` (`src/server/routes/zt-proxy-helpers.ts:10`).
9. `ztFetch` reads `zt_config` row (`src/server/db/zt-config.ts:49`), decrypts AES-256-GCM token using `SESSION_SECRET`, fetches the controller URL with `X-ZT1-Auth` and 10s `AbortSignal.timeout`.
10. Response body returned to client; `HttpClient.handleResponse<T>` parses JSON.
11. Page sets `@state` and re-renders.

### Mutating Request — operator updates a member

1. `src/pages/network-detail.ts` calls `memberService.updateMember(...)` (`src/services/member-service.ts:48`).
2. `httpClient.post(...)` calls `ensureCsrfToken()` (`src/api/http-client.ts:14`), which fetches `/api/csrf-token` if cache empty (handler at `src/server/routes/auth.ts:82`).
3. POST goes out with `X-CSRF-Token` header + cookie.
4. `onRequest` CSRF hook (`src/server/index.ts:67`) validates the token via `@fastify/csrf-protection`.
5. Auth + RBAC pass (operator can POST except for ID-shaped member endpoints which permit viewer).
6. `src/server/routes/zt-proxy.ts:141` whitelist-filters the body against `ALLOWED_MEMBER_KEYS`, then if `ipAssignments` is present runs `validateIpAssignments` — fetches network + every other member of the network to detect collisions, returns 400/409 on failure, else proxies the filtered body to the controller.

### First-run / Setup flow

1. Browser loads `/` → `src/app.ts::firstUpdated` calls `checkSetupStatus()` → GET `/api/setup/status` (`src/server/routes/setup.ts:19`).
2. If no admin user exists, redirect to `/setup`; otherwise `checkAuth()` → redirect to `/login` if unauthenticated.
3. `/setup` page POSTs `/api/setup/admin` → bcrypt-hashes password, inserts into `users`.
4. `/setup` page POSTs `/api/setup/zt-config` → `saveZtConfig` encrypts token and inserts into `zt_config`.
5. Server-side first-run preHandler (`src/server/index.ts:88`) returns 503 `{ needsSetup: true }` for any non-setup, non-health, non-csrf-token API call while admin count is 0.

**State Management:**
- Per-page state: Lit `@state()` decorators inside `src/pages/*.ts`
- Cross-page state: module-level singletons in `src/services/*.ts` (no Redux/Pinia)
- Persistent UI prefs: `localStorage['zt-theme']` (theme), `sessionStorage['ztcwm-return-url']` (post-login redirect)
- Auth state: server-side session row in `sessions` table; client only knows truth via `/api/auth/me`
- CSRF token: module-level `let csrfToken = ''` cache in `src/api/http-client.ts:3`

## Key Abstractions

**Singleton service:**
- Purpose: Encapsulate one concern (network, member, log, toast, user) as one shared instance
- Examples: `src/services/network-service.ts`, `src/services/user-service.ts`, `src/services/toast-service.ts`
- Pattern: `export class FooService { … } export const fooService = new FooService();`

**Lit page component:**
- Purpose: One custom element per route; lazy-loaded by router
- Examples: `src/pages/dashboard.ts` (`page-dashboard`), `src/pages/network-detail.ts` (`page-network-detail`)
- Pattern: `@customElement('page-foo') class PageFoo extends LitElement` with `@state()` for view state, `static styles = [theme, sharedStyles, css\`…\`]`, `render()` returning `html\`…\``

**Lit reusable component:**
- Purpose: Cross-page UI primitives
- Examples: `src/components/data-table.ts`, `src/components/modal.ts`, `src/components/badge.ts`
- Pattern: `@property({ type: ... })` for inputs, `@state()` for internal state, custom events for outputs

**FastifyPluginAsync:**
- Purpose: Group routes around one concern
- Examples: `src/server/routes/auth.ts`, `src/server/routes/zt-proxy.ts`, `src/server/routes/users.ts`
- Pattern: `export const fooRoutes: FastifyPluginAsync = async (fastify) => { fastify.addHook(...); fastify.get(...); … }`

**Migration:**
- Purpose: Versioned schema change with explicit `up`/`down`
- Examples: `src/server/migrations/002-create-users.ts`, `src/server/migrations/004-username-collate-nocase.ts`
- Pattern: Numbered file (`NNN-description.ts`) exporting `up(db)` and `down(db)`; registered in the `migrations` array of `src/server/db/migrator.ts`

**Helper module:**
- Purpose: Pure, side-effect-free functions reusable across layers
- Examples: `src/utils/concurrency.ts::concurrentMap`, `src/utils/helpers.ts::filterMembers`, `src/server/routes/member-ip-validator.ts::validateIpAssignments`
- Pattern: Named exports only; no class wrapper unless state is needed

## Entry Points

**SPA entry:**
- Location: `src/index.html` → `src/main.ts` (one-line `import './app.js'`) → `src/app.ts` `<zt-app>`
- Triggers: Browser GET `/` served by Vite (dev) or Fastify static (prod)
- Responsibilities: Mount the Lit root; install fetch 401 interceptor; run pre-router setup/auth gate; initialise Vaadin Router on the `<div id="outlet">`

**Server entry:**
- Location: `src/server/index.ts`
- Triggers: `npm run dev:server` (`tsx watch server/index.ts`) or `npm start` (`node server/dist/index.js`)
- Responsibilities: Build Fastify, decorate `db` + `sessionSecret`, register plugins (cookie, rate-limit, session, csrf-protection), install hooks (CSRF enforce, first-run gate, auth gate), register route plugins, branch dev (HTTP proxy to Vite at `:3001`) vs prod (static SPA fallback)

**Route handlers:**
- Health: `GET /api/health` → `src/server/routes/api.ts:12`
- Auth: `POST /api/auth/login`, `DELETE /api/auth/logout`, `GET /api/auth/me`, `GET /api/csrf-token` → `src/server/routes/auth.ts`
- Setup: `GET /api/setup/status`, `POST /api/setup/admin`, `POST /api/setup/zt-config`, `POST /api/setup/test-connection` → `src/server/routes/setup.ts`
- User mgmt: `GET/POST /api/users`, `PUT /api/users/:id/role`, `PATCH /api/users/:id/username`, `DELETE /api/users/:id`, `POST /api/users/:id/reset-password`, `POST /api/auth/change-password` → `src/server/routes/users.ts`
- ZT proxy: typed routes 1–14 + admin wildcard `ALL /api/zt/*` → `src/server/routes/zt-proxy.ts`

## Architectural Constraints

- **Single Fastify process:** No clustering or worker threads; one Node.js event loop. Long-running ZT calls hold a connection — `ztFetch` enforces a 10s `AbortSignal.timeout` (`src/server/routes/zt-proxy-helpers.ts:34`).
- **Single SQLite DB file:** `data/ztcwm.db` (override with `ZTCWM_DB_PATH`). WAL mode, `busy_timeout=5000ms`, `foreign_keys=ON` (`src/server/db/index.ts:16`). All writes serialize via better-sqlite3 (synchronous).
- **`SESSION_SECRET` is load-bearing:** Signs session cookies AND derives the AES-256-GCM key for the stored ZT token (`src/server/db/zt-config.ts:13`). Rotating it invalidates every session AND breaks every encrypted ZT config row.
- **Module-level singletons (client):** Each service file exports one shared instance (e.g. `userService`, `httpClient`). Tests in `src/services/*.test.ts` rely on resetting these singletons.
- **CSRF token cached client-side at module scope:** `src/api/http-client.ts:3` (`let csrfToken = ''`). It is never invalidated within a session; rotation requires a page reload.
- **Single `<zt-app>` mount:** `src/app.ts` is the only place the router is initialised; redirects before router init are done by `window.location.href` to force a full reload.
- **Boot-time CSS literals duplicated in two places:** `src/index.html:33` (pre-hydration `<html>`/`<body>` background+colour) MUST stay in sync with the dark/light token values in `src/styles/theme.ts`. The `MIRROR-START`/`MIRROR-END` block in `index.html` documents this constraint.
- **No circular imports detected:** `pages → services → api → types`, and server `routes → auth/db → migrations` form clean DAGs.
- **Pre-router auth gate is best-effort:** `src/app.ts:80` checks setup+auth before initialising the router, but the server preHandler in `src/server/index.ts:105` is the authoritative gate.

## Anti-Patterns

### Bypassing the HttpClient for ZT calls

**What happens:** A page or service calls `fetch('/api/zt/...')` directly instead of going through `src/api/http-client.ts`.
**Why it's wrong:** Loses CSRF token attachment for mutating methods, loses cookie inclusion, loses `ApiError` shaping, drifts from the single base URL (`/api/zt`).
**Do this instead:** Add a method to the appropriate service (`network-service.ts`, `member-service.ts`, `node-service.ts`) that calls `httpClient.get/post/delete` (`src/api/http-client.ts:48`). The auth-style endpoints under `/api/auth/*` and `/api/setup/*` legitimately use raw `fetch` because they sit outside `/api/zt`.

### Adding business logic in route handlers

**What happens:** A new SQL query or branching policy is inlined inside a `fastify.get/post(...)` callback in `src/server/routes/*.ts`.
**Why it's wrong:** Breaks the BFF-only philosophy and duplicates logic across routes (see how `isLastAdmin` lives in `src/server/auth/rbac.ts:46` and is reused by `users.ts` PUT and DELETE).
**Do this instead:** Extract the helper into `src/server/auth/*.ts` or a new file under `src/server/db/*.ts` and call it from the route. See `validateIpAssignments` (`src/server/routes/member-ip-validator.ts`) for a reference factoring.

### Forwarding raw client bodies to the ZT controller

**What happens:** A new ZT proxy route does `proxy(path, request, reply, request.body)` without filtering.
**Why it's wrong:** Lets clients clobber unrelated fields on the next member/network update (the `request.body` echo-back problem documented in `src/server/routes/zt-proxy.ts:9` D-11).
**Do this instead:** Build a `forwardBody` from a whitelist set (`ALLOWED_MEMBER_KEYS`-style) before calling `proxy(...)`. New whitelists belong next to the route in `src/server/routes/zt-proxy.ts`.

### Hand-rolling auth state in pages

**What happens:** A page calls `fetch('/api/auth/me')` itself or stores a role in `localStorage`.
**Why it's wrong:** Duplicates the cache in `src/services/user-service.ts:11`, allows stale role data after rename/role change, and bypasses `userService.clear()` on logout.
**Do this instead:** Use `userService.getCurrentUser()` and `userService.hasRole(...)` / `userService.canEditNetwork()` etc. (`src/services/user-service.ts:43`).

### Reading `.env` directly inside routes

**What happens:** A route handler calls `process.env.SOME_VAR` instead of going through Fastify decorators.
**Why it's wrong:** Bypasses the typed `FastifyInstance` augmentation pattern and makes test injection harder.
**Do this instead:** Decorate at boot in `src/server/index.ts` (see `server.decorate('db', db)` at line 33 and `server.decorate('sessionSecret', sessionSecret)` at line 37) and consume via `fastify.db` / `fastify.sessionSecret`. Add the type via `declare module 'fastify' { interface FastifyInstance { … } }` in the consuming route file.

## Error Handling

**Strategy:** Errors are translated at the layer boundary nearest the user. The server normalises ZT controller errors into client-friendly status codes; the HttpClient surfaces server errors as a typed `ApiError`; pages map `ApiError.body.reason` to copy via small pure helpers (e.g. `mapReasonToCopy` in `src/pages/network-detail.ts:23`).

**Patterns:**
- Server-side ZT errors flow through `translateZtError` / `genericErrorResponse` (`src/server/routes/zt-proxy-helpers.ts:58`); 401/403 from the controller are remapped to 502 to avoid leaking auth-failure semantics to the SPA's 401 interceptor.
- Network unreachable / timeout become 502 / 504 from `ztFetch` (`src/server/routes/zt-proxy-helpers.ts:38`).
- The HttpClient builds an `ApiError` with `status`, `message`, and the parsed `body` so callers can read `body.reason`/`body.invalidIp` for IP-validation outcomes (`src/api/http-client.ts:24`).
- The browser-wide fetch interceptor in `src/app.ts:47` catches any 401 from `/api/*` (except login/setup) and redirects to `/login` with a `sessionStorage` return-url stash.
- Validation errors return structured JSON with `error`, `details[]` (passwords) or `reason`+`invalidIp` (IP assignments).

## Cross-Cutting Concerns

**Logging:** Server uses Fastify's pino logger (level `info` in dev, `warn` in prod — `src/server/index.ts:23`). Audit-style events are emitted as structured `fastify.log.info({ event, actorId, targetId, ... })` — see the username-rename audit in `src/server/routes/users.ts:140`. Client logs go to the in-memory `logService` (`src/services/log-service.ts`), surfaced on `/logs`.

**Validation:**
- Username: `validateUsername` (`src/server/auth/username.ts`) — sole regex source.
- Password: `validatePasswordStrength` (`src/server/auth/password.ts:18`) — 8 chars, mixed case, digit, special.
- ZT IDs: `NETWORK_ID_RE = /^[0-9a-f]{16}$/i`, `NODE_ID_RE = /^[0-9a-f]{10}$/i` (`src/server/routes/zt-proxy.ts:6`) applied to every typed route.
- IP assignments: `validateIpAssignments` (`src/server/routes/member-ip-validator.ts`) — IPv4/IPv6 parsed via `node:net` `isIP`, route-fit and cross-member collision checks.

**Authentication:** `@fastify/session` over `@fastify/cookie` with the custom `SQLiteSessionStore` (`src/server/auth/session-store.ts`). Rolling sessions with 30-min idle timeout; absolute 24h cap enforced inside the store's `get`. `rememberMe` extends `maxAge` to 7 days at login (`src/server/routes/auth.ts:54`).

**Authorization:** Role hierarchy `admin (3) > operator (2) > viewer (1)` — single source of truth in `src/server/auth/rbac.ts:5` (server) and `src/services/user-service.ts:9` (client mirror). Server gate is the `getMinRole`-based `preHandler` in `src/server/routes/zt-proxy.ts:26`; the wildcard ZT route is admin-only.

**CSRF:** `@fastify/csrf-protection` with custom `getToken` reading `X-CSRF-Token` (`src/server/index.ts:63`). Enforced via the `onRequest` hook for all mutating `/api/*` requests except login/logout/setup. The token is fetched lazily by the client via `GET /api/csrf-token`.

**Rate limiting:** `@fastify/rate-limit` registered globally with `global: false` — only `/api/auth/login` (5/min, `src/server/routes/auth.ts:18`) and `/api/setup/test-connection` (10/min, `src/server/routes/setup.ts:93`) opt in.

---

*Architecture analysis: 2026-05-04*
