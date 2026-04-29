import type { FastifyPluginAsync } from 'fastify';
import type Database from 'better-sqlite3';
import { hashPassword, validatePasswordStrength } from '../auth/password.js';
import { saveZtConfig, hasZtConfig, isZtConfiguredViaEnv } from '../db/zt-config.js';

declare module 'fastify' {
    interface FastifyInstance {
        sessionSecret: string;
    }
}

function hasAdmin(db: Database.Database): boolean {
    const row = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin') as { count: number };
    return row.count > 0;
}

export const setupRoutes: FastifyPluginAsync = async (fastify) => {
    // GET /setup/status — always public, no lockout
    fastify.get('/setup/status', async () => {
        return {
            needsSetup: !hasAdmin(fastify.db),
            ztConfigured: hasZtConfig(fastify.db) || isZtConfiguredViaEnv(),
        };
    });

    // POST /setup/admin — create first admin account
    fastify.post<{
        Body: { username: string; password: string };
    }>('/setup/admin', async (request, reply) => {
        if (hasAdmin(fastify.db)) {
            return reply.code(403).send({ error: 'Setup already completed' });
        }

        const { username, password } = request.body;

        if (!username || username.length < 3) {
            return reply.code(400).send({ error: 'Username must be at least 3 characters' });
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return reply.code(400).send({ error: 'Only letters, numbers, and underscores allowed' });
        }

        const validation = validatePasswordStrength(password);
        if (!validation.valid) {
            return reply.code(400).send({ error: 'Password too weak', details: validation.errors });
        }

        const hash = await hashPassword(password);

        try {
            fastify.db.prepare(
                'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
            ).run(username, hash, 'admin');
        } catch (err: any) {
            if (err.message?.includes('UNIQUE constraint')) {
                return reply.code(409).send({ error: 'Username already exists' });
            }
            throw err;
        }

        return { success: true, user: { username, role: 'admin' } };
    });

    // POST /setup/zt-config — save encrypted ZT configuration
    fastify.post<{
        Body: { url: string; token: string };
    }>('/setup/zt-config', async (request, reply) => {
        if (!hasAdmin(fastify.db)) {
            return reply.code(400).send({ error: 'Create admin account first' });
        }
        if (hasAdmin(fastify.db) && hasZtConfig(fastify.db)) {
            return reply.code(403).send({ error: 'Setup already completed' });
        }

        const url = request.body.url?.trim();
        const token = request.body.token?.trim();

        if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
            return reply.code(400).send({ error: 'Enter a valid URL starting with http:// or https://' });
        }
        if (!token) {
            return reply.code(400).send({ error: 'Auth token is required' });
        }

        saveZtConfig(fastify.db, url, token, fastify.sessionSecret);
        return { success: true };
    });

    // POST /setup/test-connection — test ZT controller reachability
    fastify.post<{
        Body: { url: string; token: string };
    }>('/setup/test-connection', {
        config: {
            rateLimit: {
                max: 10,
                timeWindow: '1 minute',
            },
        },
    }, async (request, reply) => {
        if (hasAdmin(fastify.db) && hasZtConfig(fastify.db)) {
            return reply.code(403).send({ error: 'Setup already completed' });
        }

        const url = request.body.url?.trim();
        const token = request.body.token?.trim();

        if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
            return reply.code(400).send({ error: 'Enter a valid URL starting with http:// or https://' });
        }
        if (!token) {
            return reply.code(400).send({ error: 'Auth token is required' });
        }

        const steps: Array<{ name: string; status: 'pass' | 'fail'; error?: string }> = [];

        try {
            const statusUrl = new URL('/status', url).href;
            const response = await fetch(statusUrl, {
                headers: { 'X-ZT1-Auth': token },
                signal: AbortSignal.timeout(5000),
            });
            steps.push({ name: 'connect', status: 'pass' });

            if (response.status === 401 || response.status === 403) {
                steps.push({ name: 'authenticate', status: 'fail', error: 'Authentication failed' });
                return { success: false, steps };
            }
            steps.push({ name: 'authenticate', status: 'pass' });

            if (!response.ok) {
                steps.push({ name: 'nodeStatus', status: 'fail', error: 'Unexpected response from controller' });
                return { success: false, steps };
            }

            const data = await response.json() as Record<string, unknown>;
            if (!data.address) {
                steps.push({ name: 'nodeStatus', status: 'fail', error: 'Invalid node status response' });
                return { success: false, steps };
            }
            steps.push({ name: 'nodeStatus', status: 'pass' });
            return { success: true, steps };
        } catch (_err) {
            if (steps.length === 0) {
                steps.push({ name: 'connect', status: 'fail', error: 'Could not reach controller' });
            }
            return { success: false, steps };
        }
    });
};
