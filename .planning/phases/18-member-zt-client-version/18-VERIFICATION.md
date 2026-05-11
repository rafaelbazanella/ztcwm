---
phase: 18-member-zt-client-version
verified: 2026-05-11T00:00:00Z
status: passed
score: 4/4 success criteria verified
overrides_applied: 0
requirements_satisfied: [MEMBER-01, MEMBER-02]
---

# Phase 18: Member ZT Client Version Verification Report

**Phase Goal:** Network operators can see, at a glance, which ZeroTier client version each member is running alongside its online status — and never see `undefined`/`null`/spinner states for members the controller has not reported a version for.

**Verified:** 2026-05-11
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| #   | Truth                                                                                                                                                                  | Status     | Evidence                                                                                                                                                                                                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | On the network-detail page, every member row shows the ZT client version next to the online/offline indicator                                                          | VERIFIED   | `src/pages/network-detail.ts:533-541` — Status column (key=`'online'`) renders `<zt-badge variant="success">Online</zt-badge><span class="version">· ${display}</span>` for online rows. `display` is `vX.Y.Z` from `row.version`. Status column widened from 90px → 180px to accommodate (UI-SPEC line 162-163 estimate). |
| 2   | When the controller has not reported a version (offline/unknown), the version cell renders a neutral placeholder — never `undefined`, `null`, or a perpetual spinner   | VERIFIED   | Render path at `network-detail.ts:537-540`: offline → only badge (D-05; no separator, no placeholder). Online + missing version → `· —` (D-06). The ternary at L539 (`rawVersion && !/^0\.0\.0(\.|$)/.test(rawVersion) ? `v${rawVersion}` : '—'`) prevents `undefined`/`null` leakage. No `<zt-loading>`/spinner anywhere on the Status cell render path (D-08). Service-side filter at `member-service.ts:64-66` also strips empty strings and `0.0.0.x` upstream. |
| 3   | The version field is wired through `Member` types and `memberService` rather than hand-rolled in the page component (no `as any` shortcut)                             | VERIFIED   | `MemberWithPeer extends Member { version?: string }` declared at `src/types/zerotier.ts:208-211`; `MemberWithPeerListResponse` at `:214-220`. Service method `memberService.listMembersWithPeers` at `src/services/member-service.ts:55-79` produces it. Page consumes it: `network-detail.ts:10` (import), `:52` (`@state members: MemberWithPeer[]`), `:353` (call site). `grep "as any"` against the three files returns **0 matches**. The page-render cast `(row as { version?: string }).version` at L538 is a narrowing cast on the data-table's `Record<string, unknown>` row type — not an `as any` evasion. |
| 4   | The existing members-list rendering, search/filter, and IP chip-editor flows continue to pass their tests after the column addition                                    | VERIFIED   | `filterMembers` at `src/utils/helpers.ts:16-34` is byte-unchanged from prior phases — searches name/nodeId/ipAssignments only (D-04 honored). IP chip editor wiring intact: `editingIpsMember` state at `network-detail.ts:72`, modal at `:965-981`. Runtime gates (verification context): `pages/network-detail.test.ts` 38/38, `services/member-service.test.ts` 12/12, `styles/theme-audit + theme-contrast` 230 pass / 8 skipped, `tsc --noEmit` exit 0. |

**Score:** 4/4 truths verified

---

### Required Artifacts

| Artifact                                       | Expected                                                          | Status     | Details                                                                                                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/types/zerotier.ts`                         | `MemberWithPeer` + `MemberWithPeerListResponse` exported          | VERIFIED   | Both types present (lines 208-211, 214-220). `MemberWithPeer extends Member` cleanly; `version?: string` optional.                                |
| `src/services/member-service.ts`                | `listMembersWithPeers(networkId)` method with D-07 filter + D-14 graceful degrade | VERIFIED   | Implemented at lines 55-79. `nodeService.getPeers().catch(() => [])` for D-14; `0.0.0.x` regex filter at L65; `Promise.all` for D-15 single-pass. |
| `src/services/member-service.test.ts`           | Tests for merge logic + D-07 detection rules                      | VERIFIED   | 6 new `listMembersWithPeers` tests B1-B6 (lines 140-226). Covers known version, missing peer, empty string, `0.0.0.x` noise, getPeers rejection, meta passthrough. |
| `src/pages/network-detail.ts`                   | Consumer of `listMembersWithPeers`, inline version sub-line render | VERIFIED   | Import at L10; `MemberWithPeer[]` state at L52; `loadData` calls service at L353; Status column render rewritten at L532-542 with `· vX.Y.Z` / `· —` / hidden states. Scoped CSS at L323-334 using only `--color-text-muted`, `--font-mono`, `--font-size-xs`, `--space-xs` (no new tokens). |
| `src/pages/network-detail.test.ts`              | 3 render-state tests + loadData wiring test                       | VERIFIED   | 4 new B-UI tests at lines 624-671 covering all 3 visual states plus the page→service wiring contract. Uses `String.fromCharCode(0xB7)`/`(0x2014)` constants (deviation documented in 18-02-SUMMARY.md; runtime byte-identical). |

All 5 artifacts exist (Level 1), are substantive (Level 2), wired (Level 3 — types flow through service to page; service consumed by page L353), and data flows end-to-end (Level 4 — see Data-Flow Trace below).

---

### Key Link Verification

| From                                | To                                          | Via                                                  | Status | Details                                                                                                                                                            |
| ----------------------------------- | ------------------------------------------- | ---------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `MemberWithPeer` (types)             | `member-service.ts`                         | `import type { MemberWithPeer, MemberWithPeerListResponse }` | WIRED  | `member-service.ts:8-9` imports both; used as method return-shape and array element type.                                                                          |
| `member-service.listMembersWithPeers` | `nodeService.getPeers`                      | `Promise.all([..., nodeService.getPeers().catch(() => [])])` | WIRED  | `member-service.ts:56-59` calls both in parallel; `.catch(() => [])` enables D-14 graceful degrade.                                                                |
| `member-service.listMembersWithPeers` | `network-detail.loadData`                   | `memberService.listMembersWithPeers(this.networkId)` | WIRED  | `network-detail.ts:353` calls service; result mapped into `this.members` at L377-386.                                                                              |
| `MemberWithPeer.version`             | Status column render                        | `(row as { version?: string }).version` at render site | WIRED  | `network-detail.ts:538-540` reads `row.version`, applies D-07 defensive filter, renders `· vX.Y.Z` or `· —`.                                                       |
| Status column render                 | Member row in `<zt-data-table>`             | `columns` array returned from `getMemberColumns`     | WIRED  | Column declared at L532 with `key: 'online', label: 'Status', width: '180px'`; consumed by `zt-data-table` via `.columns=` binding (existing pattern, unchanged).  |

All 5 key links WIRED.

---

### Data-Flow Trace (Level 4)

| Artifact                              | Data Variable                                            | Source                                                                                       | Produces Real Data | Status   |
| ------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------ | -------- |
| `network-detail.ts` Status column     | `row.version` (per-row), derives from `this.members[i].version` | `memberService.listMembersWithPeers` → `Promise.all([listMembers, getPeers()])` → peer-map merge by nodeId | YES                | FLOWING  |
| `member-service.listMembersWithPeers` | `peers` (local), `membersResult.data` (local)            | Live calls to `httpClient.get('/peer')` (via `nodeService.getPeers`) + `/unstable/.../member` (via `listMembers`) | YES                | FLOWING  |

Real data flows from the ZeroTier backend through `httpClient` → service merge → page state → render. The B-UI-4 test (`network-detail.test.ts:654-671`) locks the page→service contract by asserting `mockMemberService.listMembersWithPeers` is called with the network ID and the returned `version` value propagates onto `el.members[0].version`. No hardcoded empties, no static returns on the version path. Note: `loadData` does a second `nodeService.getPeers()` call directly for `physicalAddress`/`online` derivation (page-specific UI concern per CONTEXT line 113-114 / SUMMARY rationale); this is the intentional service-vs-page split, not an oversight.

---

### Behavioral Spot-Checks

| Behavior                                                                  | Command / Method                                                  | Result                                                          | Status |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------- | ------ |
| `MemberWithPeer` type compiles and extends `Member`                       | `npx tsc --noEmit` (per verification context runtime gate)        | exit 0 (reported in verification context)                       | PASS   |
| `listMembersWithPeers` returns merged version, filters D-07 cases         | `npm test -- --run services/member-service.test.ts`               | 12/12 passing (verification context)                            | PASS   |
| Status column renders 3 visual states + page consumes service             | `npm test -- --run pages/network-detail.test.ts`                  | 38/38 passing (verification context)                            | PASS   |
| No new literal hex colors introduced; dual-theme contrast preserved       | `npm test -- --run styles/theme-audit styles/theme-contrast`      | 230 passing, 8 skipped (verification context)                   | PASS   |
| `grep "as any"` across the three modified production files               | `grep "as any" src/{types/zerotier,services/member-service,pages/network-detail}.ts` | 0 matches                                                       | PASS   |
| `listMembersWithPeers` is imported AND called (not orphaned)              | `grep -rn "listMembersWithPeers" src/`                            | 15 references across service, page, and 2 test files            | PASS   |
| `MemberWithPeer` type is imported AND used (not orphaned)                 | `grep -rn "MemberWithPeer" src/`                                  | 11 references across types, service, page, and tests            | PASS   |

All spot-checks PASS. Runtime gate results in the verification context were reported by the user from `cd /var/www/Projects/ztcwm/src && npm test ... && npx tsc --noEmit`; this verifier's sandbox blocked re-running `npm`/`npx`, so the values are accepted as evidence per the verification context contract.

---

### Requirements Coverage

| Requirement | Source Plan                       | Description                                                                                                                                                                                                                                                              | Status    | Evidence                                                                                                                                                                                                |
| ----------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MEMBER-01   | 18-01-PLAN + 18-02-PLAN           | Network detail screen displays each member's installed ZeroTier client version alongside the online/offline status indicator                                                                                                                                              | SATISFIED | Status column at `network-detail.ts:533-541` renders the version inline next to the existing Online badge. Locked by tests B-UI-1 (known) and B-UI-4 (page→service contract).                            |
| MEMBER-02   | 18-01-PLAN + 18-02-PLAN           | When the client version is unavailable (member offline, controller has not reported a version yet), the version cell shows a neutral placeholder (e.g. `—`) — no `undefined`, no `null`, no perpetual spinner                                                            | SATISFIED | Three-state matrix locked: D-05 (offline hides sub-line) + D-06 (online+unknown shows em-dash) + D-08 (no spinner — treated as unknown until data lands). Service-side D-07 filter at `member-service.ts:64-66`; defensive page-side filter at `network-detail.ts:539`. Tests B-UI-1, B-UI-2, B-UI-3. |

No ORPHANED requirements. REQUIREMENTS.md mapping (lines 54-55) lists exactly MEMBER-01 and MEMBER-02 for Phase 18; both are declared in `requirements-completed: [MEMBER-01, MEMBER-02]` in both plan SUMMARYs and are verified above.

---

### Anti-Patterns Found

| File                                  | Line | Pattern                            | Severity | Impact                                                                                                                                       |
| ------------------------------------- | ---- | ---------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/network-detail.ts`          | 309, 808, 930, 941, 951 | `placeholder=...` (HTML attr)        | INFO     | False positive — these are `<input placeholder="...">` form attributes, not stub/TODO placeholders. Pre-existing. Not introduced by Phase 18. |

No blocker or warning anti-patterns introduced by Phase 18. Notably:
- Zero `TODO`/`FIXME`/`HACK`/`XXX` comments in `types/zerotier.ts`, `services/member-service.ts`, `pages/network-detail.ts`.
- Zero `as any` casts on the version path (D-12 honored).
- Zero literal hex/rgb colors outside `theme.ts`/`shared.ts` (theme-audit gate confirms).
- Zero new `console.log` statements.
- The narrowing cast `(row as { version?: string }).version` at `network-detail.ts:538` is a Lit data-table render-signature pattern, not an `as any` evasion — the row arrives typed as `Record<string, unknown>` from `<zt-data-table>`'s generic signature.

---

### Notable Execution Deviations (documented in 18-02-SUMMARY.md)

| Deviation                                                                                                       | Status      | Rationale                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test-body glyphs use `String.fromCharCode(0xB7)` / `(0x2014)` constants instead of `·` / `—` escapes | ACCEPTABLE  | 18-02-SUMMARY § Deviations documents the tool-layer escape-sequence collapse. Runtime behavior is bit-identical (`'·' === String.fromCharCode(0xB7)` is `true`). The B-UI-1/2/3 assertions still validate exact codepoint presence/absence. Static-gate substitution: `grep "MIDDLE_DOT" → 4` and `grep "EM_DASH" → 4` preserve the gate's negative spirit. Verification accepts; no regression in render contract. |
| Status column width: 180px (UI-SPEC estimated 170–190px)                                                       | ACCEPTABLE  | Mid-range of UI-SPEC line 162-163 estimate; multiple of 4 per spacing scale; fits `v999.999.999` worst case without wrap. Within contract.                                                                                                                                                                                                                                                                          |
| Silent degrade on peer-fetch failure (no toast emitted)                                                         | ACCEPTABLE  | UI-SPEC line 217-222 (Plan-Phase Open Item 3) explicitly leaves this to plan-phase discretion. Plan 02 SUMMARY documents the choice to remain silent for consistency with existing `physicalAddress`/`online` degrade precedent. Within contract.                                                                                                                                                                    |
| `aria-label` on version span: not added                                                                         | ACCEPTABLE  | UI-SPEC line 178 marks this as "Claude's Discretion, plan-phase"; declined per 18-02-SUMMARY § Decisions. v3.1 has no a11y milestone (per PROJECT.md OOS). Status column header remains the labelling anchor. Within contract.                                                                                                                                                                                       |

---

### Human Verification Required

(none — all 4 success criteria verified programmatically through code inspection and the user's recently-run runtime gates)

The phase is inline metadata addition (no new component, no new pattern, no new token). UI-SPEC dimension 1-6 sign-off (all PASS) plus the 4 B-UI render-state tests plus the theme-audit/theme-contrast gates cover the visual contract. Pixel-level visual inspection in a running browser is not required because:

1. The render template emits the exact DOM contract from UI-SPEC line 152-159 (`<span class="status-cell"><zt-badge variant="success">Online</zt-badge><span class="version">· ${display}</span></span>`), locked by B-UI-1 grep assertions.
2. The styling uses only existing tokens (`--color-text-muted`, `--font-mono`, `--font-size-xs`, `--space-xs`), already validated by `theme-audit.test.ts` (230 pass) and `theme-contrast.test.ts` (WCAG AA on `--color-text-muted` against secondary card surface).
3. The three states (online+known, online+unknown, offline-absent) are mechanically locked by B-UI-1/2/3.

---

### Gaps Summary

No gaps. All 4 ROADMAP Success Criteria are verified by direct code inspection plus the runtime gate results provided in the verification context. Both Requirements MEMBER-01 and MEMBER-02 are SATISFIED. The implementation matches every locked decision (D-01 inline placement, D-02 v-prefix format, D-03 muted secondary color, D-04 search not extended, D-05 offline hides sub-line, D-06 em-dash for online+unknown, D-07 detection rules, D-08 no spinner, D-09 view type `MemberWithPeer`, D-10 service method, D-11 single-getter untouched, D-12 no `as any`, D-13 client-side merge, D-14 graceful degrade, D-15 re-fetch every refresh, D-16 no bounded concurrency added). UI-SPEC's 6/6 dimensions hold in the rendered output (Copy / Visuals / Color / Typography / Spacing / Registry Safety). The three documented deviations are all within UI-SPEC discretion or tool-environment workarounds with no behavioral impact.

---

## VERIFICATION PASSED — goal achieved, all REQs delivered, all SCs verified

---

_Verified: 2026-05-11_
_Verifier: Claude (gsd-verifier)_
