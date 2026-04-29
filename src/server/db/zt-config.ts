import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
import type Database from 'better-sqlite3';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export interface ZtConfig {
    controllerUrl: string;
    authToken: string;
}

function deriveKey(secret: string): Buffer {
    return createHash('sha256').update(secret).digest();
}

export function encryptToken(plaintext: string, secret: string): { encrypted: string; iv: string } {
    const key = deriveKey(secret);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return {
        encrypted: encrypted.toString('base64') + ':' + authTag.toString('base64'),
        iv: iv.toString('base64'),
    };
}

export function decryptToken(encryptedWithTag: string, iv: string, secret: string): string {
    const key = deriveKey(secret);
    const [ciphertext, authTagBase64] = encryptedWithTag.split(':');
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(authTagBase64, 'base64'));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(ciphertext, 'base64')),
        decipher.final(),
    ]);
    return decrypted.toString('utf8');
}

export function saveZtConfig(db: Database.Database, url: string, token: string, secret: string): void {
    const { encrypted, iv } = encryptToken(token, secret);
    db.prepare(
        `INSERT OR REPLACE INTO zt_config (id, controller_url, auth_token_encrypted, auth_token_iv, updated_at)
         VALUES (1, ?, ?, ?, datetime('now'))`
    ).run(url, encrypted, iv);
}

export function getZtConfig(db: Database.Database, secret: string): ZtConfig | null {
    const row = db.prepare(
        'SELECT controller_url, auth_token_encrypted, auth_token_iv FROM zt_config WHERE id = 1'
    ).get() as { controller_url: string; auth_token_encrypted: string; auth_token_iv: string } | undefined;
    if (!row) return null;
    const authToken = decryptToken(row.auth_token_encrypted, row.auth_token_iv, secret);
    return { controllerUrl: row.controller_url, authToken };
}

export function hasZtConfig(db: Database.Database): boolean {
    const row = db.prepare('SELECT COUNT(*) as count FROM zt_config').get() as { count: number };
    return row.count > 0;
}

export function isZtConfiguredViaEnv(): boolean {
    return !!(process.env.ZTCWM_ZT_URL && process.env.ZTCWM_ZT_TOKEN);
}
