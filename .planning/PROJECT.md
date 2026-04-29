# ZeroTier Controller Web Manager

## What This Is

A web application for managing a self-hosted ZeroTier network controller. Lit-based SPA frontend backed by a Fastify + SQLite backend with local-account authentication, three-role RBAC (Admin/Operator/Viewer), and secure ZeroTier API proxying — the ZT auth token never leaves the server. v1.0 established test infrastructure, hardened security, and delivered a full UI overhaul. v2.0 added the entire backend layer with user management, making the app production-ready for multi-user deployments. v3.0 closed UX gaps (inline member-IP edit, search/filter, username rename), passed light-theme WCAG 2.1 AA, and shipped a complete documentation set including a paste-ready EC2 deploy guide.

## Core Value

A secure, role-based admin interface where the ZeroTier auth token never leaves the server.

## Current State: v3.0 Shipped (2026-04-29)

**Delivered:** UX refinement (inline member-IP edit, search/filter, username rename), light-theme WCAG 2.1 AA pass with full button standardization, and the project's first complete documentation set including a paste-ready EC2 deploy guide.

**What shipped in v3.0:**

- Backend: `validateIpAssignments` + `validateUsername` helpers, migration 004 (`COLLATE NOCASE` for case-insensitive username uniqueness), `PATCH /api/users/:id/username` with audit log line, only-changed-fields forwarding to the ZT controller (D-11)
- Member-features UI: inline chip-editor for member IPs with structured `ApiError` body + optimistic rollback, case-insensitive search/filter with "Showing N of M" indicator, IPv4-preferred Physical Address column with IPv6-only badge fallback, late-stage "Editar" modal hosting the chip editor
- Username Edit UI: unified Edit-User modal with inline 409 surfacing and self-rename cache refresh; non-admins see username read-only
- Light theme: token-only refactor (accent `#9A6500`, text-muted `#646877`, error `#c91f1f`); every literal color outside `theme.ts` / `shared.ts` removed; `data-theme` boot attribute with comment-fenced `MIRROR-START`/`MIRROR-END` block as the sole permitted home for boot-time hex literals
- CI guardrails: 26-assertion Vitest contrast test (WCAG AA verified) + 184-assertion theme-audit test + 318-line `docs-audit.test.ts` making every DOCS-01..DOCS-06 success criterion machine-checkable
- Documentation: 261-line v3.0 README replacing the 50-line v1.0; paste-ready EC2 §10 covering Ubuntu 24.04 + AL2023 (NodeSource setup_20.x, hardened systemd unit, nginx X-Forwarded-*, certbot TLS, SG TCP 443 + UDP 9993 + TCP 9993-localhost, SQLite hot-backup timer); `docs/architecture.md` + `docs/development.md` refreshed in-place against v2.0+ codebase; `docs/setup.md` deleted (absorbed into README); `docs/api-reference.md` annotated with caveat
- 671 tests across 33 files (was 628), 25/25 v3.0 requirements complete

## Requirements

### Validated

- ✓ Dashboard with network/member/peer stats — existing
- ✓ Network CRUD with IP assignment management — existing
- ✓ Member management with authorize/deauthorize — existing
- ✓ Node status and peer information view — existing
- ✓ Settings page for API URL and auth token — existing
- ✓ In-memory event logging with viewer — existing
- ✓ Interactive API explorer for debugging — existing
- ✓ Client-side routing with lazy-loaded pages — existing
- ✓ Test coverage for critical paths (CIDR, API fallbacks, HTTP errors) — v1.0
- ✓ AES-GCM encrypted auth token storage — v1.0 (superseded by server-side storage in v2.0)
- ✓ Confirmation dialog for destructive API Explorer operations — v1.0
- ✓ Bounded concurrency replacing N+1 API call patterns — v1.0
- ✓ Dual-theme design system (dark/light) with design tokens — v1.0
- ✓ Sidebar with Lucide icons, grouped sections, tablet collapse — v1.0
- ✓ Navbar with theme toggle and live connection status — v1.0
- ✓ Toast notification system — v1.0
- ✓ Reusable data table with sort, inline edit, copy — v1.0
- ✓ Enhanced empty states and loading skeletons — v1.0
- ✓ Dashboard overhaul with stat grid and quick actions — v1.0
- ✓ Network detail redesign with batch member operations — v1.0
- ✓ Pending authorization page with per-network filter tabs — v1.0
- ✓ All list pages migrated to data table component — v1.0
- ✓ Fastify backend with SQLite user storage — v2.0
- ✓ Local account auth with bcrypt(12) + strong password rules — v2.0
- ✓ Server-managed sessions (HttpOnly/Secure/SameSite cookies, CSRF, rate limiting) — v2.0
- ✓ Role-based access control (Admin, Operator, Viewer) — v2.0
- ✓ Full user management UI (create, edit roles, delete, password management) — v2.0
- ✓ Setup wizard (first admin + ZT controller auth token with AES-256-GCM) — v2.0
- ✓ Full ZeroTier API proxy (token server-side only, path validation) — v2.0
- ✓ Login/logout flow with auth guards on all routes — v2.0
- ✓ Rate limiting on auth endpoints (5/min per IP) — v2.0
- ✓ Inline member-IP edit on the network detail page (chip editor in modal) — v3.0
- ✓ Member IP validation: malformed (400), out-of-route (400), collision (409) — v3.0
- ✓ Member IP edit preserves IPv4↔IPv6 entries (no silent drops) — v3.0
- ✓ Members search/filter (name, node ID, IP; case-insensitive) with "Showing N of M" — v3.0
- ✓ IPv4-preferred Physical Address column with IPv6-only badge fallback — v3.0
- ✓ Admin can rename any user's username; case-insensitive 409 on collision — v3.0
- ✓ Username rename writes audit log line (actor, target, old, new, timestamp) — v3.0
- ✓ Username rename leaves sessions valid (sessions key on userId per D-04) — v3.0
- ✓ Viewer/Operator see username field as read-only — v3.0
- ✓ Standardized `.btn-*` system across all action buttons (no bespoke styling) — v3.0
- ✓ Light theme WCAG 2.1 AA pass on every text/background pair — v3.0
- ✓ Light-theme cards/borders/shadows visibly separated and tinted — v3.0
- ✓ Zero literal colors outside `styles/theme.ts` / `styles/shared.ts` — v3.0
- ✓ README + docs/ refreshed against v2.0+ codebase (architecture, development) — v3.0
- ✓ Paste-ready hardened EC2 deploy guide (Ubuntu 24.04 + Amazon Linux 2023) — v3.0
- ✓ Docs guardrail in CI (`docs-audit.test.ts`, 43 assertions across DOCS-01..06) — v3.0

### Active

(None — ready for next milestone planning. Use `/gsd-new-milestone` to seed the next set of requirements.)

### Out of Scope

- Responsive / mobile layout — not a priority for self-hosted admin tool
- Real-time updates (WebSocket/SSE/polling) — manual refresh is acceptable
- Multi-user authentication — MOVED TO ACTIVE (v2.0)
- Keyboard navigation / ARIA accessibility — deferred (Phase 15 UI review surfaced concrete gaps; revisit in a future milestone)
- Request caching / deduplication — low severity
- Pagination — low severity, unlikely to hit scale limits on self-hosted controller
- Environment variable support — localStorage config is working (server-side in v2.0+)
- In-memory logging persistence — low severity
- CI/CD pipeline — deferred from v1.0, revisit in future milestone
- Server-side member search/pagination — self-hosted controllers stay well under any reasonable client-side limit (v3.0)
- Free-form IPs outside managed routes — would silently break ZT peer reachability; rejecting is correct (v3.0)
- Cross-network IP-conflict checks — same IP across different networks is legitimate (v3.0)
- WCAG AAA target — AA is the standard for production admin tools; AAA imposes design constraints disproportionate to value (v3.0)
- New `<zt-button>` web component — existing `.btn-*` class system is the right primitive; standardization means adopting it, not replacing it (v3.0)
- Validation libraries (zod, valibot) — manual validation pattern stays; new code mirrors it (v3.0)
- Search libraries (Fuse.js) — substring + lowercase match is sufficient for typical scale (v3.0)
- CSS framework adoption (Tailwind) — design token system is the chosen abstraction (v3.0)
- Docs site framework (VitePress, Docusaurus, MkDocs) — plain Markdown in `docs/` is the chosen format (v3.0)
- Public demo deployment — self-hosted admin tool; we document deploy, we don't host one (v3.0)
- Docker / docker-compose deployment recipe — deferred to v3.1+ alongside Caddy reverse-proxy (v3.0)

## Context

- **Domain:** ZeroTier network controller administration via the local API (port 9993)
- **Stack:** TypeScript 5.9, Lit 3.3, Vite 6.4, @vaadin/router 2.0, lucide-static
- **Backend:** Fastify + SQLite (better-sqlite3), bcrypt, @fastify/session, @fastify/csrf-protection, @fastify/rate-limit
- **Runtime:** Fastify serves SPA + proxies ZT API (Vite dev proxy in development)
- **Codebase:** ~15,400 LOC TypeScript across 99 files in `src/` (post-v3.0; smaller than v2.0 figure because v2.0 number included `.planning/` and generated artifacts)
- **Tests:** 671 tests across 33 files (Vitest + @open-wc/testing + happy-dom); includes 43-assertion `docs-audit.test.ts` and 26-assertion `theme-contrast.test.ts` that ratchet docs/theme guarantees in CI
- **v1.0 shipped:** 5 phases, 16 plans, 72 commits (2026-04-09 → 2026-04-10)
- **v2.0 shipped:** 7 phases, 21 plans, 81 commits (2026-04-10 → 2026-04-16)
- **v3.0 shipped:** 5 phases, 15 plans, 107 commits since v2.0 (2026-04-23 → 2026-04-29)

## Constraints

- **Tech stack**: Must remain Lit + Vite + TypeScript — no framework migration
- **API compatibility**: Must work with ZeroTier One local API (stable + unstable endpoints)
- **Single-user**: This is a local admin tool, not a multi-tenant service
- **Backend**: Fastify + SQLite — security-first, minimal dependencies
- **No external auth providers**: Local accounts only, no OAuth/SSO

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vitest + @open-wc/testing | Standard for Lit/Vite projects, fast, good DX | ✓ Good — 59 tests, fast execution |
| Risk-first priority order | Security and high-severity tech debt before performance | ✓ Good — security before features |
| Critical + medium only | Low-severity concerns deferred to future milestone | ✓ Good — kept scope manageable |
| Skip responsive/real-time | Self-hosted admin tool doesn't need mobile or live updates | ✓ Good — no demand surfaced |
| Targeted error handling | Fix specific known issues rather than adding global error boundary | ✓ Good — toast covers errors |
| AES-GCM for token storage | Web Crypto API native, no dependencies, browser-supported | ✓ Good — seamless migration |
| concurrentMap(5) for API calls | Bounded concurrency prevents connection exhaustion | ✓ Good — replaced unbounded Promise.all |
| Dual-theme with CSS custom properties | Design tokens in :root, theme classes toggle values | ✓ Good — clean, no JS overhead |
| zt-data-table as universal list component | One component replaces all manual table HTML | ✓ Good — adopted across all pages |
| CI/CD deferred | Testing + security + UI more impactful for v1.0 | — Revisit next milestone |
| Add Fastify backend | Security-first: ZT token server-side, server sessions, RBAC | ✓ Good — clean separation, 15 proxy routes |
| SQLite for user storage | Lightweight, file-based, zero config, ideal for self-hosted | ✓ Good — WAL mode, migration system, zero setup |
| Server sessions over JWT | HttpOnly cookies not exposed to XSS, server-managed invalidation | ✓ Good — CSRF + rate limiting + idle/absolute timeouts |
| Full ZT API proxy | ZT auth token never reaches browser, single security boundary | ✓ Good — AES-256-GCM storage, path validation, role filtering |
| Three-role RBAC model | Admin/Operator/Viewer covers all real delegation needs | ✓ Good — enforced backend + frontend, last-admin protection |
| Setup wizard bootstrapping | First-run detection avoids manual DB seeding | ✓ Good — step-by-step UX, connection validation before save |
| Atomic frontend migration | All-at-once cutover avoids partial proxy state | ✓ Good — crypto-storage deleted, no direct ZT calls remain |
| `validate*` functional helpers (no zod/valibot) | New backend validation mirrors v2.0 manual pattern; no new deps | ✓ Good — `validateUsername`, `validateIpAssignments` slot in cleanly (v3.0) |
| Sessions key on userId, not username (D-04) | Username rename leaves active sessions valid; matches "user identity is the row, not the label" | ✓ Good — integration test confirms; satisfies USER-03 with the chosen interpretation (v3.0) |
| Only-changed-fields forwarding to ZT controller (D-11) | Avoid clobbering controller state on partial member updates | ✓ Good — explicit allowlist; member edit no longer overwrites ipAssignments unless touched (v3.0) |
| Structured `ApiError.body` for inline 409 surfacing | Frontend gets the error code without parsing prose | ✓ Good — Edit-User and chip-editor modals show targeted "Username already taken" / "IP collision with member X" without retries (v3.0) |
| Single-secret model (`SESSION_SECRET` → sha256 → AES-256-GCM key) | One operator-facing secret instead of two; lower setup friction | ✓ Good — README + .env.example aligned (v3.0 D-15, supersedes original two-secret CONTEXT) |
| `data-theme` on `<html>` + MIRROR-fenced literal block | Boot-time theme attribute survives FOUC; sole permitted home for hex literals; runtime `<zt-app theme>` operates independently | ✓ Good — audit grep allow-lists the fence range; everywhere else is token-only (v3.0) |
| LOCKED-INTENT named-color regex (lookbehind, not leading-colon) | LOCKED-form contradicted LOCKED sanity assertion (`solid black` IS flagged); reconciled by lookbehind | ✓ Good — `1px solid black` flagged, `white-space: nowrap` skipped (v3.0) |
| Refresh-in-place for `docs/` (D-18, no versioned snapshots) | Plain Markdown stays readable; git history is the version log | ✓ Good — `architecture.md` + `development.md` updated against v2.0+ codebase, `setup.md` deleted (absorbed into README) (v3.0) |
| Only-existing npm scripts in docs (D-22) | Prevent doc/code drift; future scripts must be added before being documented | ✓ Good — doc-audit grep enforces `npm run …` ⊆ `src/package.json` scripts (v3.0) |
| Phase 17 nyquist guardrail in CI | Every DOCS-* success criterion is an executable assertion | ✓ Good — 318-line `docs-audit.test.ts` runs in ~170ms; closes Phase 17 nyquist_validation (v3.0) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-29 — v3.0 milestone shipped*
