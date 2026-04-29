import type Database from 'better-sqlite3';

export interface Migration {
    name: string;
    up: (db: Database.Database) => void;
    down: (db: Database.Database) => void;
}

import { up as m001up, down as m001down } from '../migrations/001-create-migrations.js';
import { up as m002up, down as m002down } from '../migrations/002-create-users.js';
import { up as m003up, down as m003down } from '../migrations/003-create-zt-config.js';
import { up as m004up, down as m004down } from '../migrations/004-username-collate-nocase.js';

const migrations: Migration[] = [
    { name: '001-create-migrations', up: m001up, down: m001down },
    { name: '002-create-users', up: m002up, down: m002down },
    { name: '003-create-zt-config', up: m003up, down: m003down },
    { name: '004-username-collate-nocase', up: m004up, down: m004down },
];

export function runMigrations(db: Database.Database): void {
    // Ensure migrations table exists (bootstrap)
    db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    `);

    const applied = db
        .prepare('SELECT name FROM migrations ORDER BY id')
        .all() as { name: string }[];
    const appliedSet = new Set(applied.map((r) => r.name));

    for (const migration of migrations) {
        if (appliedSet.has(migration.name)) {
            continue;
        }

        const applyMigration = db.transaction(() => {
            migration.up(db);
            db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migration.name);
        });

        applyMigration();
        console.log(`[migrator] Applied: ${migration.name}`);
    }
}
