import { fixture, html } from '@open-wc/testing-helpers';

// vi.mock factories are hoisted — no external references allowed
vi.mock('./router/index.js', () => ({
    initRouter: vi.fn(),
    checkSetupStatus: vi.fn().mockResolvedValue(false),
    checkAuth: vi.fn().mockResolvedValue(true),
    resetSetupCache: vi.fn(),
}));

vi.mock('./components/sidebar.js', () => ({}));
vi.mock('./components/toast.js', () => ({}));

import './app.js';
import type { ZtApp } from './app.js';
import { initRouter, checkSetupStatus, checkAuth } from './router/index.js';

describe('zt-app pre-router auth gate', () => {
    let locationHrefSetter: ReturnType<typeof vi.fn<(v: string) => void>>;
    let originalLocation: Location;

    beforeEach(() => {
        vi.clearAllMocks();
        sessionStorage.clear();

        // Default: auth passes, setup not needed
        vi.mocked(checkAuth).mockResolvedValue(true);
        vi.mocked(checkSetupStatus).mockResolvedValue(false);
        vi.mocked(initRouter).mockReturnValue(undefined as any);

        // Save original and set up href tracking
        originalLocation = window.location;
        locationHrefSetter = vi.fn();
    });

    afterEach(() => {
        Object.defineProperty(window, 'location', {
            writable: true,
            configurable: true,
            value: originalLocation,
        });
    });

    function mockPathname(path: string) {
        locationHrefSetter = vi.fn();
        Object.defineProperty(window, 'location', {
            writable: true,
            configurable: true,
            value: new Proxy(originalLocation, {
                get(target, prop) {
                    if (prop === 'pathname') return path;
                    if (prop === 'href') return `http://localhost:3000${path}`;
                    const val = Reflect.get(target, prop);
                    return typeof val === 'function' ? val.bind(target) : val;
                },
                set(_target, prop, value) {
                    if (prop === 'href') {
                        locationHrefSetter(value);
                        return true;
                    }
                    return true;
                },
            }),
        });
    }

    it('redirects to /login when unauthenticated on a protected page', async () => {
        mockPathname('/networks');
        vi.mocked(checkSetupStatus).mockResolvedValue(false);
        vi.mocked(checkAuth).mockResolvedValue(false);

        const el = await fixture<ZtApp>(html`<zt-app></zt-app>`);
        await el.updateComplete;
        await new Promise(r => setTimeout(r, 100));

        expect(locationHrefSetter).toHaveBeenCalledWith('/login');
        expect(initRouter).not.toHaveBeenCalled();
    });

    it('initializes router when authenticated', async () => {
        mockPathname('/dashboard');
        vi.mocked(checkSetupStatus).mockResolvedValue(false);
        vi.mocked(checkAuth).mockResolvedValue(true);

        const el = await fixture<ZtApp>(html`<zt-app></zt-app>`);
        await el.updateComplete;
        await new Promise(r => setTimeout(r, 100));

        expect(initRouter).toHaveBeenCalled();
    });

    it('skips auth check on /login and initializes router', async () => {
        mockPathname('/login');

        const el = await fixture<ZtApp>(html`<zt-app></zt-app>`);
        await el.updateComplete;
        await new Promise(r => setTimeout(r, 100));

        expect(vi.mocked(checkAuth)).not.toHaveBeenCalled();
        expect(initRouter).toHaveBeenCalled();
    });

    it('skips auth check on /setup and initializes router', async () => {
        mockPathname('/setup');

        const el = await fixture<ZtApp>(html`<zt-app></zt-app>`);
        await el.updateComplete;
        await new Promise(r => setTimeout(r, 100));

        expect(vi.mocked(checkAuth)).not.toHaveBeenCalled();
        expect(initRouter).toHaveBeenCalled();
    });

    it('saves intended URL to sessionStorage before redirecting', async () => {
        mockPathname('/networks');
        vi.mocked(checkSetupStatus).mockResolvedValue(false);
        vi.mocked(checkAuth).mockResolvedValue(false);

        const el = await fixture<ZtApp>(html`<zt-app></zt-app>`);
        await el.updateComplete;
        await new Promise(r => setTimeout(r, 100));

        expect(sessionStorage.getItem('ztcwm-return-url')).toBe('/networks');
    });

    it('redirects to /setup when setup is needed', async () => {
        mockPathname('/dashboard');
        vi.mocked(checkSetupStatus).mockResolvedValue(true);

        const el = await fixture<ZtApp>(html`<zt-app></zt-app>`);
        await el.updateComplete;
        await new Promise(r => setTimeout(r, 100));

        expect(locationHrefSetter).toHaveBeenCalledWith('/setup');
        expect(initRouter).not.toHaveBeenCalled();
    });
});
