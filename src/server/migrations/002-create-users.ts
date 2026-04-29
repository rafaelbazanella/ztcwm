import type Database from 'better-sqlite3';

export function up(db: Database.Database): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'viewer',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            last_login_at TEXT
        )
    `);
}

export function down(db: Database.Database): void {
    db.exec('DROP TABLE IF EXISTS users');
}
