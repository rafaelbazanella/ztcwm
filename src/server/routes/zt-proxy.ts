import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { ztFetch, translateZtError, genericErrorResponse } from './zt-proxy-helpers.js';
import { validateIpAssignments } from './member-ip-validator.js';
import { getMinRole, hasPermission, type UserRole } from '../auth/rbac.js';

const NETWORK_ID_RE = /^[0-9a-f]{16}$/i;
const NODE_ID_RE = /^[0-9a-f]{10}$/i;

// D-11: only forward keys the ZT controller actually understands.
// Drops echoed-back/unknown keys so concurrent edits to other fields aren't clobbered.
const ALLOWED_MEMBER_KEYS = new Set([
    'authorized',
    'activeBridge',
    'noAutoAssignIps',
    'name',
    'ipAssignments',
    'authenticationExpiryTime',
    'remoteTraceTarget',
    'remoteTraceLevel',
    'tags',
    'capabilities',
]);

export const ztProxyRoutes: FastifyPluginAsync = async (fastify) => {
    // RBAC preHandler: enforce role-based method filtering on all proxy routes
    fastify.addHook('preHandler', async (request, reply) => {
        const role = (request.session?.role ?? 'viewer') as UserRole;
        const method = request.method;
        // Strip the prefix to get the ZT path for permission check
        const url = request.url.replace(/^\/api\/zt/, '') || '/';
        const minRole = getMinRole(method, url);
        if (!hasPermission(role, minRole)) {
            return reply.code(403).send({
                error: `Insufficient permissions: ${role} role cannot perform ${method} on this resource`,
            });
        }
    });

    async function proxy(
        ztPath: string,
        request: FastifyRequest,
        reply: FastifyReply,
        body?: unknown,
    ): Promise<unknown> {
        const result = await ztFetch(fastify.db, fastify.sessionSecret, ztPath, {
            method: request.method,
            body,
        });
        if (result.ok) return result.body;
        // ztFetch-generated errors (502/503/504) already have proper messages — pass through
        if (result.status >= 500) {
            return reply.code(result.status).send(result.body);
        }
        const err = translateZtError(result.status, ztPath, result.body);
        return reply.code(err.status).send({ error: err.error });
    }

    // 1. GET /status — node status
    fastify.get('/status', async (request, reply) => {
        return proxy('/status', request, reply);
    });

    // 2. GET /peer — list peers
    fastify.get('/peer', async (request, reply) => {
        return proxy('/peer', request, reply);
    });

    // 3. GET /peer/:address — get peer
    fastify.get<{ Params: { address: string } }>('/peer/:address', async (request, reply) => {
        const { address } = request.params;
        if (!NODE_ID_RE.test(address)) {
            return reply.code(400).send({ error: 'Invalid peer address format' });
        }
        return proxy(`/peer/${address}`, request, reply);
    });

    // 4. GET /controller — controller status
    fastify.get('/controller', async (request, reply) => {
        return proxy('/controller', request, reply);
    });

    // 5. GET /controller/network — list network IDs
    fastify.get('/controller/network', async (request, reply) => {
        return proxy('/controller/network', request, reply);
    });

    // 6. GET /controller/network/:networkId — get network
    fastify.get<{ Params: { networkId: string } }>('/controller/network/:networkId', async (request, reply) => {
        const { networkId } = request.params;
        if (!NETWORK_ID_RE.test(networkId)) {
            return reply.code(400).send({ error: 'Invalid network ID format' });
        }
        return proxy(`/controller/network/${networkId}`, request, reply);
    });

    // 7. POST /controller/network — create network
    fastify.post<{ Body: unknown }>('/controller/network', async (request, reply) => {
        return proxy('/controller/network', request, reply, request.body);
    });

    // 8. POST /controller/network/:networkId — update network
    fastify.post<{ Params: { networkId: string }; Body: unknown }>('/controller/network/:networkId', async (request, reply) => {
        const { networkId } = request.params;
        if (!NETWORK_ID_RE.test(networkId)) {
            return reply.code(400).send({ error: 'Invalid network ID format' });
        }
        return proxy(`/controller/network/${networkId}`, request, reply, request.body);
    });

    // 9. DELETE /controller/network/:networkId — delete network
    fastify.delete<{ Params: { networkId: string } }>('/controller/network/:networkId', async (request, reply) => {
        const { networkId } = request.params;
        if (!NETWORK_ID_RE.test(networkId)) {
            return reply.code(400).send({ error: 'Invalid network ID format' });
        }
        return proxy(`/controller/network/${networkId}`, request, reply);
    });

    // 10. GET /controller/network/:networkId/member — list member IDs
    fastify.get<{ Params: { networkId: string } }>('/controller/network/:networkId/member', async (request, reply) => {
        const { networkId } = request.params;
        if (!NETWORK_ID_RE.test(networkId)) {
            return reply.code(400).send({ error: 'Invalid network ID format' });
        }
        return proxy(`/controller/network/${networkId}/member`, request, reply);
    });

    // 11. GET /controller/network/:networkId/member/:memberId — get member
    fastify.get<{ Params: { networkId: string; memberId: string } }>('/controller/network/:networkId/member/:memberId', async (request, reply) => {
        const { networkId, memberId } = request.params;
        if (!NETWORK_ID_RE.test(networkId)) {
            return reply.code(400).send({ error: 'Invalid network ID format' });
        }
        if (!NODE_ID_RE.test(memberId)) {
            return reply.code(400).send({ error: 'Invalid member ID format' });
        }
        return proxy(`/controller/network/${networkId}/member/${memberId}`, request, reply);
    });

    // 12. POST /controller/network/:networkId/member/:memberId — update member
    fastify.post<{ Params: { networkId: string; memberId: string }; Body: unknown }>('/controller/network/:networkId/member/:memberId', async (request, reply) => {
        const { networkId, memberId } = request.params;
        if (!NETWORK_ID_RE.test(networkId)) {
            return reply.code(400).send({ error: 'Invalid network ID format' });
        }
        if (!NODE_ID_RE.test(memberId)) {
            return reply.code(400).send({ error: 'Invalid member ID format' });
        }

        // D-11: build forwardBody = whitelist filter of request.body
        const rawBody = (request.body && typeof request.body === 'object' && !Array.isArray(request.body))
            ? (request.body as Record<string, unknown>)
            : {};
        const forwardBody: Record<string, unknown> = {};
        for (const k of Object.keys(rawBody)) {
            if (ALLOWED_MEMBER_KEYS.has(k)) forwardBody[k] = rawBody[k];
        }

        // Validate ipAssignments only if present in the (filtered) body
        if (Array.isArray(forwardBody.ipAssignments)) {
            const ipAssignments = forwardBody.ipAssignments as string[];

            const netRes = await ztFetch(
                fastify.db,
                fastify.sessionSecret,
                `/controller/network/${networkId}`,
            );
            if (!netRes.ok || !netRes.body || typeof netRes.body !== 'object') {
                return reply.code(502).send({ error: 'Could not fetch network for IP validation' });
            }
            const network = netRes.body as { routes?: Array<{ target: string }> };
            if (!Array.isArray(network.routes)) {
                return reply.code(502).send({ error: 'Network has no routes — cannot validate IP assignments' });
            }

            const memberListRes = await ztFetch(
                fastify.db,
                fastify.sessionSecret,
                `/controller/network/${networkId}/member`,
            );
            if (!memberListRes.ok || !memberListRes.body || typeof memberListRes.body !== 'object') {
                return reply.code(502).send({ error: 'Could not fetch member list for collision check' });
            }
            const memberIds = Object.keys(memberListRes.body as Record<string, unknown>);
            const otherIds = memberIds.filter((id) => id.toLowerCase() !== memberId.toLowerCase());

            const memberFetches = await Promise.all(
                otherIds.map((id) =>
                    ztFetch(fastify.db, fastify.sessionSecret, `/controller/network/${networkId}/member/${id}`),
                ),
            );
            for (const r of memberFetches) {
                if (!r.ok) {
                    return reply.code(502).send({ error: 'Could not fetch a member for collision check' });
                }
            }
            const currentMembers = memberFetches.map((r, i) => {
                const b = (r.body as { ipAssignments?: string[] }) ?? {};
                return { id: otherIds[i], ipAssignments: Array.isArray(b.ipAssignments) ? b.ipAssignments : [] };
            });

            const result = validateIpAssignments(
                ipAssignments,
                { routes: network.routes },
                currentMembers,
                memberId,
            );
            if (!result.ok) {
                const status = result.reason === 'collision' ? 409 : 400;
                return reply.code(status).send({
                    error: result.error,
                    invalidIp: result.invalidIp,
                    reason: result.reason,
                });
            }
        }

        return proxy(`/controller/network/${networkId}/member/${memberId}`, request, reply, forwardBody);
    });

    // 13. GET /unstable/controller/network — list networks with metadata
    fastify.get('/unstable/controller/network', async (request, reply) => {
        return proxy('/unstable/controller/network', request, reply);
    });

    // 14. GET /unstable/controller/network/:networkId/member — list members with metadata
    fastify.get<{ Params: { networkId: string } }>('/unstable/controller/network/:networkId/member', async (request, reply) => {
        const { networkId } = request.params;
        if (!NETWORK_ID_RE.test(networkId)) {
            return reply.code(400).send({ error: 'Invalid network ID format' });
        }
        return proxy(`/unstable/controller/network/${networkId}/member`, request, reply);
    });

    // Admin-only wildcard catch-all for unregistered ZT endpoints
    fastify.all<{ Params: { '*': string } }>('/*', async (request, reply) => {
        if (request.session?.role !== 'admin') {
            return reply.code(403).send({ error: 'Admin access required for unregistered endpoints' });
        }
        const ztPath = '/' + request.params['*'];
        const body = ['POST', 'PUT', 'PATCH'].includes(request.method) ? request.body as unknown : undefined;
        const result = await ztFetch(fastify.db, fastify.sessionSecret, ztPath, {
            method: request.method,
            body,
        });
        if (result.ok) return result.body;
        const err = genericErrorResponse(result.status);
        return reply.code(err.status).send({ error: err.error });
    });
};
