# Requirements: ZeroTier Controller Web Manager — v3.1

**Defined:** 2026-05-04
**Core Value:** A secure, role-based admin interface where the ZeroTier auth token never leaves the server.
**Milestone focus:** Polish & i18n Cleanup — sourced from `.TODO.md`.

## v3.1 Requirements

Requirements for the v3.1 release. Each maps to a roadmap phase.

### Member Visibility

- [x] **MEMBER-01**: Network detail screen displays each member's installed ZeroTier client version alongside the online/offline status indicator — closed by Phase 18 (working tree 2026-05-11; awaiting commit)
- [x] **MEMBER-02**: When the client version is unavailable (member offline, controller has not reported a version yet), the version cell shows a neutral placeholder (e.g. `—`) — no `undefined`, no `null`, no perpetual spinner — closed by Phase 18 (working tree 2026-05-11; awaiting commit)

### Internationalization

- [x] **I18N-01**: Every visible UI string in the SPA (components, pages, modals, toasts, error messages, button labels, table headers, empty states) is in English — no remaining Portuguese strings ✓ verified 2026-05-12 (Phase 19; audit script exit 0, walkthrough self-attested)
- [x] **I18N-02**: User-visible backend response messages (validation errors, audit-log lines surfaced in the UI) are in English ✓ verified 2026-05-12 (Phase 19; src/server/routes & src/server/auth covered by D-01 grep scope)

### Users Page

- [ ] **USERS-01**: Users-page action buttons for **edit**, **reset password**, and **delete** display Lucide icons (via `lucide-static`), restoring the visual standard broken in the v3.0 `.btn-*` migration

### Layout

- [ ] **LAYOUT-01**: `<zt-navbar>` renders outside the page outlet (`<div id="outlet">`) so it stays mounted across navigation — page content alone re-renders on route change
- [ ] **LAYOUT-02**: Navbar aligns vertically with the brand logo container (`<div class="brand">`) at the top of the viewport — no gap, no offset

## v3.2+ Requirements

Deferred to future release. Tracked but not in current roadmap.

*(None at this time — surface here as new ideas emerge during v3.1 execution.)*

## Out of Scope

Explicitly excluded for v3.1. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Multi-language support / runtime locale switching (i18n framework like i18next) | English is the single chosen language for a self-hosted admin tool; runtime locale switching adds complexity without value |
| Replacing `lucide-static` with a different icon library | Existing icon system stays; standardization means adopting it everywhere (echoes v3.0 D-button-system decision) |
| Sidebar layout / structure changes | This milestone only fixes navbar position; sidebar's existing collapse + grouping is correct |
| Real-time client-version updates (push/poll/SSE) | Manual refresh remains the established pattern (v1.0 out-of-scope, reaffirmed) |
| New CI guardrail test for English-only strings | Could be added later; not requested for v3.1, and the i18n audit is a one-time sweep |

## Traceability

Updated by `gsd-roadmapper` on 2026-05-04.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MEMBER-01 | Phase 18 | Complete (2026-05-11 working tree; commits pending) |
| MEMBER-02 | Phase 18 | Complete (2026-05-11 working tree; commits pending) |
| I18N-01 | Phase 19 | Complete (2026-05-12) |
| I18N-02 | Phase 19 | Complete (2026-05-12) |
| USERS-01 | Phase 20 | Pending |
| LAYOUT-01 | Phase 20 | Pending |
| LAYOUT-02 | Phase 20 | Pending |

**Coverage:**
- v3.1 requirements: 7 total
- Mapped to phases: 7 ✓
- Unmapped: 0

---
*Requirements defined: 2026-05-04*
*Last updated: 2026-05-11 — MEMBER-01 and MEMBER-02 marked complete by Phase 18 (working tree only; commits pending user action — see `.planning/phases/18-member-zt-client-version/18-02-SUMMARY.md`)*
