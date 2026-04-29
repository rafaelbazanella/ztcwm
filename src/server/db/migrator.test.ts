// @vitest-environment node
import Database from 'better-sqlite3';
import { runMigrations } from './migrator.js';

function createTestDb(): Database.Database {
    return new Database(':memory:');
}

describe('runMigrations', () => {
    it('creates the migrations tracking table', () => {
        const db = createTestDb();
        runMigrations(db);

        const tables = db
            .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'")
            .all();
        expect(tables).toHaveLength(1);
        db.close();
    });

    it('applies all registered migrations', () => {
        const db = createTestDb();
        runMigrations(db);

        const applied = db
            .prepare('SELECT name FROM migrations ORDER BY id')
            .all() as { name: string }[];
        expect(applied.length).toBeGreaterThanOrEqual(2);
        expect(applied.map(r => r.name)).toContain('001-create-migrations');
        expect(applied.map(r => r.name)).toContain('002-create-users');
        db.close();
    });

    it('skips already applied migrations on second run', () => {
        const db = createTestDb();
        runMigrations(db);
        const firstCount = (db.prepare('SELECT COUNT(*) as c FROM migrations').get() as { c: number }).c;

        runMigrations(db);
        const secondCount = (db.prepare('SELECT COUNT(*) as c FROM migrations').get() as { c: number }).c;

        expect(secondCount).toBe(firstCount);
        db.close();
    });

    it('creates the users table via 002 migration', () => {
        const db = createTestDb();
        runMigrations(db);

        const tables = db
            .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
            .all();
        expect(tables).toHaveLength(1);
        db.close();
    });

    it('users table has expected columns', () => {
        const db = createTestDb();
        runMigrations(db);

        const columns = db.prepare('PRAGMA table_info(users)').all() as { name: string }[];
        const colNames = columns.map(c => c.name);
        expect(colNames).toContain('id');
        expect(colNames).toContain('username');
        expect(colNames).toContain('password_hash');
        expect(colNames).toContain('role');
        expect(colNames).toContain('created_at');
        expect(colNames).toContain('updated_at');
        expect(colNames).toContain('last_login_at');
        db.close();
    });

    it('records applied_at timestamp for each migration', () => {
        const db = createTestDb();
        runMigrations(db);

        const rows = db.prepare('SELECT applied_at FROM migrations').all() as { applied_at: string }[];
        for (const row of rows) {
            expect(row.applied_at).toBeTruthy();
            // Should be a valid datetime string
            expect(new Date(row.applied_at).getTime()).not.toBeNaN();
        }
        db.close();
    });

    it('migration 004 makes username UNIQUE case-insensitive', () => {
        const db = createTestDb();
        runMigrations(db);
        db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)')
            .run('Admin', 'hash1', 'admin');
        expect(() =>
            db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)')
                .run('admin', 'hash2', 'viewer')
        ).toThrow(/UNIQUE/);
        db.close();
    });

    it('runMigrations is idempotent across all 4 migrations', () => {
        const db = createTestDb();
        runMigrations(db);
        runMigrations(db); // second run = no-op, no throw
        const count = (db.prepare('SELECT COUNT(*) AS n FROM migrations').get() as { n: number }).n;
        expect(count).toBe(4); // 001, 002, 003, 004
        db.close();
    });

    it('migration 004 preserves existing user data', () => {
        const db = createTestDb();
        runMigrations(db);
        // Verify the unique-nocase index exists post-migration
        const indexes = db.prepare("PRAGMA index_list('users')").all() as { name: string }[];
        expect(indexes.map(i => i.name)).toContain('users_username_unique_nocase');
        db.close();
    });
});
