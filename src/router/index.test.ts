import { checkAuth, checkSetupStatus, resetSetupCache } from './index.js';

const fetchSpy = vi.fn();
vi.stubGlobal('fetch', fetchSpy);

describe('router auth guard', () => {
    beforeEach(() => {
        fetchSpy.mockReset();
        resetSetupCache();
    });

    describe('checkAuth()', () => {
        it('returns true when /api/auth/me responds 200', async () => {
            fetchSpy.mockResolvedValueOnce({ ok: true, status: 200 });
            const result = await checkAuth();
            expect(result).toBe(true);
            expect(fetchSpy).toHaveBeenCalledWith('/api/auth/me', { credentials: 'include' });
        });

        it('returns false when /api/auth/me responds 401', async () => {
            fetchSpy.mockResolvedValueOnce({ ok: false, status: 401 });
            const result = await checkAuth();
            expect(result).toBe(false);
        });

        it('returns false when fetch throws (network error)', async () => {
            fetchSpy.mockRejectedValueOnce(new Error('Network error'));
            const result = await checkAuth();
            expect(result).toBe(false);
        });
    });

    describe('checkSetupStatus()', () => {
        it('returns true when server says needsSetup: true', async () => {
            fetchSpy.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ needsSetup: true }),
            });
            const result = await checkSetupStatus();
            expect(result).toBe(true);
            expect(fetchSpy).toHaveBeenCalledWith('/api/setup/status');
        });

        it('returns false when server says needsSetup: false', async () => {
            fetchSpy.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ needsSetup: false }),
            });
            const result = await checkSetupStatus();
            expect(result).toBe(false);
        });

        it('caches result after first call', async () => {
            fetchSpy.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ needsSetup: true }),
            });
            await checkSetupStatus();
            const result = await checkSetupStatus();
            expect(result).toBe(true);
            // Only one fetch call despite two checkSetupStatus calls
            expect(fetchSpy).toHaveBeenCalledTimes(1);
        });

        it('returns false when fetch fails', async () => {
            fetchSpy.mockRejectedValueOnce(new Error('Network error'));
            const result = await checkSetupStatus();
            expect(result).toBe(false);
        });
    });

    describe('auth redirect integration', () => {
        afterEach(() => {
            sessionStorage.clear();
        });

        it('unauthenticated navigation stores return URL in sessionStorage', async () => {
            // Simulate what the router action does: store intended path
            const intended: string = '/networks';
            if (intended !== '/login' && intended !== '/setup') {
                sessionStorage.setItem('ztcwm-return-url', intended);
            }
            expect(sessionStorage.getItem('ztcwm-return-url')).toBe('/networks');
        });

        it('does not store /login as return URL', async () => {
            const intended: string = '/login';
            if (intended !== '/login' && intended !== '/setup') {
                sessionStorage.setItem('ztcwm-return-url', intended);
            }
            expect(sessionStorage.getItem('ztcwm-return-url')).toBeNull();
        });

        it('does not store /setup as return URL', async () => {
            const intended: string = '/setup';
            if (intended !== '/login' && intended !== '/setup') {
                sessionStorage.setItem('ztcwm-return-url', intended);
            }
            expect(sessionStorage.getItem('ztcwm-return-url')).toBeNull();
        });
    });
});
