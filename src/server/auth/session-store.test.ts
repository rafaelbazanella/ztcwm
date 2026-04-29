// @vitest-environment node
import Database from 'better-sqlite3';
import { SQLiteSessionStore } from './session-store.js';

function createStore() {
    const db = new Database(':memory:');
    const store = new SQLiteSessionStore(db);
    return { db, store };
}

function promisify<T>(fn: (cb: (err?: Error | null, result?: T) => void) => void): Promise<T | null> {
    return new Promise((resolve, reject) => {
        fn((err, result) => {
            if (err) reject(err);
            else resolve(result ?? null);
        });
    });
}

describe('SQLiteSessionStore', () => {
    it('creates sessions table on construction', () => {
        const { db } = createStore();
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'").all();
        expect(tables).toHaveLength(1);
    });

    it('sets and gets a session', async () => {
        const { store } = createStore();
        const session = { userId: 1, username: 'admin', cookie: { maxAge: 1800000 } };

        await promisify(cb => store.set('sid-1', session, cb));
        const result = await promisify<any>(cb => store.get('sid-1', cb));

        expect(result).toBeTruthy();
        expect(result.userId).toBe(1);
        expect(result.username).toBe('admin');
    });

    it('returns null for non-existent session', async () => {
        const { store } = createStore();
        const result = await promisify(cb => store.get('non-existent', cb));
        expect(result).toBeNull();
    });

    it('destroys a session', async () => {
        const { store } = createStore();
        const session = { userId: 1, cookie: { maxAge: 1800000 } };

        await promisify(cb => store.set('sid-del', session, cb));
        await promisify(cb => store.destroy('sid-del', cb));
        const result = await promisify(cb => store.get('sid-del', cb));

        expect(result).toBeNull();
    });

    it('overwrites session on set with same sid', async () => {
        const { store } = createStore();

        await promisify(cb => store.set('sid-ow', { userId: 1, cookie: { maxAge: 1800000 } }, cb));
        await promisify(cb => store.set('sid-ow', { userId: 2, cookie: { maxAge: 1800000 } }, cb));
        const result = await promisify<any>(cb => store.get('sid-ow', cb));

        expect(result.userId).toBe(2);
    });

    it('returns null for expired session', async () => {
        const { db, store } = createStore();
        const session = { userId: 1, cookie: { maxAge: 1800000 } };

        await promisify(cb => store.set('sid-exp', session, cb));

        // Manually set expires_at to the past
        const pastTs = Math.floor(Date.now() / 1000) - 100;
        db.prepare('UPDATE sessions SET expires_at = ? WHERE sid = ?').run(pastTs, 'sid-exp');

        const result = await promisify(cb => store.get('sid-exp', cb));
        expect(result).toBeNull();
    });

    it('returns null for session exceeding 24h absolute timeout', async () => {
        const { db, store } = createStore();
        const session = { userId: 1, cookie: { maxAge: 604800000 } }; // 7-day remember me

        await promisify(cb => store.set('sid-abs', session, cb));

        // Manually set created_at to 25 hours ago
        const oldCreated = Math.floor(Date.now() / 1000) - (25 * 3600);
        db.prepare('UPDATE sessions SET created_at = ? WHERE sid = ?').run(oldCreated, 'sid-abs');

        const result = await promisify(cb => store.get('sid-abs', cb));
        expect(result).toBeNull();
    });

    it('keeps session within 24h absolute timeout', async () => {
        const { db, store } = createStore();
        const session = { userId: 1, cookie: { maxAge: 604800000 } };

        await promisify(cb => store.set('sid-ok', session, cb));

        // Set created_at to 23 hours ago (still within 24h)
        const recentCreated = Math.floor(Date.now() / 1000) - (23 * 3600);
        db.prepare('UPDATE sessions SET created_at = ? WHERE sid = ?').run(recentCreated, 'sid-ok');

        const result = await promisify<any>(cb => store.get('sid-ok', cb));
        expect(result).toBeTruthy();
        expect(result.userId).toBe(1);
    });
});
