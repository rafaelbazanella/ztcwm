# Phase 18: Member ZT Client Version - Pattern Map

**Mapped:** 2026-05-08
**Files analyzed:** 5 (all modify; 0 create)
**Analogs found:** 5 / 5
**Source:** All analogs are in-tree; no external research needed (`--skip-research`).

---

## File Classification

| File | Action | Role | Data Flow | Closest Analog | Match Quality |
|------|--------|------|-----------|----------------|---------------|
| `src/types/zerotier.ts` | modify | type definitions | declarative | `MemberListResponse` (lines 198-205) + `Member` (lines 99-116) | exact (in-file analog) |
| `src/services/member-service.ts` | modify | service singleton | request-response (orchestrated fan-in) | `MemberService.listMembers` (lines 19-39) — same file, same class | exact (in-file analog) |
| `src/services/member-service.test.ts` | modify | unit test | mocked async | existing `listMembers — unstable API success` block (lines 53-63) and fallback block (lines 65-118) | exact (in-file analog) |
| `src/pages/network-detail.ts` | modify | page (Lit element) | render + fetch orchestration | `loadData` peer-merge (lines 334-381) + `Status` column render (lines 518-524) + `physicalAddress` column render (lines 525-533) | exact (in-file analog, same render path) |
| `src/pages/network-detail.test.ts` | modify | unit test | DOM render + mocked services | `Physical Address column (Plan 14-03)` block (lines 485-593) — `makePageWithLoadData` + column-render assertions | exact (in-file analog, same scaffold) |

**Match-quality note:** every file already has a sibling pattern in the same file; the planner can extend rather than invent. There are no greenfield files.

---

## Pattern Assignments

### `src/types/zerotier.ts` (type definitions, declarative)

**Analog:** `MemberListResponse` (lines 198-205) and `Member` (lines 99-116) in the same file.

**Wrapper response shape pattern** (lines 198-205) — mirror this verbatim for `MemberWithPeerListResponse`:

```typescript
/** Unstable API - member list response */
export interface MemberListResponse {
    data: Member[];
    meta: {
        totalCount: number;
        authorizedCount: number;
    };
}
```

**Existing `Peer` shape — already carries `version: string` so no extension needed** (lines 159-168):

```typescript
/** Peer information */
export interface Peer {
    address: string;
    versionMajor: number;
    versionMinor: number;
    versionRev: number;
    version: string;
    latency: number;
    role: 'LEAF' | 'UPSTREAM' | 'ROOT';
    paths: PeerPath[];
}
```

**JSDoc convention for new types** (observed throughout file): one-line `/** … */` above each interface; no `@property` ceremony. New `MemberWithPeer` and `MemberWithPeerListResponse` follow the same comment style.

**`extends` precedent for shape evolution** (lines 92-96) — `NetworkUpdate extends NetworkCreate` is the in-file template for "same shape with a couple of extra fields":

```typescript
/** Network update payload */
export interface NetworkUpdate extends NetworkCreate {
    remoteTraceTarget?: string;
    remoteTraceLevel?: number;
}
```

Per **D-09** the new view-type uses the same `extends` form: `MemberWithPeer extends Member { version?: string }`. Per the discretion clause, the planner may shape the wrapper response either as `extends Omit<MemberListResponse, 'data'>` or as a fresh interface — both options have in-file precedent (`NetworkUpdate extends` vs the standalone `MemberListResponse`).

---

### `src/services/member-service.ts` (service singleton, orchestrated fan-in)

**Analog:** `MemberService.listMembers` in the same file (lines 19-39).

**Imports pattern** (lines 1-3) — extend the existing import block; do NOT add a new file-level group:

```typescript
import { httpClient } from '../api/http-client.js';
import { concurrentMap } from '../utils/concurrency.js';
import type { Member, MemberUpdate, MemberListResponse } from '../types/index.js';
```

The new method needs `nodeService` (or `nodeService.getPeers` directly) and the new `MemberWithPeer*` types. **Cross-service imports are acceptable in this layer** — `network-detail.ts:8` already shows the canonical multi-service grouped import from `'../services/index.js'`. For an internal cross-service reference *within* `member-service.ts`, importing from `./node-service.js` is the closer pattern (services are singletons; circular-import risk is low because `node-service.ts` does not import from `member-service.ts`).

**Service-method shape pattern** (lines 19-39) — the `listMembers` body is the precise template for `listMembersWithPeers`. Note the structure: try-the-fast-path → catch-fallback → assemble response. The new method does NOT need a fallback (per **D-13/D-14/D-16** — `/peer` is a single call, gracefully degrades to empty array on failure):

```typescript
async listMembers(networkId: string): Promise<MemberListResponse> {
    try {
        const result = await httpClient.get<MemberListResponse>(
            `/unstable/controller/network/${encodeURIComponent(networkId)}/member`,
        );
        result.data = result.data.map((m) => this.normalizeMember(m));
        return result;
    } catch {
        // Fallback: fetch IDs then details
        const idMap = await this.listMemberIds(networkId);
        const ids = Object.keys(idMap);
        const members = await concurrentMap(ids, (id) => this.getMember(networkId, id), 5);
        return {
            data: members,
            meta: {
                totalCount: members.length,
                authorizedCount: members.filter((m) => m.authorized).length,
            },
        };
    }
}
```

**Normalize-then-merge pattern** — `normalizeMember` (lines 7-11) is the join-key contract. Per **D-10** the new method must merge by the *normalized* node ID:

```typescript
/** Ensure both id and nodeId are populated regardless of API version */
private normalizeMember(m: Member): Member {
    if (!m.nodeId && m.id) m.nodeId = m.id;
    if (!m.id && m.nodeId) m.id = m.nodeId;
    return m;
}
```

**Singleton export tail** (line 68) — preserved verbatim; `listMembersWithPeers` is just another method on the existing class:

```typescript
export const memberService = new MemberService();
```

**Promise.all + graceful-degrade pattern** — the closest existing analog for a multi-source fan-in with one source allowed to soft-fail is `network-detail.ts` lines 338-342 (annotated below in the page section). The pattern transplants cleanly into the service:

- `Promise.all([this.listMembers(nwid), nodeService.getPeers().catch(() => [])])` → on `getPeers` rejection, supplies `Peer[] = []` so all members merge with `version: undefined` (D-14).
- After the awaited tuple resolves, `Map<string, Peer>` keyed by `peer.address` is the join structure; iterate `members.data`, look up `peer = map.get(member.nodeId || member.id)`, derive `version` per **D-07**.

**`concurrentMap` is NOT used here** (D-16) — `/peer` is a single endpoint. The existing import stays for the `listMembers` fallback path which is unchanged.

---

### `src/services/member-service.test.ts` (unit test, mocked async)

**Analog:** existing `describe('MemberService', …)` block, especially the unstable-success block (lines 53-63) and fallback block (lines 65-118) in the same file.

**Mock-setup pattern** (lines 1-10) — extend the existing `vi.mock('../api/http-client.js', …)`. Add a mock for `nodeService.getPeers` analogous to how the page test mocks it:

```typescript
import type { MemberListResponse, Member } from '../types/index.js';
import { httpClient } from '../api/http-client.js';
import { MemberService } from './member-service.js';

vi.mock('../api/http-client.js', () => ({
    httpClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const getMock = vi.mocked(httpClient.get);
```

**Fixture pattern** (lines 13-44) — reuse `memberAlice`, `memberBob`, `unstableMemberResponse` constants for new tests. Add `Peer` fixtures next to them following the same `as Type` const idiom:

```typescript
const memberAlice: Member = {
    id: 'mem-a',
    nwid: networkId,
    nodeId: 'node-a',
    /* … */
};
```

**Test-case structure pattern** (lines 53-63) — `describe → it → arrange (mockResolvedValueOnce) → act → assert`:

```typescript
describe('listMembers — unstable API success', () => {
    it('returns unstable response directly when unstable API succeeds', async () => {
        getMock.mockResolvedValueOnce(unstableMemberResponse);
        const result = await service.listMembers(networkId);
        expect(result).toEqual(unstableMemberResponse);
        expect(getMock).toHaveBeenCalledTimes(1);
        expect(getMock).toHaveBeenCalledWith(
            `/unstable/controller/network/${networkId}/member`
        );
    });
});
```

**Path-dispatching mock pattern** (lines 66-80) — `mockFallback` shows how to route a single `httpClient.get` mock by URL substring. The new tests for `listMembersWithPeers` will need an analogous helper that dispatches `/unstable/.../member` → `MemberListResponse`, `/peer` → `Peer[]`:

```typescript
function mockFallback(memberIdMap: Record<string, number>, members: Member[]) {
    getMock.mockImplementation((path: string) => {
        if (path.includes('/unstable/')) {
            return Promise.reject(new Error('unstable down'));
        }
        if (path === `/controller/network/${networkId}/member`) {
            return Promise.resolve(memberIdMap) as Promise<unknown>;
        }
        // Individual member fetch
        const parts = path.split('/');
        const memberId = parts[parts.length - 1];
        const member = members.find((m) => m.id === memberId);
        return Promise.resolve(member) as Promise<unknown>;
    });
}
```

**Assertions to mirror per Phase 18** (the planner locks the exact list, but the test scaffold supports them all):
1. Online member with peer present and `peer.version === '1.10.6'` → result contains `MemberWithPeer` with `version: '1.10.6'`.
2. Online member, peer entry missing → `version: undefined` (D-07 case 1).
3. Online member, `peer.version === ''` → `version: undefined` (D-07 case 2).
4. Online member, `peer.version === '0.0.0'` → `version: undefined` (D-07 case 3).
5. `getPeers` rejects → all members returned with `version: undefined`, `listMembers` data still passes through (D-14).
6. Meta wrapper (`totalCount`, `authorizedCount`) on the new response shape matches `MemberListResponse` semantics.

---

### `src/pages/network-detail.ts` (page, render + fetch orchestration)

**Analog:** `loadData` (lines 334-381) and the column render block (lines 518-524, 525-533) in the same file. **This file already implements a member↔peer merge for `physicalAddress` and `online`** — the version field is a third merge artifact in the same loop.

**Imports pattern** (lines 1-17) — already imports `nodeService`, `nothing`, `html`, `css`, `Member`. The new `MemberWithPeer` type import is the only change to the import block:

```typescript
import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
/* … */
import { networkService, memberService, logService, toastService, nodeService, userService } from '../services/index.js';
import { filterMembers, isIPv4 } from '../utils/helpers.js';
import type { Network, Member, NetworkUpdate, MemberUpdate } from '../types/index.js';
```

**State shape** (lines 50-53) — `members: Member[]` is the existing field. Per **D-09** it likely changes to `MemberWithPeer[]` (or stays `Member[]` if the planner keeps version on a parallel `Map`). The existing pattern of `as Member[]` casts at the assignment site (line 372) is the precedent the planner extends:

```typescript
@state() private members: Member[] = [];
```

**Three-way Promise.all + soft-fail merge pattern** (lines 338-372) — this is the most important analog in the codebase for Phase 18. **Per D-10/D-13/D-14, the planner moves the `Promise.all([listMembers, getPeers])` orchestration *from the page into the service*** so the page calls `memberService.listMembersWithPeers(nwid)` instead. The merge logic that builds `peerInfoMap` migrates with it. The `online`/`physicalAddress` enrichment stays here (page concern) OR migrates too (service concern) — the planner decides; both shapes are supportable.

```typescript
private async loadData(): Promise<void> {
    if (!this.networkId) return;
    this.loading = true;
    try {
        const [network, membersResult, peers] = await Promise.all([
            networkService.getNetwork(this.networkId),
            memberService.listMembers(this.networkId),
            nodeService.getPeers().catch(() => []),
        ]);
        this.network = network;

        // Build peer info map: prefer active IPv4 path; fall back to first active path of any family (D-14, D-15)
        const peerInfoMap = new Map<string, { physicalAddress?: string; isPhysicalAddressIPv6?: boolean; online: boolean }>();
        for (const peer of peers) {
            const activePaths = (peer.paths ?? []).filter(p => p.active && p.address);
            const ipv4Path = activePaths.find(p => isIPv4(p.address.split('/')[0]));
            const chosenPath = ipv4Path ?? activePaths[0];
            const physicalAddress = chosenPath ? chosenPath.address.split('/')[0] : undefined;
            const isPhysicalAddressIPv6 = chosenPath !== undefined && !ipv4Path;
            const hasRecentActivity = peer.paths?.some(p => {
                const lr = p.lastReceive ?? 0;
                const ls = p.lastSend ?? 0;
                const latest = Math.max(lr, ls);
                return latest > 0 && (Date.now() - latest) < 300000;
            }) ?? false;
            peerInfoMap.set(peer.address, { physicalAddress, isPhysicalAddressIPv6, online: hasRecentActivity });
        }

        // Enrich members with physicalAddress, IPv6-only flag, and online status from peers
        this.members = membersResult.data.map(m => {
            const nodeId = m.nodeId || m.id;
            const peerInfo = peerInfoMap.get(nodeId);
            return {
                ...m,
                ...(peerInfo?.physicalAddress ? { physicalAddress: peerInfo.physicalAddress } : {}),
                ...(peerInfo?.isPhysicalAddressIPv6 ? { isPhysicalAddressIPv6: true } : {}),
                online: peerInfo?.online ?? false,
            };
        }) as Member[];
        /* … */
    } catch (err) {
        logService.error(`Failed to load network ${this.networkId}`, String(err));
    } finally {
        this.loading = false;
    }
}
```

**Two callers of D-10's responsibility split:**
- If the service owns the merge (D-10 explicit): `loadData` collapses to `Promise.all([networkService.getNetwork, memberService.listMembersWithPeers])` and the inner `peerInfoMap` building moves into the service. Note the `physicalAddress` + `online` derivation is **page-specific UI concern** (per CONTEXT line 113-114) and the service should NOT take ownership of it; the cleanest split is: service merges *only* `version`, page continues to derive `physicalAddress`/`online` from a separate `peers` array OR from a re-exposed peer field on `MemberWithPeer`.
- If the page keeps the orchestration (alt): the new `version` field is just one more `Map` lookup in the existing for-of loop. The service still gains `listMembersWithPeers` for callers that don't need physical-address enrichment.

The planner picks; both shapes pass. **D-10 explicitly says "Internal implementation: `Promise.all([this.listMembers(nwid), nodeService.getPeers()])`, then merge by joining `member.nodeId` … against `peer.address`"** so the service owns the version-merge minimum.

**Status-column render pattern** (lines 518-524) — this is the surgical edit site:

```typescript
{
    key: 'online', label: 'Status', width: '90px', sortable: true,
    render: (val: unknown) => {
        const online = Boolean(val);
        return html`<zt-badge variant="${online ? 'success' : 'error'}">${online ? 'Online' : 'Offline'}</zt-badge>`;
    },
},
```

**Per D-01/D-03/D-05/D-06 the new render shape is** (illustrative — exact HTML is plan-phase territory per UI-SPEC line 152-159):

```typescript
{
    key: 'online', label: 'Status', /* width widens — UI-SPEC ~170-190px */, sortable: true,
    render: (val: unknown, row: { version?: string }) => {
        const online = Boolean(val);
        const badge = html`<zt-badge variant="${online ? 'success' : 'error'}">${online ? 'Online' : 'Offline'}</zt-badge>`;
        if (!online) return badge; // D-05: hide sub-line entirely
        const version = row.version;
        const display = version && !/^0\.0\.0(\.|$)/.test(version) ? `v${version}` : '—'; // D-02, D-06, D-07
        return html`<span class="status-cell">${badge}<span class="version">· ${display}</span></span>`;
    },
},
```

**Em-dash placeholder pattern** (line 529) — `physicalAddress` already uses `—` for "no data":

```typescript
if (!addr) return html`<span>—</span>`;
```

**Unicode em-dash convention:** the existing code uses the literal character `—` inline in the template (line 529). The test assertion uses `—` (line 579) — both are valid; the planner should match the in-file convention (literal in templates, escape in test strings).

**Conditional rendering with `nothing`** (line 531) — for "render only when X" the file uses Lit's `nothing` sentinel (already imported on line 1). Per UI-SPEC line 161 ("Lit's `nothing` sentinel, not an empty string") this is the locked pattern for D-05's offline-hide:

```typescript
return html`<span>${addr}</span>${isIPv6Only ? html` <zt-badge variant="warning">IPv6 only</zt-badge>` : nothing}`;
```

**CSS scoping convention** (lines 188-322 inline — file's `static styles` block is the home for new selectors). Per UI-SPEC line 221, new `.status-cell` and `.version` classes live inside `network-detail.ts`'s `static styles`, NOT in `theme.ts`/`shared.ts`. Token references use `var(--color-text-muted)`, `var(--font-size-xs)`, `var(--font-mono)`, `var(--space-xs)` — all already in the theme.

**Filter exclusion (D-04)** — `filterMembers` (`src/utils/helpers.ts`) is imported on line 9 and used elsewhere in this file. Per **D-04** the planner does NOT extend it; version is not searchable. No code changes to `helpers.ts`.

---

### `src/pages/network-detail.test.ts` (unit test, DOM render + mocked services)

**Analog:** `Physical Address column (Plan 14-03)` describe block (lines 485-593) in the same file. This block tests the exact same merge-then-render flow Phase 18 extends.

**Service-mock hoisting pattern** (lines 12-73) — already mocks `mockMemberService.listMembers` and `mockNodeService.getPeers`. **No new mock declarations are needed** unless the planner promotes `listMembersWithPeers` to a separate mock entry:

```typescript
const { mockMemberService, mockToastService, mockLogService, mockNetworkService, mockNodeService, mockUserService } =
    vi.hoisted(() => ({
        mockMemberService: {
            listMembers: vi.fn().mockResolvedValue({ data: [], meta: { totalCount: 0, authorizedCount: 0 } }),
            updateMember: vi.fn(),
            authorizeMember: vi.fn(),
            deauthorizeMember: vi.fn(),
        },
        /* … */
        mockNodeService: {
            getPeers: vi.fn().mockResolvedValue([]),
        },
        /* … */
    }));

vi.mock('../services/index.js', () => ({
    memberService: mockMemberService,
    /* … */
    nodeService: mockNodeService,
    /* … */
}));
```

If `listMembersWithPeers` becomes the page's data source, add `listMembersWithPeers: vi.fn().mockResolvedValue({ data: [], meta: { totalCount: 0, authorizedCount: 0 } })` to `mockMemberService` and use it in the new tests; existing tests that rely on `listMembers` continue to work either way (the page calls only one).

**`makePageWithLoadData` helper pattern** (lines 490-503) — the canonical test scaffold for "merge happens during loadData; assert the resulting members[]":

```typescript
async function makePageWithLoadData(members: Member[], peers: unknown[]): Promise<PageNetworkDetail> {
    mockMemberService.listMembers.mockResolvedValueOnce({
        data: members,
        meta: { totalCount: members.length, authorizedCount: members.filter(m => m.authorized).length },
    });
    mockNodeService.getPeers.mockResolvedValueOnce(peers);
    const el = await fixture<PageNetworkDetail>(
        html`<page-network-detail></page-network-detail>`,
    );
    (el as unknown as { networkId: string }).networkId = 'net1';
    await (el as unknown as { loadData: () => Promise<void> }).loadData();
    await el.updateComplete;
    return el;
}
```

If the planner moves the merge into `listMembersWithPeers`, this helper rewrites to mock that method directly with `MemberWithPeer[]` data; if the merge stays in `loadData`, the helper is reused as-is.

**Enrichment-assertion pattern** (lines 505-517) — the locked "given peers, assert merged member field" template:

```typescript
it('Test 1: loadData prefers IPv4 active path over IPv6', async () => {
    const member = buildMember({ nodeId: 'aaaaaaaaaa' });
    const el = await makePageWithLoadData([member], [{
        address: 'aaaaaaaaaa',
        paths: [
            { active: true, address: 'fc00::1/9993', lastReceive: 0, lastSend: 0 },
            { active: true, address: '10.0.0.5/9993', lastReceive: 0, lastSend: 0 },
        ],
    }]);
    const enriched = (el as unknown as { members: Array<Member & { isPhysicalAddressIPv6?: boolean; physicalAddress?: string }> }).members[0];
    expect(enriched.physicalAddress).toBe('10.0.0.5');
    expect(enriched.isPhysicalAddressIPv6).toBeFalsy();
});
```

**Column-render-assertion pattern** (lines 541-581) — uses `Object.getPrototypeOf(el)` to read the column descriptors, then runs the column's `render` callback through Lit's `render` into a detached `<div>` and asserts on `host.innerHTML`:

```typescript
function getPhysicalAddressColumn(el: PageNetworkDetail): { render: (v: unknown, r: Record<string, unknown>) => unknown } {
    const proto = Object.getPrototypeOf(el) as { getMemberColumns?: () => Array<{ key: string; render?: unknown }> };
    const cols = proto.getMemberColumns!.call(el);
    const col = cols.find(c => c.key === 'physicalAddress')!;
    return col as { render: (v: unknown, r: Record<string, unknown>) => unknown };
}

it('Test 4: column render with IPv4 produces NO badge', async () => {
    const el = await makePage([buildMember()]);
    const col = getPhysicalAddressColumn(el);
    const tpl = col.render('10.0.0.5', { isPhysicalAddressIPv6: false });
    const { render } = await import('lit');
    const host = document.createElement('div');
    render(tpl as Parameters<typeof render>[0], host);
    expect(host.innerHTML).toContain('10.0.0.5');
    expect(host.innerHTML).not.toContain('zt-badge');
    expect(host.innerHTML).not.toContain('IPv6 only');
});
```

**Em-dash assertion convention** (line 579) — `—` escape for stable cross-editor comparison:

```typescript
expect(host.innerHTML).toContain('—');
```

**Three-state assertion plan for Phase 18** (mirrors UI-SPEC States Matrix):
1. **Online + version known** — peer with `version: '1.10.6'`, `lastSend: now-1000`. Assert `host.innerHTML` contains `v1.10.6`, `Online`, `·` (middle dot separator).
2. **Online + version unknown** — peer present but `version: ''` OR peer entry absent OR `version: '0.0.0'`. Assert contains `—`, contains `Online`, does NOT contain `v0.0.0`.
3. **Offline** — peer missing or no recent activity. Assert contains `Offline`, does NOT contain `·`, does NOT contain `—`.

`buildMember` (lines 79-99) is the locked fixture builder — extend with version-related overrides only via `Partial<Member & { version?: string }>` once the type lands.

---

## Shared Patterns

### Promise.all + `.catch(() => fallback)` graceful degrade

**Source:** `src/pages/network-detail.ts:338-342`

**Apply to:** `member-service.ts::listMembersWithPeers` (new) — peer-fetch failure must not break the members render (D-14).

```typescript
const [a, b, c] = await Promise.all([
    serviceA.fetchA(id),
    serviceB.fetchB(id),
    serviceC.fetchC().catch(() => []), // <-- non-blocking branch
]);
```

The `.catch(() => fallbackValue)` inline on the third Promise is the locked codebase idiom for "this leg is allowed to fail; supply a benign default". No `try`/`catch` wrapping the whole `Promise.all` — that would mask the other two legitimate failures.

---

### Service singleton class + `export const fooService = new FooService()`

**Source:** `src/services/member-service.ts:5,68`, `src/services/node-service.ts:4,18`

**Apply to:** No new service files; the existing `MemberService` class gains a method, the singleton stays.

```typescript
export class MemberService { /* … */ }
export const memberService = new MemberService();
```

---

### Error-handling: `try / catch / log + toast`, `try / catch (_)` for non-actionable

**Source:** `src/pages/network-detail.ts:376-380` (page) and `src/router/index.ts` (silent catch precedent referenced in CONVENTIONS.md)

**Apply to:** `member-service.ts::listMembersWithPeers` graceful-degrade path. The locked precedent at this layer is **inline `.catch(() => [])` rather than a nested `try`/`catch`** — it's terser and matches the `loadData` peer-fetch line 341. The advisory toast (D-14 / UI-SPEC discretion item 3) is the planner's call:

```typescript
} catch (err) {
    logService.error(`Failed to load network ${this.networkId}`, String(err));
} finally {
    this.loading = false;
}
```

If the planner adds a toast for peer-fetch failure, the precedent is `toastService.error('…')` from elsewhere in `network-detail.ts` (e.g., line 393).

---

### Token-only CSS in Lit `static styles`

**Source:** `src/pages/network-detail.ts` `static styles = [theme, sharedStyles, css\`…\`]` (the file's existing CSS block, lines 188-322)

**Apply to:** New `.status-cell` and `.version` selectors that the planner adds for Phase 18.

Locked tokens (already in `src/styles/theme.ts`):
- `--color-text-muted` (line 16: `#6b6f85` dark / line 87: `#646877` light) — version + separator + em-dash color
- `--font-size-xs` (line 35: `0.75rem`) — version font-size
- `--font-mono` (line 33: `'JetBrains Mono', 'Fira Code', 'Consolas', monospace`) — version family
- `--space-xs` (line 43: `4px`) — flex gap between badge and version sub-span

**Forbidden:** literal hex/rgb in `network-detail.ts`. `src/styles/theme-audit.test.ts` enforces.

---

### `import type` for type-only imports

**Source:** `src/services/member-service.ts:3`, `src/pages/network-detail.ts:10-11`, `src/services/member-service.test.ts:1`

**Apply to:** New imports of `MemberWithPeer`, `MemberWithPeerListResponse`, and `Peer` (where used as a type only).

```typescript
import type { Member, MemberUpdate, MemberListResponse } from '../types/index.js';
```

Always import from the barrel `'../types/index.js'`, not directly from `'../types/zerotier.js'`.

---

### `.js` ESM extension on relative imports of `.ts` source

**Source:** every relative import in the codebase (e.g., `src/services/member-service.ts:1-3`)

**Apply to:** Any new imports added by Phase 18.

```typescript
import { httpClient } from '../api/http-client.js'; // file is http-client.ts
```

Required by NodeNext / bundler-resolution ESM. ESLint and the TS compiler both fail without it.

---

## No Analog Found

| File | Role | Reason |
|------|------|--------|
| (none) | — | All five files have direct in-file analogs. |

Phase 18 is the textbook "extend an existing pattern" phase — no greenfield surface, no new directory, no new component, no new endpoint. Every pattern the planner needs is already mirrored within the file being modified.

---

## Metadata

**Analog search scope:**
- `src/types/` — full sweep for response wrapper precedents
- `src/services/` — full sweep for service-method shapes and Promise.all orchestration
- `src/pages/network-detail.ts` — exhaustive (it is the largest single change site, 977 lines; the merge-then-render flow already exists for `physicalAddress` + `online`)
- `src/pages/network-detail.test.ts` — exhaustive (594 lines; the column-render assertion scaffold already exists)
- `src/styles/theme.ts` — token name/line lookups only (no full read needed; theme tokens are stable)

**Files scanned:** 7 (types, 2 services, 2 service tests, 1 page, 1 page test). All in-tree.

**Pattern extraction date:** 2026-05-08

**Conventional Commits reminder:** any commit produced for this phase must follow `<type>(scope): subject`. Suggested scopes for the file set above: `types(member)`, `service(member)`, `ui(network-detail)`, `test(network-detail)`. Type usually `feat` for the new method/type, `test` for test-only edits.
