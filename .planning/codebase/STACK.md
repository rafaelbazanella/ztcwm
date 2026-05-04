# Technology Stack

**Analysis Date:** 2026-05-04

## Languages

**Primary:**
- TypeScript ^5.9.3 — used for both browser (SPA) and Node.js backend code under `src/`
- HTML — single entry document `src/index.html`; component templates live inside Lit `html\`...\`` tagged templates in `*.ts` files

**Secondary:**
- JavaScript (ESM only, `"type": "module"`) — used for the ESLint flat config at `src/eslint.config.js`; everything else is `.ts`
- SQL — embedded in `db.exec()`/`db.prepare()` calls inside migrations under `src/server/migrations/` and route handlers under `src/server/routes/`

## Runtime

**Environment:**
- Node.js (LTS, ESM, top-level `await`) — required by `Fastify ^5.8.4`, `better-sqlite3 ^12.9.0`, and the top-level `await server.register(...)` calls in `src/server/index.ts:29-127`
- Browser — modern evergreen browsers (custom elements + ES2021); served from `src/index.html`
- No `.nvmrc`, `.node-version`, or `engines` field in `src/package.json` — Node version is implicit

**Package Manager:**
- npm (lockfile present at `src/package-lock.json`, ~195 KB)
- Lockfile: present
- No `pnpm-lock.yaml`, `yarn.lock`, or `bun.lockb`

## Frameworks

**Core (Backend):**
- Fastify ^5.8.4 (`fastify`) — HTTP server framework; entry point at `src/server/index.ts`
- `@fastify/sensible` ^6.0.4 — error helpers (registered first at `src/server/index.ts:29`)
- `@fastify/cookie` ^11.0.2 — cookie parsing (prerequisite for session)
- `@fastify/session` ^11.1.1 — server-side session management; uses custom `SQLiteSessionStore` from `src/server/auth/session-store.ts`
- `@fastify/csrf-protection` ^7.1.0 — CSRF tokens stored in session, validated against `x-csrf-token` header at `src/server/index.ts:60-85`
- `@fastify/rate-limit` ^10.3.0 — registered globally with `global: false`, used per-route on `/api/auth/login` (5/min) and `/api/setup/test-connection` (10/min)
- `@fastify/http-proxy` ^11.4.3 — dev-only; proxies non-`/api` requests to Vite at `http://localhost:3001` (lazy import at `src/server/index.ts:130-134`)
- `@fastify/static` ^9.1.0 — production-only; serves the built SPA from `dist/` (lazy import at `src/server/index.ts:137-141`)

**Core (Frontend):**
- Lit ^3.3.2 (`lit`) — Web Components framework; every page/component is a `LitElement` (e.g. `src/app.ts`, `src/components/badge.ts`, `src/pages/dashboard.ts`)
- `@vaadin/router` ^2.0.1 — client-side router with lazy-loaded route components; configured at `src/router/index.ts:34-160`
- `lucide-static` ^1.8.0 — SVG icon set imported as strings, rendered through Lit's `unsafeSVG` directive (e.g. `src/components/navbar.ts:3-4`)

**Testing:**
- Vitest ^4.1.4 — test runner; config at `src/vitest.config.ts` (extends Vite config, `environment: 'happy-dom'`, `globals: true`, `include: ['**/*.test.ts']`)
- happy-dom ^20.8.9 — DOM emulation for browser-side component tests
- `@open-wc/testing-helpers` ^3.0.1 — Lit/web-component fixtures (`fixture`, `aTimeout`)

**Build/Dev:**
- Vite ^6.4.1 — frontend dev server (`:3001`) and production bundler; config at `src/vite.config.ts` (proxies `/api → http://localhost:3000`)
- `tsx` ^4.21.0 — TypeScript runner used by `npm run dev:server` to run `server/index.ts` directly with `--watch`
- `concurrently` ^9.2.1 — runs server + client dev processes in parallel via `npm run dev`
- `tsc` (TypeScript compiler) — used twice in `npm run build`: once for the SPA (`tsc && vite build`) and once for the server (`tsc -p server/tsconfig.json`)

## Key Dependencies

**Critical:**
- `better-sqlite3` ^12.9.0 — synchronous SQLite driver; the only data store. Initialized at `src/server/db/index.ts` with WAL mode, `busy_timeout=5000`, `foreign_keys=ON`. DB path defaults to `./data/ztcwm.db`, overridable via `ZTCWM_DB_PATH`.
- `bcryptjs` ^2.4.3 — password hashing at cost factor 12 (`src/server/auth/password.ts:3`); also enforces strength rules (8+ chars, upper/lower/digit/special)
- `fastify` ^5.8.4 — backbone of the backend; everything is registered as a Fastify plugin under `src/server/routes/`
- `lit` ^3.3.2 — every UI component derives from `LitElement` with `@customElement`, `@state`, `@property`, `static styles = [...]`

**Security primitives (Node built-ins, no external deps):**
- `node:crypto` `createCipheriv`/`createDecipheriv` with `aes-256-gcm` — encrypts the ZeroTier auth token at rest in `zt_config.auth_token_encrypted` (`src/server/db/zt-config.ts:1-39`). Key is derived as `sha256(SESSION_SECRET)`.
- `node:crypto` `randomBytes`, `randomInt` — IV generation and temporary password generation (`src/server/routes/users.ts:9-20`)
- Native `fetch` + `AbortSignal.timeout(...)` — used to call the ZeroTier controller (no axios/got/node-fetch); see `src/server/routes/zt-proxy-helpers.ts:30-44` and `src/server/routes/setup.ts:118-121`

**Infrastructure:**
- `@types/bcryptjs` ^2.4.6 — bcryptjs typings
- `@types/better-sqlite3` ^7.6.13 — better-sqlite3 typings
- `@typescript-eslint/eslint-plugin` ^8.57.2, `@typescript-eslint/parser` ^8.57.2 — TS linting
- `eslint` ^9.39.4 (flat config), `eslint-config-prettier` ^10.1.8, `eslint-plugin-lit` ^2.2.1 — linting toolchain configured at `src/eslint.config.js`
- `prettier` ^3.8.1 — formatter; rules at `src/.prettierrc` (4 spaces, semis, single quotes, trailing commas, printWidth 100)

## Configuration

**TypeScript — two distinct projects:**
- SPA: `src/tsconfig.json` (`target: ES2021`, `module: ESNext`, `moduleResolution: bundler`, `lib: ['ES2021', 'DOM', 'DOM.Iterable']`, `experimentalDecorators: true`, `useDefineForClassFields: false` — required by Lit decorators; `types: ['vitest/globals']`)
- Server: `src/server/tsconfig.json` (`target: ES2022`, `module: NodeNext`, `moduleResolution: NodeNext`, `lib: ['ES2022']`, `esModuleInterop: true`, excludes `**/*.test.ts` from build output; outputs to `src/server/dist/`)
- Both: `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `isolatedModules: true`, `declaration: true`

**Linting:**
- `src/eslint.config.js` (flat config) — extends `js.configs.recommended` and `eslint-config-prettier`, applies `@typescript-eslint` and `eslint-plugin-lit` to `**/*.ts`. Hard rules: 4-space indent, semicolons required, single quotes, `parameter-properties: 'error'`, `no-unused-vars` allows `_`-prefixed args. Ignores `dist/`, `node_modules/`, `vite.config.ts`.

**Formatting:**
- `src/.prettierrc` — `tabWidth: 4`, `singleQuote: true`, `trailingComma: 'all'`, `printWidth: 100`, `arrowParens: 'always'`, `bracketSpacing: true`, `semi: true`

**Vite (`src/vite.config.ts`):**
- `root: '.'`, `@` alias points to project root
- Dev server: `port: 3001`, `proxy: { '/api': 'http://localhost:3000' }` — every `/api` request is forwarded to the Fastify backend, eliminating CORS in dev
- Build: `outDir: 'dist'`, `sourcemap: true`

**Vitest (`src/vitest.config.ts`):**
- `mergeConfig(viteConfig, ...)` — inherits `@` alias from Vite
- `environment: 'happy-dom'`, `globals: true`, `include: ['**/*.test.ts']`

**Environment (template at `src/.env.example`, real `.env` is gitignored at `src/.gitignore:4`):**
- `PORT` — Fastify backend port (default `3000`)
- `NODE_ENV` — `production` switches dev proxy to static-file serving in `src/server/index.ts:128-153`
- `SESSION_SECRET` — single secret; signs session cookies AND is `sha256`-derived into the AES-256-GCM key for the stored ZeroTier auth token (`src/server/db/zt-config.ts:13-15`). Dev fallback `'ztcwm-dev-secret-change-in-production'` at `src/server/index.ts:36`.
- `COOKIE_SECURE` — set to `'true'` to enable the Secure cookie flag (production only)
- `ZTCWM_DB_PATH` — overrides SQLite file path (default `./data/ztcwm.db`)
- `ZTCWM_ZT_URL`, `ZTCWM_ZT_TOKEN` — optional pre-seed pair; when both are set, the setup wizard skips the ZT-token step (`src/server/db/zt-config.ts:63-65`)

**Build outputs (gitignored):**
- `src/dist/` — Vite SPA build
- `src/server/dist/` — server `tsc` build
- `src/data/` — runtime SQLite files (`ztcwm.db`, `ztcwm.db-shm`, `ztcwm.db-wal`)

## Platform Requirements

**Development:**
- Node.js with ESM and top-level `await` support (LTS recommended)
- npm
- POSIX filesystem assumed (the server creates `dirname(dbPath)` recursively at `src/server/db/index.ts:12`)
- Two ports free locally: `3000` (Fastify) and `3001` (Vite)
- A reachable ZeroTier One controller exposing its admin API (typically `http://localhost:9993` per `src/.env.example:35`)

**Production:**
- Per `README.md`: nginx terminates TLS and reverse-proxies to Fastify on `127.0.0.1:3000`. Build pipeline: `npm run build` → start with `NODE_ENV=production node server/dist/index.js` (`src/package.json:11`). The `setNotFoundHandler` at `src/server/index.ts:144-153` serves `index.html` for SPA routes and returns JSON 404 for `/api/*`.
- Process is expected to run as a non-root system user (`ztcwm`); secrets file at `/etc/ztcwm/ztcwm.env` (mode 0600, owner `ztcwm:ztcwm`) per `src/.env.example` comments.
- No Docker images, Kubernetes manifests, or CI workflows are committed in this repo.

---

*Stack analysis: 2026-05-04*
