# ztcwm — Development Guide

## Tech Stack

| Layer        | Technology                                                                     |
| ------------ | ------------------------------------------------------------------------------ |
| Language     | TypeScript (strict mode)                                                       |
| UI Framework | Lit (Web Components)                                                           |
| Build Tool   | Vite                                                                           |
| Router       | @vaadin/router                                                                 |
| Linting      | ESLint + @typescript-eslint                                                    |
| Formatting   | Prettier                                                                       |
| Backend      | Fastify 5                                                                      |
| Database     | better-sqlite3 (WAL mode)                                                      |
| Auth         | bcrypt(12) + @fastify/session + @fastify/csrf-protection + @fastify/rate-limit |
| Crypto       | AES-256-GCM via Node `crypto`                                                  |
| Test         | Vitest + happy-dom + @open-wc/testing                                          |

## Project Structure

```
src/
├── index.html              # Entry HTML (boot-time mirror of theme tokens)
├── main.ts                 # Bootstrap
├── app.ts                  # Root app shell (zt-app, theme + auth gate)
├── api/
│   ├── index.ts
│   └── http-client.ts      # Central HTTP client (fetch wrapper)
├── components/
│   ├── badge.ts            # Status badges
│   ├── data-table.ts       # Reusable sortable/filterable table
│   ├── empty-state.ts      # Empty state placeholder
│   ├── ip-chip-editor.ts   # Inline IP chip editor (Phase 14)
│   ├── loading.ts          # Spinner
│   ├── logo.ts             # Brand mark
│   ├── modal.ts            # Dialog overlay
│   ├── navbar.ts           # Top navigation bar
│   ├── sidebar.ts          # Main navigation sidebar
│   ├── stat-card.ts        # Dashboard stat cards
│   └── toast.ts            # Toast notifications
├── pages/
│   ├── api-explorer.ts     # /api
│   ├── controllers.ts      # /controllers
│   ├── dashboard.ts        # /dashboard
│   ├── login.ts            # /login (Phase 7)
│   ├── logs.ts             # /logs
│   ├── members.ts          # /members
│   ├── network-detail.ts   # /networks/:id
│   ├── networks.ts         # /networks
│   ├── pending.ts          # /pending
│   ├── settings.ts         # /settings
│   ├── setup.ts            # /setup (Phase 8 first-run wizard)
│   └── users.ts            # /users (Phase 12 admin user management)
├── router/
│   └── index.ts            # Route definitions + auth guard
├── services/
│   ├── log-service.ts      # In-memory event log (pub/sub)
│   ├── member-service.ts   # Member CRUD against /api/zt/controller
│   ├── network-service.ts  # Network CRUD with unstable API fallback
│   ├── node-service.ts     # Node status + peer info
│   ├── toast-service.ts    # Toast event bus
│   └── user-service.ts     # Local user CRUD against /api/users
├── server/                 # Fastify backend (Phase 6+)
│   ├── index.ts            # Server entry; hook order; route registration
│   ├── tsconfig.json       # Backend-specific tsconfig (CommonJS-friendly)
│   ├── auth/
│   │   ├── session-store.ts  # SQLite-backed session store
│   │   ├── password.ts       # bcrypt(12) hashing
│   │   ├── rbac.ts           # Role guard middleware
│   │   └── username.ts       # Username rename helper
│   ├── db/
│   │   ├── index.ts          # better-sqlite3 init + migrate runner
│   │   ├── migrator.ts
│   │   └── zt-config.ts      # AES-256-GCM-encrypted ZT token row
│   ├── migrations/           # Numbered .sql files
│   └── routes/
│       ├── api.ts            # General /api/*
│       ├── auth.ts           # /api/auth/login, /logout, /csrf
│       ├── setup.ts          # /api/setup (first-run only)
│       ├── users.ts          # /api/users (Admin CRUD)
│       ├── zt-proxy.ts       # /api/zt/* (path-validated proxy)
│       ├── zt-proxy-helpers.ts
│       └── member-ip-validator.ts  # Phase 13
├── styles/
│   ├── theme.ts            # Dark + light theme tokens (Phase 5 + 16)
│   ├── shared.ts           # Shared utility styles incl. .btn-* system
│   ├── theme-audit.test.ts   # Phase 16 button-class + literal-color guardrails
│   └── theme-contrast.test.ts # Phase 16 WCAG AA contrast unit test
├── tests/
│   └── docs-audit.test.ts  # Phase 17 documentation-audit guardrails
├── types/
│   └── zerotier.ts         # TypeScript interfaces for the ZT API
└── utils/
    ├── concurrency.ts      # concurrentMap (Phase 4)
    ├── config.ts           # localStorage UI prefs (theme, API URL)
    └── helpers.ts          # Formatters, clipboard, ID gen
```

## Component Conventions

- All components use `zt-` prefix (e.g. `<zt-sidebar>`)
- Page components use `page-` prefix (e.g. `<page-dashboard>`)
- Each component is a self-contained Lit element with co-located styles
- Decorator-based property definitions: `@property`, `@state`
- Shadow DOM scoped styles — no global CSS leakage

## Adding a New Page

1. Create `src/pages/my-page.ts`:

<!-- prettier-ignore -->
```typescript
import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { theme } from '../styles/theme.js';
import { sharedStyles } from '../styles/shared.js';

@customElement('page-my-page')
export class PageMyPage extends LitElement {
    static styles = [theme, sharedStyles, css`:host { display: block; padding: 1.5rem; }`];

    render() {
        return html`<zt-navbar title="My Page"></zt-navbar>`;
    }
}
```

2. Add route in `src/router/index.ts`:

```typescript
{
    path: '/my-page',
    component: 'page-my-page',
    action: async () => { await import('../pages/my-page.js'); },
},
```

3. Add sidebar entry in `src/components/sidebar.ts` `navItems` array.

## Adding a New Component

1. Create `src/components/my-widget.ts`
2. Export it from `src/components/index.ts`
3. Import in consuming page: `import '../components/my-widget.js';`

## Code Style

- **Indent**: 4 spaces
- **Semicolons**: always
- **Quotes**: single
- **Max width**: 100 chars

Run `npm run lint` and `npm run format` before committing.

## Testing

The full Vitest suite covers frontend unit, Lit component, and backend route tests. Conventions:

- Run the full suite: `npm test` (628+ tests, ~20 seconds)
- Watch mode: `npm run test:watch`
- Filter by file: `npx vitest run path/to/file.test.ts`
- Filter by test name: `npx vitest run -t "substring"`
- Test environment: `happy-dom` (per `src/vitest.config.ts:6`)
- Lit components: tested via `@open-wc/testing` helpers
- Per-file env override: `// @vitest-environment node` on line 1 (e.g. `src/tests/docs-audit.test.ts`)
- Test placement: colocated next to source — `src/foo/bar.ts` ↔ `src/foo/bar.test.ts`
- The `src/tests/` directory holds tests with no source-code partner (e.g. the documentation-audit guardrail that walks the repo's Markdown)
- The `src/styles/theme-audit.test.ts` file-walker is the canonical analog for "audit the entire tree" tests
- Style: 4-space indent, single quotes, semis (mirrors `src/eslint.config.js` + `.prettierrc`)

The current baseline is 628 passing tests across 32 files (as of v3.0). When adding a new feature with `*.test.ts` next to the source, the suite picks it up automatically — no glob change needed.

## Backend Patterns

Mirroring the `Adding a New Page` recipe above, here is the equivalent for a new backend route. Conventions are: one `*Routes` plugin per resource, manual input validation (no zod/valibot — see "Out of Scope" in REQUIREMENTS.md), RBAC via `server.authGuard(...)` preHandler, and a colocated `*.test.ts` exercising the route through Fastify's `inject()`.

1. Create `src/server/routes/my-feature.ts`:

<!-- prettier-ignore -->
```typescript
import type { FastifyInstance } from 'fastify';

export async function myFeatureRoutes(server: FastifyInstance) {
    server.get('/my-feature', {
        preHandler: server.authGuard('admin'),
    }, async (request, reply) => {
        // handler logic
        return { ok: true };
    });
}
```

2. Register it from `src/server/index.ts`:

<!-- prettier-ignore -->
```typescript
import { myFeatureRoutes } from './routes/my-feature.js';
await server.register(myFeatureRoutes, { prefix: '/api/my-feature' });
```

3. Apply the RBAC guard via `preHandler: server.authGuard('admin' | 'operator' | 'viewer')`. The guard short-circuits with 401/403 before the handler runs.

4. Validate input manually — the project does not use zod/valibot. Mirror the patterns in `src/server/routes/users.ts` and `src/server/routes/setup.ts`: explicit `typeof`, `length`, and shape checks; reply with a structured `{ error: 'message' }` on failure.

5. Add a test: `src/server/routes/my-feature.test.ts`. Build the Fastify app the same way as the existing `setup.test.ts` and `users.test.ts` examples, then exercise the route via `app.inject({ method, url, headers, payload })`. Assert response status and body.

### Hook Order

Every request flows through Fastify's hook chain in this order (defined in `src/server/index.ts`):

1. cookie parse (`@fastify/cookie`)
2. rate limit (per-route on `/api/auth/*`; global registration is opt-in)
3. session resolve (`@fastify/session` with the `SQLiteSessionStore`)
4. CSRF token check (`@fastify/csrf-protection`, mutating `/api/*` requests only)
5. first-run gate (returns `503 needsSetup: true` when no admin exists)
6. auth gate (returns 401 when no `request.session.userId`)
7. RBAC guard (per-route, set with `preHandler: server.authGuard(...)`)
8. handler

### Migrations

Numbered SQL files live in `src/server/migrations/` (`001-create-migrations.ts`, `002-create-users.ts`, `003-create-zt-config.ts`, `004-username-collate-nocase.ts`, …). On startup, `db/migrator.ts` runs every unapplied migration in order and records the applied set in the `migrations` table. To add a new migration, drop a new `NNN-description.ts` file with a higher number — no manual registration step.

## API Proxy

The backend is the API gateway in BOTH dev and production:

- **Production**: nginx (`:443`) → Fastify (`:3000`) → handles `/api/*` directly OR proxies `/api/zt/*` to ZeroTier One on `127.0.0.1:9993` (path-validated, role-filtered).
- **Development**: Fastify (`:3000`) is still the gateway. `npm run dev` starts both Fastify (`tsx watch server/index.ts`) and Vite (`vite --port 3001`) concurrently. Fastify reverse-proxies non-`/api/*` requests to Vite for the SPA assets via `@fastify/http-proxy`. Open `http://localhost:3001` in dev — Vite serves the SPA bundle, fetches to `/api/*` are proxied back to Fastify by `vite.config.ts` `server.proxy`.

The legacy `zt-api` URL prefix from v1.0 (a Vite-dev-only proxy from the browser to the ZeroTier One service) was removed in v2.0. All ZeroTier API access now flows through the backend's `/api/zt/*` proxy.
