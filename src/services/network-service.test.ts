import type { NetworkListResponse, Network } from '../types/index.js';
import { httpClient } from '../api/http-client.js';
import { NetworkService } from './network-service.js';

vi.mock('../api/http-client.js', () => ({
    httpClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const getMock = vi.mocked(httpClient.get);

const unstableResponse: NetworkListResponse = {
    data: [
        { id: 'net-001', name: 'TestNet', meta: { totalMemberCount: 5, authorizedMemberCount: 3 } },
    ],
    meta: { networkCount: 1 },
};

const networkDetail: Network = {
    id: 'net-001',
    nwid: 'net-001',
    name: 'TestNet',
    private: true,
    creationTime: 0,
    revision: 1,
    multicastLimit: 32,
    enableBroadcast: true,
    v4AssignMode: { zt: false },
    v6AssignMode: { zt: false, rfc4193: false, '6plane': false },
    routes: [],
    ipAssignmentPools: [],
    rules: [],
    dns: { domain: '', servers: [] },
    tags: [],
    capabilities: [],
    remoteTraceTarget: '',
    remoteTraceLevel: 0,
    objtype: 'network',
    totalMemberCount: 5,
    authorizedMemberCount: 3,
};

const networkDetailNoCount: Network = {
    ...networkDetail,
    id: '',
    nwid: 'net-002',
    name: 'NoCountNet',
    totalMemberCount: undefined,
    authorizedMemberCount: undefined,
};

describe('NetworkService', () => {
    let service: NetworkService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new NetworkService();
    });

    describe('listNetworks — unstable API success', () => {
        it('returns unstable response directly when unstable API succeeds', async () => {
            getMock.mockResolvedValueOnce(unstableResponse);
            const result = await service.listNetworks();
            expect(result).toEqual(unstableResponse);
            expect(getMock).toHaveBeenCalledTimes(1);
            expect(getMock).toHaveBeenCalledWith('/unstable/controller/network');
        });
    });

    describe('listNetworks — fallback path', () => {
        function mockFallback(ids: string[], networks: Network[]) {
            getMock.mockImplementation((path: string) => {
                if (path === '/unstable/controller/network') {
                    return Promise.reject(new Error('unstable down'));
                }
                if (path === '/controller/network') {
                    return Promise.resolve(ids) as Promise<unknown>;
                }
                // Individual network fetch
                const id = path.replace('/controller/network/', '');
                const net = networks.find((n) => n.id === id || n.nwid === id);
                return Promise.resolve(net) as Promise<unknown>;
            });
        }

        it('falls back to stable API when unstable fails', async () => {
            mockFallback(['net-001'], [networkDetail]);
            await service.listNetworks();
            // 1: unstable, 2: listNetworkIds, 3: getNetwork
            expect(getMock).toHaveBeenCalledTimes(3);
        });

        it('returns correct NetworkListResponse shape from fallback', async () => {
            mockFallback(['net-001'], [networkDetail]);
            const result = await service.listNetworks();
            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('meta.networkCount');
            expect(Array.isArray(result.data)).toBe(true);
        });

        it('maps id from n.id falling back to n.nwid', async () => {
            mockFallback(['net-002'], [networkDetailNoCount]);
            const result = await service.listNetworks();
            expect(result.data[0].id).toBe('net-002');
        });

        it('defaults totalMemberCount to 0 when undefined', async () => {
            mockFallback(['net-002'], [networkDetailNoCount]);
            const result = await service.listNetworks();
            expect(result.data[0].meta.totalMemberCount).toBe(0);
        });

        it('defaults authorizedMemberCount to 0 when undefined', async () => {
            mockFallback(['net-002'], [networkDetailNoCount]);
            const result = await service.listNetworks();
            expect(result.data[0].meta.authorizedMemberCount).toBe(0);
        });

        it('sets meta.networkCount to number of IDs', async () => {
            const threeNets = [
                { ...networkDetail, id: 'n1', nwid: 'n1' },
                { ...networkDetail, id: 'n2', nwid: 'n2' },
                { ...networkDetail, id: 'n3', nwid: 'n3' },
            ];
            mockFallback(['n1', 'n2', 'n3'], threeNets);
            const result = await service.listNetworks();
            expect(result.meta.networkCount).toBe(3);
        });
    });
});
