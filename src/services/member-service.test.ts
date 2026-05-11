import type { MemberListResponse, Member, Peer, MemberWithPeerListResponse } from '../types/index.js';
import { httpClient } from '../api/http-client.js';
import { MemberService } from './member-service.js';
import { nodeService } from '../services/node-service.js';

vi.mock('../api/http-client.js', () => ({
    httpClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

vi.mock('../services/node-service.js', () => ({
    nodeService: { getPeers: vi.fn() },
}));

const getMock = vi.mocked(httpClient.get);
const getPeersMock = vi.mocked(nodeService.getPeers);

const networkId = 'net-001';

const memberAlice: Member = {
    id: 'mem-a',
    nwid: networkId,
    nodeId: 'node-a',
    name: 'Alice',
    authorized: true,
    activeBridge: false,
    noAutoAssignIps: false,
    ipAssignments: [],
    revision: 1,
    creationTime: 0,
    lastAuthorizedTime: 0,
    lastDeauthorizedTime: 0,
    authenticationExpiryTime: 0,
    remoteTraceTarget: '',
    remoteTraceLevel: 0,
    objtype: 'member',
};

const memberBob: Member = {
    ...memberAlice,
    id: 'mem-b',
    nodeId: 'node-b',
    name: 'Bob',
    authorized: false,
};

const unstableMemberResponse: MemberListResponse = {
    data: [memberAlice],
    meta: { totalCount: 1, authorizedCount: 1 },
};

function buildPeer(overrides: Partial<Peer> = {}): Peer {
    return {
        address: 'node-a',
        versionMajor: 1,
        versionMinor: 10,
        versionRev: 6,
        version: '1.10.6',
        latency: 0,
        role: 'LEAF',
        paths: [],
        ...overrides,
    };
}

describe('MemberService', () => {
    let service: MemberService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new MemberService();
    });

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

    describe('listMembers — fallback path', () => {
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

        it('falls back to stable API when unstable fails', async () => {
            mockFallback({ 'mem-a': 1, 'mem-b': 1 }, [memberAlice, memberBob]);
            await service.listMembers(networkId);
            // 1: unstable, 2: listMemberIds, 3: getMember(mem-a), 4: getMember(mem-b)
            expect(getMock).toHaveBeenCalledTimes(4);
        });

        it('returns correct MemberListResponse shape from fallback', async () => {
            mockFallback({ 'mem-a': 1, 'mem-b': 1 }, [memberAlice, memberBob]);
            const result = await service.listMembers(networkId);
            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('meta.totalCount');
            expect(result).toHaveProperty('meta.authorizedCount');
            expect(Array.isArray(result.data)).toBe(true);
            expect(result.data).toHaveLength(2);
        });

        it('sets meta.totalCount to total members', async () => {
            mockFallback({ 'mem-a': 1, 'mem-b': 1 }, [memberAlice, memberBob]);
            const result = await service.listMembers(networkId);
            expect(result.meta.totalCount).toBe(2);
        });

        it('counts only authorized members for authorizedCount', async () => {
            mockFallback({ 'mem-a': 1, 'mem-b': 1 }, [memberAlice, memberBob]);
            const result = await service.listMembers(networkId);
            // Alice authorized, Bob not
            expect(result.meta.authorizedCount).toBe(1);
        });

        it('returns full Member objects in data array', async () => {
            mockFallback({ 'mem-a': 1, 'mem-b': 1 }, [memberAlice, memberBob]);
            const result = await service.listMembers(networkId);
            const ids = result.data.map((m) => m.id).sort();
            expect(ids).toEqual(['mem-a', 'mem-b']);
        });
    });

    describe('listMembersWithPeers — merge with peer versions', () => {
        beforeEach(() => {
            getPeersMock.mockReset();
        });

        it('B1: surfaces version when peer entry exists with valid version', async () => {
            getMock.mockResolvedValueOnce({
                data: [memberAlice],
                meta: { totalCount: 1, authorizedCount: 1 },
            } as MemberListResponse);
            getPeersMock.mockResolvedValueOnce([buildPeer({ address: 'node-a', version: '1.10.6' })]);

            const result: MemberWithPeerListResponse = await service.listMembersWithPeers(networkId);

            expect(result.data).toHaveLength(1);
            expect(result.data[0].version).toBe('1.10.6');
            expect(result.data[0].id).toBe('mem-a');
            expect(result.meta).toEqual({ totalCount: 1, authorizedCount: 1 });
        });

        it('B2: version is undefined when peer entry is missing', async () => {
            getMock.mockResolvedValueOnce({
                data: [memberAlice],
                meta: { totalCount: 1, authorizedCount: 1 },
            } as MemberListResponse);
            getPeersMock.mockResolvedValueOnce([]);

            const result = await service.listMembersWithPeers(networkId);

            expect(result.data[0].version).toBeUndefined();
        });

        it('B3: version is undefined when peer.version is empty string', async () => {
            getMock.mockResolvedValueOnce({
                data: [memberAlice],
                meta: { totalCount: 1, authorizedCount: 1 },
            } as MemberListResponse);
            getPeersMock.mockResolvedValueOnce([buildPeer({ address: 'node-a', version: '' })]);

            const result = await service.listMembersWithPeers(networkId);

            expect(result.data[0].version).toBeUndefined();
        });

        it('B4: version is undefined when peer.version matches 0.0.0 controller noise', async () => {
            getMock.mockResolvedValueOnce({
                data: [memberAlice, memberBob],
                meta: { totalCount: 2, authorizedCount: 1 },
            } as MemberListResponse);
            getPeersMock.mockResolvedValueOnce([
                buildPeer({ address: 'node-a', version: '0.0.0' }),
                buildPeer({ address: 'node-b', version: '0.0.0.123' }),
            ]);

            const result = await service.listMembersWithPeers(networkId);

            expect(result.data[0].version).toBeUndefined();
            expect(result.data[1].version).toBeUndefined();
        });

        it('B5: graceful degrade — getPeers rejection leaves all rows with version undefined', async () => {
            getMock.mockResolvedValueOnce({
                data: [memberAlice, memberBob],
                meta: { totalCount: 2, authorizedCount: 1 },
            } as MemberListResponse);
            getPeersMock.mockRejectedValueOnce(new Error('peer-fetch boom'));

            const result = await service.listMembersWithPeers(networkId);

            expect(result.data).toHaveLength(2);
            expect(result.data.every((row) => row.version === undefined)).toBe(true);
            expect(result.meta).toEqual({ totalCount: 2, authorizedCount: 1 });
        });

        it('B6: meta is passed through from listMembers (totalCount + authorizedCount)', async () => {
            getMock.mockResolvedValueOnce({
                data: [memberAlice, memberBob],
                meta: { totalCount: 2, authorizedCount: 1 },
            } as MemberListResponse);
            getPeersMock.mockResolvedValueOnce([]);

            const result = await service.listMembersWithPeers(networkId);

            expect(result.meta.totalCount).toBe(2);
            expect(result.meta.authorizedCount).toBe(1);
        });
    });
});
