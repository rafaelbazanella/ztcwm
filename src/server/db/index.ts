import Database from 'better-sqlite3';
import { resolve, dirname } from 'path';
import { mkdirSync } from 'fs';
import { runMigrations } from './migrator.js';

export function initDatabase(dbPath?: string): Database.Database {
    const resolvedPath =
        dbPath ??
        process.env.ZTCWM_DB_PATH ??
        resolve(process.cwd(), 'data/ztcwm.db');

    mkdirSync(dirname(resolvedPath), { recursive: true });

    const db = new Database(resolvedPath);

    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
    db.pragma('foreign_keys = ON');

    runMigrations(db);

    console.log(`[db] Database initialized at ${resolvedPath}`);

    return db;
}
