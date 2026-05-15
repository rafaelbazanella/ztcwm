---
status: partial
phase: 20-shell-users-page-regression-fixes
source: [20-VERIFICATION.md]
started: 2026-05-15T19:10:15Z
updated: 2026-05-15T20:10:00Z
---

## Current Test

[awaiting human testing of items 2, 3, 4]

## Tests

### 1. Visual LAYOUT-02 alignment check (carried forward from previous verification — geometry contract unchanged by 20-05)
expected: Open /dashboard in dev (npm run dev); inspect the top of the viewport — the navbar's bottom border lines up pixel-for-pixel with the sidebar `<div class="brand">` row's bottom border. No gap, no offset, no shift. SC #3.
result: issue → fixed 2026-05-15. Gap reported by user (screenshot showing ~14px taller navbar). Root cause: UI-SPEC assumed single-line navbar content (~49px band) but the navbar stacks title (16px) + subtitle (12px) at default line-height ~1.5 = ~42px content vs the sidebar's 28px `<zt-logo>` content. Fixed in `src/components/navbar.ts` by adding `.nav-title-stack` wrapper with `min-height: 28px` + `flex-direction: column` + `justify-content: center` and pinning `line-height: 1` on title/subtitle so total content is 28px regardless of subtitle presence. Both bands now compute to 32px padding + 28px content + 1px border = 61px. Awaiting user re-confirmation.

### 2. Navbar persistence across route changes (carried forward — state-continuity is a visual property)
expected: Open /dashboard. Note the connection-indicator state (Connected / Disconnected dot). Navigate /dashboard -> /networks -> /users -> /controllers -> /dashboard via the sidebar. Navbar stays mounted (no flicker, no white frame), connection-status dot does not reset to 'checking pulse' on each nav (its @state survives because the component instance survives), title/subtitle update smoothly per route.
result: [pending]

### 3. CR-01 theme-toggle FIX confirmation (previously the BLOCKER reproduction — now expected to PASS)
expected: Open /settings. Note the current sun/moon icon and aria-label in the navbar (top-right). Click 'Dark' / 'Light' / 'System' in Settings. POST-FIX EXPECTED: navbar's theme icon and aria-label update IMMEDIATELY on each click — for Dark/Light, the chosen theme persists across reload; for System, the live theme matches OS preference AND DevTools shows localStorage['zt-theme'] is ABSENT after the click.
result: [pending]

### 4. Initial-render title-flash perceptibility (WR-02; carried forward from previous verification)
expected: Hard-refresh on /dashboard (Cmd+Shift+R / Ctrl+F5). Watch the navbar title region during load. Expected (acceptable): no perceptible flash of empty title before 'Dashboard' / 'Overview' populates.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0
fixed_pending_reconfirm: 1

## Gaps

### Gap 1: LAYOUT-02 navbar/.brand height mismatch (fixed 2026-05-15, awaiting re-confirmation)
status: fixed
reported_by: user (screenshot 2026-05-15)
fix_commit: pending
fix_summary: Added `.nav-title-stack` wrapper to `<zt-navbar>` with `min-height: 28px` + flex column + `justify-content: center`; pinned `line-height: 1` on `.nav-title` and `.nav-subtitle` so the stacked content is exactly 28px (matching the sidebar's 28px `<zt-logo>`). Total band height is now 32px padding + 28px content + 1px border = 61px on both sides.
