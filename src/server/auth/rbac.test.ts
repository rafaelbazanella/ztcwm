// @vitest-environment node
import { initDatabase } from '../db/index.js';
import { hashPassword } from './password.js';
import { existsSync, unlinkSync } from 'fs';
import type Database from 'better-sqlite3';

// Will import from rbac.ts once created
import { ROLE_LEVEL, getMinRole, hasPermission, isLastAdmin } from './rbac.js';

let db: Database.Database;
let dbPath: string;

beforeEach(() => {
    dbPath = `/tmp/ztcwm-rbac-test-${Date.now()}.db`;
    db = initDatabase(dbPath);
});

afterEach(() => {
    db.close();
    if (existsSync(dbPath)) unlinkSync(dbPath);
});

describe('rbac', () => {
    describe('ROLE_LEVEL', () => {
        it('defines three roles with ascending levels', () => {
            expect(ROLE_LEVEL.viewer).toBe(1);
            expect(ROLE_LEVEL.operator).toBe(2);
            expect(ROLE_LEVEL.admin).toBe(3);
        });
    });

    describe('getMinRole', () => {
        it('returns viewer for GET on any path', () => {
            expect(getMinRole('GET', '/controller/network/abc0123456789def')).toBe('viewer');
            expect(getMinRole('GET', '/status')).toBe('viewer');
            expect(getMinRole('GET', '/controller/network')).toBe('viewer');
        });

        it('returns viewer for POST on member endpoint (authorize/deauthorize)', () => {
            expect(getMinRole('POST', '/controller/network/abc0123456789def/member/def1234567')).toBe('viewer');
        });

        it('returns operator for POST on create network', () => {
            expect(getMinRole('POST', '/controller/network')).toBe('operator');
        });

        it('returns operator for POST on update network', () => {
            expect(getMinRole('POST', '/controller/network/abc0123456789def')).toBe('operator');
        });

        it('returns admin for DELETE on network endpoint', () => {
            expect(getMinRole('DELETE', '/controller/network/abc0123456789def')).toBe('admin');
        });

        it('returns admin for any other method', () => {
            expect(getMinRole('PUT', '/controller/network/abc0123456789def')).toBe('admin');
            expect(getMinRole('PATCH', '/controller/network/abc0123456789def')).toBe('admin');
        });
    });

    describe('hasPermission', () => {
        it('admin has permission for all roles', () => {
            expect(hasPermission('admin', 'admin')).toBe(true);
            expect(hasPermission('admin', 'operator')).toBe(true);
            expect(hasPermission('admin', 'viewer')).toBe(true);
        });

        it('operator has permission for operator and viewer', () => {
            expect(hasPermission('operator', 'admin')).toBe(false);
            expect(hasPermission('operator', 'operator')).toBe(true);
            expect(hasPermission('operator', 'viewer')).toBe(true);
        });

        it('viewer only has permission for viewer', () => {
            expect(hasPermission('viewer', 'admin')).toBe(false);
            expect(hasPermission('viewer', 'operator')).toBe(false);
            expect(hasPermission('viewer', 'viewer')).toBe(true);
        });
    });

    describe('isLastAdmin', () => {
        it('returns true when zero admins exist', () => {
            expect(isLastAdmin(db)).toBe(true);
        });

        it('returns true when exactly one admin exists', async () => {
            const hash = await hashPassword('TestPass123!');
            db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('admin1', hash, 'admin');
            expect(isLastAdmin(db)).toBe(true);
        });

        it('returns false when two or more admins exist', async () => {
            const hash = await hashPassword('TestPass123!');
            db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('admin1', hash, 'admin');
            db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('admin2', hash, 'admin');
            expect(isLastAdmin(db)).toBe(false);
        });
    });
});
