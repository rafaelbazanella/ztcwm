import type Database from 'better-sqlite3';

export function up(db: Database.Database): void {
    // SQLite cannot ALTER an existing column-level UNIQUE constraint in place.
    // The implicit auto-index from `username TEXT NOT NULL UNIQUE` (migration 002)
    // is case-sensitive (BINARY collation) and cannot be dropped directly.
    // Strategy: rebuild the table without the column-level UNIQUE, then create
    // an explicit UNIQUE INDEX with COLLATE NOCASE. (D-01, D-02)
    db.exec(`
        CREATE TABLE users_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'viewer',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            last_login_at TEXT
        );
        INSERT INTO users_new (id, username, password_hash, role, created_at, updated_at, last_login_at)
            SELECT id, username, password_hash, role, created_at, updated_at, last_login_at FROM users;
        DROP TABLE users;
        ALTER TABLE users_new RENAME TO users;
        CREATE UNIQUE INDEX users_username_unique_nocase ON users(username COLLATE NOCASE);
    `);
}

export function down(db: Database.Database): void {
    db.exec(`
        DROP INDEX IF EXISTS users_username_unique_nocase;
        CREATE TABLE users_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'viewer',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            last_login_at TEXT
        );
        INSERT INTO users_new (id, username, password_hash, role, created_at, updated_at, last_login_at)
            SELECT id, username, password_hash, role, created_at, updated_at, last_login_at FROM users;
        DROP TABLE users;
        ALTER TABLE users_new RENAME TO users;
    `);
}
