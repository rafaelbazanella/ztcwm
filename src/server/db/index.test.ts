// @vitest-environment node
import { existsSync, rmSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { tmpdir } from 'os';
import { initDatabase } from './index.js';

const TEST_DIR = resolve(tmpdir(), 'ztcwm-test-db-' + Date.now());
const TEST_DB = resolve(TEST_DIR, 'test.db');

beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('initDatabase', () => {
    it('creates the database file', () => {
        const db = initDatabase(TEST_DB);
        expect(existsSync(TEST_DB)).toBe(true);
        db.close();
    });

    it('sets WAL journal mode', () => {
        const db = initDatabase(TEST_DB);
        const mode = db.pragma('journal_mode', { simple: true });
        expect(mode).toBe('wal');
        db.close();
    });

    it('sets busy timeout to 5000ms', () => {
        const db = initDatabase(TEST_DB);
        const timeout = db.pragma('busy_timeout', { simple: true });
        expect(timeout).toBe(5000);
        db.close();
    });

    it('enables foreign keys', () => {
        const db = initDatabase(TEST_DB);
        const fk = db.pragma('foreign_keys', { simple: true });
        expect(fk).toBe(1);
        db.close();
    });

    it('runs migrations (migrations table exists)', () => {
        const db = initDatabase(TEST_DB);
        const tables = db
            .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'")
            .all();
        expect(tables).toHaveLength(1);
        db.close();
    });

    it('creates parent directory if it does not exist', () => {
        const nestedPath = resolve(TEST_DIR, 'nested', 'deep', 'test.db');
        const db = initDatabase(nestedPath);
        expect(existsSync(nestedPath)).toBe(true);
        db.close();
    });
});
