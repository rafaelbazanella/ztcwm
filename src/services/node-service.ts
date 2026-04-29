import { httpClient } from '../api/http-client.js';
import type { NodeStatus, Peer } from '../types/index.js';

export class NodeService {
    async getStatus(): Promise<NodeStatus> {
        return httpClient.get<NodeStatus>('/status');
    }

    async getPeers(): Promise<Peer[]> {
        return httpClient.get<Peer[]>('/peer');
    }

    async getPeer(address: string): Promise<Peer> {
        return httpClient.get<Peer>(`/peer/${encodeURIComponent(address)}`);
    }
}

export const nodeService = new NodeService();
