---
status: complete
phase: 20-shell-users-page-regression-fixes
source: [20-VERIFICATION.md]
started: 2026-05-15T19:10:15Z
updated: 2026-05-19T00:00:00Z
completed: 2026-05-19T00:00:00Z
---

## Current Test

[testing complete — 3/4 passed, 1 issue → diagnosis in progress]

## Tests

### 1. Visual LAYOUT-02 alignment check (carried forward from previous verification — geometry contract unchanged by 20-05)
expected: Open /dashboard in dev (npm run dev); inspect the top of the viewport — the navbar's bottom border lines up pixel-for-pixel with the sidebar `<div class="brand">` row's bottom border. No gap, no offset, no shift. SC #3.
result: issue
reported: "ainda não está alinhado, percebi que se eu alterar os valores de padding, na ferramenta de inspect, de .brand para '1.2rem 1.25rem', aí sim fica perfeitamente alinhado."
reported_at: 2026-05-19
severity: major
diagnostic_insight: User identified via DevTools that the fix landed at commit 8f622f1 (.nav-title-stack with min-height: 28px) did NOT fully resolve the alignment. The remaining gap is closed only when the SIDEBAR `.brand` row padding is bumped from `1rem 1.25rem` to `1.2rem 1.25rem` — i.e. the navbar band is ~3.2px taller than .brand. Likely root cause: navbar's stacked title/subtitle content (16px + 12px = 28px nominal) compresses to less than the `<zt-logo>` rendered height OR the .nav-title-stack min-height is computed against a baseline that includes line-height padding on the title font. Either bump .brand padding to match navbar OR reduce navbar's content min-height OR introduce a shared --header-band-padding token. Geometry mirror approach (navbar.ts:23-33 mirrors sidebar.ts:32-40 byte-for-byte) is no longer accurate post-fix.
prior_result: issue → fixed 2026-05-15. Gap reported by user (screenshot showing ~14px taller navbar). Root cause: UI-SPEC assumed single-line navbar content (~49px band) but the navbar stacks title (16px) + subtitle (12px) at default line-height ~1.5 = ~42px content vs the sidebar's 28px `<zt-logo>` content. Fixed in `src/components/navbar.ts` by adding `.nav-title-stack` wrapper with `min-height: 28px` + `flex-direction: column` + `justify-content: center` and pinning `line-height: 1` on title/subtitle so total content is 28px regardless of subtitle presence. Both bands now compute to 32px padding + 28px content + 1px border = 61px. — RESULT: User reports residual gap remains; new diagnostic via DevTools narrows the fix to .brand padding `1.2rem 1.25rem`.

### 2. Navbar persistence across route changes (carried forward — state-continuity is a visual property)
expected: Open /dashboard. Note the connection-indicator state (Connected / Disconnected dot). Navigate /dashboard -> /networks -> /users -> /controllers -> /dashboard via the sidebar. Navbar stays mounted (no flicker, no white frame), connection-status dot does not reset to 'checking pulse' on each nav (its @state survives because the component instance survives), title/subtitle update smoothly per route.
result: pass
confirmed_at: 2026-05-19

### 3. CR-01 theme-toggle FIX confirmation (previously the BLOCKER reproduction — now expected to PASS)
expected: Open /settings. Note the current sun/moon icon and aria-label in the navbar (top-right). Click 'Dark' / 'Light' / 'System' in Settings. POST-FIX EXPECTED: navbar's theme icon and aria-label update IMMEDIATELY on each click — for Dark/Light, the chosen theme persists across reload; for System, the live theme matches OS preference AND DevTools shows localStorage['zt-theme'] is ABSENT after the click.
result: pass
confirmed_at: 2026-05-19
note: "CR-01 BLOCKER closed end-to-end. Browser UX confirmation closes the regression loop opened by 20-VERIFICATION.md's previous gaps_found status and matches the programmatic guards at app.test.ts:261-317 (CR-01 regression) + :319-366 (System UX)."

### 4. Initial-render title-flash perceptibility (WR-02; carried forward from previous verification)
expected: Hard-refresh on /dashboard (Cmd+Shift+R / Ctrl+F5). Watch the navbar title region during load. Expected (acceptable): no perceptible flash of empty title before 'Dashboard' / 'Overview' populates.
result: pass
confirmed_at: 2026-05-19
note: "WR-02 confirmed not perceptible on user's hardware. Remains deferred per 20-05 <deferred> block — no upgrade to fix-plan target required."

## Summary

total: 4
passed: 3
issues: 1
pending: 0
skipped: 0
blocked: 0
fixed_pending_reconfirm: 0

## Gaps

### Gap 1: LAYOUT-02 navbar/.brand height mismatch — residual gap remains after 8f622f1 fix
status: diagnosed
reported_by: user (DevTools inspection 2026-05-19)
prior_fix_commit: 8f622f1 (closed initial ~14px gap but not the residual ~3px)
verbatim: "ainda não está alinhado, percebi que se eu alterar os valores de padding, na ferramenta de inspect, de .brand para '1.2rem 1.25rem', aí sim fica perfeitamente alinhado."
severity: major
- truth: "Navbar bottom border aligns pixel-for-pixel with sidebar .brand row's bottom border"
  status: failed
  reason: "Residual gap remains after 8f622f1 fix. User DevTools inspection: setting .brand padding from `1rem 1.25rem` to `1.2rem 1.25rem` makes alignment pixel-perfect — i.e. navbar band is approximately 3.2px taller than .brand band."
  severity: major
  test: 1
  artifacts: ["src/components/navbar.ts:44-49", "src/components/sidebar.ts:32-40", "src/components/logo.ts:33"]
  missing: ["height-locked navbar content stack that mirrors the SVG-driven sidebar content (28px exact, not min-height-with-growth)"]
  root_cause: "`min-height: 28px` on `.nav-title-stack` allows growth above 28px when Inter's intrinsic line metrics (~19.2px line box at font-size-lg=1rem) bleed through `line-height: 1` in Chromium's flex centering. `line-height: 1` strips extra leading but NOT the font's own ascent/descent. Sidebar `.brand` content is `<zt-logo>` SVG with explicit `height=28` (logo.ts:33) — byte-exact, immune to font metrics. Sidebar = 32 + 28 + 1 = 61px deterministic. Navbar = 32 + ~31.2 + 1 = ~64.2px due to Inter metric bleed."
  recommended_fix: "(B-tightened) — pin `.nav-title-stack` to `height: 28px` (not min-height) and add `overflow: hidden` in `src/components/navbar.ts` lines 44-49. Removes the growth axis entirely. 2-line change in 1 file. Stable under future content changes (longer titles, subtitle present/absent, font-size changes)."
  rejected_alternatives:
    - "(A) Bump .brand padding to 1.2rem 1.25rem — treats symptom not cause; sidebar pegged to navbar's metric quirk; will drift again if navbar font/font-size changes. Same fragility class that already failed twice."
    - "(C) Shared --header-band-padding / --header-content-min-height tokens — right philosophy, wrong mechanism. A shared min-height token does not solve the problem since the navbar can still grow past min via font metrics; would still need the `height + overflow: hidden` pattern underneath. Adds two new tokens, modifies three files, bug still reproduces if anyone uses min-height. Defer until a second consumer justifies the abstraction."

### Gap 1-prior (CLOSED — superseded by Gap 1)
status: superseded
reported_by: user (screenshot 2026-05-15)
fix_commit: 8f622f1
fix_summary: Added `.nav-title-stack` wrapper to `<zt-navbar>` with `min-height: 28px` + flex column + `justify-content: center`; pinned `line-height: 1` on `.nav-title` and `.nav-subtitle` so the stacked content is exactly 28px (matching the sidebar's 28px `<zt-logo>`). Total band height was reported as 32px padding + 28px content + 1px border = 61px on both sides.
outcome: Initial ~14px gap closed, but a residual ~3.2px gap remains. See Gap 1 above for diagnosis.
