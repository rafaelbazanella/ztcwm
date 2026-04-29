# ztcwm — Architecture

## Overview

ztcwm is a single-page application (SPA) built with [Lit](https://lit.dev/) web components. The frontend communicates with a Fastify backend via `/api/*`; the backend authenticates the operator with a session cookie, enforces role-based access (Admin / Operator / Viewer), and proxies a whitelisted subset of the ZeroTier One controller API on `127.0.0.1:9993`. The ZeroTier auth token is AES-256-GCM-encrypted in SQLite and never reaches the browser.

```
┌──────────────────────────────────────────────────────────┐
│  Operator's Browser                                      │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Lit SPA (zt-app)                                  │  │
│  │   pages → services → HttpClient                    │  │
│  └─────────────────────────┬──────────────────────────┘  │
│                            │ fetch('/api/...')           │
└────────────────────────────┼─────────────────────────────┘
                             │ HTTPS (TLS 1.3)
                             ▼
                  ┌──────────────────────┐
                  │  nginx (:443)        │  TLS termination
                  │  Let's Encrypt cert  │  + X-Forwarded-*
                  └──────────┬───────────┘
                             │ proxy_pass http://127.0.0.1:3000
                             ▼
        ┌────────────────────────────────────────────┐
        │  Fastify backend (:3000, ztcwm user)       │
        │  ┌──────────────────┐  ┌────────────────┐  │
        │  │ session + CSRF   │  │ RBAC guard     │  │
        │  └────────┬─────────┘  └────────┬───────┘  │
        │           │                     │          │
        │  /api/auth, /api/users,   /api/zt/* proxy  │
        │  /api/setup                     │          │
        │           │                     │          │
        │           ▼                     ▼          │
        │  ┌─────────────────┐   ┌────────────────┐  │
        │  │ better-sqlite3  │   │ AES-GCM crypt  │  │
        │  │ ztcwm.db (WAL)  │   │ (SESSION_SECRET│  │
        │  │ users / sessions│   │  → sha256 → key)│  │
        │  │ zt_config       │   └────────┬───────┘  │
        │  └─────────────────┘            │          │
        └─────────────────────────────────┼──────────┘
                                          │ X-ZT1-Auth + JSON
                                          ▼
                              ┌──────────────────────┐
                              │ ZeroTier One         │
                              │ 127.0.0.1:9993 only  │
                              │ /controller/*, /peer │
                              └──────────────────────┘
```

## Layers

### 1. Presentation Layer (`pages/` + `components/`)

- **Pages** are route-level views (one per URL path)
- **Components** are reusable UI primitives (sidebar, badge, modal, etc.)
- All use Lit's Shadow DOM for style encapsulation
- Pages import services directly — no state management library needed for this scope

### 2. Service Layer (`services/`)

- Business logic and data access
- `NetworkService` — CRUD for networks, with unstable API fallback
- `MemberService` — CRUD for members, authorization
- `NodeService` — Node status and peer information
- `LogService` — In-memory event logging with pub/sub

### 3. API Layer (`api/`)

- `HttpClient` — Centralized fetch wrapper
- Wraps `fetch` calls to `/api/*`. Includes the CSRF token from session state on mutating requests. Surfaces errors uniformly via the toast service.

### 4. Infrastructure (`router/`, `utils/`, `styles/`, `types/`)

- **Router**: Vaadin Router with lazy-loading page imports
- **Config**: localStorage-backed UI preferences (theme, API URL); never holds secrets
- **Theme**: CSS custom properties for both dark and light themes (per Phase 5 design system + Phase 16 WCAG AA contrast)
- **Types**: Full TypeScript interfaces for the ZeroTier API

### 5. Backend Layer (`server/`)

The Backend Layer (Fastify, `src/server/`) consists of:

- **Routes** (`server/routes/`) — `auth.ts` (login/logout/CSRF), `setup.ts` (first-run wizard), `users.ts` (Admin CRUD over local accounts), `api.ts` (general `/api/*`), `zt-proxy.ts` (path-validated, role-filtered ZeroTier API proxy mounted at `/api/zt/*`)
- **Auth** (`server/auth/`) — `session-store.ts` (SQLite-backed session store), `password.ts` (bcrypt(12) hashing), `rbac.ts` (Admin/Operator/Viewer guard), `username.ts` (rename helper from Phase 13)
- **DB** (`server/db/`) — `index.ts` (better-sqlite3 init in WAL mode + migration runner), `zt-config.ts` (AES-256-GCM-encrypted token row; key = `sha256(SESSION_SECRET)`), `migrator.ts`
- **Migrations** (`server/migrations/`) — numbered SQL files; runner applies all unapplied on startup

The hook order on every request: cookie parse → rate limit (per-route on auth) → session → CSRF → first-run gate (redirect to `/setup` if no admin) → auth gate (redirect to `/login` if unauthenticated) → RBAC guard on protected routes → handler.

## Key Design Decisions

| Decision                  | Rationale                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| Lit over React/Vue/Svelte | Native Web Components, no virtual DOM, tiny bundle, standards-based                              |
| No state management lib   | App scope is manageable with component-level `@state`                                            |
| Shadow DOM everywhere     | True encapsulation, no global CSS conflicts                                                      |
| Vaadin Router             | Purpose-built for Web Components, supports lazy loading                                          |
| CSS custom properties     | Theme tokens shared across Shadow DOM boundaries                                                 |
| Unstable API fallback     | Gracefully handles older ZT controllers (< 1.14)                                                 |
| Vite proxy                | Avoids CORS in development without extra server setup                                            |
| localStorage config       | Simple, used only for UI preferences (theme, API URL); auth token is server-side in SQLite       |
| Fastify backend           | ZT auth token never reaches browser; single security boundary; minimal dependency surface        |
| better-sqlite3 + WAL      | Lightweight, file-based, zero config for self-hosted; WAL enables concurrent reads while writing |
| bcrypt(12)                | Industry-standard password hashing with adaptive cost factor                                     |
| Sessions over JWT         | HttpOnly cookies are not exposed to XSS; server-managed invalidation                             |
| AES-256-GCM token storage | Native Node `crypto`; key derived from SESSION_SECRET via sha256 (single-secret model)           |
| Three-role RBAC           | Admin / Operator / Viewer covers all real delegation needs                                       |
| Setup wizard bootstrap    | First-run detection avoids manual DB seeding                                                     |

## Security Considerations

- **ZeroTier auth token**: stored server-side in the `zt_config` table, AES-256-GCM-encrypted with a key derived from `SESSION_SECRET` via `sha256()` (see `src/server/db/zt-config.ts`). The token never reaches the browser; only the backend's path-validated `/api/zt/*` proxy can use it.
- **Local-account authentication**: bcrypt(12) password hashing with adaptive cost. Three-role RBAC (Admin / Operator / Viewer) enforced both in middleware (`server/auth/rbac.ts`) and in the SPA's auth guard.
- **Sessions**: HttpOnly + SameSite=strict cookies, 30-min idle timeout (rolling), CSRF protection via `@fastify/csrf-protection`, and rate limiting on `/api/auth/*` (5 / minute per IP).
- **Setup wizard**: `/setup` is the only first-run path; it auto-disables once any admin exists (subsequent visits 404 / redirect to `/login`).
- **Production deploy**: Fastify behind nginx with TLS termination via Let's Encrypt; `COOKIE_SECURE=true` is set; the systemd unit runs as a non-root `ztcwm` user with `ProtectSystem=strict` and the broader `Protect*`/`Restrict*` family. See the EC2 deploy section in the README for the full hardened layout.
- **The single-secret model**: `SESSION_SECRET` is the one secret the backend needs. Rotating it invalidates the encrypted ZT token in `zt_config`; the operator must re-run `/setup` to re-store the token.
