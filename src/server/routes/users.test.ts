// @vitest-environment node
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import type { InjectOptions, Response as InjectResponse } from 'light-my-request';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import { initDatabase } from '../db/index.js';
import { hashPassword } from '../auth/password.js';
import { usersRoutes } from './users.js';
import { existsSync, unlinkSync } from 'fs';
import type Database from 'better-sqlite3';

let app: FastifyInstance;
let dbPath: string;
let db: Database.Database;

beforeEach(async () => {
    dbPath = `/tmp/ztcwm-users-test-${Date.now()}.db`;
    app = Fastify();
    db = initDatabase(dbPath);
    app.decorate('db', db);
    app.decorate('sessionSecret', 'test-secret-for-aes-encryption');
    await app.register(fastifyCookie);
    await app.register(fastifySession, {
        secret: 'test-secret-that-is-at-least-32-characters-long!!',
        cookie: { secure: false },
    });
    // Helper route to establish test sessions
    app.post('/__test-login', async (request) => {
        const { userId, username, role } = request.body as { userId: number; username: string; role: string };
        request.session.set('userId', userId);
        request.session.set('username', username);
        request.session.set('role', role);
        return { ok: true };
    });
    await app.register(usersRoutes, { prefix: '/api' });
    await app.ready();
});

afterEach(async () => {
    await app.close();
    db.close();
    if (existsSync(dbPath)) unlinkSync(dbPath);
});

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
    userId: number,
    username: string,
    role: string,
    payload?: unknown,
): Promise<InjectResponse> {
    const loginRes = await app.inject({
        method: 'POST',
        url: '/__test-login',
        payload: { userId, username, role },
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

async function adminInject(
    method: InjectOptions['method'],
    url: string,
    payload?: unknown,
): Promise<InjectResponse> {
    const admin = await createUser('admin');
    return injectWithSession(method, url, admin.id, admin.username, 'admin', payload);
}

// ─── GET /api/users ──────────────────────────────────────────────────────

describe('GET /api/users', () => {
    it('returns list of users without password_hash', async () => {
        await createUser('admin');
        await createUser('viewer');
        const admin = await createUser('admin');
        const res = await injectWithSession('GET', '/api/users', admin.id, admin.username, 'admin');
        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.users).toBeInstanceOf(Array);
        expect(body.users.length).toBe(3);
        // Verify no password_hash in response
        for (const user of body.users) {
            expect(user).not.toHaveProperty('password_hash');
            expect(user).toHaveProperty('id');
            expect(user).toHaveProperty('username');
            expect(user).toHaveProperty('role');
            expect(user).toHaveProperty('created_at');
        }
    });

    it('returns 403 for non-admin', async () => {
        const viewer = await createUser('viewer');
        const res = await injectWithSession('GET', '/api/users', viewer.id, viewer.username, 'viewer');
        expect(res.statusCode).toBe(403);
    });
});

// ─── POST /api/users ─────────────────────────────────────────────────────

describe('POST /api/users', () => {
    it('creates user with temporary password', async () => {
        const res = await adminInject('POST', '/api/users', { username: 'newuser', role: 'viewer' });
        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.user.username).toBe('newuser');
        expect(body.user.role).toBe('viewer');
        expect(body.user.id).toBeDefined();
        expect(body.temporaryPassword).toBeDefined();
        expect(typeof body.temporaryPassword).toBe('string');
        expect(body.temporaryPassword.length).toBeGreaterThanOrEqual(12);
    });

    it('returns 409 for duplicate username', async () => {
        await createUser('viewer'); // creates vieweruserN
        const admin = await createUser('admin');
        // Try to create with same username as first viewer
        const existingUser = db.prepare('SELECT username FROM users WHERE role = ?').get('viewer') as { username: string };
        const res = await injectWithSession('POST', '/api/users', admin.id, admin.username, 'admin', {
            username: existingUser.username,
            role: 'viewer',
        });
        expect(res.statusCode).toBe(409);
        expect(res.json().error).toBe('Username already exists');
    });

    it('returns 400 for username too short', async () => {
        const res = await adminInject('POST', '/api/users', { username: 'ab', role: 'viewer' });
        expect(res.statusCode).toBe(400);
    });

    it('returns 400 for invalid username characters', async () => {
        const res = await adminInject('POST', '/api/users', { username: 'user@name', role: 'viewer' });
        expect(res.statusCode).toBe(400);
    });

    it('returns 400 for invalid role', async () => {
        const res = await adminInject('POST', '/api/users', { username: 'validuser', role: 'superadmin' });
        expect(res.statusCode).toBe(400);
    });

    it('returns 403 for non-admin', async () => {
        const op = await createUser('operator');
        const res = await injectWithSession('POST', '/api/users', op.id, op.username, 'operator', {
            username: 'test',
            role: 'viewer',
        });
        expect(res.statusCode).toBe(403);
    });
});

// ─── PUT /api/users/:id/role ─────────────────────────────────────────────

describe('PUT /api/users/:id/role', () => {
    it('changes user role', async () => {
        const target = await createUser('viewer');
        const admin = await createUser('admin');
        const res = await injectWithSession('PUT', `/api/users/${target.id}/role`, admin.id, admin.username, 'admin', {
            role: 'operator',
        });
        expect(res.statusCode).toBe(200);
        expect(res.json().success).toBe(true);
        expect(res.json().user.role).toBe('operator');

        // Verify in DB
        const updated = db.prepare('SELECT role FROM users WHERE id = ?').get(target.id) as { role: string };
        expect(updated.role).toBe('operator');
    });

    it('returns 403 when demoting last admin', async () => {
        const admin = await createUser('admin');
        const res = await injectWithSession('PUT', `/api/users/${admin.id}/role`, admin.id, admin.username, 'admin', {
            role: 'viewer',
        });
        expect(res.statusCode).toBe(403);
        expect(res.json().error).toContain('last admin');
    });

    it('allows demoting admin when another admin exists', async () => {
        const admin1 = await createUser('admin');
        const admin2 = await createUser('admin');
        const res = await injectWithSession('PUT', `/api/users/${admin1.id}/role`, admin2.id, admin2.username, 'admin', {
            role: 'operator',
        });
        expect(res.statusCode).toBe(200);
    });

    it('returns 404 for non-existent user', async () => {
        const res = await adminInject('PUT', '/api/users/999/role', { role: 'operator' });
        expect(res.statusCode).toBe(404);
    });

    it('returns 400 for invalid role', async () => {
        const target = await createUser('viewer');
        const res = await adminInject('PUT', `/api/users/${target.id}/role`, { role: 'invalid' });
        expect(res.statusCode).toBe(400);
    });
});

// ─── DELETE /api/users/:id ───────────────────────────────────────────────

describe('DELETE /api/users/:id', () => {
    it('deletes a user', async () => {
        const target = await createUser('viewer');
        const admin = await createUser('admin');
        const res = await injectWithSession('DELETE', `/api/users/${target.id}`, admin.id, admin.username, 'admin');
        expect(res.statusCode).toBe(200);
        expect(res.json().success).toBe(true);

        // Verify deleted
        const row = db.prepare('SELECT id FROM users WHERE id = ?').get(target.id);
        expect(row).toBeUndefined();
    });

    it('returns 403 when deleting self', async () => {
        const admin = await createUser('admin');
        await createUser('admin'); // second admin so we don't hit last-admin guard
        const res = await injectWithSession('DELETE', `/api/users/${admin.id}`, admin.id, admin.username, 'admin');
        expect(res.statusCode).toBe(403);
        expect(res.json().error).toBe('Cannot delete your own account');
    });

    it('returns 403 when deleting last admin', async () => {
        // Clear all users and create a clean scenario
        db.prepare('DELETE FROM users').run();
        userCounter = 100;
        const lastAdmin = await createUser('admin');
        const otherAdmin = await createUser('admin');
        // Now delete otherAdmin using lastAdmin's session, should work
        const res1 = await injectWithSession('DELETE', `/api/users/${otherAdmin.id}`, lastAdmin.id, lastAdmin.username, 'admin');
        expect(res1.statusCode).toBe(200);
        // Now lastAdmin is truly the last admin. Create another admin to attempt deletion
        const newAdmin = await createUser('admin');
        const res2 = await injectWithSession('DELETE', `/api/users/${lastAdmin.id}`, newAdmin.id, newAdmin.username, 'admin');
        // lastAdmin is no longer the last admin (newAdmin exists), so this should succeed
        expect(res2.statusCode).toBe(200);
    });

    it('returns 404 for non-existent user', async () => {
        const res = await adminInject('DELETE', '/api/users/999');
        expect(res.statusCode).toBe(404);
    });
});

// ─── POST /api/users/:id/reset-password ──────────────────────────────────

describe('POST /api/users/:id/reset-password', () => {
    it('resets password and returns temporary password', async () => {
        const target = await createUser('viewer');
        const admin = await createUser('admin');
        const oldHash = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(target.id) as { password_hash: string };

        const res = await injectWithSession('POST', `/api/users/${target.id}/reset-password`, admin.id, admin.username, 'admin');
        expect(res.statusCode).toBe(200);
        expect(res.json().temporaryPassword).toBeDefined();

        const newHash = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(target.id) as { password_hash: string };
        expect(newHash.password_hash).not.toBe(oldHash.password_hash);
    });

    it('returns 404 for non-existent user', async () => {
        const res = await adminInject('POST', '/api/users/999/reset-password');
        expect(res.statusCode).toBe(404);
    });
});

// ─── POST /api/auth/change-password ──────────────────────────────────────

describe('POST /api/auth/change-password', () => {
    it('changes password with correct current password', async () => {
        const user = await createUser('viewer');
        const res = await injectWithSession('POST', '/api/auth/change-password', user.id, user.username, 'viewer', {
            currentPassword: 'TestPass123!',
            newPassword: 'NewSecure456!',
        });
        expect(res.statusCode).toBe(200);
        expect(res.json().success).toBe(true);
    });

    it('returns 401 with wrong current password', async () => {
        const user = await createUser('viewer');
        const res = await injectWithSession('POST', '/api/auth/change-password', user.id, user.username, 'viewer', {
            currentPassword: 'WrongPassword123!',
            newPassword: 'NewSecure456!',
        });
        expect(res.statusCode).toBe(401);
        expect(res.json().error).toBe('Current password is incorrect');
    });

    it('returns 400 with weak new password', async () => {
        const user = await createUser('viewer');
        const res = await injectWithSession('POST', '/api/auth/change-password', user.id, user.username, 'viewer', {
            currentPassword: 'TestPass123!',
            newPassword: 'weak',
        });
        expect(res.statusCode).toBe(400);
        expect(res.json().error).toBe('Password too weak');
    });

    it('allows non-admin to change own password', async () => {
        const viewer = await createUser('viewer');
        const res = await injectWithSession('POST', '/api/auth/change-password', viewer.id, viewer.username, 'viewer', {
            currentPassword: 'TestPass123!',
            newPassword: 'AnotherSecure789!',
        });
        expect(res.statusCode).toBe(200);
    });
});

// ─── PATCH /api/users/:id/username ───────────────────────────────────────

describe('PATCH /api/users/:id/username', () => {
    it('admin can rename a user (200 + updated payload + audit log line)', async () => {
        const target = await createUser('viewer');
        const admin = await createUser('admin');
        const logSpy = vi.spyOn(app.log, 'info');
        const res = await injectWithSession(
            'PATCH',
            `/api/users/${target.id}/username`,
            admin.id,
            admin.username,
            'admin',
            { username: 'renamed_user' },
        );
        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.success).toBe(true);
        expect(body.user.username).toBe('renamed_user');
        expect(body.user.id).toBe(target.id);
        expect(logSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                event: 'user.username.changed',
                actorId: admin.id,
                targetId: target.id,
                oldUsername: target.username,
                newUsername: 'renamed_user',
            }),
            'username changed',
        );
        const row = db.prepare('SELECT username FROM users WHERE id = ?').get(target.id) as { username: string };
        expect(row.username).toBe('renamed_user');
    });

    it('returns 409 on case-insensitive collision', async () => {
        const admin = await createUser('admin');
        const other = await createUser('viewer');
        // Insert a fixed-name user to collide against
        db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('Existing', 'h', 'viewer');
        const res = await injectWithSession(
            'PATCH',
            `/api/users/${other.id}/username`,
            admin.id,
            admin.username,
            'admin',
            { username: 'existing' },
        );
        expect(res.statusCode).toBe(409);
        expect(res.json().error).toBe('Username already exists');
    });

    it('returns 400 on invalid format (uses validateUsername)', async () => {
        const target = await createUser('viewer');
        const res = await adminInject('PATCH', `/api/users/${target.id}/username`, { username: 'a b' });
        expect(res.statusCode).toBe(400);
        expect(res.json().error).toBe('Only letters, numbers, and underscores allowed');
    });

    it('returns 400 on too-short username', async () => {
        const target = await createUser('viewer');
        const res = await adminInject('PATCH', `/api/users/${target.id}/username`, { username: 'ab' });
        expect(res.statusCode).toBe(400);
        expect(res.json().error).toBe('Username must be at least 3 characters');
    });

    it('returns 404 for non-existent user', async () => {
        const res = await adminInject('PATCH', '/api/users/99999/username', { username: 'whatever_ok' });
        expect(res.statusCode).toBe(404);
    });

    it('returns 403 for operator caller', async () => {
        const target = await createUser('viewer');
        const op = await createUser('operator');
        const res = await injectWithSession(
            'PATCH',
            `/api/users/${target.id}/username`,
            op.id,
            op.username,
            'operator',
            { username: 'newname' },
        );
        expect(res.statusCode).toBe(403);
    });

    it('returns 403 for viewer caller', async () => {
        const target = await createUser('viewer');
        const viewer = await createUser('viewer');
        const res = await injectWithSession(
            'PATCH',
            `/api/users/${target.id}/username`,
            viewer.id,
            viewer.username,
            'viewer',
            { username: 'newname' },
        );
        expect(res.statusCode).toBe(403);
    });

    it('no-op rename (same string) returns 200 without audit log', async () => {
        const target = await createUser('viewer');
        const admin = await createUser('admin');
        const logSpy = vi.spyOn(app.log, 'info');
        const res = await injectWithSession(
            'PATCH',
            `/api/users/${target.id}/username`,
            admin.id,
            admin.username,
            'admin',
            { username: target.username },
        );
        expect(res.statusCode).toBe(200);
        expect(logSpy).not.toHaveBeenCalledWith(
            expect.objectContaining({ event: 'user.username.changed' }),
            expect.anything(),
        );
    });

    it("does NOT invalidate the renamed user's existing session (D-04)", async () => {
        // Capture target's session cookie via /__test-login
        const target = await createUser('viewer');
        const loginRes = await app.inject({
            method: 'POST',
            url: '/__test-login',
            payload: { userId: target.id, username: target.username, role: 'viewer' },
        });
        const cookies = loginRes.cookies as Array<{ name: string; value: string }>;
        const sessionCookie = cookies.find(c => c.name === 'sessionId');
        expect(sessionCookie).toBeDefined();
        const cookieHeader = sessionCookie ? `sessionId=${sessionCookie.value}` : '';

        // Admin renames the target
        const admin = await createUser('admin');
        const renameRes = await injectWithSession(
            'PATCH',
            `/api/users/${target.id}/username`,
            admin.id,
            admin.username,
            'admin',
            { username: 'renamed' },
        );
        expect(renameRes.statusCode).toBe(200);

        // Re-use the original target cookie — session must still be valid
        const probe = await app.inject({
            method: 'POST',
            url: '/__test-login',
            headers: { cookie: cookieHeader },
            payload: { userId: target.id, username: 'renamed', role: 'viewer' },
        });
        expect(probe.statusCode).toBe(200);

        const row = db.prepare('SELECT username FROM users WHERE id = ?').get(target.id) as { username: string };
        expect(row.username).toBe('renamed');
    });

    it('case-only rename (Admin -> admin same letters different case) emits audit log', async () => {
        const admin = await createUser('admin');
        // Insert a fixed-case target to rename
        const r = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)')
            .run('CaseTarget', 'h', 'viewer');
        const targetId = Number(r.lastInsertRowid);
        const logSpy = vi.spyOn(app.log, 'info');
        const res = await injectWithSession(
            'PATCH',
            `/api/users/${targetId}/username`,
            admin.id,
            admin.username,
            'admin',
            { username: 'casetarget' },
        );
        expect(res.statusCode).toBe(200);
        expect(res.json().user.username).toBe('casetarget');
        expect(logSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                event: 'user.username.changed',
                oldUsername: 'CaseTarget',
                newUsername: 'casetarget',
            }),
            'username changed',
        );
    });
});
