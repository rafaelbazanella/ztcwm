# Phase 19: Internationalization Sweep — Audit Report

**Audit Date:** 2026-05-11
**Auditor:** Claude Code (gsd-executor)
**Outcome:** Clean
**Closes Requirements:** I18N-01, I18N-02

## Scope (per 19-CONTEXT.md D-01)

In scope:
- Lit templates (`html\`…\``) in `src/pages/*.ts` and `src/components/*.ts`
- Reactive `@property` / `@state` initial values that render as text
- Toast and log call-site message strings across `src/`
- Validation error strings in `src/server/auth/*.ts` and `src/server/routes/member-ip-validator.ts`
- Server response `error` / `message` / `details` fields in `src/server/routes/*.ts`
- Accessibility attributes: `aria-label`, `aria-description`, `title`, `placeholder`, `alt`

Out of scope (per 19-CONTEXT.md D-02):
- `console.log` / `console.warn` / `console.error` payloads
- `fastify.log.*` audit-log message strings
- Comments and JSDoc
- `*.test.ts` files
- `.planning/`, `.docs/`, `docs/`, `README.md`, `.TODO.md`

## Methodology (per 19-CONTEXT.md D-03 / D-04)

Two-pass audit:
1. Automated grep — `src/scripts/i18n-audit.sh` runs the locked accent-class regex and the locked PT token-list regex (43 tokens; seed list extended by `carregando`, `enviar`, `selecionar` per 19-RESEARCH.md § "PT Token List Audit").
2. Manual page-by-role walkthrough on the running app (`cd src && npm run dev`), exercising real toast and 4xx error paths.

Audit script uses `LC_ALL=C.UTF-8` locale prefix per the D-03 amendment recorded in commit `59a6549` — see `19-01-SUMMARY.md` Deviations section.

## Automated Pass — Script Invocation

```bash
cd src
npm run audit:i18n
```

Output (verbatim):

```
> ztcwm@1.0.0 audit:i18n
> bash scripts/i18n-audit.sh

Pass 1: accent class
Pass 2: PT token list
Audit clean — no PT strings found in src/ under D-01/D-02 filters.
exit=0
```

Exit code: `0`

## Manual Pass — Walkthrough Sign-off

Roles tested:
- [x] Admin
- [x] Operator
- [x] Viewer
- [x] Unauthenticated (login + setup screens only)

Each row below has been visually confirmed against the running app at `http://localhost:3001`.

| Page | Role | Interaction | English-only confirmed |
|------|------|-------------|-----------------------|
| /login | Unauthenticated | Render login form | [x] |
| /login | Unauthenticated | Submit empty form (fires inline error) | [x] |
| /login | Unauthenticated | Submit wrong password (fires toast / inline 401 error) | [x] |
| /setup | Unauthenticated (first run) | Render step 1 (admin creation) | [x] |
| /setup | Unauthenticated (first run) | Submit weak password (fires inline error) | [x] |
| /setup | Unauthenticated (first run) | Render step 2 (ZT controller) | [x] |
| /setup | Unauthenticated (first run) | Test connection (fires Connection Test modal) | [x] |
| /dashboard | Admin | Render loaded dashboard (stats, recent networks, controller info) | [x] |
| /dashboard | Admin | Render with empty controller (no networks state) | [x] |
| /dashboard | Operator | Render loaded dashboard | [x] |
| /dashboard | Viewer | Render loaded dashboard | [x] |
| /networks | Admin | Render networks table | [x] |
| /networks | Admin | Open "Add Network" modal, render form | [x] |
| /networks | Admin | Submit network create — success toast | [x] |
| /networks | Admin | Submit network create with duplicate name — error toast | [x] |
| /networks | Operator | Render networks table (no Delete button visible) | [x] |
| /networks | Viewer | Render networks table (no Create button visible) | [x] |
| /networks/:id | Admin | Render Status, Members, Settings sections | [x] |
| /networks/:id | Admin | Open Edit-Network modal | [x] |
| /networks/:id | Admin | Submit Edit-Network — success toast | [x] |
| /networks/:id | Admin | Open Delete-Network modal — confirm + cancel buttons | [x] |
| /networks/:id | Admin | Member row: open IP chip-editor modal | [x] |
| /networks/:id | Admin | IP chip-editor: type invalid IP — inline error fires | [x] |
| /networks/:id | Admin | IP chip-editor: type out-of-route IP — 400 error toast (`'IP address is outside the network's managed routes'`) | [x] |
| /networks/:id | Admin | IP chip-editor: type duplicate IP — 409 toast (`'IP address is already assigned to another member of this network'`) | [x] |
| /networks/:id | Admin | Batch-authorize selected members — modal + success toast | [x] |
| /networks/:id | Admin | Search members ("Showing N of M") | [x] |
| /networks/:id | Admin | Empty filter state (no matches) | [x] |
| /networks/:id | Operator | Render network detail (Delete-Network button hidden) | [x] |
| /networks/:id | Viewer | Render network detail (Edit + Delete buttons hidden) | [x] |
| /members | Admin | Render all-networks member roll-up | [x] |
| /members | Operator | Render members roll-up | [x] |
| /members | Viewer | Render members roll-up | [x] |
| /pending | Admin | Render pending groups + empty state ("All clear") | [x] |
| /pending | Operator | Render pending groups | [x] |
| /pending | Viewer | Render pending groups | [x] |
| /controllers | Admin | Render controller + peer status | [x] |
| /controllers | Operator | Render controller + peer status | [x] |
| /controllers | Viewer | Render controller + peer status | [x] |
| /users | Admin | Render users table | [x] |
| /users | Admin | Open "Add User" modal | [x] |
| /users | Admin | Create user — success toast + credential modal | [x] |
| /users | Admin | Create user with duplicate username — error toast (`'Username already exists'`) | [x] |
| /users | Admin | Open "Edit User" modal | [x] |
| /users | Admin | Edit user — rename to existing username — error toast | [x] |
| /users | Admin | Open "Reset Password" modal | [x] |
| /users | Admin | Open "Delete User" modal (cannot-delete-self path: confirm last-admin guard fires) | [x] |
| /users | Operator | Route redirects to /dashboard | [x] |
| /users | Viewer | Route redirects to /dashboard | [x] |
| /settings | Admin | Render preferences (change-password form) | [x] |
| /settings | Admin | Change password — success toast | [x] |
| /settings | Admin | Change password with wrong current — error toast | [x] |
| /settings | Operator | Render preferences | [x] |
| /settings | Viewer | Render preferences | [x] |
| /logs | Admin | Render in-memory log entries (varied levels) | [x] |
| /logs | Admin | Empty state (no entries) | [x] |
| /logs | Operator | Render log entries | [x] |
| /logs | Viewer | Render log entries | [x] |
| /api | Admin | Render API Explorer | [x] |
| /api | Admin | Submit GET request — response panel | [x] |
| /api | Admin | Submit DELETE — confirm-modal heading "Confirm DELETE Request" | [x] |
| /api | Operator | Render API Explorer (operator-allowed) | [x] |
| /api | Viewer | Route redirects to /dashboard | [x] |
| (shell) | Any | Sidebar nav labels (Overview / Management / Tools / System sections; Dashboard / Networks / Members / Pending / User Management / API Explorer / Logs / Controllers / Preferences) | [x] |
| (shell) | Any | Navbar status indicator ("Connected" / "Disconnected") | [x] |
| (shell) | Any | Navbar log-out button (aria-label / title "Log out") | [x] |
| (shell) | Any | Navbar theme-toggle button (aria-label / title "Switch to light/dark theme") | [x] |
| (shell) | Any | Toast dismiss button (aria-label "Dismiss notification") | [x] |
| (shell) | Any | Modal close button (aria-label "Close dialog") | [x] |

## Findings

**Clean.** Both grep passes returned zero hits; every walkthrough row visually confirmed English. Phase 19 closes I18N-01 and I18N-02 with no source changes required.

## Sign-off

- Audit script run: 2026-05-12 07:30
- Walkthrough completed: 2026-05-12 07:45
- Signed off by: Rafael Bazanella

---
*Audit performed per 19-CONTEXT.md D-03 / D-04. Re-run with `cd src && npm run audit:i18n` at any time.*
