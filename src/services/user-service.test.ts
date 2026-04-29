import { userService } from '../services/index.js';

// Mock userService to test role-based route guards
const fetchSpy = vi.fn();
vi.stubGlobal('fetch', fetchSpy);

describe('router RBAC guards', () => {
    beforeEach(() => {
        fetchSpy.mockReset();
    });

    describe('userService role checks for route guards', () => {
        afterEach(() => {
            userService.clear();
        });

        it('canAccessApiExplorer returns false for viewer role', async () => {
            fetchSpy.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ user: { id: 1, username: 'viewer', role: 'viewer' } }),
            });
            await userService.getCurrentUser();
            expect(userService.canAccessApiExplorer()).toBe(false);
        });

        it('canAccessApiExplorer returns true for operator role', async () => {
            fetchSpy.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ user: { id: 1, username: 'operator', role: 'operator' } }),
            });
            await userService.getCurrentUser();
            expect(userService.canAccessApiExplorer()).toBe(true);
        });

        it('canAccessApiExplorer returns true for admin role', async () => {
            fetchSpy.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ user: { id: 1, username: 'admin', role: 'admin' } }),
            });
            await userService.getCurrentUser();
            expect(userService.canAccessApiExplorer()).toBe(true);
        });

        it('hasRole("admin") returns false for operator', async () => {
            fetchSpy.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ user: { id: 1, username: 'op', role: 'operator' } }),
            });
            await userService.getCurrentUser();
            expect(userService.hasRole('admin')).toBe(false);
        });

        it('hasRole("admin") returns true for admin', async () => {
            fetchSpy.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ user: { id: 1, username: 'admin', role: 'admin' } }),
            });
            await userService.getCurrentUser();
            expect(userService.hasRole('admin')).toBe(true);
        });

        it('getRole defaults to viewer when not loaded', () => {
            expect(userService.getRole()).toBe('viewer');
        });
    });
});
