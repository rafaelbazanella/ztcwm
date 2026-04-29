import type Database from 'better-sqlite3';

export function up(db: Database.Database): void {
    db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    `);
}

export function down(db: Database.Database): void {
    db.exec('DROP TABLE IF EXISTS migrations');
}
