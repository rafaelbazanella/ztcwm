// @vitest-environment node
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import fastifyCsrfProtection from '@fastify/csrf-protection';
import fastifyRateLimit from '@fastify/rate-limit';
import { initDatabase } from '../db/index.js';
import { setupRoutes } from './setup.js';
import { saveZtConfig } from '../db/zt-config.js';
import { hashPassword } from '../auth/password.js';
import { existsSync, unlinkSync } from 'fs';
import type Database from 'better-sqlite3';

let app: FastifyInstance;
let dbPath: string;
let db: Database.Database;

beforeEach(async () => {
    dbPath = `/tmp/ztcwm-setup-test-${Date.now()}.db`;
    app = Fastify();
    db = initDatabase(dbPath);
    app.decorate('db', db);
    app.decorate('sessionSecret', 'test-secret-for-aes-encryption');
    await app.register(fastifyCookie);
    await app.register(fastifyRateLimit, { global: false });
    await app.register(fastifySession, {
        secret: 'test-secret-that-is-at-least-32-characters-long!!',
        cookie: { secure: false },
    });
    // Skip CSRF in tests — we're testing route business logic, not CSRF middleware
    await app.register(setupRoutes, { prefix: '/api' });
    await app.ready();
});

afterEach(async () => {
    await app.close();
    db.close();
    if (existsSync(dbPath)) unlinkSync(dbPath);
});

async function createAdmin() {
    const hash = await hashPassword('TestPass123!');
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('admin', hash, 'admin');
}

function saveConfig() {
    saveZtConfig(db, 'http://localhost:9993', 'test-token', 'test-secret-for-aes-encryption');
}

describe('GET /api/setup/status', () => {
    it('returns needsSetup: true on fresh DB', async () => {
        const res = await app.inject({ method: 'GET', url: '/api/setup/status' });
        expect(res.statusCode).toBe(200);
        expect(res.json().needsSetup).toBe(true);
    });

    it('returns needsSetup: false after admin created', async () => {
        await createAdmin();
        const res = await app.inject({ method: 'GET', url: '/api/setup/status' });
        expect(res.statusCode).toBe(200);
        expect(res.json().needsSetup).toBe(false);
    });

    it('returns ztConfigured: false on fresh DB', async () => {
        const res = await app.inject({ method: 'GET', url: '/api/setup/status' });
        expect(res.json().ztConfigured).toBe(false);
    });

    it('returns ztConfigured: true after config saved', async () => {
        saveConfig();
        const res = await app.inject({ method: 'GET', url: '/api/setup/status' });
        expect(res.json().ztConfigured).toBe(true);
    });
});

describe('POST /api/setup/admin', () => {
    it('creates admin with valid data', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/api/setup/admin',
            payload: { username: 'admin', password: 'TestPass123!' },
        });
        expect(res.statusCode).toBe(200);
        expect(res.json().success).toBe(true);
        expect(res.json().user.role).toBe('admin');
    });

    it('rejects weak password', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/api/setup/admin',
            payload: { username: 'admin', password: 'weak' },
        });
        expect(res.statusCode).toBe(400);
        expect(res.json().error).toBe('Password too weak');
    });

    it('rejects short username', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/api/setup/admin',
            payload: { username: 'ab', password: 'TestPass123!' },
        });
        expect(res.statusCode).toBe(400);
        expect(res.json().error).toContain('at least 3 characters');
    });

    it('rejects invalid username characters', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/api/setup/admin',
            payload: { username: 'admin@!', password: 'TestPass123!' },
        });
        expect(res.statusCode).toBe(400);
        expect(res.json().error).toContain('letters, numbers, and underscores');
    });

    it('returns 403 when admin already exists', async () => {
        await createAdmin();
        const res = await app.inject({
            method: 'POST',
            url: '/api/setup/admin',
            payload: { username: 'admin2', password: 'TestPass123!' },
        });
        expect(res.statusCode).toBe(403);
        expect(res.json().error).toBe('Setup already completed');
    });
});

describe('POST /api/setup/zt-config', () => {
    it('returns 400 when no admin exists', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/api/setup/zt-config',
            payload: { url: 'http://localhost:9993', token: 'test-token' },
        });
        expect(res.statusCode).toBe(400);
        expect(res.json().error).toBe('Create admin account first');
    });

    it('saves config after admin exists', async () => {
        await createAdmin();
        const res = await app.inject({
            method: 'POST',
            url: '/api/setup/zt-config',
            payload: { url: 'http://localhost:9993', token: 'test-token' },
        });
        expect(res.statusCode).toBe(200);
        expect(res.json().success).toBe(true);
    });

    it('returns 403 when setup complete', async () => {
        await createAdmin();
        saveConfig();
        const res = await app.inject({
            method: 'POST',
            url: '/api/setup/zt-config',
            payload: { url: 'http://localhost:9993', token: 'another-token' },
        });
        expect(res.statusCode).toBe(403);
    });

    it('rejects invalid URL scheme', async () => {
        await createAdmin();
        const res = await app.inject({
            method: 'POST',
            url: '/api/setup/zt-config',
            payload: { url: 'ftp://evil.com', token: 'tok' },
        });
        expect(res.statusCode).toBe(400);
        expect(res.json().error).toContain('http:// or https://');
    });
});

describe('POST /api/setup/test-connection', () => {
    it('returns fail steps for unreachable URL', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/api/setup/test-connection',
            payload: { url: 'http://192.0.2.1:9999', token: 'tok' },
        });
        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.success).toBe(false);
        expect(body.steps[0].name).toBe('connect');
        expect(body.steps[0].status).toBe('fail');
    }, 10000);

    it('returns 403 when setup complete', async () => {
        await createAdmin();
        saveConfig();
        const res = await app.inject({
            method: 'POST',
            url: '/api/setup/test-connection',
            payload: { url: 'http://localhost:9993', token: 'tok' },
        });
        expect(res.statusCode).toBe(403);
    });

    it('rejects missing token', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/api/setup/test-connection',
            payload: { url: 'http://localhost:9993', token: '' },
        });
        expect(res.statusCode).toBe(400);
    });
});

describe('First-run 503 gate', () => {
    let hookApp: FastifyInstance;
    let hookDbPath: string;
    let hookDb: Database.Database;

    beforeEach(async () => {
        hookDbPath = `/tmp/ztcwm-hook-test-${Date.now()}.db`;
        hookApp = Fastify();
        hookDb = initDatabase(hookDbPath);
        hookApp.decorate('db', hookDb);
        hookApp.decorate('sessionSecret', 'test-secret-for-aes-encryption');

        await hookApp.register(fastifyCookie);
        await hookApp.register(fastifyRateLimit, { global: false });
        await hookApp.register(fastifySession, {
            secret: 'test-secret-that-is-at-least-32-characters-long!!',
            cookie: { secure: false },
        });

        // Replicate the first-run 503 gate hook from src/server/index.ts
        hookApp.addHook('preHandler', async (request, reply) => {
            if (!request.url.startsWith('/api/')) return;
            if (request.url.startsWith('/api/setup/')) return;
            if (request.url.startsWith('/api/health')) return;
            if (request.url.startsWith('/api/csrf-token')) return;

            const { count } = hookDb.prepare(
                'SELECT COUNT(*) as count FROM users WHERE role = ?'
            ).get('admin') as { count: number };

            if (count === 0) {
                reply.code(503).send({ error: 'Setup required', needsSetup: true });
            }
        });

        // Register setup routes (exempt from 503 gate)
        await hookApp.register(setupRoutes, { prefix: '/api' });

        // Dummy routes to test the hook intercepts non-setup API calls
        hookApp.get('/api/zt/status', async () => ({ status: 'ok' }));
        hookApp.get('/api/health', async () => ({ status: 'ok' }));
        hookApp.get('/api/csrf-token', async () => ({ token: 'test' }));

        await hookApp.ready();
    });

    afterEach(async () => {
        await hookApp.close();
        hookDb.close();
        if (existsSync(hookDbPath)) unlinkSync(hookDbPath);
    });

    it('returns 503 for non-setup API calls when no admin exists', async () => {
        const res = await hookApp.inject({ method: 'GET', url: '/api/zt/status' });
        expect(res.statusCode).toBe(503);
        const body = res.json();
        expect(body.error).toBe('Setup required');
        expect(body.needsSetup).toBe(true);
    });

    it('allows /api/setup/status when no admin exists', async () => {
        const res = await hookApp.inject({ method: 'GET', url: '/api/setup/status' });
        expect(res.statusCode).toBe(200);
    });

    it('allows /api/health when no admin exists', async () => {
        const res = await hookApp.inject({ method: 'GET', url: '/api/health' });
        expect(res.statusCode).toBe(200);
        expect(res.json().status).toBe('ok');
    });

    it('allows /api/csrf-token when no admin exists', async () => {
        const res = await hookApp.inject({ method: 'GET', url: '/api/csrf-token' });
        expect(res.statusCode).toBe(200);
        expect(res.json().token).toBe('test');
    });

    it('stops returning 503 after admin is created', async () => {
        // Verify 503 before admin exists
        let res = await hookApp.inject({ method: 'GET', url: '/api/zt/status' });
        expect(res.statusCode).toBe(503);

        // Create admin via setup route
        const adminRes = await hookApp.inject({
            method: 'POST',
            url: '/api/setup/admin',
            payload: { username: 'admin', password: 'TestPass123!' },
        });
        expect(adminRes.statusCode).toBe(200);

        // Non-setup API call should now succeed
        res = await hookApp.inject({ method: 'GET', url: '/api/zt/status' });
        expect(res.statusCode).toBe(200);
        expect(res.json().status).toBe('ok');
    });
});

describe('CSRF enforcement', () => {
    let csrfApp: FastifyInstance;
    let csrfDbPath: string;
    let csrfDb: Database.Database;

    beforeEach(async () => {
        csrfDbPath = `/tmp/ztcwm-csrf-test-${Date.now()}.db`;
        csrfApp = Fastify();
        csrfDb = initDatabase(csrfDbPath);
        csrfApp.decorate('db', csrfDb);
        csrfApp.decorate('sessionSecret', 'test-secret-for-aes-encryption');

        await csrfApp.register(fastifyCookie);
        await csrfApp.register(fastifySession, {
            secret: 'test-secret-that-is-at-least-32-characters-long!!',
            cookie: { secure: false },
            saveUninitialized: false,
        });

        // Register CSRF protection plugin (same config as src/server/index.ts)
        await csrfApp.register(fastifyCsrfProtection, {
            sessionPlugin: '@fastify/session',
            getToken: (req: any) => req.headers['x-csrf-token'] as string,
        });

        // Replicate the CSRF enforcement hook from src/server/index.ts
        csrfApp.addHook('onRequest', async (request, reply) => {
            if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') return;
            if (!request.url.startsWith('/api/')) return;
            if (request.url.startsWith('/api/auth/login')) return;
            if (request.url.startsWith('/api/setup/')) return;
            await new Promise<void>((resolve, reject) => {
                (csrfApp.csrfProtection as any)(request, reply, (err?: Error) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });

        // Test routes
        csrfApp.post('/api/test-endpoint', async () => ({ ok: true }));
        csrfApp.delete('/api/test-endpoint', async () => ({ ok: true }));
        csrfApp.get('/api/test-endpoint', async () => ({ ok: true }));
        csrfApp.post('/api/auth/login', async () => ({ ok: true }));
        csrfApp.post('/api/setup/admin', async () => ({ ok: true }));
        csrfApp.get('/api/csrf-token', async (_request, reply) => {
            const token = reply.generateCsrf();
            return { token };
        });

        await csrfApp.ready();
    });

    afterEach(async () => {
        await csrfApp.close();
        csrfDb.close();
        if (existsSync(csrfDbPath)) unlinkSync(csrfDbPath);
    });

    it('rejects POST without CSRF token with 403', async () => {
        const res = await csrfApp.inject({ method: 'POST', url: '/api/test-endpoint' });
        expect(res.statusCode).toBe(403);
    });

    it('rejects DELETE without CSRF token with 403', async () => {
        const res = await csrfApp.inject({ method: 'DELETE', url: '/api/test-endpoint' });
        expect(res.statusCode).toBe(403);
    });

    it('allows GET without CSRF token', async () => {
        const res = await csrfApp.inject({ method: 'GET', url: '/api/test-endpoint' });
        expect(res.statusCode).toBe(200);
    });

    it('allows POST to /api/auth/login without CSRF token (exempt)', async () => {
        const res = await csrfApp.inject({ method: 'POST', url: '/api/auth/login' });
        expect(res.statusCode).toBe(200);
    });

    it('allows POST to /api/setup/admin without CSRF token (exempt)', async () => {
        const res = await csrfApp.inject({ method: 'POST', url: '/api/setup/admin' });
        expect(res.statusCode).toBe(200);
    });

    it('allows POST with valid CSRF token', async () => {
        // Step 1: Get a CSRF token (establishes session)
        const tokenRes = await csrfApp.inject({ method: 'GET', url: '/api/csrf-token' });
        expect(tokenRes.statusCode).toBe(200);
        const { token } = tokenRes.json();
        const cookies = tokenRes.headers['set-cookie'];
        const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : (cookies ?? '');

        // Step 2: POST with CSRF token and session cookie
        const res = await csrfApp.inject({
            method: 'POST',
            url: '/api/test-endpoint',
            headers: {
                'x-csrf-token': token,
                cookie: cookieHeader,
            },
        });
        expect(res.statusCode).toBe(200);
        expect(res.json().ok).toBe(true);
    });
});
