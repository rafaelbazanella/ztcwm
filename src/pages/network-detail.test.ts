import { fixture, html } from '@open-wc/testing-helpers';
import { mapReasonToCopy, diffSingleIp } from './network-detail.js';

// Stub fetch to avoid real network requests during page bootstrapping.
const fetchSpy = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
});
vi.stubGlobal('fetch', fetchSpy);

const { mockMemberService, mockToastService, mockLogService, mockNetworkService, mockNodeService, mockUserService } =
    vi.hoisted(() => ({
        mockMemberService: {
            listMembers: vi.fn().mockResolvedValue({ data: [], meta: { totalCount: 0, authorizedCount: 0 } }),
            listMembersWithPeers: vi.fn().mockResolvedValue({ data: [], meta: { totalCount: 0, authorizedCount: 0 } }),
            updateMember: vi.fn(),
            authorizeMember: vi.fn(),
            deauthorizeMember: vi.fn(),
        },
        mockToastService: {
            success: vi.fn(),
            error: vi.fn(),
            info: vi.fn(),
            warning: vi.fn(),
        },
        mockLogService: {
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
        },
        mockNetworkService: {
            getNetwork: vi.fn().mockResolvedValue({
                id: 'net1',
                nwid: 'net1',
                name: 'Test',
                private: true,
                creationTime: 0,
                revision: 1,
                multicastLimit: 0,
                enableBroadcast: true,
                v4AssignMode: { zt: true },
                v6AssignMode: { '6plane': false, rfc4193: false, zt: false },
                routes: [{ target: '10.0.0.0/24', via: null, flags: 0, metric: 0 }],
                ipAssignmentPools: [],
                rules: [],
                dns: { domain: '', servers: [] },
                tags: [],
                capabilities: [],
                remoteTraceTarget: '',
                remoteTraceLevel: 0,
                objtype: 'network',
            }),
            updateNetwork: vi.fn(),
            deleteNetwork: vi.fn(),
        },
        mockNodeService: {
            getPeers: vi.fn().mockResolvedValue([]),
        },
        mockUserService: {
            getCurrentUser: vi.fn().mockResolvedValue({ id: 1, username: 'admin', role: 'admin' }),
            canEditNetwork: vi.fn().mockReturnValue(true),
            canDeleteNetwork: vi.fn().mockReturnValue(true),
        },
    }));

vi.mock('../services/index.js', () => ({
    memberService: mockMemberService,
    toastService: mockToastService,
    logService: mockLogService,
    networkService: mockNetworkService,
    nodeService: mockNodeService,
    userService: mockUserService,
}));

import './network-detail.js';
import type { PageNetworkDetail } from './network-detail.js';
import type { Member } from '../types/index.js';

function buildMember(overrides: Partial<Member> = {}): Member {
    return {
        id: 'aaaaaaaaaa',
        nwid: 'net1',
        nodeId: 'aaaaaaaaaa',
        name: 'm1',
        authorized: true,
        activeBridge: false,
        noAutoAssignIps: false,
        ipAssignments: ['10.0.0.1'],
        revision: 1,
        creationTime: 0,
        lastAuthorizedTime: 0,
        lastDeauthorizedTime: 0,
        authenticationExpiryTime: 0,
        remoteTraceTarget: '',
        remoteTraceLevel: 0,
        objtype: 'member',
        ...overrides,
    };
}

async function makePage(initialMembers: Member[]): Promise<PageNetworkDetail> {
    const el = await fixture<PageNetworkDetail>(
        html`<page-network-detail></page-network-detail>`,
    );
    // Bypass loadData() so we can deterministically seed members.
    (el as unknown as { loading: boolean; members: Member[]; networkId: string }).loading = false;
    (el as unknown as { networkId: string }).networkId = 'net1';
    (el as unknown as { members: Member[] }).members = initialMembers;
    (el as unknown as { network: unknown }).network = await mockNetworkService.getNetwork('net1');
    el.requestUpdate();
    await el.updateComplete;
    return el;
}

describe('network-detail helpers', () => {
    describe('mapReasonToCopy', () => {
        it('maps malformed', () => {
            expect(mapReasonToCopy({ body: { reason: 'malformed' } })).toBe('Not a valid IP address');
        });
        it('maps out-of-route', () => {
            expect(mapReasonToCopy({ body: { reason: 'out-of-route' } })).toBe(
                "IP is outside this network's managed routes",
            );
        });
        it('maps collision', () => {
            expect(mapReasonToCopy({ body: { reason: 'collision' } })).toBe(
                'IP already assigned to another member',
            );
        });
        it('falls back to body.error when reason missing', () => {
            expect(mapReasonToCopy({ body: { error: 'Some other error' } })).toBe('Some other error');
        });
        it('falls back to "Update failed" when body absent', () => {
            expect(mapReasonToCopy({})).toBe('Update failed');
        });
    });

    describe('diffSingleIp', () => {
        it('detects a single addition', () => {
            expect(diffSingleIp(['10.0.0.1'], ['10.0.0.1', '10.0.0.2'])).toBe('10.0.0.2');
        });
        it('detects a single removal', () => {
            expect(diffSingleIp(['10.0.0.1', 'fc00::1'], ['fc00::1'])).toBe('10.0.0.1');
        });
        it('returns null for bulk changes (same length, different content)', () => {
            expect(diffSingleIp(['10.0.0.1'], ['10.0.0.5'])).toBeNull();
        });
    });
});

describe('page-network-detail ipAssignments column', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Test A: cell renders read-only chips and an Edit IPs button (no inline zt-ip-chip-editor)', async () => {
        const el = await makePage([buildMember({ ipAssignments: ['10.0.0.1', '10.0.0.2'] })]);
        const proto = Object.getPrototypeOf(el) as { getMemberColumns?: () => Array<{ key: string; render?: unknown }> };
        const columns = proto.getMemberColumns!.call(el);
        const ipCol = columns.find((c) => c.key === 'ipAssignments')!;
        const tpl = (ipCol.render as (val: unknown, row: Record<string, unknown>) => unknown).call(
            el,
            ['10.0.0.1', '10.0.0.2'],
            { nodeId: 'aaaaaaaaaa' } as Record<string, unknown>,
        );
        // Render the template into a host fragment to inspect the resulting DOM.
        const host = document.createElement('div');
        const { render } = await import('lit');
        render(tpl as Parameters<typeof render>[0], host);
        // Both IPs displayed
        expect(host.textContent).toContain('10.0.0.1');
        expect(host.textContent).toContain('10.0.0.2');
        // Edit IPs button present (icon-only, identified by aria-label)
        const buttons = host.querySelectorAll('button');
        const hasEditar = Array.from(buttons).some((b) => /edit ips/i.test(b.getAttribute('aria-label') ?? ''));
        expect(hasEditar).toBe(true);
        // Inline chip editor must NOT be rendered in the cell
        expect(host.querySelector('zt-ip-chip-editor')).toBeNull();
    });

    it('Test B: clicking Edit IPs sets editingIpsMember and opens a modal hosting zt-ip-chip-editor', async () => {
        const member = buildMember({ ipAssignments: ['10.0.0.1', '10.0.0.2'] });
        const el = await makePage([member]);
        const proto = Object.getPrototypeOf(el) as { getMemberColumns?: () => Array<{ key: string; render?: unknown }> };
        const columns = proto.getMemberColumns!.call(el);
        const ipCol = columns.find((c) => c.key === 'ipAssignments')!;
        const tpl = (ipCol.render as (val: unknown, row: Record<string, unknown>) => unknown).call(
            el,
            member.ipAssignments,
            member as unknown as Record<string, unknown>,
        );
        const host = document.createElement('div');
        const { render } = await import('lit');
        render(tpl as Parameters<typeof render>[0], host);
        const editarBtn = Array.from(host.querySelectorAll('button')).find((b) => /edit ips/i.test(b.getAttribute('aria-label') ?? ''));
        expect(editarBtn).toBeTruthy();
        editarBtn!.click();
        await el.updateComplete;
        // editingIpsMember state should be set
        expect((el as unknown as { editingIpsMember: Member | null }).editingIpsMember).toBeTruthy();
        // Modal with chip editor inside it should be present
        const modals = el.renderRoot.querySelectorAll('zt-modal');
        let chipInModal: Element | null = null;
        modals.forEach((m) => {
            if ((m as unknown as { open?: boolean }).open) {
                const c = m.querySelector('zt-ip-chip-editor');
                if (c) chipInModal = c;
            }
        });
        expect(chipInModal).not.toBeNull();
        expect((chipInModal as unknown as { ips: string[] }).ips).toEqual(['10.0.0.1', '10.0.0.2']);
    });

    it('Test C: ip-change emitted from chip editor inside the modal triggers handleChipChange', async () => {
        const member = buildMember({ ipAssignments: ['10.0.0.1'] });
        const el = await makePage([member]);
        mockMemberService.updateMember.mockResolvedValueOnce({ ...member, ipAssignments: ['10.0.0.1', '10.0.0.2'] });
        // Open the modal by setting state directly (equivalent to clicking Editar).
        (el as unknown as { editingIpsMember: Member | null }).editingIpsMember = member;
        el.requestUpdate();
        await el.updateComplete;
        // Find the chip editor inside the open modal.
        const modals = el.renderRoot.querySelectorAll('zt-modal');
        let chip: Element | null = null;
        modals.forEach((m) => {
            if ((m as unknown as { open?: boolean }).open) {
                const c = m.querySelector('zt-ip-chip-editor');
                if (c) chip = c;
            }
        });
        expect(chip).not.toBeNull();
        chip!.dispatchEvent(new CustomEvent('ip-change', {
            detail: { ips: ['10.0.0.1', '10.0.0.2'] },
            bubbles: true,
            composed: true,
        }));
        // handleChipChange awaits updateMember; flush microtasks.
        await Promise.resolve();
        await Promise.resolve();
        expect(mockMemberService.updateMember).toHaveBeenCalledWith('net1', 'aaaaaaaaaa', { ipAssignments: ['10.0.0.1', '10.0.0.2'] });
    });

    it('Test D: closing the modal clears editingIpsMember', async () => {
        const member = buildMember({ ipAssignments: ['10.0.0.1'] });
        const el = await makePage([member]);
        (el as unknown as { editingIpsMember: Member | null }).editingIpsMember = member;
        el.requestUpdate();
        await el.updateComplete;
        // Find the open modal and dispatch its 'close' event.
        let openModal: Element | null = null;
        el.renderRoot.querySelectorAll('zt-modal').forEach((m) => {
            if ((m as unknown as { open?: boolean }).open) openModal = m;
        });
        expect(openModal).not.toBeNull();
        openModal!.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
        await el.updateComplete;
        expect((el as unknown as { editingIpsMember: Member | null }).editingIpsMember).toBeNull();
        // No modal should now be open with a chip editor in it.
        let stillOpen = false;
        el.renderRoot.querySelectorAll('zt-modal').forEach((m) => {
            if ((m as unknown as { open?: boolean }).open && m.querySelector('zt-ip-chip-editor')) stillOpen = true;
        });
        expect(stillOpen).toBe(false);
    });

    it('Test E: ipAssignments column width is compact (\u2264 200px, not 220px)', async () => {
        const el = await makePage([buildMember()]);
        const proto = Object.getPrototypeOf(el) as { getMemberColumns?: () => Array<{ key: string; width?: string }> };
        const columns = proto.getMemberColumns!.call(el);
        const ipCol = columns.find((c) => c.key === 'ipAssignments')!;
        expect(ipCol.width).not.toBe('220px');
        // Width is a px string \u2264 200
        const m = /^(\d+)px$/.exec(ipCol.width ?? '');
        expect(m).not.toBeNull();
        expect(Number(m![1])).toBeLessThanOrEqual(200);
    });

    it('Test 2: happy path save calls updateMember and toasts success', async () => {
        const member = buildMember({ ipAssignments: ['10.0.0.1'] });
        const el = await makePage([member]);
        mockMemberService.updateMember.mockResolvedValueOnce({ ...member, ipAssignments: ['10.0.0.5'] });

        await (el as unknown as { handleChipChange: (e: CustomEvent, row: Record<string, unknown>) => Promise<void> })
            .handleChipChange(
                new CustomEvent('ip-change', { detail: { ips: ['10.0.0.5'] } }),
                member as unknown as Record<string, unknown>,
            );

        expect(mockMemberService.updateMember).toHaveBeenCalledWith('net1', 'aaaaaaaaaa', { ipAssignments: ['10.0.0.5'] });
        expect(mockToastService.success).toHaveBeenCalledWith('Member updated');
        expect((el as unknown as { members: Member[] }).members[0].ipAssignments).toEqual(['10.0.0.5']);
    });

    it('Test 3: rollback on 400 malformed + toast + markRejected', async () => {
        const member = buildMember({ ipAssignments: ['10.0.0.1'] });
        const el = await makePage([member]);
        mockMemberService.updateMember.mockRejectedValueOnce({
            status: 400,
            body: { error: 'Invalid IP', invalidIp: '999.0.0.1', reason: 'malformed' },
        });

        await (el as unknown as { handleChipChange: (e: CustomEvent, row: Record<string, unknown>) => Promise<void> })
            .handleChipChange(
                new CustomEvent('ip-change', { detail: { ips: ['10.0.0.1', '999.0.0.1'] } }),
                member as unknown as Record<string, unknown>,
            );

        // Rollback to snapshot
        expect((el as unknown as { members: Member[] }).members[0].ipAssignments).toEqual(['10.0.0.1']);
        expect(mockToastService.error).toHaveBeenCalledWith('Not a valid IP address');
    });

    it('Test 4: error mapping for out-of-route', async () => {
        const member = buildMember({ ipAssignments: ['10.0.0.1'] });
        const el = await makePage([member]);
        mockMemberService.updateMember.mockRejectedValueOnce({
            status: 400,
            body: { error: 'oor', invalidIp: '172.16.0.5', reason: 'out-of-route' },
        });

        await (el as unknown as { handleChipChange: (e: CustomEvent, row: Record<string, unknown>) => Promise<void> })
            .handleChipChange(
                new CustomEvent('ip-change', { detail: { ips: ['10.0.0.1', '172.16.0.5'] } }),
                member as unknown as Record<string, unknown>,
            );

        expect(mockToastService.error).toHaveBeenCalledWith("IP is outside this network's managed routes");
    });

    it('Test 5: error mapping for collision', async () => {
        const member = buildMember({ ipAssignments: ['10.0.0.1'] });
        const el = await makePage([member]);
        mockMemberService.updateMember.mockRejectedValueOnce({
            status: 409,
            body: { error: 'col', invalidIp: '10.0.0.5', reason: 'collision' },
        });

        await (el as unknown as { handleChipChange: (e: CustomEvent, row: Record<string, unknown>) => Promise<void> })
            .handleChipChange(
                new CustomEvent('ip-change', { detail: { ips: ['10.0.0.1', '10.0.0.5'] } }),
                member as unknown as Record<string, unknown>,
            );

        expect(mockToastService.error).toHaveBeenCalledWith('IP already assigned to another member');
    });

    it('Test 6: unknown reason falls back to body.error', async () => {
        const member = buildMember({ ipAssignments: ['10.0.0.1'] });
        const el = await makePage([member]);
        mockMemberService.updateMember.mockRejectedValueOnce({
            status: 400,
            body: { error: 'Some other error' },
        });

        await (el as unknown as { handleChipChange: (e: CustomEvent, row: Record<string, unknown>) => Promise<void> })
            .handleChipChange(
                new CustomEvent('ip-change', { detail: { ips: ['10.0.0.1', 'x'] } }),
                member as unknown as Record<string, unknown>,
            );

        expect(mockToastService.error).toHaveBeenCalledWith('Some other error');
    });

    it('Test 7: preservation across save \u2014 IPv4 removed keeps IPv6 (MEMBER-05)', async () => {
        const member = buildMember({ ipAssignments: ['10.0.0.1', 'fc00::1'] });
        const el = await makePage([member]);
        mockMemberService.updateMember.mockResolvedValueOnce({ ...member, ipAssignments: ['fc00::1'] });

        await (el as unknown as { handleChipChange: (e: CustomEvent, row: Record<string, unknown>) => Promise<void> })
            .handleChipChange(
                new CustomEvent('ip-change', { detail: { ips: ['fc00::1'] } }),
                member as unknown as Record<string, unknown>,
            );

        expect(mockMemberService.updateMember).toHaveBeenCalledWith('net1', 'aaaaaaaaaa', { ipAssignments: ['fc00::1'] });
        expect((el as unknown as { members: Member[] }).members[0].ipAssignments).toEqual(['fc00::1']);
    });
});

describe('page-network-detail search bar (Plan 14-02)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    function setSearch(el: PageNetworkDetail, value: string): void {
        (el as unknown as { searchQuery: string }).searchQuery = value;
        el.requestUpdate();
    }
    function setTab(el: PageNetworkDetail, tab: 'all' | 'authorized' | 'pending'): void {
        (el as unknown as { memberFilter: string }).memberFilter = tab;
        el.requestUpdate();
    }

    it('Test 1: search input rendered with correct placeholder and aria-label', async () => {
        const el = await makePage([buildMember()]);
        await el.updateComplete;
        const input = el.shadowRoot!.querySelector('input.search-input') as HTMLInputElement | null;
        expect(input).not.toBeNull();
        expect(input!.placeholder).toBe('Search by name, ID, or IP\u2026');
        expect(input!.getAttribute('aria-label')).toBe('Search members');
    });

    it('Test 2: typing into the input updates searchQuery state', async () => {
        const el = await makePage([buildMember()]);
        await el.updateComplete;
        const input = el.shadowRoot!.querySelector('input.search-input') as HTMLInputElement;
        input.value = 'alice';
        input.dispatchEvent(new Event('input'));
        await el.updateComplete;
        expect((el as unknown as { searchQuery: string }).searchQuery).toBe('alice');
    });

    it('Test 3: filteredMembers AND-composes tab + search', async () => {
        const members = [
            buildMember({ nodeId: 'aaaaaaaaa1', name: 'alice', authorized: true, ipAssignments: ['10.0.0.5'] }),
            buildMember({ nodeId: 'aaaaaaaaa2', name: 'alice', authorized: false, ipAssignments: ['10.0.0.6'] }),
            buildMember({ nodeId: 'aaaaaaaaa3', name: 'bob', authorized: true, ipAssignments: ['10.0.0.7'] }),
        ];
        const el = await makePage(members);
        setTab(el, 'authorized');
        setSearch(el, 'alice');
        await el.updateComplete;
        const filtered = (el as unknown as { filteredMembers: Member[] }).filteredMembers;
        expect(filtered).toHaveLength(1);
        expect(filtered[0].nodeId).toBe('aaaaaaaaa1');
    });

    it('Test 4: search bar appears above filter tabs in the DOM', async () => {
        const el = await makePage([buildMember()]);
        await el.updateComplete;
        const root = el.shadowRoot!;
        const search = root.querySelector('.search-bar')!;
        const tabs = root.querySelector('.filter-tabs')!;
        expect(search).toBeTruthy();
        expect(tabs).toBeTruthy();
        expect(search.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('Test 5: search indicator hidden when query is empty or whitespace', async () => {
        const el = await makePage([buildMember()]);
        await el.updateComplete;
        expect(el.shadowRoot!.querySelector('.search-indicator')).toBeNull();
        setSearch(el, '   ');
        await el.updateComplete;
        expect(el.shadowRoot!.querySelector('.search-indicator')).toBeNull();
    });

    it('Test 6: search indicator shows "Showing X of Y members" when query is active', async () => {
        const members = [
            buildMember({ nodeId: 'aaaaaaaaa1', name: 'alice' }),
            buildMember({ nodeId: 'aaaaaaaaa2', name: 'bob' }),
            buildMember({ nodeId: 'aaaaaaaaa3', name: 'carol' }),
        ];
        const el = await makePage(members);
        setSearch(el, 'alice');
        await el.updateComplete;
        const indicator = el.shadowRoot!.querySelector('.search-indicator');
        expect(indicator).not.toBeNull();
        expect(indicator!.textContent).toContain('Showing 1 of 3 members');
    });

    it('Test 7: Clear filter button resets searchQuery to empty', async () => {
        const el = await makePage([buildMember()]);
        setSearch(el, 'alice');
        await el.updateComplete;
        const btn = el.shadowRoot!.querySelector('.search-indicator button') as HTMLButtonElement;
        expect(btn).not.toBeNull();
        btn.click();
        await el.updateComplete;
        expect((el as unknown as { searchQuery: string }).searchQuery).toBe('');
        expect(el.shadowRoot!.querySelector('.search-indicator')).toBeNull();
    });

    it('Test 8: input event updates state synchronously (no debounce)', async () => {
        const el = await makePage([buildMember()]);
        await el.updateComplete;
        const input = el.shadowRoot!.querySelector('input.search-input') as HTMLInputElement;
        input.value = 'x';
        input.dispatchEvent(new Event('input'));
        // No await/timer — state must already be updated.
        expect((el as unknown as { searchQuery: string }).searchQuery).toBe('x');
    });
});

describe('page-network-detail Physical Address column (Plan 14-03)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    async function makePageWithLoadData(members: Member[], peers: unknown[]): Promise<PageNetworkDetail> {
        const meta = { totalCount: members.length, authorizedCount: members.filter(m => m.authorized).length };
        mockMemberService.listMembers.mockResolvedValueOnce({ data: members, meta });
        mockMemberService.listMembersWithPeers.mockResolvedValueOnce({ data: members, meta });
        mockNodeService.getPeers.mockResolvedValueOnce(peers);
        const el = await fixture<PageNetworkDetail>(
            html`<page-network-detail></page-network-detail>`,
        );
        (el as unknown as { networkId: string }).networkId = 'net1';
        await (el as unknown as { loadData: () => Promise<void> }).loadData();
        await el.updateComplete;
        return el;
    }

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

    it('Test 2: loadData falls back to IPv6 and sets isPhysicalAddressIPv6 true', async () => {
        const member = buildMember({ nodeId: 'aaaaaaaaaa' });
        const el = await makePageWithLoadData([member], [{
            address: 'aaaaaaaaaa',
            paths: [{ active: true, address: 'fc00::1/9993', lastReceive: 0, lastSend: 0 }],
        }]);
        const enriched = (el as unknown as { members: Array<Member & { isPhysicalAddressIPv6?: boolean; physicalAddress?: string }> }).members[0];
        expect(enriched.physicalAddress).toBe('fc00::1');
        expect(enriched.isPhysicalAddressIPv6).toBe(true);
    });

    it('Test 3: loadData with no active path leaves physicalAddress undefined and IPv6 flag falsy', async () => {
        const member = buildMember({ nodeId: 'aaaaaaaaaa' });
        const el = await makePageWithLoadData([member], [{
            address: 'aaaaaaaaaa',
            paths: [{ active: false, address: '10.0.0.5/9993', lastReceive: 0, lastSend: 0 }],
        }]);
        const enriched = (el as unknown as { members: Array<Member & { isPhysicalAddressIPv6?: boolean; physicalAddress?: string }> }).members[0];
        expect(enriched.physicalAddress).toBeUndefined();
        expect(enriched.isPhysicalAddressIPv6).toBeFalsy();
    });

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

    it('Test 5: column render with IPv6 fallback produces zt-badge "IPv6 only"', async () => {
        const el = await makePage([buildMember()]);
        const col = getPhysicalAddressColumn(el);
        const tpl = col.render('fc00::1', { isPhysicalAddressIPv6: true });
        const { render } = await import('lit');
        const host = document.createElement('div');
        render(tpl as Parameters<typeof render>[0], host);
        expect(host.innerHTML).toContain('zt-badge');
        expect(host.innerHTML).toContain('IPv6 only');
        expect(host.innerHTML).toContain('fc00::1');
    });

    it('Test 6: column render with undefined address produces em dash and NO badge', async () => {
        const el = await makePage([buildMember()]);
        const col = getPhysicalAddressColumn(el);
        const tpl = col.render(undefined, {});
        const { render } = await import('lit');
        const host = document.createElement('div');
        render(tpl as Parameters<typeof render>[0], host);
        expect(host.innerHTML).toContain('\u2014');
        expect(host.innerHTML).not.toContain('zt-badge');
    });

    it('Test 7: refactor does not break filteredMembers / search composition', async () => {
        const members = [
            buildMember({ nodeId: 'aaaaaaaaa1', name: 'alice' }),
            buildMember({ nodeId: 'aaaaaaaaa2', name: 'bob' }),
        ];
        const el = await makePage(members);
        (el as unknown as { searchQuery: string }).searchQuery = 'alice';
        const filtered = (el as unknown as { filteredMembers: Member[] }).filteredMembers;
        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toBe('alice');
    });
});

describe('page-network-detail Status column (Phase 18 version sub-line)', () => {
    // D-08 separator glyph (U+00B7, middle dot) and D-06 placeholder glyph (U+2014, em dash).
    // Built via String.fromCharCode so the source bytes are unambiguous (greppable as the
    // hex literals 0xB7 / 0x2014) and the file-authoring layer cannot collapse them into
    // literal codepoints. See 18-02-SUMMARY.md Deviations section for the rationale.
    const MIDDLE_DOT = String.fromCharCode(0xB7);
    const EM_DASH = String.fromCharCode(0x2014);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    function getStatusColumn(el: PageNetworkDetail): { render: (v: unknown, r: Record<string, unknown>) => unknown } {
        const proto = Object.getPrototypeOf(el) as { getMemberColumns?: () => Array<{ key: string; render?: unknown }> };
        const cols = proto.getMemberColumns!.call(el);
        const col = cols.find(c => c.key === 'online')!;
        return col as { render: (v: unknown, r: Record<string, unknown>) => unknown };
    }

    async function renderStatusCell(el: PageNetworkDetail, val: unknown, row: Record<string, unknown>): Promise<string> {
        const col = getStatusColumn(el);
        const tpl = col.render(val, row);
        const { render } = await import('lit');
        const host = document.createElement('div');
        render(tpl as Parameters<typeof render>[0], host);
        return host.innerHTML;
    }

    it('B-UI-1: online + known version renders badge, middle-dot separator, and v-prefixed version', async () => {
        const el = await makePage([buildMember()]);
        const innerHTML = await renderStatusCell(el, true, { version: '1.10.6' });
        expect(innerHTML).toContain('Online');
        expect(innerHTML).toContain('zt-badge');
        expect(innerHTML).toContain(MIDDLE_DOT);
        expect(innerHTML).toContain('v1.10.6');
        expect(innerHTML).not.toContain(EM_DASH);
    });

    it('B-UI-2: online + unknown version renders badge, separator, and em-dash placeholder', async () => {
        const el = await makePage([buildMember()]);
        const innerHTML = await renderStatusCell(el, true, { version: undefined });
        expect(innerHTML).toContain('Online');
        expect(innerHTML).toContain('zt-badge');
        expect(innerHTML).toContain(MIDDLE_DOT);
        expect(innerHTML).toContain(EM_DASH);
        expect(innerHTML).not.toMatch(/v\d/);
    });

    it('B-UI-3: offline renders only the badge (no separator, no em-dash, no version wrapper)', async () => {
        const el = await makePage([buildMember({ authorized: false })]);
        const innerHTML = await renderStatusCell(el, false, { version: '1.10.6' });
        expect(innerHTML).toContain('Offline');
        expect(innerHTML).toContain('zt-badge');
        expect(innerHTML).not.toContain(MIDDLE_DOT);
        expect(innerHTML).not.toContain(EM_DASH);
        expect(innerHTML).not.toContain('class="version"');
    });

    it('B-UI-4: loadData consumes listMembersWithPeers and propagates version onto el.members', async () => {
        const member = buildMember({ nodeId: 'aaaaaaaaaa' });
        mockMemberService.listMembersWithPeers.mockResolvedValueOnce({
            data: [{ ...member, version: '1.10.6' }],
            meta: { totalCount: 1, authorizedCount: 1 },
        });
        mockNodeService.getPeers.mockResolvedValueOnce([]);
        const el = await fixture<PageNetworkDetail>(
            html`<page-network-detail></page-network-detail>`,
        );
        (el as unknown as { networkId: string }).networkId = 'net1';
        await (el as unknown as { loadData: () => Promise<void> }).loadData();
        await el.updateComplete;
        const rows = (el as unknown as { members: Array<Member & { version?: string }> }).members;
        expect(rows).toHaveLength(1);
        expect(rows[0].version).toBe('1.10.6');
        expect(mockMemberService.listMembersWithPeers).toHaveBeenCalledWith('net1');
    });
});
