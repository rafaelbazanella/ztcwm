// @vitest-environment node
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import type { InjectOptions, Response as InjectResponse } from 'light-my-request';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import { initDatabase } from '../db/index.js';
import { saveZtConfig } from '../db/zt-config.js';
import { hashPassword } from '../auth/password.js';
import { ztProxyRoutes } from './zt-proxy.js';
import { translateZtError, genericErrorResponse } from './zt-proxy-helpers.js';
import { existsSync, unlinkSync } from 'fs';
import type Database from 'better-sqlite3';

let app: FastifyInstance;
let dbPath: string;
let db: Database.Database;

beforeEach(async () => {
    dbPath = `/tmp/ztcwm-zt-proxy-test-${Date.now()}.db`;
    app = Fastify();
    db = initDatabase(dbPath);
    app.decorate('db', db);
    app.decorate('sessionSecret', 'test-secret-for-aes-encryption');
    await app.register(fastifyCookie);
    await app.register(fastifySession, {
        secret: 'test-secret-that-is-at-least-32-characters-long!!',
        cookie: { secure: false },
    });
    // Helper route to establish test sessions (must be registered before ready())
    app.post('/__test-login', async (request) => {
        const { userId, username, role } = request.body as { userId: number; username: string; role: string };
        request.session.set('userId', userId);
        request.session.set('username', username);
        request.session.set('role', role);
        return { ok: true };
    });
    await app.register(ztProxyRoutes, { prefix: '/api/zt' });
    await app.ready();
});

afterEach(async () => {
    vi.unstubAllGlobals();
    await app.close();
    db.close();
    if (existsSync(dbPath)) unlinkSync(dbPath);
});

function setupZtConfig() {
    saveZtConfig(db, 'http://localhost:9993', 'test-zt-token', 'test-secret-for-aes-encryption');
}

let userCounter = 0;
async function createUser(role: string): Promise<{ id: number; username: string }> {
    userCounter++;
    const username = `${role}user${userCounter}`;
    const hash = await hashPassword('TestPass123!');
    const result = db.prepare(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
    ).run(username, hash, role);
    return { id: Number(result.lastInsertRowid), username };
}

async function injectWithSession(
    method: InjectOptions['method'],
    url: string,
    role: string,
    payload?: unknown,
): Promise<InjectResponse> {
    const user = await createUser(role);

    const loginRes = await app.inject({
        method: 'POST',
        url: '/__test-login',
        payload: { userId: user.id, username: user.username, role },
    });
    const cookies = loginRes.cookies as Array<{ name: string; value: string }>;
    const sessionCookie = cookies.find(c => c.name === 'sessionId');
    const cookieHeader = sessionCookie ? `sessionId=${sessionCookie.value}` : '';

    const opts: InjectOptions = {
        method,
        url,
        headers: { cookie: cookieHeader },
    };
    if (payload !== undefined) {
        opts.payload = payload as InjectOptions['payload'];
    }
    return app.inject(opts);
}

function mockFetch(responseBody: unknown, status = 200) {
    const mockFn = vi.fn().mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(responseBody),
    });
    vi.stubGlobal('fetch', mockFn);
    return mockFn;
}

// ─── Unit tests: translateZtError ─────────────────────────────────────────

describe('translateZtError', () => {
    it('returns "Network not found" for 404 on network path', () => {
        const result = translateZtError(404, '/controller/network/abc0123456789def');
        expect(result).toEqual({ error: 'Network not found', status: 404 });
    });

    it('returns "Member not found" for 404 on member path', () => {
        const result = translateZtError(404, '/controller/network/abc/member/def123');
        expect(result).toEqual({ error: 'Member not found', status: 404 });
    });

    it('returns auth failed for 401', () => {
        const result = translateZtError(401, '/controller');
        expect(result).toEqual({ error: 'ZeroTier controller authentication failed', status: 502 });
    });

    it('returns auth failed for 403', () => {
        const result = translateZtError(403, '/status');
        expect(result).toEqual({ error: 'ZeroTier controller authentication failed', status: 502 });
    });

    it('returns controller error for 500', () => {
        const result = translateZtError(500, '/status');
        expect(result.status).toBe(502);
        expect(result.error).toContain('ZeroTier controller error');
    });

    it('returns generic API error for other status codes', () => {
        const result = translateZtError(429, '/controller/network');
        expect(result).toEqual({ error: 'ZeroTier API error: 429', status: 429 });
    });
});

// ─── Unit tests: genericErrorResponse ─────────────────────────────────────

describe('genericErrorResponse', () => {
    it('returns generic 404 message', () => {
        const result = genericErrorResponse(404);
        expect(result).toEqual({ error: 'ZeroTier resource not found', status: 404 });
    });

    it('returns generic auth failed for 403', () => {
        const result = genericErrorResponse(403);
        expect(result.status).toBe(502);
        expect(result.error).toBe('ZeroTier controller authentication failed');
    });

    it('returns controller internal error for 500', () => {
        const result = genericErrorResponse(500);
        expect(result).toEqual({ error: 'ZeroTier controller internal error', status: 502 });
    });

    it('returns generic API error for other codes', () => {
        const result = genericErrorResponse(429);
        expect(result).toEqual({ error: 'ZeroTier API error (429)', status: 429 });
    });
});

// ─── Integration tests: proxy routes ──────────────────────────────────────

describe('proxy routes', () => {
    it('GET /api/zt/status returns proxied response', async () => {
        setupZtConfig();
        const fetchMock = mockFetch({ online: true, address: 'abc1234567' });
        const res = await injectWithSession('GET', '/api/zt/status', 'admin');
        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ online: true, address: 'abc1234567' });
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('/status'),
            expect.objectContaining({
                headers: expect.objectContaining({ 'X-ZT1-Auth': 'test-zt-token' }),
            }),
        );
    });

    it('GET /api/zt/controller/network/:id returns 400 for invalid hex ID', async () => {
        setupZtConfig();
        mockFetch({});
        const res = await injectWithSession('GET', '/api/zt/controller/network/not-hex', 'admin');
        expect(res.statusCode).toBe(400);
        expect(res.json().error).toBe('Invalid network ID format');
    });

    it('GET /api/zt/controller/network/:id proxies valid request', async () => {
        setupZtConfig();
        mockFetch({ id: 'abcdef0123456789', name: 'testnet' });
        const res = await injectWithSession('GET', '/api/zt/controller/network/abcdef0123456789', 'admin');
        expect(res.statusCode).toBe(200);
        expect(res.json().id).toBe('abcdef0123456789');
    });

    it('GET /api/zt/controller/network/:nid/member/:mid returns 400 for invalid member ID', async () => {
        setupZtConfig();
        mockFetch({});
        const res = await injectWithSession('GET', '/api/zt/controller/network/abcdef0123456789/member/not-hex', 'admin');
        expect(res.statusCode).toBe(400);
        expect(res.json().error).toBe('Invalid member ID format');
    });

    it('wildcard returns 403 for non-admin', async () => {
        setupZtConfig();
        mockFetch({});
        const res = await injectWithSession('GET', '/api/zt/some/other/path', 'viewer');
        expect(res.statusCode).toBe(403);
        expect(res.json().error).toBe('Admin access required for unregistered endpoints');
    });

    it('wildcard proxies request for admin', async () => {
        setupZtConfig();
        mockFetch({ custom: true });
        const res = await injectWithSession('GET', '/api/zt/some/other/path', 'admin');
        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ custom: true });
    });

    it('returns 503 when ZT not configured', async () => {
        // Don't call setupZtConfig() — no ZT config in DB
        mockFetch({});
        const res = await injectWithSession('GET', '/api/zt/status', 'admin');
        expect(res.statusCode).toBe(503);
        expect(res.json().error).toBe('ZeroTier controller not configured');
    });

    it('POST /api/zt/controller/network forwards request body', async () => {
        setupZtConfig();
        const fetchMock = mockFetch({ id: 'abcdef0123456789' });
        const res = await injectWithSession('POST', '/api/zt/controller/network', 'admin', { name: 'newnet' });
        expect(res.statusCode).toBe(200);
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('/controller/network'),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ name: 'newnet' }),
            }),
        );
    });

    it('DELETE /api/zt/controller/network/:id validates and proxies', async () => {
        setupZtConfig();
        mockFetch(null);
        const res = await injectWithSession('DELETE', '/api/zt/controller/network/abcdef0123456789', 'admin');
        expect(res.statusCode).toBe(200);
    });
});

// ─── RBAC enforcement tests ──────────────────────────────────────────────

describe('RBAC enforcement', () => {
    it('Viewer GET /api/zt/controller/network → 200 (read allowed)', async () => {
        setupZtConfig();
        mockFetch(['abcdef0123456789']);
        const res = await injectWithSession('GET', '/api/zt/controller/network', 'viewer');
        expect(res.statusCode).toBe(200);
    });

    it('Viewer POST /api/zt/controller/network → 403 (create network denied)', async () => {
        setupZtConfig();
        const res = await injectWithSession('POST', '/api/zt/controller/network', 'viewer', {});
        expect(res.statusCode).toBe(403);
        expect(res.json().error).toContain('Insufficient permissions');
    });

    it('Viewer POST member endpoint → 200 (authorize/deauthorize allowed per D-01)', async () => {
        setupZtConfig();
        mockFetch({ authorized: true });
        const res = await injectWithSession('POST', '/api/zt/controller/network/abcdef0123456789/member/def1234567', 'viewer', { authorized: true });
        expect(res.statusCode).toBe(200);
    });

    it('Viewer DELETE /api/zt/controller/network/:id → 403 (delete denied)', async () => {
        setupZtConfig();
        const res = await injectWithSession('DELETE', '/api/zt/controller/network/abcdef0123456789', 'viewer');
        expect(res.statusCode).toBe(403);
        expect(res.json().error).toContain('Insufficient permissions');
    });

    it('Operator GET /api/zt/controller/network → 200 (read allowed)', async () => {
        setupZtConfig();
        mockFetch(['abcdef0123456789']);
        const res = await injectWithSession('GET', '/api/zt/controller/network', 'operator');
        expect(res.statusCode).toBe(200);
    });

    it('Operator POST /api/zt/controller/network → 200 (create network allowed)', async () => {
        setupZtConfig();
        mockFetch({ id: 'abcdef0123456789' });
        const res = await injectWithSession('POST', '/api/zt/controller/network', 'operator', { name: 'net' });
        expect(res.statusCode).toBe(200);
    });

    it('Operator DELETE /api/zt/controller/network/:id → 403 (delete denied)', async () => {
        setupZtConfig();
        const res = await injectWithSession('DELETE', '/api/zt/controller/network/abcdef0123456789', 'operator');
        expect(res.statusCode).toBe(403);
        expect(res.json().error).toContain('Insufficient permissions');
    });

    it('Admin DELETE /api/zt/controller/network/:id → 200 (all allowed)', async () => {
        setupZtConfig();
        mockFetch(null);
        const res = await injectWithSession('DELETE', '/api/zt/controller/network/abcdef0123456789', 'admin');
        expect(res.statusCode).toBe(200);
    });

    it('Admin POST /api/zt/controller/network → 200 (all allowed)', async () => {
        setupZtConfig();
        mockFetch({ id: 'abcdef0123456789' });
        const res = await injectWithSession('POST', '/api/zt/controller/network', 'admin', { name: 'net' });
        expect(res.statusCode).toBe(200);
    });
});

// ─── Member IP validation (POST /controller/network/:nwid/member/:memberId) ──

describe('Member IP validation (POST /controller/network/:nwid/member/:memberId)', () => {
    const NWID = 'a1b2c3d4e5f60718';
    const SELF = '1111111111';
    const OTHER = '2222222222';

    function stubFetchSequence(responses: Array<{ status: number; body: unknown }>): void {
        let i = 0;
        vi.stubGlobal('fetch', async () => {
            const r = responses[i++] ?? { status: 200, body: {} };
            return new Response(JSON.stringify(r.body), { status: r.status });
        });
    }

    it('returns 400 + reason=malformed for invalid IP literal', async () => {
        setupZtConfig();
        stubFetchSequence([
            { status: 200, body: { routes: [{ target: '10.0.0.0/8' }] } }, // GET network
            { status: 200, body: {} },                                      // GET member list (empty)
        ]);
        const res = await injectWithSession(
            'POST',
            `/api/zt/controller/network/${NWID}/member/${SELF}`,
            'admin',
            { ipAssignments: ['999.0.0.1'] },
        );
        expect(res.statusCode).toBe(400);
        const body = res.json();
        expect(body.reason).toBe('malformed');
        expect(body.invalidIp).toBe('999.0.0.1');
    });

    it('returns 400 + reason=out-of-route for IP outside routes', async () => {
        setupZtConfig();
        stubFetchSequence([
            { status: 200, body: { routes: [{ target: '10.0.0.0/8' }] } },
            { status: 200, body: {} },
        ]);
        const res = await injectWithSession(
            'POST',
            `/api/zt/controller/network/${NWID}/member/${SELF}`,
            'admin',
            { ipAssignments: ['172.16.0.5'] },
        );
        expect(res.statusCode).toBe(400);
        expect(res.json().reason).toBe('out-of-route');
    });

    it('returns 409 + reason=collision when another member holds the IP', async () => {
        setupZtConfig();
        stubFetchSequence([
            { status: 200, body: { routes: [{ target: '10.0.0.0/8' }] } },     // GET network
            { status: 200, body: { [OTHER]: 1 } },                             // GET member list
            { status: 200, body: { ipAssignments: ['10.0.0.5'] } },            // GET other member
        ]);
        const res = await injectWithSession(
            'POST',
            `/api/zt/controller/network/${NWID}/member/${SELF}`,
            'admin',
            { ipAssignments: ['10.0.0.5'] },
        );
        expect(res.statusCode).toBe(409);
        const body = res.json();
        expect(body.reason).toBe('collision');
        expect(body.invalidIp).toBe('10.0.0.5');
    });

    it('passes validation and forwards when IP is valid + free (D-11: only ipAssignments forwarded)', async () => {
        setupZtConfig();
        let forwardedBody: unknown = null;
        vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
            if (url.endsWith(`/controller/network/${NWID}`)) {
                return new Response(JSON.stringify({ routes: [{ target: '10.0.0.0/8' }] }), { status: 200 });
            }
            if (url.endsWith(`/controller/network/${NWID}/member`)) {
                return new Response(JSON.stringify({}), { status: 200 });
            }
            if (url.endsWith(`/controller/network/${NWID}/member/${SELF}`) && init?.method === 'POST') {
                forwardedBody = JSON.parse(init.body as string);
                return new Response(JSON.stringify({ id: SELF, ipAssignments: ['10.0.0.7'] }), { status: 200 });
            }
            return new Response('{}', { status: 200 });
        });
        const res = await injectWithSession(
            'POST',
            `/api/zt/controller/network/${NWID}/member/${SELF}`,
            'admin',
            { ipAssignments: ['10.0.0.7'] },
        );
        expect(res.statusCode).toBe(200);
        expect(forwardedBody).toEqual({ ipAssignments: ['10.0.0.7'] });
    });

    it('does NOT collide with own current IP (self exemption)', async () => {
        setupZtConfig();
        let postCalled = false;
        vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
            if (url.endsWith(`/controller/network/${NWID}`)) {
                return new Response(JSON.stringify({ routes: [{ target: '10.0.0.0/8' }] }), { status: 200 });
            }
            if (url.endsWith(`/controller/network/${NWID}/member`) && (init?.method ?? 'GET') === 'GET') {
                return new Response(JSON.stringify({ [SELF]: 1 }), { status: 200 });
            }
            if (url.endsWith(`/controller/network/${NWID}/member/${SELF}`) && init?.method === 'POST') {
                postCalled = true;
                return new Response(JSON.stringify({ id: SELF }), { status: 200 });
            }
            return new Response('{}', { status: 200 });
        });
        const res = await injectWithSession(
            'POST',
            `/api/zt/controller/network/${NWID}/member/${SELF}`,
            'admin',
            { ipAssignments: ['10.0.0.5'] },
        );
        expect(res.statusCode).toBe(200);
        expect(postCalled).toBe(true);
    });

    it('skips validation when ipAssignments is not in body (D-11: only authorized forwarded)', async () => {
        setupZtConfig();
        let forwardedBody: unknown = null;
        let networkFetchCalled = false;
        vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
            if (url.endsWith(`/controller/network/${NWID}`) && (init?.method ?? 'GET') === 'GET') {
                networkFetchCalled = true;
                return new Response('{}', { status: 200 });
            }
            if (init?.method === 'POST') {
                forwardedBody = JSON.parse(init.body as string);
                return new Response('{}', { status: 200 });
            }
            return new Response('{}', { status: 200 });
        });
        const res = await injectWithSession(
            'POST',
            `/api/zt/controller/network/${NWID}/member/${SELF}`,
            'admin',
            { authorized: true },
        );
        expect(res.statusCode).toBe(200);
        expect(forwardedBody).toEqual({ authorized: true });
        expect(networkFetchCalled).toBe(false); // validation was skipped, no GET /network
    });

    it('strips unknown body keys before forwarding (D-11)', async () => {
        setupZtConfig();
        let forwardedBody: unknown = null;
        vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
            if (init?.method === 'POST') {
                forwardedBody = JSON.parse(init.body as string);
                return new Response('{}', { status: 200 });
            }
            return new Response('{}', { status: 200 });
        });
        await injectWithSession(
            'POST',
            `/api/zt/controller/network/${NWID}/member/${SELF}`,
            'admin',
            { authorized: true, totallyUnknownKey: 'pwned', revision: 999 },
        );
        expect(forwardedBody).toEqual({ authorized: true });
    });

    it('returns 502 when network fetch fails (does NOT silently allow write)', async () => {
        setupZtConfig();
        vi.stubGlobal('fetch', async () =>
            new Response(JSON.stringify({ error: 'down' }), { status: 503 }),
        );
        const res = await injectWithSession(
            'POST',
            `/api/zt/controller/network/${NWID}/member/${SELF}`,
            'admin',
            { ipAssignments: ['10.0.0.5'] },
        );
        expect(res.statusCode).toBe(502);
    });

    it('accepts mixed v4+v6 when both are in routes', async () => {
        setupZtConfig();
        stubFetchSequence([
            { status: 200, body: { routes: [{ target: '10.0.0.0/8' }, { target: '2001:db8::/32' }] } },
            { status: 200, body: {} },
            { status: 200, body: {} }, // POST forward
        ]);
        const res = await injectWithSession(
            'POST',
            `/api/zt/controller/network/${NWID}/member/${SELF}`,
            'admin',
            { ipAssignments: ['10.0.0.7', '2001:db8::7'] },
        );
        expect(res.statusCode).toBe(200);
    });

    it('returns 502 when network has no routes array', async () => {
        setupZtConfig();
        stubFetchSequence([
            { status: 200, body: { name: 'net-without-routes' } }, // routes undefined
        ]);
        const res = await injectWithSession(
            'POST',
            `/api/zt/controller/network/${NWID}/member/${SELF}`,
            'admin',
            { ipAssignments: ['10.0.0.5'] },
        );
        expect(res.statusCode).toBe(502);
        expect(res.json().error).toContain('no routes');
    });
});
