import { httpClient } from '../api/http-client.js';
import { concurrentMap } from '../utils/concurrency.js';
import { nodeService } from './node-service.js';
import type {
    Member,
    MemberUpdate,
    MemberListResponse,
    MemberWithPeer,
    MemberWithPeerListResponse,
} from '../types/index.js';

export class MemberService {
    /** Ensure both id and nodeId are populated regardless of API version */
    private normalizeMember(m: Member): Member {
        if (!m.nodeId && m.id) m.nodeId = m.id;
        if (!m.id && m.nodeId) m.id = m.nodeId;
        return m;
    }

    async listMemberIds(networkId: string): Promise<Record<string, number>> {
        return httpClient.get<Record<string, number>>(
            `/controller/network/${encodeURIComponent(networkId)}/member`,
        );
    }

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

    /**
     * D-10: list members + enrich each row with the matching ZT peer's version.
     * D-13: client-side merge — no new backend route.
     * D-14: graceful degrade — peer-fetch failure returns members with version: undefined.
     * D-07: version is undefined when peer is missing OR peer.version is '' OR peer.version
     *       matches /^0\.0\.0(\.|$)/ (controllers report 0.0.0 for never-connected peers).
     */
    async listMembersWithPeers(networkId: string): Promise<MemberWithPeerListResponse> {
        const [membersResult, peers] = await Promise.all([
            this.listMembers(networkId),
            nodeService.getPeers().catch(() => []),
        ]);

        const peerMap = new Map<string, string>();
        for (const peer of peers) {
            const v = peer.version;
            if (!v) continue;
            if (/^0\.0\.0(\.|$)/.test(v)) continue;
            peerMap.set(peer.address, v);
        }

        const data: MemberWithPeer[] = membersResult.data.map((m) => {
            const joinKey = m.nodeId || m.id;
            const version = peerMap.get(joinKey);
            return { ...m, version };
        });

        return {
            data,
            meta: membersResult.meta,
        };
    }

    async getMember(networkId: string, memberId: string): Promise<Member> {
        const member = await httpClient.get<Member>(
            `/controller/network/${encodeURIComponent(networkId)}/member/${encodeURIComponent(memberId)}`,
        );
        return this.normalizeMember(member);
    }

    async updateMember(
        networkId: string,
        memberId: string,
        config: MemberUpdate,
    ): Promise<Member> {
        return httpClient.post<Member>(
            `/controller/network/${encodeURIComponent(networkId)}/member/${encodeURIComponent(memberId)}`,
            config,
        );
    }

    async authorizeMember(networkId: string, memberId: string): Promise<Member> {
        return this.updateMember(networkId, memberId, { authorized: true });
    }

    async deauthorizeMember(networkId: string, memberId: string): Promise<Member> {
        return this.updateMember(networkId, memberId, { authorized: false });
    }
}

export const memberService = new MemberService();
