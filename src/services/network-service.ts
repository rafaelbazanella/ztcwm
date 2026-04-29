import { httpClient } from '../api/http-client.js';
import { concurrentMap } from '../utils/concurrency.js';
import type {
    ControllerStatus,
    Network,
    NetworkCreate,
    NetworkUpdate,
    NetworkListResponse,
} from '../types/index.js';

export class NetworkService {
    async getControllerStatus(): Promise<ControllerStatus> {
        return httpClient.get<ControllerStatus>('/controller');
    }

    async listNetworkIds(): Promise<string[]> {
        return httpClient.get<string[]>('/controller/network');
    }

    async listNetworks(): Promise<NetworkListResponse> {
        try {
            return await httpClient.get<NetworkListResponse>('/unstable/controller/network');
        } catch {
            // Fallback: fetch IDs then details individually
            const ids = await this.listNetworkIds();
            const networks = await concurrentMap(ids, (id) => this.getNetwork(id), 5);
            return {
                data: networks.map((n) => ({
                    id: n.id || n.nwid,
                    name: n.name,
                    meta: {
                        totalMemberCount: n.totalMemberCount ?? 0,
                        authorizedMemberCount: n.authorizedMemberCount ?? 0,
                    },
                })),
                meta: { networkCount: ids.length },
            };
        }
    }

    async getNetwork(networkId: string): Promise<Network> {
        return httpClient.get<Network>(`/controller/network/${encodeURIComponent(networkId)}`);
    }

    async createNetwork(config?: NetworkCreate): Promise<Network> {
        return httpClient.post<Network>('/controller/network', config || {});
    }

    async updateNetwork(networkId: string, config: NetworkUpdate): Promise<Network> {
        return httpClient.post<Network>(
            `/controller/network/${encodeURIComponent(networkId)}`,
            config,
        );
    }

    async deleteNetwork(networkId: string): Promise<Network> {
        return httpClient.delete<Network>(
            `/controller/network/${encodeURIComponent(networkId)}`,
        );
    }
}

export const networkService = new NetworkService();
