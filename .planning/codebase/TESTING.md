# Testing Patterns

**Analysis Date:** 2026-05-04

## Test Framework

**Runner:**
- Vitest 4.1.4 with `globals: true` — `describe`, `it`, `expect`, `vi`, `beforeEach`, `afterEach`, `beforeAll` are auto-available without imports
- Config: `src/vitest.config.ts` (merges with `src/vite.config.ts`)
- Default environment: `happy-dom` 20.8.9 (browser-like DOM for Lit component tests)
- Per-file override: `// @vitest-environment node` comment at the top of test files for Node-only modules (server routes, DB, password hashing, RBAC, validators)
- Globs: `include: ['**/*.test.ts']`

**TypeScript types:** `"types": ["vitest/globals"]` in `src/tsconfig.json` provides type definitions for the auto-imported globals.

**Assertion library:** built-in `expect` from Vitest (Chai-compatible). No alternative library.

**DOM testing helpers:** `@open-wc/testing-helpers` 3.0.1 provides `fixture` and `html` for mounting Lit components into a managed test container.

**Run Commands** (defined in `src/package.json`):
```bash
npm test              # vitest run — single CI-style pass
npm run test:watch    # vitest — watch mode
```

## Test File Organization

**Location:** co-located with source — `foo.ts` and `foo.test.ts` live in the same directory.

**Naming:** `{source-basename}.test.ts` (e.g., `network-service.test.ts`, `password.test.ts`, `theme-audit.test.ts`).

**Server tests:** `src/server/routes/*.test.ts`, `src/server/auth/*.test.ts`, `src/server/db/*.test.ts` — all carry `// @vitest-environment node` because they exercise Node APIs (`fs`, `crypto`, `better-sqlite3`).

**Cross-cutting/repository-level tests:** placed under `src/tests/` (currently `src/tests/docs-audit.test.ts` — verifies documentation matches code).

**Excluded from server build:** `src/server/tsconfig.json` excludes `./**/*.test.ts` so production output (`src/server/dist`) does not ship test files. (Note: a previous `tsc` run produced stale compiled `*.test.js` files under `src/server/dist/auth/`, `src/server/dist/db/`, `src/server/dist/routes/` — these are obsolete artifacts, not part of the test suite.)

**File counts (current):**
- 33 `*.test.ts` files
- 66 non-test `.ts` source files
- ~50% test-to-source ratio

## Test Structure

**Suite Organization (canonical pattern):**
```typescript
describe('FeatureName', () => {
    describe('subFeature — happy path', () => {
        it('does the expected thing', async () => { /* ... */ });
    });

    describe('subFeature — error cases', () => {
        it('throws on bad input', async () => { /* ... */ });
    });
});
```

**Patterns:**
- Top-level `describe` names a function, class, route, or component
- Nested `describe` groups behavioral slices ("happy path", "error cases", "GET /api/users", "CSRF token", "fallback path"); names use the em-dash separator: `'listNetworks — fallback path'`
- One assertion focus per `it` — many `it` blocks per `describe`
- `beforeEach` resets mocks (`vi.clearAllMocks()` / `fetchMock.mockReset()`) and creates fresh app/db instances; `afterEach` closes Fastify apps and removes temp DB files
- Test names occasionally carry plan-spec codes: `it('Test 10: physicalAddress is NOT searched (only name/nodeId/ipAssignments)', ...)`, `it("does NOT invalidate the renamed user's existing session (D-04)", ...)`, `it('USER-02 UI', ...)`

**Setup/Teardown idioms:**
- Server tests build a fresh Fastify instance in `beforeEach` and tear it down with `await app.close(); db.close(); if (existsSync(dbPath)) unlinkSync(dbPath);` in `afterEach`
- Per-test SQLite DBs use `/tmp/ztcwm-{suite}-test-${Date.now()}.db` to avoid cross-test pollution
- `:memory:` databases are used when migration order is the only thing under test (`src/server/db/migrator.test.ts`, `src/server/auth/session-store.test.ts`)
- `localStorage.clear()` + module-cache reset (`clearConfig()`) before each config test (`src/utils/config.test.ts`)

## Mocking

**Framework:** Vitest's built-in `vi` (`vi.fn`, `vi.mock`, `vi.mocked`, `vi.spyOn`, `vi.stubGlobal`, `vi.unstubAllGlobals`, `vi.resetModules`, `vi.hoisted`, `vi.clearAllMocks`).

**Three mocking strategies in active use:**

### 1. Module-level mock with `vi.mock` (services consumed by components)

```typescript
// src/components/sidebar.test.ts, src/pages/users.test.ts
const { mockUserService } = vi.hoisted(() => ({
    mockUserService: {
        getCurrentUser: vi.fn().mockResolvedValue({ id: 1, username: 'admin', role: 'admin' }),
        canAccessApiExplorer: vi.fn().mockReturnValue(true),
        hasRole: vi.fn().mockReturnValue(true),
        getRole: vi.fn().mockReturnValue('admin'),
        clear: vi.fn(),
    },
}));

vi.mock('../services/index.js', () => ({
    userService: mockUserService,
}));
```

`vi.hoisted` is required because `vi.mock` is hoisted above imports — the factory cannot reference module-scope variables defined below it without `vi.hoisted`.

### 2. Direct dependency mock with `vi.mocked` (services calling http-client)

```typescript
// src/services/network-service.test.ts
import { httpClient } from '../api/http-client.js';
import { NetworkService } from './network-service.js';

vi.mock('../api/http-client.js', () => ({
    httpClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const getMock = vi.mocked(httpClient.get);
// ...
getMock.mockResolvedValueOnce(unstableResponse);
```

### 3. Global `fetch` stub with URL routing (for components/services that hit the network directly)

```typescript
// src/api/http-client.test.ts, src/router/index.test.ts, src/pages/users.test.ts
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function urlRouter(routes: Record<string, () => Response>, fallback?: () => Response) {
    return async (url: string | URL | Request) => {
        const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
        for (const [pattern, handler] of Object.entries(routes)) {
            if (urlStr === pattern || urlStr.startsWith(pattern)) return handler();
        }
        return fallback ? fallback() : mockResponse({ ok: true, body: {} });
    };
}

fetchMock.mockImplementation(urlRouter({
    '/api/csrf-token': () => mockResponse({ ok: true, body: { token: 'test-csrf' } }),
    '/api/zt/test':    () => mockResponse({ body: { id: '1' } }),
}));
```

Pair `vi.stubGlobal('fetch', ...)` with `vi.unstubAllGlobals()` in `afterEach` for tests that need to compose with other globals.

**Spy patterns:**
- `vi.spyOn(app.log, 'info')` to assert structured audit-log calls (see `src/server/routes/users.test.ts` username-rename tests)
- `vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('dark')` to control localStorage in component tests (`src/components/navbar.test.ts`)
- `vi.restoreAllMocks()` in `afterEach` when spies need to be reset

**What to mock:**
- The HTTP layer (`httpClient`) when testing services
- `services/index.js` re-exports when testing components/pages that consume singletons
- Global `fetch` for low-level units (`HttpClient` itself, router auth checks, page-level fetches)
- `app.log.info` to assert audit events
- `Storage.prototype.getItem` / `localStorage` for theme/config-cache tests
- Underlying `bcrypt`, `crypto` are NEVER mocked — those run real

**What NOT to mock:**
- `better-sqlite3` — tests use real SQLite (`:memory:` or `/tmp/*.db`) for fidelity with migrations and constraints
- `bcryptjs` — `password.test.ts` exercises real hashing (slow but trustworthy)
- AES-GCM crypto — `zt-config.test.ts` round-trips real encrypt/decrypt
- Lit reactive lifecycle — `@open-wc/testing-helpers` `fixture()` mounts the real custom element

## Fastify Integration Tests

**App-construction pattern (`src/server/routes/*.test.ts`):**
```typescript
beforeEach(async () => {
    dbPath = `/tmp/ztcwm-{suite}-test-${Date.now()}.db`;
    app = Fastify();
    db = initDatabase(dbPath);
    app.decorate('db', db);
    app.decorate('sessionSecret', 'test-secret-for-aes-encryption');
    await app.register(fastifyCookie);
    await app.register(fastifySession, {
        secret: 'test-secret-that-is-at-least-32-characters-long!!',
        cookie: { secure: false },
    });
    // Test-only login helper to seed sessions without going through real auth
    app.post('/__test-login', async (request) => {
        const { userId, username, role } = request.body as { userId: number; username: string; role: string };
        request.session.set('userId', userId);
        request.session.set('username', username);
        request.session.set('role', role);
        return { ok: true };
    });
    await app.register(usersRoutes, { prefix: '/api' });
    await app.ready();
});
```

**Request injection** uses Fastify's `app.inject()` (light-my-request) — no real HTTP sockets:
```typescript
async function injectWithSession(method, url, userId, username, role, payload?) {
    const loginRes = await app.inject({ method: 'POST', url: '/__test-login', payload: { userId, username, role } });
    const sessionCookie = loginRes.cookies.find(c => c.name === 'sessionId');
    return app.inject({
        method, url,
        headers: { cookie: `sessionId=${sessionCookie.value}` },
        payload,
    });
}
```

CSRF middleware is intentionally NOT registered in route tests — the comment in `src/server/routes/setup.test.ts` reads: *"Skip CSRF in tests — we're testing route business logic, not CSRF middleware"*. CSRF is exercised only in `src/api/http-client.test.ts`.

## Lit Component Tests

**Mount with `fixture<T>(html\`...\`)`** from `@open-wc/testing-helpers`:
```typescript
import { fixture, html } from '@open-wc/testing-helpers';
import './badge.js';
import type { ZtBadge } from './badge.js';

it('renders with success variant', async () => {
    const el = await fixture<ZtBadge>(html`<zt-badge variant="success">OK</zt-badge>`);
    const span = el.shadowRoot!.querySelector('.badge');
    expect(span!.classList.contains('success')).toBe(true);
});
```

**Idioms:**
- Always `await el.updateComplete` after triggering state changes before asserting on the shadow DOM
- For components that fire async work in `firstUpdated` / `connectedCallback` (e.g., `userService.getCurrentUser()`), bridge with `await new Promise(r => setTimeout(r, 100))` then `await el.updateComplete`
- Custom event capture pattern (see `src/components/ip-chip-editor.test.ts`):
  ```typescript
  async function captureNextEvent(el: IpChipEditor): Promise<CustomEvent | null> {
      return new Promise((resolve) => {
          const handler = (e: Event) => { el.removeEventListener('ip-change', handler); resolve(e as CustomEvent); };
          el.addEventListener('ip-change', handler);
          setTimeout(() => { el.removeEventListener('ip-change', handler); resolve(null); }, 50);
      });
  }
  ```
- Query the shadow DOM with `el.shadowRoot!.querySelector(...)` — non-null assertion is preferred over conditional checks (test fail-fast on missing elements)

## Fixtures and Factories

**Inline factory functions** are the dominant pattern — one per test file:

```typescript
// src/utils/helpers.test.ts
function m(overrides: Partial<Member>): Member {
    return {
        id: '', nwid: 'net1', nodeId: 'aaaaaaaaaa', name: '',
        authorized: true, /* ...sensible defaults... */
        ...overrides,
    };
}
```

```typescript
// src/server/routes/users.test.ts
let userCounter = 0;
async function createUser(role: string): Promise<{ id: number; username: string }> {
    userCounter++;
    const username = `${role}user${userCounter}`;
    const hash = await hashPassword('TestPass123!');
    const result = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)')
        .run(username, hash, role);
    return { id: Number(result.lastInsertRowid), username };
}
```

```typescript
// src/api/http-client.test.ts
function mockResponse(opts: { ok?: boolean; status?: number; body?: unknown; jsonThrows?: boolean }): Response {
    return {
        ok: opts.ok ?? true,
        status: opts.status ?? 200,
        json: opts.jsonThrows ? () => Promise.reject(new Error('no json')) : () => Promise.resolve(opts.body ?? {}),
    } as unknown as Response;
}
```

**No shared fixture directory** — there is no `__fixtures__/`, `test-data/`, or shared-helpers module. Each test file owns its factories. Reuse comes from copy-paste between sibling test files (e.g., the `injectWithSession` helper appears verbatim in both `users.test.ts` and `zt-proxy.test.ts`).

## Coverage

**No coverage tool is configured** — `package.json` has no coverage script and no `@vitest/coverage-*` dev-dependency.

**View Coverage:**
```bash
# Coverage requires installing a provider first; not currently configured.
# Suggested: npm install -D @vitest/coverage-v8 then run:
# npx vitest run --coverage
```

**Implicit coverage signal** — every `src/services/*.ts`, `src/server/auth/*.ts`, `src/server/db/*.ts`, `src/server/routes/*.ts`, `src/utils/*.ts`, `src/api/*.ts`, `src/router/*.ts` has a co-located `*.test.ts`. UI pages and components have selective coverage (see Coverage Gaps in CONCERNS.md).

## Test Types

**Unit Tests:** dominant style — pure functions (`cidrToRange`, `isIPv4`, `filterMembers`, `validateUsername`, `validatePasswordStrength`, `hasPermission`, `getMinRole`, `concurrentMap`, `encryptToken`/`decryptToken`).

**Integration Tests:**
- Server-route tests instantiate Fastify + real SQLite + real session/cookie plugins and exercise the route via `app.inject()` — these are integration tests in everything but name (`src/server/routes/users.test.ts`, `setup.test.ts`, `zt-proxy.test.ts`)
- DB tests run real migrations against `:memory:` or `/tmp` SQLite files (`src/server/db/migrator.test.ts`, `index.test.ts`, `zt-config.test.ts`)
- Component tests mount the real custom element under happy-dom (`src/components/*.test.ts`, `src/pages/*.test.ts`)

**E2E Tests:** none. No Playwright, Cypress, or Puppeteer dependency. There is no end-to-end coverage of the SPA loading + logging in + driving a real ZeroTier controller.

**Audit Tests:** `src/styles/theme-audit.test.ts`, `src/styles/theme-contrast.test.ts`, and `src/tests/docs-audit.test.ts` are repository-wide guardrails — they `walkSrc()` the source tree and assert structural invariants (no literal colors outside theme files, every documented npm script exists, WCAG contrast ratios). These act as locked, enforced ADRs.

## Common Patterns

**Async testing:**
```typescript
it('returns parsed JSON', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ id: '1' }) });
    const result = await client.get('/test');
    expect(result).toEqual({ id: '1' });
});
```

**Error testing:**
```typescript
// Reject-based
await expect(client.get('/test')).rejects.toMatchObject({ status: 401 });
await expect(client.get('/test')).rejects.toThrow(TypeError);

// Synchronous throw with custom message
await expect(
    concurrentMap([1,2,3], async (x) => { if (x === 3) throw new Error('boom'); return x; }, 2)
).rejects.toThrow('boom');
```

**Property assertions:**
- `expect(body).not.toHaveProperty('password_hash')` — explicit absence checks for sensitive fields
- `expect.objectContaining({ event: 'user.username.changed', actorId, targetId })` — partial match for log payloads
- `expect.arrayContaining([...])` and `expect(arr).toHaveLength(n)` — collection checks

**Database verification:**
- After a mutation, query the DB directly to confirm side effects:
  ```typescript
  const updated = db.prepare('SELECT role FROM users WHERE id = ?').get(target.id) as { role: string };
  expect(updated.role).toBe('operator');
  ```

**HTTP method assertion shape:**
```typescript
const postCall = fetchMock.mock.calls.find((c: any[]) => c[0] === '/api/zt/test');
expect(postCall![1]).toEqual(expect.objectContaining({
    method: 'POST',
    body: JSON.stringify(payload),
    credentials: 'include',
}));
```

---

*Testing analysis: 2026-05-04*
