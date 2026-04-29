type UserRole = 'admin' | 'operator' | 'viewer';

interface CurrentUser {
    id: number;
    username: string;
    role: UserRole;
}

const ROLE_LEVELS: Record<UserRole, number> = { admin: 3, operator: 2, viewer: 1 };

class UserService {
    private user: CurrentUser | null = null;
    private fetchPromise: Promise<CurrentUser | null> | null = null;

    /** Fetch and cache current user. Returns null if not authenticated. */
    async getCurrentUser(): Promise<CurrentUser | null> {
        if (this.user) return this.user;
        if (this.fetchPromise) return this.fetchPromise;
        this.fetchPromise = this._fetch();
        const result = await this.fetchPromise;
        this.fetchPromise = null;
        return result;
    }

    private async _fetch(): Promise<CurrentUser | null> {
        try {
            const res = await fetch('/api/auth/me', { credentials: 'include' });
            if (!res.ok) return null;
            const data = await res.json() as { user: CurrentUser };
            this.user = data.user;
            return this.user;
        } catch {
            return null;
        }
    }

    /** Get cached role (returns 'viewer' if not loaded yet — safe default). */
    getRole(): UserRole {
        return this.user?.role ?? 'viewer';
    }

    /** Check if user has at least the given role level. */
    hasRole(minRole: UserRole): boolean {
        return ROLE_LEVELS[this.getRole()] >= ROLE_LEVELS[minRole];
    }

    // Convenience methods per permission matrix (D-01):
    canCreateNetwork(): boolean { return this.hasRole('operator'); }
    canEditNetwork(): boolean { return this.hasRole('operator'); }
    canDeleteNetwork(): boolean { return this.hasRole('admin'); }
    canAccessApiExplorer(): boolean { return this.hasRole('operator'); }

    /** Clear cache (call on logout). */
    clear(): void {
        this.user = null;
        this.fetchPromise = null;
    }
}

export const userService = new UserService();
