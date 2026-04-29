// @vitest-environment node
import Database from 'better-sqlite3';
import { encryptToken, decryptToken, saveZtConfig, getZtConfig, hasZtConfig, isZtConfiguredViaEnv } from './zt-config.js';

let db: Database.Database;

beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
        CREATE TABLE IF NOT EXISTS zt_config (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            controller_url TEXT NOT NULL,
            auth_token_encrypted TEXT NOT NULL,
            auth_token_iv TEXT NOT NULL,
            configured_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    `);
});

afterEach(() => {
    db.close();
});

describe('encryptToken / decryptToken', () => {
    it('roundtrip produces original plaintext', () => {
        const secret = 'test-secret';
        const plaintext = 'my-secret-token';
        const { encrypted, iv } = encryptToken(plaintext, secret);
        const result = decryptToken(encrypted, iv, secret);
        expect(result).toBe(plaintext);
    });

    it('produces different ciphertext each call (random IV)', () => {
        const secret = 'test-secret';
        const plaintext = 'my-secret-token';
        const a = encryptToken(plaintext, secret);
        const b = encryptToken(plaintext, secret);
        expect(a.encrypted).not.toBe(b.encrypted);
        expect(a.iv).not.toBe(b.iv);
    });

    it('decrypt with wrong secret throws', () => {
        const { encrypted, iv } = encryptToken('my-secret-token', 'secret-a');
        expect(() => decryptToken(encrypted, iv, 'secret-b')).toThrow();
    });

    it('decrypt with tampered ciphertext throws', () => {
        const secret = 'test-secret';
        const { encrypted, iv } = encryptToken('my-secret-token', secret);
        const tampered = 'AAAA' + encrypted.slice(4);
        expect(() => decryptToken(tampered, iv, secret)).toThrow();
    });
});

describe('saveZtConfig / getZtConfig', () => {
    it('roundtrip returns correct URL and token', () => {
        const secret = 'test-secret';
        saveZtConfig(db, 'http://localhost:9993', 'my-zt-token', secret);
        const config = getZtConfig(db, secret);
        expect(config).toEqual({
            controllerUrl: 'http://localhost:9993',
            authToken: 'my-zt-token',
        });
    });

    it('getZtConfig returns null on empty DB', () => {
        const config = getZtConfig(db, 'test-secret');
        expect(config).toBeNull();
    });

    it('saveZtConfig overwrites existing config (singleton)', () => {
        const secret = 'test-secret';
        saveZtConfig(db, 'http://localhost:9993', 'token-1', secret);
        saveZtConfig(db, 'http://example.com:9993', 'token-2', secret);
        const config = getZtConfig(db, secret);
        expect(config).toEqual({
            controllerUrl: 'http://example.com:9993',
            authToken: 'token-2',
        });
    });
});

describe('hasZtConfig', () => {
    it('returns false on empty DB', () => {
        expect(hasZtConfig(db)).toBe(false);
    });

    it('returns true after save', () => {
        saveZtConfig(db, 'http://localhost:9993', 'tok', 'secret');
        expect(hasZtConfig(db)).toBe(true);
    });
});

describe('isZtConfiguredViaEnv', () => {
    it('returns false when env vars not set', () => {
        delete process.env.ZTCWM_ZT_URL;
        delete process.env.ZTCWM_ZT_TOKEN;
        expect(isZtConfiguredViaEnv()).toBe(false);
    });
});
