import { httpClient } from '../api/http-client.js';
import { concurrentMap } from '../utils/concurrency.js';
import type { Member, MemberUpdate, MemberListResponse } from '../types/index.js';

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
