import type Database from 'better-sqlite3';

export function up(db: Database.Database): void {
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
}

export function down(db: Database.Database): void {
    db.exec('DROP TABLE IF EXISTS zt_config');
}
