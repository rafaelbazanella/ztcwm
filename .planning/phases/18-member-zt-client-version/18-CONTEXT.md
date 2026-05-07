# Phase 18: Member ZT Client Version - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Surface each member's running ZeroTier client version on the network-detail screen, displayed inline alongside the existing online/offline indicator. The version reads from the local node's peer list (`/peer`) rather than the controller (which doesn't carry it). When the version is unavailable, render a neutral state — never `undefined`, `null`, or a perpetual spinner. Existing members-list rendering, search/filter, and IP chip-editor flows continue to pass.

Requirements covered: **MEMBER-01** (display version), **MEMBER-02** (handle unavailable cleanly).

</domain>

<decisions>
## Implementation Decisions

### Display & Placement

- **D-01:** Render version inline on the **same line** as the online indicator: `● online · v1.10.6`. No separate column, no stacked sub-line, no tooltip. Anchored to the existing online dot per `.TODO.md`'s "junto com a flag 'online'" constraint.
- **D-02:** Version string format: **`v` prefix + raw `peer.version`** (e.g., `v1.10.6`). The prefix signals "version" without ambiguity; the raw string preserves full semver — no truncation of patch.
- **D-03:** Visual hierarchy: status (`online` / `offline`) is primary; version is **muted secondary** (uses the v3.0 `text-muted` token in `src/styles/theme.ts`) with separator `·`. Status reads first; version is metadata.
- **D-04:** Version is **NOT** added to the existing search/filter (`filterMembers` in `src/utils/helpers.ts` continues to search name/nodeId/IP only). Adding version to search would be a separate phase if surfaced as a need.

### Unknown / Unavailable Semantics

- **D-05:** **Offline members hide the version sub-line entirely** — the row renders just `● offline` (no separator, no `—`). Avoids cosmetic placeholder noise on the dominant offline case. This refines MEMBER-02's literal "neutral placeholder" — the *intent* (no `undefined`/`null`/spinner) is preserved; the *rendering* is "absent" rather than `—` for offline rows.
- **D-06:** **Online members with no version available** render `● online · —` (em-dash placeholder). Online-without-version is a real but unexpected state and earns visible signaling.
- **D-07:** "Version unavailable" detection rule (single source of truth):
  - Peer entry missing from peer-list for the member's nodeId, OR
  - `peer.version` is empty string, OR
  - `peer.version` matches `/^0\.0\.0(\.|$)/` (controllers report `0.0.0` for never-connected peers — noise, not signal).
- **D-08:** No loading-state spinner. While the initial peer-fetch is in flight, online rows render as if version is unavailable (`—`) until data lands. MEMBER-02 prohibits perpetual spinners; this rule keeps the contract simple.

### Type Integration

- **D-09:** New view type `MemberWithPeer extends Member { version?: string }` lives in `src/types/zerotier.ts` (alongside `Member`, `Peer`). Keeps `Member` as a faithful mirror of the controller response; `MemberWithPeer` is the view-shape for enriched UI.
- **D-10:** New service method **`memberService.listMembersWithPeers(networkId): Promise<MemberWithPeerListResponse>`** in `src/services/member-service.ts`. Internal implementation: `Promise.all([this.listMembers(nwid), nodeService.getPeers()])`, then merge by joining `member.nodeId` (or `member.id` fallback) against `peer.address`. Wrapper response shape mirrors `MemberListResponse` (`{ data, meta }`) — concrete shape (e.g., `MemberWithPeerListResponse`) is for plan-phase to lock.
- **D-11:** **Single getter `getMember()` stays untouched.** Only the list method is enriched. If a future flow needs single-member version, add `getMemberWithPeer()` then (YAGNI).
- **D-12:** No `as any` casts anywhere in the merge path. Type flows from `Member + Peer.version` into `MemberWithPeer` cleanly. Roadmap success criterion #3.

### Data Source

- **D-13:** **Client-side merge** — no new backend endpoint. The page calls the existing `httpClient.get('/peer')` (already proxied via `/api/zt/peer`) and merges with the existing `listMembers()` call. Avoids a new typed route in `src/server/routes/zt-proxy.ts` and new server tests for a localhost-to-localhost optimization that doesn't matter.
- **D-14:** **Graceful degrade on peer-fetch failure.** If `nodeService.getPeers()` rejects (network error, 5xx, etc.) but `listMembers()` succeeds, return `MemberWithPeer[]` with all `version: undefined` — UI continues to function, online rows fall through to D-06's `—` rendering. Peer-fetch failures are non-blocking; consider a one-shot toast as advisory but don't break the page. (Toast is plan-phase's call.)
- **D-15:** **Peers re-fetched on every refresh.** Every refresh trigger that re-fetches members also re-fetches peers — they ride the same `listMembersWithPeers()` orchestration. No separate cache, no stale-while-revalidate. Aligns with v1.0 OOS "manual refresh acceptable".
- **D-16:** **Bounded concurrency is not relevant here** — `/peer` is a single endpoint returning the full list. v1.0's `concurrentMap(5)` decision still stands for places that *do* fan out (e.g., the `listMembers` fallback path that does `getMember` per id), and that fallback path itself is unchanged.

### Claude's Discretion

- Wrapper response shape for `listMembersWithPeers()` — likely `MemberWithPeerListResponse extends Omit<MemberListResponse, 'data'> { data: MemberWithPeer[] }` but plan-phase locks the exact name and structure.
- Whether the graceful-degrade path emits a toast or stays silent — plan-phase decides based on existing toast conventions.
- Exact CSS — `text-muted` token is locked, separator `·` is locked, but the exact margin/letter-spacing is plan-phase / execute-phase territory.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Phase Specs

- `.planning/ROADMAP.md` (Phase 18 row) — phase goal, requirements, success criteria
- `.planning/REQUIREMENTS.md` (MEMBER-01, MEMBER-02) — locked requirement language
- `.planning/PROJECT.md` — Key Decisions table (especially `concurrentMap(5)`, dual-theme tokens, `data-theme` boot attribute, refresh-not-realtime stance)
- `.planning/STATE.md` — current milestone position
- `.TODO.md` — original phrasing: "junto com a flag 'online' exibir a versão do client zerotier instalado"

### Codebase Map (already mapped 2026-05-04)

- `.planning/codebase/STRUCTURE.md` — directory layout and naming conventions
- `.planning/codebase/ARCHITECTURE.md` — data flow and request lifecycle
- `.planning/codebase/CONVENTIONS.md` — coding patterns to follow
- `.planning/codebase/CONCERNS.md` — known fragile areas (esp. for `network-detail.ts` 977 lines)

### Types & Services

- `src/types/zerotier.ts` — current `Member` (lines 99-116) and `Peer` (lines 159-168) shapes
- `src/services/member-service.ts` — `listMembers` (line 19), `listMemberIds` fallback path, `getMember`, `normalizeMember`
- `src/services/node-service.ts` — `getPeers()` (lines 9-11) returns `Peer[]` from `/peer`; `getPeer(address)` (lines 13-15)
- `src/api/http-client.ts` — `httpClient` singleton, CSRF cache, `ApiError` shape

### UI / Page

- `src/pages/network-detail.ts` (977 lines — large, change carefully) — the page that renders members; existing online/offline indicator pattern lives here
- `src/components/data-table.ts` — sortable table primitive used for member rows
- `src/components/ip-chip-editor.ts` — must continue working after the version column lands (success criterion #4)
- `src/utils/helpers.ts` — `filterMembers` stays unchanged for D-04

### Styling

- `src/styles/theme.ts` — `text-muted` token (`#646877` light per v3.0 D-15) is the locked color for the version metadata
- `src/styles/shared.ts` — `.btn-*` and shared classes (no changes expected here for Phase 18)

### Testing

- `src/pages/network-detail.test.ts` — existing test file; new assertions for version rendering land here
- `src/services/member-service.test.ts` — existing test file; new assertions for `listMembersWithPeers` merge logic land here

### Vendor Reference (offline)

- `.docs/zerotier-one/` — local copy of ZeroTier vendor docs for the `/peer` endpoint shape (consult if API ambiguity surfaces)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`nodeService.getPeers()`** (`src/services/node-service.ts:9-11`) — already returns the full `Peer[]` from `/peer`. Phase 18 reuses verbatim; no new fetcher needed.
- **`memberService.listMembers()`** (`src/services/member-service.ts:19-39`) — existing list method with `unstable` → `controller` fallback. `listMembersWithPeers` wraps this, doesn't replace.
- **`Peer` type** (`src/types/zerotier.ts:159-168`) — already declares `version: string` and `versionMajor/Minor/Rev: number`. No type extension needed on `Peer`.
- **`text-muted` token** (`src/styles/theme.ts`) — locked in v3.0 for muted secondary text; the version metadata uses it directly.

### Established Patterns

- **Service shape**: `class FooService { … }` paired with `export const fooService = new FooService()` (v1.0 D). `MemberService` already follows it; new method slots in.
- **Response wrapper**: list endpoints return `{ data: T[]; meta: { totalCount, authorizedCount } }` (`MemberListResponse`). New `MemberWithPeerListResponse` should mirror.
- **`normalizeMember`** (`src/services/member-service.ts:7-11`) — backfills `id`/`nodeId` for cross-version compatibility. The peer-merge join key must use the *normalized* node ID.
- **Bounded concurrency** (v1.0 D, `src/utils/concurrency.ts:concurrentMap`) — preserved on the `listMembers` fallback path; not needed for the new peer-fetch (single call).
- **Theme tokens only — no literal colors outside `theme.ts` / `shared.ts`** (v3.0 D). Version styling uses tokens.
- **Co-located tests** (`*.test.ts` next to source) — new tests land in `network-detail.test.ts` and `member-service.test.ts`.

### Integration Points

- **`network-detail.ts`** — render path for member rows changes; the online indicator's adjacent area gains the version inline. Largest single change in this phase.
- **`member-service.ts`** — gains `listMembersWithPeers()` method; existing methods unchanged.
- **`types/zerotier.ts`** — gains `MemberWithPeer` and (likely) `MemberWithPeerListResponse`; existing types unchanged.
- **`network-detail.ts` data fetch site** — switches from `memberService.listMembers(nwid)` to `memberService.listMembersWithPeers(nwid)`. Refresh handlers fall through automatically.
- **No backend changes** — `zt-proxy.ts` already exposes `/peer`; no new route, no new test there.

</code_context>

<specifics>
## Specific Ideas

- The `.TODO.md` phrasing "junto com a flag 'online'" was the literal anchor for D-01 (inline same-line), not coincidental.
- "Hide version sub-line when offline" (D-05) was an explicit user choice over the recommended em-dash-everywhere approach. The reasoning: a uniform placeholder for offline rows was felt to add cosmetic noise without informational value, since offline-without-version is the dominant case. Keep this in mind during plan-phase — don't "fix" the asymmetry by re-adding `—` to offline rows.

</specifics>

<deferred>
## Deferred Ideas

- **Search/filter on version** — useful if operators want to find members on outdated clients. Out of scope for Phase 18 (D-04). If surfaced as a need, would be a small follow-up phase touching `filterMembers` in `src/utils/helpers.ts` and the search input description in `network-detail.ts`.
- **Last-known version cache for offline members** — would let offline rows show `last v1.10.6` (rather than hiding the sub-line). Out of scope per D-05; would need a peer-cache layer (memory or persisted) plus invalidation rules.
- **Single-member version enrichment** (`getMemberWithPeer()`) — D-11 defers. Add when a flow needs it.
- **Backend join endpoint** (`/api/zt/controller/network/:id/members-with-peers`) — D-13 defers. Reconsider if peer-fetch becomes hot path or if frontend-side joining proves error-prone.
- **Toast on peer-fetch failure** — D-14 leaves to plan-phase's discretion; no commitment either way.

</deferred>

---

*Phase: 18-member-zt-client-version*
*Context gathered: 2026-05-04*
