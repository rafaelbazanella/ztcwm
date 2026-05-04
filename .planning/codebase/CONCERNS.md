# Codebase Concerns

**Analysis Date:** 2026-05-04

This is a security-sensitive application: a web manager for a self-hosted ZeroTier network controller. The server holds the controller's `X-ZT1-Auth` token (encrypted at rest with AES-256-GCM) and brokers every controller call. Any auth bypass, CSRF gap, or SSRF on the proxy directly exposes the network controller, so concerns below are weighted toward auth, secret handling, and the proxy layer.

## Tech Debt

**Stale `.TODO.md` carries Portuguese-language UX drift items:**
- Issue: `/var/www/Projects/ztcwm/.TODO.md` lists four open items (display ZeroTier client version next to `online` flag, finish localization sweep to English, fix off-pattern buttons on "some screens", header alignment). They are not tracked in `.planning/PROJECT.md` Active section (which says "None — ready for next milestone planning") so they will be silently lost on the next milestone seed.
- Files: `/var/www/Projects/ztcwm/.TODO.md`
- Impact: UX inconsistency persists; localization claim ("Maintain a dark theme UI" — `/var/www/Projects/ztcwm/.initial-prompt.md`) is partially false because some surfaces still ship Portuguese strings.
- Fix approach: Triage `.TODO.md` into PROJECT.md's Active list (or close as "won't fix") before next milestone planning, then delete `.TODO.md` so there is one source of truth.

**Triple-implementation of CSRF token caching:**
- Issue: A module-level `let csrfToken = ''` cache is duplicated across three files instead of being centralized in the `HttpClient`.
- Files: `src/api/http-client.ts:3` (used by `httpClient`), `src/pages/users.ts:24` (used by user-management `fetch()` calls), `src/pages/login.ts:110` (per-page `@state() csrfToken`). All three independently `GET /api/csrf-token` and store the result.
- Impact: Three caches drift independently — the user-management page can use a stale token when `httpClient` has already refreshed. There is also no retry on 403 (CSRF failure), so callers must be reloaded manually after a stale token.
- Fix approach: Move all token bookkeeping into `httpClient` (or a sibling `csrfService`), expose a single `getCsrfToken()` helper, and replace direct `fetch()` calls in `src/pages/users.ts` and `src/pages/login.ts` with the centralized client. Add a 403-on-CSRF auto-refresh-and-retry loop.

**Direct `fetch()` calls bypass `httpClient` for auth/setup/users routes:**
- Issue: `httpClient` is the documented "centralized API service" but `/api/auth/*`, `/api/setup/*`, `/api/csrf-token`, and `/api/users/*` are called via raw `fetch()`.
- Files: `src/pages/login.ts:150`, `src/pages/users.ts:25-33` and many call sites, `src/router/index.ts:11,27`, `src/services/user-service.ts:27`, `src/components/navbar.ts:147`, `src/app.ts:50` (global fetch interceptor).
- Impact: Error normalization (`ApiError` shape) and CSRF handling are inconsistent; the global 401 interceptor in `app.ts:47-63` is the only thing keeping these flows aligned.
- Fix approach: Extend `httpClient` with `auth.*`, `setup.*`, `users.*` namespaces that share a single CSRF refresh / 401-redirect / `ApiError` body parser.

**`as any` / `as unknown` casts hide structural mismatches:**
- Issue: Type-cast escape hatches are scattered across the server and frontend.
- Files: `src/server/index.ts:49` (`store: sessionStore as any`), `src/server/index.ts:63` (`(req: any)`), `src/server/index.ts:80` (`(server.csrfProtection as any)`), `src/server/auth/session-store.ts:4,22` (`session?: any`), `src/server/routes/setup.ts:54` and `src/server/routes/users.ts:67` (`err: any`), `src/components/navbar.ts:138` (`document.querySelector('zt-app') as any`), `src/pages/networks.ts:34,39,44,176`, `src/pages/network-detail.ts:512,611-612,820,961`, `src/pages/users.ts:121,541`, `src/pages/members.ts:127`, `src/server/routes/zt-proxy.ts:241`.
- Impact: The session store is the most concerning — `session: any` means any field a `@fastify/session` upgrade adds will silently round-trip through SQLite without a type check. The `as any` on `csrfProtection` would mask a future plugin-API change.
- Fix approach: Type the session-store interface against `@fastify/session`'s exported types; replace `data-table` casts with a generic `<TRow>` parameter so callers don't need `as unknown as Record<string, unknown>[]`.

**Two-source theme hex literals (mirror block in `index.html`):**
- Issue: Boot-time theme hex values (`#0f1117`, `#e4e6ef`, `#f8f9fc`, `#1a1d2b`) are duplicated between `src/index.html` (the `MIRROR-START`/`MIRROR-END` block) and `src/styles/theme.ts`.
- Files: `src/index.html:24-32`, `src/styles/theme.ts`.
- Impact: A theme palette change in `theme.ts` that forgets the mirror block produces a flash of unstyled content (FOUC) showing the old palette until Lit hydrates. Currently held together by a comment convention plus the audit grep — no runtime guard.
- Fix approach: Either (a) inject the boot block from `theme.ts` at build time via a Vite plugin, or (b) add a Vitest assertion that parses the mirror block and `theme.ts` and equates the four values.

**Logs are in-memory only with arbitrary 500-entry cap:**
- Issue: `logService` is a singleton with a 500-entry FIFO buffer; nothing persists across reloads.
- Files: `src/services/log-service.ts:9` (`maxEntries = 500`).
- Impact: Operators lose audit context (member authorize / IP edit failures) on every browser refresh. The server-side `fastify.log.info(...)` at `src/server/routes/users.ts:140` is the only durable audit signal, and it only fires on username rename — not on member auth changes, IP edits, or password resets.
- Fix approach: Add structured `fastify.log.info({ event: 'user.password.reset', actorId, targetId })` calls in `src/server/routes/users.ts` for create/role-change/delete/reset-password, and member mutations in `src/server/routes/zt-proxy.ts:141`. Treat the in-memory client log as a UX nicety, not the audit trail.

**Reset-password endpoint emits no audit log:**
- Issue: `POST /users/:id/reset-password` (`src/server/routes/users.ts:179-198`) returns the temporary password to the admin's screen but does not log who reset whose password or when.
- Files: `src/server/routes/users.ts:179-198`.
- Impact: A malicious admin can rotate another admin's password and there is no record. PROJECT.md D-06 explicitly added an audit line for username rename — the same pattern needs to apply here.
- Fix approach: Add `fastify.log.info({ event: 'user.password.reset', actorId: request.session.userId, targetId: id }, 'password reset by admin')` immediately before the response.

**Setup routes use raw username regex instead of `validateUsername`:**
- Issue: `POST /setup/admin` re-implements the username rule inline (`username.length < 3`, `/^[a-zA-Z0-9_]+$/`) instead of calling the shared `validateUsername` helper.
- Files: `src/server/routes/setup.ts:36-41`. Compare with `src/server/auth/username.ts` (the "single source of truth" per its own comment).
- Impact: A future relaxation/tightening of the rule (e.g., allow hyphens) silently diverges between setup and `/users` routes.
- Fix approach: Replace the inline check with `validateUsername(username)` and surface its error string verbatim.

**Generated `server/dist/` checked into the working tree (but not git):**
- Issue: A built copy of the backend lives at `src/server/dist/` (last touched 23 Apr) even though `src/.gitignore` excludes it. This is dead weight inside the source tree.
- Files: `src/server/dist/index.js`, `src/server/dist/auth/`, `src/server/dist/routes/`, etc.
- Impact: Editor "find in files" surfaces stale duplicate hits; risk of editing the compiled output by mistake.
- Fix approach: Add a `prebuild` / `clean` npm script (`rm -rf server/dist`) or move the build output to the repo-root `dist/` folder.

**Test database left at `data/test-migration.db` outside of `src/`:**
- Issue: A 25KB SQLite file from a one-off migration test sits at `/var/www/Projects/ztcwm/data/test-migration.db` (root-level `data/` is gitignored, so it's untracked, but it's still on disk).
- Files: `data/test-migration.db`.
- Impact: Contributor confusion ("two `data/` directories?") — production SQLite lives at `src/data/ztcwm.db`.
- Fix approach: Delete the file, and add a `tearDown()` in whatever test created it so future runs use a per-test temp dir (`tmpdir()`).

## Known Bugs

**Member-batch authorization uses unbounded `Promise.all`:**
- Symptoms: Selecting all members of a large network and clicking Authorize/Deauthorize fires N parallel requests through `httpClient` → Fastify proxy → ZT controller.
- Files: `src/pages/network-detail.ts:628-634`.
- Trigger: Bulk action on a network with 50+ members.
- Workaround: Manually paginate selections to <10. Project key decision says "concurrentMap(5) for API calls — Bounded concurrency prevents connection exhaustion" (`/var/www/Projects/ztcwm/.planning/PROJECT.md:135`) but this batch path was missed.
- Fix: Replace `Promise.all(...)` with `concurrentMap(this.selectedMembers, fn, 5)` from `src/utils/concurrency.ts`.

**`memberFetches` collision check is unbounded `Promise.all`:**
- Symptoms: A single member-IP edit triggers a `Promise.all` over **every other member of the same network** to detect IP collisions. On a 200-member network, that's 199 parallel proxy calls per edit.
- Files: `src/server/routes/zt-proxy.ts:187-191`.
- Trigger: Editing IPs on a member of a large network.
- Workaround: None.
- Fix: Use `concurrentMap` (already in `src/utils/concurrency.ts`) at limit 5–10. Better: cache the member-list response for the duration of the request and short-circuit on collision rather than fetching all members up-front.

**Theme toggle reaches into `<zt-app>` via `as any`:**
- Symptoms: Theme toggle button in `<zt-navbar>` calls `(document.querySelector('zt-app') as any).toggleTheme()`. If the component name changes or the method is renamed, the button silently no-ops.
- Files: `src/components/navbar.ts:137-143`.
- Trigger: Renaming `<zt-app>` or `toggleTheme()` without grep across the codebase.
- Workaround: None — relies on developer discipline.
- Fix: Dispatch a `theme-toggle-requested` `CustomEvent` from the navbar and let `<zt-app>` listen for it; remove the cross-shadow-DOM reach-in.

**`saveZtConfig` does not validate URL host before storing:**
- Symptoms: An admin can paste any URL (including `http://internal-jenkins:8080`, `http://169.254.169.254/latest/meta-data/`, `file:///etc/passwd`) into setup and it will be stored.
- Files: `src/server/routes/setup.ts:78` (only checks `http://` / `https://` prefix), `src/server/db/zt-config.ts:41-47`.
- Trigger: Admin (intentionally or due to phishing) supplies a non-controller URL.
- Workaround: Operators must trust admins fully.
- Fix: Reject `file:`, `data:`, and known-private metadata hosts during URL parsing in `setup.ts`. Optional: pin to a configurable allowlist via env var.

**Login does not regenerate the session ID (session-fixation surface):**
- Symptoms: A pre-login session ID is reused after successful authentication. Anyone able to plant a session cookie before login (e.g. via subdomain XSS, MITM on first HTTP hit) gains the authenticated session.
- Files: `src/server/routes/auth.ts:48-51`.
- Trigger: Pre-auth cookie injection by an attacker.
- Workaround: `httpOnly: true` and `sameSite: 'strict'` (`src/server/index.ts:50-54`) substantially reduce risk; HTTPS is recommended via `COOKIE_SECURE=true`.
- Fix: Call `await request.session.regenerate()` (or equivalent on `@fastify/session`) immediately after `comparePassword` succeeds and before assigning `userId`.

**Wildcard ZT proxy passes any admin path through unchecked:**
- Symptoms: `fastify.all('/*')` at `src/server/routes/zt-proxy.ts:236-249` forwards anything an admin types — including paths like `/../some/escape` (Fastify normalizes this, but downstream ZT doesn't have to).
- Files: `src/server/routes/zt-proxy.ts:236-249`.
- Trigger: Admin uses the API Explorer to hit an arbitrary path.
- Workaround: Admin role required.
- Fix: After `'/' + request.params['*']`, validate that the joined path matches `^/[A-Za-z0-9/_\-.]+$` and reject obviously-traversal-shaped inputs. Log every wildcard call as `event: 'zt.proxy.wildcard'` with the path.

**`generateId()` uses non-crypto random for log entry IDs:**
- Symptoms: `Math.random().toString(36).substring(2, 15)` collisions are theoretically possible at high log volume.
- Files: `src/utils/helpers.ts:44-46` (used at `src/services/log-service.ts:14`).
- Trigger: Very high log churn (>10⁵ entries in a session).
- Workaround: 500-entry cap in `logService` makes collisions effectively impossible in practice.
- Fix: Switch to `crypto.randomUUID()` if/when log persistence is added.

## Security Considerations

**`SESSION_SECRET` falls back to a public default in dev:**
- Risk: If a developer ever runs `NODE_ENV=production` without setting `SESSION_SECRET`, the server boots silently with `'ztcwm-dev-secret-change-in-production'` — both the cookie-signing key AND the AES-256-GCM key derivation source for the stored ZT auth token.
- Files: `src/server/index.ts:36`.
- Current mitigation: `.env.example` warns to generate via `openssl rand -hex 32` (`src/.env.example:21`); README is presumed to repeat this.
- Recommendations: Refuse to start when `process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET`. Log a high-visibility warning (not just `info`) when running with the default in dev. Consider hashing the value to detect "looks like the default placeholder".

**Session cookie `secure` flag is opt-in:**
- Risk: `secure: process.env.COOKIE_SECURE === 'true'` (`src/server/index.ts:51`) means a production deploy that forgets to set `COOKIE_SECURE=true` ships an HTTPS deployment with cookies that will be sent over plain HTTP. The default is unsafe.
- Files: `src/server/index.ts:51`, `src/.env.example:25`.
- Current mitigation: Documented in `.env.example`.
- Recommendations: Default `secure` to `true` when `NODE_ENV === 'production'` and require an explicit override (`COOKIE_SECURE=false`) for local-only HTTPS-less deployments.

**SSRF surface on the ZT proxy is real:**
- Risk: The stored `controllerUrl` is the prefix for every proxied call (`src/server/routes/zt-proxy-helpers.ts:21`). Whatever URL the admin saved during setup is what the server fetches every request — there is no allowlist of hosts/IPs and no rejection of localhost/metadata IPs at fetch time, only at setup time (and even then only the scheme is validated).
- Files: `src/server/routes/zt-proxy-helpers.ts:21,30`, `src/server/routes/setup.ts:78`.
- Current mitigation: Setup is admin-only; URL must start with `http://` or `https://`; per-request 10s timeout (`src/server/routes/zt-proxy-helpers.ts:34`).
- Recommendations: At setup, parse the URL, reject `localhost`/`127.x`/`::1` unless explicitly opted in via env var, and reject `169.254.169.254` (AWS metadata) and `100.100.100.200` (Tailscale). At fetch time, resolve the host once per minute and cache the IP — don't trust DNS rebinding to land outside an allowlist.

**`X-ZT1-Auth` token is exposed in any error path that leaks request context:**
- Risk: `ztFetch` puts the cleartext token into `headers['X-ZT1-Auth']` (`src/server/routes/zt-proxy-helpers.ts:23`). Any future addition that logs the outgoing request (e.g. a debug interceptor) would write the token to disk. Fastify's logger does not currently log the headers, but the bar is low.
- Files: `src/server/routes/zt-proxy-helpers.ts:22-34`.
- Current mitigation: No request logging in current code; logger level is `warn` in production (`src/server/index.ts:24`).
- Recommendations: When adding outbound logging, sanitize via a redactor (`fastify.log.child({ redact: ['req.headers.x-zt1-auth'] })`). Document this in a SECURITY.md.

**`comparePassword` is run after `SELECT … WHERE username = ?` — timing-leaks user existence:**
- Risk: When the user does not exist, `auth.ts:35-37` returns 401 immediately. When the user exists, `comparePassword` runs (12 bcrypt rounds ≈ 250ms). An attacker times the response to enumerate valid usernames.
- Files: `src/server/routes/auth.ts:31-42`.
- Current mitigation: 5-req/min/IP rate limit (`src/server/routes/auth.ts:19-21`) bounds enumeration speed.
- Recommendations: When `user` is undefined, run `bcrypt.compare(password, KNOWN_DUMMY_HASH)` to equalize timing, then return 401. Drop in a constant ~250ms minimum response time on the login route.

**Generic 401 still leaks "no user with this name":**
- Risk: Same vector as above. Both branches return `{ error: 'Invalid username or password' }` — but the response *time* differs.
- Files: `src/server/routes/auth.ts:35-42`.
- Current mitigation: As above.
- Recommendations: As above.

**No CSP / HSTS / X-Frame-Options:**
- Risk: There is no CSP, HSTS, X-Frame-Options, or X-Content-Type-Options header anywhere in the server (no `@fastify/helmet`).
- Files: `src/server/index.ts` (full registration list — `helmet` is absent).
- Current mitigation: SPA is same-origin; cookies are `httpOnly` + `sameSite: 'strict'`.
- Recommendations: Register `@fastify/helmet` with a CSP that allows `'self'` plus `https://fonts.googleapis.com`, `https://fonts.gstatic.com` (referenced from `src/index.html:8-10`). Add `frame-ancestors 'none'` to prevent clickjacking the controller UI.

**Login form does not require fresh CSRF token from a logged-in user:**
- Risk: `'/api/auth/login'` is on the CSRF exempt list (`src/server/index.ts:73`). That is correct — a logged-out user has no session secret to bind a token to. But the same exemption means a *logged-in* user submitting `/api/auth/login` (a re-login attempt) bypasses CSRF. Combined with the lack of session regeneration on login, an attacker who can plant credentials in a victim's browser could pivot into a session.
- Files: `src/server/index.ts:73`.
- Current mitigation: `sameSite: 'strict'` blocks cross-site POSTs to the login endpoint.
- Recommendations: When a session already exists with a `userId`, redirect/`409` away from `/api/auth/login` rather than allowing a re-login on the existing session.

**Temporary password is returned in the response body:**
- Risk: `POST /users` and `POST /users/:id/reset-password` return `{ temporaryPassword }` in JSON (`src/server/routes/users.ts:64-65,197`). The admin's browser console history, server access logs (if a reverse proxy logs response bodies), or any in-flight error reporter (Sentry, LogRocket) will capture it.
- Files: `src/server/routes/users.ts:64-65,197`.
- Current mitigation: TLS in production; no observability hooks currently.
- Recommendations: Document in SECURITY.md that the temp password is shown one-shot and recommend the operator change it immediately. Optional: gate the temp-password display behind a one-time-view UI that requires re-confirming the admin's own password.

**Setup endpoints are unauthenticated:**
- Risk: `POST /api/setup/admin` and `POST /api/setup/zt-config` accept anyone's request before the first admin exists. The first attacker to reach the listening port wins admin.
- Files: `src/server/routes/setup.ts:27-86`, `src/server/index.ts:77` (CSRF exemption), `src/server/index.ts:104` (auth-bypass list).
- Current mitigation: `hasAdmin(db)` check makes the endpoint inert *after* first run; project assumes the deploy happens behind a firewall and is reached over loopback for the first admin creation.
- Recommendations: Document this assumption in `docs/development.md` and the EC2 deploy guide. Optionally: gate setup behind a one-time `SETUP_TOKEN` env var that the operator must include in the first request.

**`session.username` is denormalized into the session row:**
- Risk: After username rename (`PATCH /users/:id/username`, `src/server/routes/users.ts:104-152`), the session blob still contains the old username because nothing rewrites `request.session.username`. PROJECT.md decision D-04 acknowledges this: "Sessions key on userId, not username … username rename leaves active sessions valid".
- Files: `src/server/routes/auth.ts:49`, `src/server/routes/users.ts:104-152`.
- Current mitigation: Server logic only reads `session.userId` and `session.role` for authorization decisions. The denormalized `session.username` is only used to render the navbar dropdown.
- Recommendations: Either drop `username` from the session entirely (re-fetch from the `users` table on `/auth/me`), or rewrite all matching session rows on rename. The current state is fine but creates a footgun for any future code that uses `session.username` for an authorization decision.

## Performance Bottlenecks

**Member IP-collision check is O(N) controller calls per edit:**
- Problem: Editing one member's IP triggers a fetch of every other member of the same network (`src/server/routes/zt-proxy.ts:176-200`). Each fetch is a full HTTP round-trip to the controller.
- Files: `src/server/routes/zt-proxy.ts:176-200`.
- Cause: No caching layer; collision check fetches member objects one-by-one because the `/controller/network/{id}/member` endpoint returns IDs only.
- Improvement path: (1) Use the `/unstable/controller/network/{id}/member` endpoint which returns full member objects in one call (`src/services/member-service.ts:21-23` already prefers it on the client). (2) Cache the IP-to-member-ID map per network for the duration of the request and reuse on the second member edit.

**Network detail page does serial-then-parallel fetches:**
- Problem: `loadData()` in `src/pages/network-detail.ts:334-381` does a `Promise.all([getNetwork, listMembers, getPeers])`, but `listMembers` itself fans out a `concurrentMap(5)` of per-member fetches when the unstable endpoint is unavailable.
- Files: `src/pages/network-detail.ts:334-381`, `src/services/member-service.ts:19-39`.
- Cause: Designed as a fallback path; in practice on older controllers it dominates page load.
- Improvement path: Add a short-lived (5-second) per-network in-memory cache in `memberService` so navigating away and back doesn't re-fan-out.

**`logService.notify()` re-snapshots the whole list on every entry:**
- Problem: Every `info/warn/error/debug` call does `[...this.entries]` (500 elements) and dispatches to all listeners.
- Files: `src/services/log-service.ts:56-59`.
- Cause: Defensive copy to prevent listener mutation.
- Improvement path: Pass the list by reference and document "do not mutate"; or implement a delta-based subscription.

**`Promise.all` over selected members for batch authorize:**
- Problem: See "Member-batch authorization uses unbounded `Promise.all`" under Known Bugs.
- Files: `src/pages/network-detail.ts:628-634`.

**Setup test-connection fires one fetch but no caching:**
- Problem: Every click of the "Test Connection" button in setup hits the controller. Rate-limited to 10/min (`src/server/routes/setup.ts:93-97`) but still wasteful.
- Files: `src/server/routes/setup.ts:90-148`.
- Cause: No memoization.
- Improvement path: Cache the last successful (url, token) tuple → result for ~30s in process memory.

## Fragile Areas

**`page-network-detail` is a 977-line god-component:**
- Files: `src/pages/network-detail.ts` (977 lines, the largest file in the codebase).
- Why fragile: Holds 19 `@state` properties (network metadata, member list, batch-action state, four modal states, IP-edit target, name-edit toggle, search/filter), implements peer-info fan-out, network-update form, batch authorize, IP chip rejection callback (lines 600-614 search across two shadow-DOM levels by element ID).
- Safe modification: Add new state via dedicated sub-controller class; do not extend the existing `@state` set without splitting first.
- Test coverage: `src/pages/network-detail.test.ts` exists (28k file, large) — but the IP-rejection DOM walker at `src/pages/network-detail.ts:611-613` is the kind of code that compiles but breaks on any DOM-tree change.

**`page-users` is a 679-line admin-only file with 10 modal states:**
- Files: `src/pages/users.ts`.
- Why fragile: 10 `@state` modal toggles (`showCreateModal`, `showCredentialModal`, `showEditModal`, `showResetModal`, `showDeleteModal`, plus four form-state buckets and a copy-confirmation flag). Modal cross-talk (closing edit and opening reset) is hand-coded.
- Safe modification: Use a single `currentModal: 'create' | 'reset' | 'delete' | null` discriminated state.
- Test coverage: `src/pages/users.test.ts` is 14k — present but doesn't cover modal interleaving.

**`page-setup` is a 779-line wizard with stepper logic:**
- Files: `src/pages/setup.ts`.
- Why fragile: Wizard state machine and inline CSS are co-located; navigation between steps is hand-coded against `@state() currentStep`.
- Safe modification: Encapsulate step transitions in a small reducer; do not branch directly on `currentStep` outside a single `goToStep()` method.
- Test coverage: `src/pages/setup.test.ts` exists.

**ZT proxy whitelisting is a string-set at module scope:**
- Files: `src/server/routes/zt-proxy.ts:11-22` (`ALLOWED_MEMBER_KEYS`).
- Why fragile: Adding a new member field to `Member` in `src/types/zerotier.ts` does not propagate — the field must be manually added to `ALLOWED_MEMBER_KEYS` or the proxy will silently drop the update. PROJECT.md D-11 calls this out.
- Safe modification: When extending the member type, simultaneously update the allowlist.
- Test coverage: `src/server/routes/zt-proxy.test.ts` (22k) tests existing keys but cannot fail when a *new* type field is added without also being whitelisted.

**Setup-status cache is a global module-level boolean:**
- Files: `src/router/index.ts:4-23` (`setupChecked`, `needsSetup`, `resetSetupCache()`).
- Why fragile: `checkSetupStatus()` caches the result for the lifetime of the page; `resetSetupCache()` is exported but only called from tests.
- Safe modification: Any code path that completes setup (e.g., the wizard's "create admin" success handler) must call `resetSetupCache()` or the user will see stale "needs setup" until reload.
- Test coverage: `src/router/index.test.ts` (4k).

**Auth interceptor patches `window.fetch` globally:**
- Files: `src/app.ts:47-63`.
- Why fragile: The 401 redirect is hooked by replacing `window.fetch`. Any future code that captures a reference to the original fetch (e.g., a service-worker registration) will bypass it. Re-running `installAuthInterceptor` would chain interceptors infinitely.
- Safe modification: Treat `app.ts` as the only place that touches `window.fetch`. Don't store fetch refs at module load.
- Test coverage: `src/app.test.ts` (4.8k).

## Scaling Limits

**SQLite single-writer:**
- Current capacity: WAL mode (`src/server/db/index.ts:16`), 5s busy timeout (`:17`).
- Limit: Single-writer SQLite handles dozens of concurrent admins comfortably; degrades sharply at ~100 concurrent writers.
- Scaling path: For a self-hosted single-controller admin tool this is overkill; not a concern at intended scale.

**Sessions table grows unbounded until row expiry:**
- Current capacity: Each login creates one row in `sessions`; `get()` deletes its own row when it sees an expired cookie.
- Limit: Rows whose cookies are never re-presented (e.g., user closes tab after auth and never returns) live forever.
- Scaling path: Add a startup cleanup `DELETE FROM sessions WHERE expires_at < unixepoch()` in `SQLiteSessionStore` constructor. Add a `setInterval` cleanup every hour.

**Member list page renders all rows in DOM:**
- Current capacity: `<zt-data-table>` renders one `<tr>` per row with no virtualization.
- Limit: Networks with 1000+ members will produce noticeable lag on sort/select-all.
- Scaling path: PROJECT.md explicitly defers virtualization ("Pagination — low severity, unlikely to hit scale limits on self-hosted controller"). If a future user hits this, add row virtualization to `src/components/data-table.ts` rather than backend pagination.

**Log buffer caps at 500 in-memory entries:**
- Current capacity: 500 entries (`src/services/log-service.ts:9`).
- Limit: At ~10 ops/sec, the buffer rolls over in 50 seconds.
- Scaling path: Either persist to IndexedDB or accept this is a session-scoped UX feature.

## Dependencies at Risk

**`bcryptjs` 2.4.3 (last published 2017):**
- Risk: `bcryptjs` is the pure-JS port of `bcrypt`. v2.4.3 is unmaintained; `@types/bcryptjs` 2.4.6 is the matching ambient types. The native `bcrypt` package is faster and more actively maintained but adds a native dependency.
- Files: `src/package.json:36` (`bcryptjs`), `src/package.json:45` (`@types/bcryptjs`).
- Impact: A future Node.js change in crypto/timing-safe primitives could land first in `bcrypt` (native). For now `bcryptjs` is functionally fine.
- Migration plan: Switch to `argon2` via `node-rs/argon2` when modernizing the auth stack. Bcrypt cost 12 (`src/server/auth/password.ts:3`) is still acceptable.

**`@vaadin/router` 2.0.1:**
- Risk: Vaadin Router is on a slow release cadence (v2.0 stable, no breaking changes expected).
- Files: `src/package.json:35`.
- Impact: Low — used only for SPA routing, public API is small.
- Migration plan: Lit ecosystem alternatives: `@lit-labs/router` (officially maintained) is a drop-in replacement if needed.

**`better-sqlite3` 12.x (native binding):**
- Risk: Major-version Node releases occasionally require a `better-sqlite3` rebuild. Pre-built binaries are usually available, but not always immediately for the newest Node.
- Files: `src/package.json:37`.
- Impact: Deploy can fail on a fresh Node major until prebuilt binaries land.
- Migration plan: Pin Node LTS in `.nvmrc` (does not currently exist at repo root) and the systemd unit per the EC2 guide.

**`vitest` 4.x (alpha-era major):**
- Risk: Vitest 4 is the bleeding-edge major. Configuration churn between minors is real.
- Files: `src/package.json:57`.
- Impact: CI may break on patch upgrades.
- Migration plan: Pin to a known-good minor in `package.json` (currently `^4.1.4`).

## Missing Critical Features

**No `npm audit` / dependency-scan in CI:**
- Problem: `package.json` has no `audit` script and there is no GitHub Actions workflow.
- Blocks: Surfacing CVEs before deploy. PROJECT.md notes "CI/CD pipeline — deferred from v1.0".
- Fix: Add a `npm run audit` script and a minimal GitHub Actions workflow that runs `npm ci && npm test && npm audit --audit-level=high`.

**No SECURITY.md:**
- Problem: Repository has README and three `docs/*.md` files but no `SECURITY.md`.
- Blocks: Responsible-disclosure path; documentation of the threat model (which is non-trivial: this app holds a network controller token).
- Fix: Add `SECURITY.md` covering reporting contact, supported versions, the SESSION_SECRET / token-encryption design, and the assumption that setup is performed over a trusted network.

**No structured audit log for member operations:**
- Problem: Authorize/deauthorize, IP edit, and network create/delete have no `fastify.log.info({ event: 'member.authorized', actorId, networkId, memberId })` line. Only username rename does.
- Blocks: Forensic analysis after an incident.
- Fix: Add a small audit-log helper (`src/server/audit.ts`) and call it from every mutating proxy route and every `users.ts` admin action.

**No env-var validation at boot:**
- Problem: `process.env.PORT`, `SESSION_SECRET`, `COOKIE_SECURE`, `ZTCWM_DB_PATH`, `ZTCWM_ZT_URL`, `ZTCWM_ZT_TOKEN` are read piecemeal across `src/server/index.ts` and `src/server/db/`. There is no single boot-time validator that fails fast on bad input.
- Blocks: Misconfiguration is detected at first use of each variable rather than at startup.
- Fix: Add a `src/server/config.ts` that reads, validates, and exports a frozen config object.

**No OpenAPI / route schema:**
- Problem: Fastify supports JSON-schema validation via the `schema:` option. None of the routes use it; bodies are parsed and manually checked.
- Blocks: Body-size limits, type validation, automatic 400 responses for malformed JSON.
- Fix: Add JSON schemas to each `fastify.post` definition (Fastify's compiled schema validation is faster than manual checks and removes a class of bugs).

## Test Coverage Gaps

**Wildcard ZT proxy admin path:**
- What's not tested: `fastify.all<{ Params: { '*': string } }>('/*', ...)` at `src/server/routes/zt-proxy.ts:236-249` — the catch-all that admins use via API Explorer.
- Files: `src/server/routes/zt-proxy.ts:236-249`.
- Risk: Path traversal or admin-only bypass could regress without test signal.
- Priority: High.

**Session regeneration on login:**
- What's not tested: The session-fixation surface described above. Even a passing test that simply asserts the session ID changes after `POST /auth/login` would lock in a fix when added.
- Files: would belong in `src/server/routes/auth.test.ts` (does not exist as a dedicated file — `auth.ts` is currently exercised through `setup.test.ts` and `users.test.ts`).
- Risk: Silent regression of session-fixation protection.
- Priority: High.

**`ALLOWED_MEMBER_KEYS` allowlist drift:**
- What's not tested: That every key in `Member` (`src/types/zerotier.ts`) corresponds to either an entry in `ALLOWED_MEMBER_KEYS` or an explicit deny-list comment.
- Files: `src/server/routes/zt-proxy.ts:11-22`, `src/types/zerotier.ts`.
- Risk: New member fields silently dropped on update.
- Priority: Medium.

**Auth-interceptor `window.fetch` patch is shallow-tested:**
- What's not tested: Behavior when a logged-in user's session expires server-side mid-request (server returns 401 to a non-`/api/auth/login` URL).
- Files: `src/app.ts:47-63`.
- Risk: Future change to URL prefixes (`/api/setup/`) breaks the redirect logic.
- Priority: Medium.

**SSRF / private-IP rejection at setup:**
- What's not tested: Rejection of `http://localhost`, `http://127.0.0.1`, `http://169.254.169.254` at `POST /setup/zt-config` and `POST /setup/test-connection`.
- Files: `src/server/routes/setup.test.ts` (15k — large, but does it exercise these?). The `setup.ts` code only checks the scheme.
- Risk: Foundational SSRF protection regression goes undetected.
- Priority: High.

**Reset-password audit logging:**
- What's not tested: That `POST /users/:id/reset-password` emits an audit log line. Currently it doesn't, so no test would pass — this is a coverage *and* feature gap.
- Files: `src/server/routes/users.ts:179-198`, `src/server/routes/users.test.ts`.
- Risk: Adding the log line later might use the wrong shape.
- Priority: Medium.

**Concurrency-bounded batch authorize:**
- What's not tested: That bulk authorize/deauthorize never fires more than N parallel requests.
- Files: `src/pages/network-detail.ts:628-634`.
- Risk: Performance regression on large networks.
- Priority: Low (until pagination becomes a feature).

---

*Concerns audit: 2026-05-04*
