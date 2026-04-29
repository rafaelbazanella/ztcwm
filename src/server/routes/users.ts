import type { FastifyPluginAsync } from 'fastify';
import crypto from 'crypto';
import { hashPassword, comparePassword, validatePasswordStrength } from '../auth/password.js';
import { validateUsername } from '../auth/username.js';
import { type UserRole, hasPermission, isLastAdmin } from '../auth/rbac.js';

const VALID_ROLES: UserRole[] = ['admin', 'operator', 'viewer'];

function generateTemporaryPassword(): string {
    // Generate base random string and ensure all character classes present
    const base = crypto.randomBytes(9).toString('base64url'); // ~12 chars
    // Guarantee uppercase, lowercase, digit, special char
    const chars = (base + 'Aa1!').split('');
    // Fisher-Yates shuffle
    for (let i = chars.length - 1; i > 0; i--) {
        const j = crypto.randomInt(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
}

export const usersRoutes: FastifyPluginAsync = async (fastify) => {
    // Admin-only guard for /users routes
    fastify.addHook('preHandler', async (request, reply) => {
        // Skip guard for change-password (any authenticated user)
        if (request.url.endsWith('/auth/change-password')) return;

        if (!hasPermission(request.session.role as UserRole, 'admin')) {
            return reply.code(403).send({ error: 'Admin access required' });
        }
    });

    // GET /users — list all users (no password hashes)
    fastify.get('/users', async () => {
        const users = fastify.db.prepare(
            'SELECT id, username, role, created_at, last_login_at FROM users ORDER BY created_at DESC'
        ).all();
        return { users };
    });

    // POST /users — create new user with temporary password
    fastify.post<{
        Body: { username: string; role: UserRole };
    }>('/users', async (request, reply) => {
        const { username, role } = request.body;

        const v = validateUsername(username);
        if (!v.ok) {
            return reply.code(400).send({ error: v.error });
        }
        if (!VALID_ROLES.includes(role)) {
            return reply.code(400).send({ error: 'Invalid role. Must be admin, operator, or viewer' });
        }

        const temporaryPassword = generateTemporaryPassword();
        const hash = await hashPassword(temporaryPassword);

        try {
            const result = fastify.db.prepare(
                'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
            ).run(username, hash, role);

            return {
                user: { id: Number(result.lastInsertRowid), username, role },
                temporaryPassword,
            };
        } catch (err: any) {
            if (err.message?.includes('UNIQUE constraint')) {
                return reply.code(409).send({ error: 'Username already exists' });
            }
            throw err;
        }
    });

    // PUT /users/:id/role — change user role
    fastify.put<{
        Params: { id: string };
        Body: { role: UserRole };
    }>('/users/:id/role', async (request, reply) => {
        const id = parseInt(request.params.id, 10);
        const { role } = request.body;

        if (!VALID_ROLES.includes(role)) {
            return reply.code(400).send({ error: 'Invalid role. Must be admin, operator, or viewer' });
        }

        const user = fastify.db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(id) as
            { id: number; username: string; role: string } | undefined;

        if (!user) {
            return reply.code(404).send({ error: 'User not found' });
        }

        if (user.role === 'admin' && role !== 'admin' && isLastAdmin(fastify.db)) {
            return reply.code(403).send({ error: 'Cannot change role — this is the last admin account' });
        }

        fastify.db.prepare('UPDATE users SET role = ?, updated_at = datetime(\'now\') WHERE id = ?').run(role, id);

        return { success: true, user: { id, username: user.username, role } };
    });

    // PATCH /users/:id/username — change username (admin only)
    fastify.patch<{
        Params: { id: string };
        Body: { username: string };
    }>('/users/:id/username', async (request, reply) => {
        const id = parseInt(request.params.id, 10);
        const { username: newUsername } = request.body;

        const v = validateUsername(newUsername);
        if (!v.ok) {
            return reply.code(400).send({ error: v.error });
        }

        const user = fastify.db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(id) as
            { id: number; username: string; role: string } | undefined;
        if (!user) {
            return reply.code(404).send({ error: 'User not found' });
        }

        // No-op (identical case): return success without audit
        if (user.username === newUsername) {
            return { success: true, user: { id, username: user.username, role: user.role } };
        }

        try {
            fastify.db.prepare(
                'UPDATE users SET username = ?, updated_at = datetime(\'now\') WHERE id = ?'
            ).run(newUsername, id);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('UNIQUE constraint')) {
                return reply.code(409).send({ error: 'Username already exists' });
            }
            throw err;
        }

        // D-06: structured audit log line — single fastify.log.info per successful rename
        fastify.log.info(
            {
                event: 'user.username.changed',
                actorId: request.session.userId,
                targetId: id,
                oldUsername: user.username,
                newUsername,
            },
            'username changed',
        );

        return { success: true, user: { id, username: newUsername, role: user.role } };
    });

    // DELETE /users/:id — delete user
    fastify.delete<{
        Params: { id: string };
    }>('/users/:id', async (request, reply) => {
        const id = parseInt(request.params.id, 10);

        if (id === request.session.userId) {
            return reply.code(403).send({ error: 'Cannot delete your own account' });
        }

        const user = fastify.db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(id) as
            { id: number; username: string; role: string } | undefined;

        if (!user) {
            return reply.code(404).send({ error: 'User not found' });
        }

        if (user.role === 'admin' && isLastAdmin(fastify.db)) {
            return reply.code(403).send({ error: 'Cannot delete the last admin account' });
        }

        fastify.db.prepare('DELETE FROM users WHERE id = ?').run(id);
        return { success: true };
    });

    // POST /users/:id/reset-password — reset user password (admin only)
    fastify.post<{
        Params: { id: string };
    }>('/users/:id/reset-password', async (request, reply) => {
        const id = parseInt(request.params.id, 10);

        const user = fastify.db.prepare('SELECT id FROM users WHERE id = ?').get(id) as
            { id: number } | undefined;

        if (!user) {
            return reply.code(404).send({ error: 'User not found' });
        }

        const temporaryPassword = generateTemporaryPassword();
        const hash = await hashPassword(temporaryPassword);

        fastify.db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(hash, id);

        return { temporaryPassword };
    });

    // POST /auth/change-password — any authenticated user changes own password
    fastify.post<{
        Body: { currentPassword: string; newPassword: string };
    }>('/auth/change-password', async (request, reply) => {
        const userId = request.session.userId;

        const user = fastify.db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(userId) as
            { id: number; password_hash: string } | undefined;

        if (!user) {
            return reply.code(404).send({ error: 'User not found' });
        }

        const valid = await comparePassword(request.body.currentPassword, user.password_hash);
        if (!valid) {
            return reply.code(401).send({ error: 'Current password is incorrect' });
        }

        const validation = validatePasswordStrength(request.body.newPassword);
        if (!validation.valid) {
            return reply.code(400).send({ error: 'Password too weak', details: validation.errors });
        }

        const hash = await hashPassword(request.body.newPassword);
        fastify.db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(hash, userId);

        return { success: true };
    });
};
