---
status: partial
phase: 20-shell-users-page-regression-fixes
source: [20-VERIFICATION.md]
started: 2026-05-15T19:10:15Z
updated: 2026-05-15T19:10:15Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Visual LAYOUT-02 alignment check (carried forward from previous verification — geometry contract unchanged by 20-05)
expected: Open /dashboard in dev (npm run dev); inspect the top of the viewport — the navbar's bottom border lines up pixel-for-pixel with the sidebar `<div class="brand">` row's bottom border. No gap, no offset, no shift. SC #3.
result: [pending]

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
pending: 4
skipped: 0
blocked: 0

## Gaps
