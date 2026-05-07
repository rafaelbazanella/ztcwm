# Phase 18: Member ZT Client Version - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-04
**Phase:** 18-member-zt-client-version
**Areas discussed:** Display & placement, Unknown semantics, Type integration, Data source for version

---

## Display & Placement

### Question 1 — Display anchor

| Option | Description | Selected |
|--------|-------------|----------|
| Inline same line | `● online · v1.10.6` on the same line, separated by `·` or en-dash | ✓ |
| Stacked under dot | Line 1 `● online`; line 2 muted `v1.10.6` | |
| Tooltip on online dot | Hover/focus shows `Client: v1.10.6` | |
| Badge after status text | `● online` followed by chip/badge `v1.10.6` | |

**User's choice:** Inline same line (recommended)
**Notes:** Aligns with `.TODO.md` "junto com a flag 'online'" — anchored adjacent to status, not as a separate column.

### Question 2 — Version format

| Option | Description | Selected |
|--------|-------------|----------|
| Prefixed `v1.10.6` | Adds `v` prefix to signal it's a version (semver / git-tag convention) | ✓ |
| Raw `1.10.6` | Exactly what `peer.version` returns | |
| Compact `1.10` | Truncate patch | |

**User's choice:** Prefixed v1.10.6 (recommended)

### Question 3 — Version style

| Option | Description | Selected |
|--------|-------------|----------|
| Muted secondary | `text-muted` token + separator `·`; status primary, version metadata | ✓ |
| Same color as status | Same color/weight as the `online` text | |
| Monospace muted | `text-muted` + monospace font (mirrors `nodeId` styling) | |

**User's choice:** Muted secondary (recommended)

### Question 4 — Version filter

| Option | Description | Selected |
|--------|-------------|----------|
| No — keep filter scope | Search/filter stays at name/nodeId/IP only | ✓ |
| Yes — include version | `filterMembers` extended to substring-match version | |

**User's choice:** No — keep filter scope (recommended)
**Notes:** Adding version to search would be a separate phase. Filed as deferred idea.

---

## Unknown Semantics

### Question 1 — Offline rendering

| Option | Description | Selected |
|--------|-------------|----------|
| Same em-dash both cases | `● offline · —` — uniform placeholder regardless of cause | |
| Hide version row when offline | Offline → only `● offline`, no separator, no `—` | ✓ |
| Show last-known with caveat | `● offline · last v1.10.6` if cached | |

**User's choice:** Hide version row when offline
**Notes:** Refines MEMBER-02's literal text. Intent (no `undefined`/`null`/spinner) preserved; rendering becomes "absent" rather than `—` for offline. Plan-phase must NOT "fix" this asymmetry.

### Question 2 — Online with no version

| Option | Description | Selected |
|--------|-------------|----------|
| Show em-dash placeholder | `● online · —` — online-without-version is unexpected, signal it | ✓ |
| Hide version sub-line too | Treat like offline: only `● online` | |
| Inline 'unknown' label | `● online · unknown` italic muted | |

**User's choice:** Show em-dash placeholder (recommended)

### Question 3 — Bad version handling

| Option | Description | Selected |
|--------|-------------|----------|
| Treat as unavailable | Empty string OR `0.0.0`-family OR missing peer → render as unavailable | ✓ |
| Show whatever the API returns | Render `v0.0.0` literal | |
| Defer to plan-phase | Let gsd-planner decide | |

**User's choice:** Treat as unavailable (recommended)
**Notes:** Consolidated detection rule documented in CONTEXT.md D-07.

---

## Type Integration

### Question 1 — Type shape

| Option | Description | Selected |
|--------|-------------|----------|
| New EnrichedMember view type | `MemberWithPeer extends Member { version?: string }` in `src/types/zerotier.ts` | ✓ |
| Optional field on Member | Add `version?: string` directly to `Member` | |
| Page-local merge only | Type only inside `network-detail.ts` (violates SC #3) | |

**User's choice:** New EnrichedMember view type (recommended)

### Question 2 — Merge point

| Option | Description | Selected |
|--------|-------------|----------|
| New method on MemberService | `memberService.listMembersWithPeers(nwid)` does the merge internally | ✓ |
| Page calls both, merges inline | `network-detail.ts` does Promise.all + merge | |
| New util in src/utils | `mergeMembersWithPeers(members, peers)` in utils | |

**User's choice:** New method on MemberService (recommended)
**Notes:** Roadmap success criterion #3 ("flows through Member types and memberService") preferred this option.

### Question 3 — Single getter

| Option | Description | Selected |
|--------|-------------|----------|
| Only list method enriched | `listMembersWithPeers` enriched; `getMember` unchanged (YAGNI) | ✓ |
| Both methods get peer enrichment | Add `getMemberWithPeer(nwid, memberId)` | |
| Defer single getter to future | Same as Option 1, made explicit | |

**User's choice:** Only list method enriched (recommended)

---

## Data Source for Version

### Question 1 — Peer fetch failure mode

| Option | Description | Selected |
|--------|-------------|----------|
| Graceful degrade | Return members with `version: undefined`; UI continues to function | ✓ |
| Fail entire call | Propagate peer-fetch error; page shows global error state | |
| Defer to plan-phase | Let gsd-planner decide | |

**User's choice:** Graceful degrade (recommended)

### Question 2 — Backend join

| Option | Description | Selected |
|--------|-------------|----------|
| Client-side merge | Frontend Promise.all + merge; no new backend route | ✓ |
| New backend join endpoint | `GET /api/zt/controller/network/:id/members-with-peers` | |

**User's choice:** Client-side merge (recommended)

### Question 3 — Refresh cycle

| Option | Description | Selected |
|--------|-------------|----------|
| Re-fetch both together | Every refresh hits both endpoints via `listMembersWithPeers` | ✓ |
| Cache peers per session | Peers cached on first entry; refresh only re-fetches members | |
| Defer to plan-phase | Let gsd-planner decide | |

**User's choice:** Re-fetch both together (recommended)

---

## Claude's Discretion

User left these to Claude's judgment in plan-phase / execute-phase:

- Wrapper response shape for `listMembersWithPeers` (likely `MemberWithPeerListResponse extends Omit<MemberListResponse, 'data'> { data: MemberWithPeer[] }`, but exact name and structure deferred)
- Whether the graceful-degrade path emits a toast or stays silent on peer-fetch failure
- Exact CSS spacing/letter-spacing for the inline version (token color and separator are locked)

---

## Deferred Ideas

Surfaced during discussion, captured in CONTEXT.md `<deferred>`, NOT acted on this phase:

- Search/filter extension to include version
- Last-known version cache for offline members
- Single-member peer enrichment (`getMemberWithPeer()`)
- Backend join endpoint (re-evaluate if frontend-merge proves problematic)
- Toast on peer-fetch failure (plan-phase may add or skip)

---

*Discussion log: 2026-05-04*
