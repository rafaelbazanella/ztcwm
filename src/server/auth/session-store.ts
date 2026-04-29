import type Database from 'better-sqlite3';

interface SessionStoreCallback {
    (err?: Error | null, session?: any): void;
}

export class SQLiteSessionStore {
    private db: Database.Database;

    constructor(db: Database.Database) {
        this.db = db;
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS sessions (
                sid TEXT PRIMARY KEY,
                session TEXT NOT NULL,
                expires_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL DEFAULT (unixepoch())
            )
        `);
    }

    set(sessionId: string, session: any, callback: SessionStoreCallback): void {
        try {
            const maxAge = session.cookie?.maxAge ?? 1800000;
            const expiresAt = Math.floor(Date.now() / 1000) + Math.floor(maxAge / 1000);
            const data = JSON.stringify(session);
            this.db.prepare(
                `INSERT OR REPLACE INTO sessions (sid, session, expires_at) VALUES (?, ?, ?)`
            ).run(sessionId, data, expiresAt);
            callback(null);
        } catch (err) {
            callback(err as Error);
        }
    }

    get(sessionId: string, callback: SessionStoreCallback): void {
        try {
            const now = Math.floor(Date.now() / 1000);
            const row = this.db.prepare(
                `SELECT session, expires_at, created_at FROM sessions WHERE sid = ?`
            ).get(sessionId) as { session: string; expires_at: number; created_at: number } | undefined;

            if (!row) return callback(null, null);

            // Check expiry
            if (row.expires_at < now) {
                this.destroy(sessionId, () => {});
                return callback(null, null);
            }

            // Check absolute timeout (24h from creation per D-03 / SESS-02)
            if (now - row.created_at > 86400) {
                this.destroy(sessionId, () => {});
                return callback(null, null);
            }

            callback(null, JSON.parse(row.session));
        } catch (err) {
            callback(err as Error);
        }
    }

    destroy(sessionId: string, callback: SessionStoreCallback): void {
        try {
            this.db.prepare(`DELETE FROM sessions WHERE sid = ?`).run(sessionId);
            callback(null);
        } catch (err) {
            callback(err as Error);
        }
    }
}
