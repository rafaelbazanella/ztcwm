import Fastify from 'fastify';
import fastifySensible from '@fastify/sensible';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import fastifyCsrfProtection from '@fastify/csrf-protection';
import fastifyRateLimit from '@fastify/rate-limit';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/index.js';
import { apiRoutes } from './routes/api.js';
import { authRoutes } from './routes/auth.js';
import { setupRoutes } from './routes/setup.js';
import { ztProxyRoutes } from './routes/zt-proxy.js';
import { usersRoutes } from './routes/users.js';
import { SQLiteSessionStore } from './auth/session-store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isDev = process.env.NODE_ENV !== 'production';
const PORT = parseInt(process.env.PORT ?? '3000', 10);

const server = Fastify({
    logger: {
        level: isDev ? 'info' : 'warn',
    },
});

// Register sensible error helpers
await server.register(fastifySensible);

// Initialize database and decorate Fastify instance
const db = initDatabase();
server.decorate('db', db);

// Session secret (stable across restarts for AES-GCM encryption)
const sessionSecret = process.env.SESSION_SECRET || 'ztcwm-dev-secret-change-in-production';
server.decorate('sessionSecret', sessionSecret);

// 1. Cookie parsing (required by session)
await server.register(fastifyCookie);

// 2. Rate limiting (global registration, disabled by default, per-route config on login)
await server.register(fastifyRateLimit, { global: false });

// 3. Session management with SQLite store
const sessionStore = new SQLiteSessionStore(db);
await server.register(fastifySession, {
    secret: sessionSecret,
    store: sessionStore as any,
    cookie: {
        secure: process.env.COOKIE_SECURE === 'true',
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 1800000, // 30 min idle timeout (per D-03, SESS-02)
    },
    rolling: true, // Reset idle timer on each response
    saveUninitialized: false,
});

// 4. CSRF protection (uses session plugin)
await server.register(fastifyCsrfProtection, {
    sessionPlugin: '@fastify/session',
    getToken: (req: any) => req.headers['x-csrf-token'] as string,
});

// 4b. CSRF enforcement: validate token on all mutating /api/* requests
server.addHook('onRequest', async (request, reply) => {
    // Safe methods don't need CSRF
    if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') return;
    // Non-API requests don't need CSRF
    if (!request.url.startsWith('/api/')) return;
    // Login endpoint exempt (no session exists yet to hold CSRF secret)
    if (request.url.startsWith('/api/auth/login')) return;
    // Logout endpoint exempt (logging out is inherently safe — CSRF logout is a nuisance, not a risk)
    if (request.url.startsWith('/api/auth/logout')) return;
    // Setup endpoints exempt (first-run, no session yet)
    if (request.url.startsWith('/api/setup/')) return;
    // Validate CSRF token
    await new Promise<void>((resolve, reject) => {
        (server.csrfProtection as any)(request, reply, (err?: Error) => {
            if (err) reject(err);
            else resolve();
        });
    });
});

// 5. First-run detection: block non-setup API calls when no admin exists
server.addHook('preHandler', async (request, reply) => {
    if (!request.url.startsWith('/api/')) return;
    if (request.url.startsWith('/api/setup/')) return;
    if (request.url.startsWith('/api/health')) return;
    if (request.url.startsWith('/api/csrf-token')) return;

    const { count } = server.db.prepare(
        'SELECT COUNT(*) as count FROM users WHERE role = ?'
    ).get('admin') as { count: number };

    if (count === 0) {
        reply.code(503).send({ error: 'Setup required', needsSetup: true });
    }
});

// 6. Auth middleware: require session for all /api/* except public paths
const PUBLIC_PATHS = ['/api/auth/login', '/api/health', '/api/csrf-token', '/api/setup/'];
server.addHook('preHandler', async (request, reply) => {
    if (!request.url.startsWith('/api/')) return;
    if (PUBLIC_PATHS.some(p => request.url.startsWith(p))) return;
    if (!request.session?.userId) {
        reply.code(401).send({ error: 'Authentication required' });
    }
});

// 7. Setup routes
await server.register(setupRoutes, { prefix: '/api' });

// 8. Auth routes (login, logout, csrf-token, auth/me)
await server.register(authRoutes, { prefix: '/api' });

// 9. API routes
await server.register(apiRoutes, { prefix: '/api' });

// 10. ZT API proxy — typed routes + admin wildcard
await server.register(ztProxyRoutes, { prefix: '/api/zt' });

// 11. User management routes
await server.register(usersRoutes, { prefix: '/api' });

if (isDev) {
    // Dev mode: proxy all non-API requests to Vite HMR server
    const { default: fastifyProxy } = await import('@fastify/http-proxy');
    await server.register(fastifyProxy, {
        upstream: 'http://localhost:3001',
        websocket: true,
    });
} else {
    // Production mode: serve built SPA from dist/
    const { default: fastifyStatic } = await import('@fastify/static');
    await server.register(fastifyStatic, {
        root: resolve(__dirname, '../../dist'),
        wildcard: false,
    });

    // SPA fallback: serve index.html for non-API routes
    server.setNotFoundHandler((request, reply) => {
        if (request.url.startsWith('/api/')) {
            return reply.status(404).send({
                error: 'Not Found',
                message: 'API endpoint not found',
                statusCode: 404,
            });
        }
        return reply.sendFile('index.html');
    });
}

// Start server
try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
    console.log(
        `Server running at http://localhost:${PORT} (${isDev ? 'development' : 'production'})`,
    );
} catch (err) {
    server.log.error(err);
    process.exit(1);
}

// Graceful shutdown
const shutdown = async () => {
    await server.close();
    process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
