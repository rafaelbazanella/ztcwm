# External Integrations

**Analysis Date:** 2026-05-04

## APIs & External Services

**ZeroTier One Controller API (the only external service):**
- Service: ZeroTier One controller administrative API (typically `http://127.0.0.1:9993` on the same host) — used for all network/member/peer/status operations.
- SDK/Client: none — calls go through the platform `fetch` with an `AbortSignal.timeout(...)` (default 10s in `src/server/routes/zt-proxy-helpers.ts:34`, 5s for the setup test in `src/server/routes/setup.ts:120`). No `axios`, `got`, `node-fetch`, or ZeroTier SDK is in `dependencies`.
- Auth: per-request `X-ZT1-Auth` header (`src/server/routes/zt-proxy-helpers.ts:22-24`); token value is decrypted at request time from the `zt_config` table by `getZtConfig()` (`src/server/db/zt-config.ts:49-56`).
- Auth source: configured by an admin via `POST /api/setup/zt-config` (`src/server/routes/setup.ts:64-87`) or pre-seeded by the env vars `ZTCWM_ZT_URL` + `ZTCWM_ZT_TOKEN` (detected via `isZtConfiguredViaEnv()` at `src/server/db/zt-config.ts:63-65`).
- Token storage: AES-256-GCM, IV per record, key = `sha256(SESSION_SECRET)`. Implementation at `src/server/db/zt-config.ts:13-39`.
- Token never reaches the browser — every controller call is proxied through Fastify under `/api/zt/*` (`src/server/index.ts:123`, plugin at `src/server/routes/zt-proxy.ts`).
- Whitelisted upstream paths (typed routes in `src/server/routes/zt-proxy.ts:24-234`):
  - `GET  /status` — node status
  - `GET  /peer`, `GET /peer/:address` (10-hex address)
  - `GET  /controller`
  - `GET  /controller/network` — list network IDs
  - `GET  /controller/network/:networkId` (16-hex)
  - `POST /controller/network` — create network
  - `POST /controller/network/:networkId` — update network
  - `DELETE /controller/network/:networkId` — delete network
  - `GET  /controller/network/:networkId/member`
  - `GET  /controller/network/:networkId/member/:memberId` (10-hex)
  - `POST /controller/network/:networkId/member/:memberId` — update member; body is whitelist-filtered against `ALLOWED_MEMBER_KEYS` at `src/server/routes/zt-proxy.ts:11-22`, and `ipAssignments` are validated against the network's `routes[]` and other members' assignments via `validateIpAssignments` (`src/server/routes/member-ip-validator.ts`).
  - `GET  /unstable/controller/network` — networks with metadata (also used by SPA via `NetworkService.listNetworks` at `src/services/network-service.ts:20-23`, with a fallback to fan-out detail fetches)
  - `GET  /unstable/controller/network/:networkId/member` — members with metadata
- Admin-only catch-all: `fastify.all<{ Params: { '*': string } }>('/*')` at `src/server/routes/zt-proxy.ts:236-249` forwards any other path for users with `role === 'admin'` (used by the API Explorer page `src/pages/api-explorer.ts`).
- Error translation: ZT controller responses are mapped into client-friendly errors (`502` for `401/403/5xx`, `504` for timeout, `503` when ZT is not yet configured) in `translateZtError`/`genericErrorResponse`/`ztFetch` at `src/server/routes/zt-proxy-helpers.ts:38-71`.
- RBAC: a `preHandler` hook on the proxy plugin computes the minimum role required for `(method, ztPath)` via `getMinRole()` (`src/server/auth/rbac.ts:12-33`). Rules: `GET → viewer`, `POST → operator` except `POST /controller/network/{16hex}/member/{10hex}` → `viewer` (so viewers can authorize), `DELETE → admin`, anything else → `admin`.

## Data Storage

**Databases:**
- SQLite via `better-sqlite3` ^12.9.0 — the only data store. Initialized at `src/server/db/index.ts:6-25` with `journal_mode = WAL`, `busy_timeout = 5000`, `foreign_keys = ON`.
- Path: `process.env.ZTCWM_DB_PATH` ?? `./data/ztcwm.db` relative to the backend cwd. Parent directory is created with `mkdirSync(..., { recursive: true })`.
- Connection: a single synchronous `Database` instance is decorated onto Fastify as `fastify.db` (`src/server/index.ts:32-33`) and on the `FastifyInstance` interface declaration in `src/server/routes/api.ts:4-8`.
- Schema (managed by the in-house migrator at `src/server/db/migrator.ts:14-49`):
  - `migrations` (`src/server/migrations/001-create-migrations.ts`) — applied-migration ledger keyed on `name`
  - `users` (`src/server/migrations/002-create-users.ts`, then rebuilt by `004-username-collate-nocase.ts` to use a `UNIQUE INDEX ... COLLATE NOCASE` on `username`) — `id`, `username`, `password_hash`, `role` (default `viewer`), `created_at`, `updated_at`, `last_login_at`
  - `zt_config` (`src/server/migrations/003-create-zt-config.ts`) — singleton row (`CHECK (id = 1)`) holding `controller_url`, `auth_token_encrypted`, `auth_token_iv`, `configured_at`, `updated_at`
  - `sessions` — created at runtime by `SQLiteSessionStore` (`src/server/auth/session-store.ts:12-19`); columns: `sid`, `session` (JSON blob), `expires_at`, `created_at`. Absolute 24h cap enforced inside `get()` regardless of `expires_at` (`src/server/auth/session-store.ts:51-55`).
- Migrator: synchronous, transactional (`db.transaction(...)`), idempotent — each migration is applied at most once and recorded in `migrations`. New migrations are added by appending an entry to the `migrations[]` array in `src/server/db/migrator.ts:14-19`.
- Runtime DB files (gitignored under `src/.gitignore:5`): `src/data/ztcwm.db`, `src/data/ztcwm.db-shm`, `src/data/ztcwm.db-wal`. A historical fixture `data/test-migration.db` lives at the repo root (read-only, not used by the running server).

**File Storage:**
- Local filesystem only. The application creates the SQLite parent directory at startup; no S3, GCS, Azure Blob, or other object store is used.

**Caching:**
- None at the server layer (no Redis, no Memcached, no in-memory LRU).
- Client-side caches:
  - Frontend `userService` caches the current user and an in-flight fetch promise to dedupe `/api/auth/me` calls (`src/services/user-service.ts:11-35`).
  - Router caches the `/api/setup/status` result via `setupChecked`/`needsSetup` module-level flags (`src/router/index.ts:4-23`).
  - `localStorage` holds only `zt-theme` (`light` | `dark`); the legacy `ztcwm-config` key is purged on first read (`src/utils/config.ts:14`).

## Authentication & Identity

**Auth Provider:**
- Local accounts only — no OAuth, OIDC, SAML, or external IdP. Stated as a design principle in `README.md` ("Smallest viable surface — local accounts only (no OAuth/SSO)").
- First admin is bootstrapped through `POST /api/setup/admin` (`src/server/routes/setup.ts:27-62`); subsequent users are managed under `/api/users/*` by an admin (`src/server/routes/users.ts:22-198`).
- Roles: `admin` | `operator` | `viewer` defined in `src/server/auth/rbac.ts:3-9`. Frontend mirrors the same trio in `src/services/user-service.ts:1-9`.
- Last-admin protection: `isLastAdmin()` in `src/server/auth/rbac.ts:46-49` blocks role-downgrade and self-delete of the only admin.

**Password handling:**
- bcryptjs at cost factor 12 (`src/server/auth/password.ts:3-7`).
- Strength validator (8+ chars, lowercase, uppercase, digit, special) at `src/server/auth/password.ts:18-26`.
- Temporary passwords for new users / admin resets are generated with `crypto.randomBytes(9).toString('base64url')`, then guaranteed-class-mixed and Fisher-Yates shuffled (`src/server/routes/users.ts:9-20`).

**Sessions & CSRF:**
- `@fastify/session` with the custom SQLite-backed `SQLiteSessionStore` (`src/server/auth/session-store.ts`).
- Cookie: `httpOnly: true`, `sameSite: 'strict'`, `secure` from `COOKIE_SECURE === 'true'`, `maxAge: 1800000` (30 min idle), `rolling: true`, `saveUninitialized: false` (`src/server/index.ts:46-58`). Remember-me extends to 7 days at `src/server/routes/auth.ts:54-56`.
- CSRF: `@fastify/csrf-protection` reads `x-csrf-token` from the header (`src/server/index.ts:61-64`). A global `onRequest` hook enforces validation on all mutating `/api/*` requests except `/api/auth/login`, `/api/auth/logout`, and `/api/setup/*` (`src/server/index.ts:67-85`). The token is fetched by the SPA from `GET /api/csrf-token` (`src/server/routes/auth.ts:82-85`) and cached on `httpClient` (`src/api/http-client.ts:3-19`).
- Auth gate: `preHandler` at `src/server/index.ts:104-111` requires `request.session.userId` for `/api/*` except `/api/auth/login`, `/api/health`, `/api/csrf-token`, `/api/setup/`.
- First-run gate: `preHandler` at `src/server/index.ts:88-101` returns `503 { needsSetup: true }` for `/api/*` when no `admin` row exists.
- Browser-side 401 handler: `app.ts:47-63` patches `window.fetch` to redirect to `/login` (preserving the intended path in `sessionStorage['ztcwm-return-url']`) on any unauthenticated `/api/*` response.

**Admin-only routes:**
- `usersRoutes` (`src/server/routes/users.ts:22-31`) installs a `preHandler` admin gate, exempting only `POST /auth/change-password` (any authenticated user can change their own password).

## Monitoring & Observability

**Error Tracking:**
- None. No Sentry, Datadog, Bugsnag, Rollbar, or OpenTelemetry SDK is in `src/package.json`.

**Logs:**
- Backend: Fastify's built-in pino logger; level `info` in dev, `warn` in production (`src/server/index.ts:23-25`). Structured audit-style entries are emitted with `fastify.log.info({ event, ... }, 'message')` — see the `event: 'user.username.changed'` line at `src/server/routes/users.ts:140-149`.
- Frontend: an in-memory ring-buffer log service for the `/logs` page (`src/services/log-service.ts`), surfaced via the `page-logs` component (`src/pages/logs.ts`). Errors and major actions are pushed there. There is no remote shipping.

**Metrics / Health:**
- `GET /api/health` (`src/server/routes/api.ts:11-28`) probes the DB with `SELECT 1` and returns `{ status, timestamp, database }`. No `/metrics` Prometheus endpoint.

## CI/CD & Deployment

**Hosting:**
- Self-hosted on a single VM behind nginx, per `README.md`. nginx terminates TLS (Let's Encrypt) and reverse-proxies to Fastify at `127.0.0.1:3000`. The Fastify process is expected to run as a non-root `ztcwm` system user.
- No Docker, Kubernetes, Terraform, Pulumi, Ansible, or Helm files are committed.

**CI Pipeline:**
- None committed. No `.github/`, `.gitlab-ci.yml`, `.circleci/`, `azure-pipelines.yml`, `.travis.yml`, or `Jenkinsfile` exists in the repo. The only workflow surface is the local `npm` scripts in `src/package.json:6-17` (`dev`, `dev:server`, `dev:client`, `build`, `start`, `preview`, `lint`, `format`, `test`, `test:watch`).

## Environment Configuration

**Required env vars (template at `src/.env.example`):**
- `SESSION_SECRET` — only mandatory secret. Used both as the session-cookie signing key AND as the seed for `sha256()` → AES-256-GCM key for the stored ZeroTier auth token. Production guidance: `openssl rand -hex 32`, stored in `/etc/ztcwm/ztcwm.env` (mode 0600).
- `NODE_ENV` — `production` is the explicit non-dev branch (`src/server/index.ts:19`).
- `PORT` — Fastify backend port (default `3000`).

**Optional env vars:**
- `COOKIE_SECURE` — `'true'` enables the Secure cookie flag; required when behind HTTPS (`src/server/index.ts:51`).
- `ZTCWM_DB_PATH` — overrides the SQLite file path (`src/server/db/index.ts:7-10`).
- `ZTCWM_ZT_URL`, `ZTCWM_ZT_TOKEN` — pre-seed the ZeroTier configuration so the setup wizard can skip the ZT-token step (`src/server/db/zt-config.ts:63-65`, `src/server/routes/setup.ts:21-22`).

**Secrets location:**
- Development: `src/.env` (gitignored at `src/.gitignore:4`); template is `src/.env.example`.
- Production (per `.env.example` comments): `/etc/ztcwm/ztcwm.env`, mode `0600`, owned by `ztcwm:ztcwm`. The ZeroTier auth token itself is never on disk in plaintext after setup — it lives encrypted in `zt_config.auth_token_encrypted`.

## Webhooks & Callbacks

**Incoming:**
- None. The application exposes no webhook endpoints. All `/api/*` routes are operator-driven (login, setup, user management, ZT proxy).

**Outgoing:**
- None. The backend's only outbound HTTP is the proxied call to the ZeroTier controller's admin API; there are no notifications, no Slack/Discord/Teams/email integrations, and no SMTP client.

---

*Integration audit: 2026-05-04*
