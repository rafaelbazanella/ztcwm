import type { FastifyPluginAsync } from 'fastify';
import { comparePassword } from '../auth/password.js';

declare module 'fastify' {
    interface Session {
        userId?: number;
        username?: string;
        role?: string;
        createdAt?: number;
    }
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
    // POST /login — authenticate user and create session
    fastify.post<{
        Body: { username: string; password: string; rememberMe?: boolean };
    }>('/auth/login', {
        config: {
            rateLimit: {
                max: 5,
                timeWindow: '1 minute',
            },
        },
    }, async (request, reply) => {
        const { username, password, rememberMe } = request.body;

        if (!username || !password) {
            return reply.code(400).send({ error: 'Username and password are required' });
        }

        const user = fastify.db.prepare(
            'SELECT id, username, password_hash, role FROM users WHERE username = ?'
        ).get(username) as { id: number; username: string; password_hash: string; role: string } | undefined;

        if (!user) {
            return reply.code(401).send({ error: 'Invalid username or password' });
        }

        const valid = await comparePassword(password, user.password_hash);
        if (!valid) {
            return reply.code(401).send({ error: 'Invalid username or password' });
        }

        // Update last login timestamp
        fastify.db.prepare('UPDATE users SET last_login_at = datetime(\'now\') WHERE id = ?').run(user.id);

        // Set session data
        request.session.userId = user.id;
        request.session.username = user.username;
        request.session.role = user.role;
        request.session.createdAt = Math.floor(Date.now() / 1000);

        // Extend session for remember me (7 days)
        if (rememberMe) {
            request.session.options({ maxAge: 604800000 });
        }

        return { success: true, user: { id: user.id, username: user.username, role: user.role } };
    });

    // DELETE /auth/logout — destroy session
    fastify.delete('/auth/logout', async (request, _reply) => {
        await request.session.destroy();
        return { success: true };
    });

    // GET /auth/me — return current authenticated user
    fastify.get('/auth/me', async (request, reply) => {
        if (!request.session.userId) {
            return reply.code(401).send({ error: 'Authentication required' });
        }
        return {
            user: {
                id: request.session.userId,
                username: request.session.username,
                role: request.session.role,
            },
        };
    });

    // GET /csrf-token — generate and return CSRF token
    fastify.get('/csrf-token', async (_request, reply) => {
        const token = reply.generateCsrf();
        return { token };
    });
};
