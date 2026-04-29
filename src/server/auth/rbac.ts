import type Database from 'better-sqlite3';

export type UserRole = 'admin' | 'operator' | 'viewer';

export const ROLE_LEVEL: Record<UserRole, number> = {
    admin: 3,
    operator: 2,
    viewer: 1,
};

// Member endpoint pattern: /controller/network/{16-hex}/member/{10-hex}
const MEMBER_POST_RE = /^\/controller\/network\/[0-9a-f]{16}\/member\/[0-9a-f]{10}$/i;

/**
 * Determine minimum role required for the given HTTP method and ZT API path.
 * Path should be relative to the /api/zt prefix (e.g., '/controller/network').
 */
export function getMinRole(method: string, urlPath: string): UserRole {
    const m = method.toUpperCase();

    if (m === 'GET') return 'viewer';

    if (m === 'POST') {
        // Viewer can authorize/deauthorize members (D-01)
        if (MEMBER_POST_RE.test(urlPath)) return 'viewer';
        return 'operator';
    }

    if (m === 'DELETE') return 'admin';

    // PUT, PATCH, or anything else → admin (safety default)
    return 'admin';
}

/**
 * Check if a user role meets or exceeds the required role level.
 */
export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
    return ROLE_LEVEL[userRole] >= ROLE_LEVEL[requiredRole];
}

/**
 * Check if there is at most one admin in the database (last-admin protection).
 * Returns true when count <= 1 (also true when 0 for safety).
 */
export function isLastAdmin(db: Database.Database): boolean {
    const row = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin') as { count: number };
    return row.count <= 1;
}
