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
vi.mock('./components/navbar.js', () => ({}));

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

describe('zt-app persistent navbar (LAYOUT-01)', () => {
    let locationHrefSetter: ReturnType<typeof vi.fn<(v: string) => void>>;
    let originalLocation: Location;

    beforeEach(() => {
        vi.clearAllMocks();
        sessionStorage.clear();
        vi.mocked(checkAuth).mockResolvedValue(true);
        vi.mocked(checkSetupStatus).mockResolvedValue(false);
        vi.mocked(initRouter).mockReturnValue(undefined as any);

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

    it('renders <zt-navbar> when authenticated on /dashboard (LAYOUT-01)', async () => {
        mockPathname('/dashboard');
        vi.mocked(checkSetupStatus).mockResolvedValue(false);
        vi.mocked(checkAuth).mockResolvedValue(true);

        const el = await fixture<ZtApp>(html`<zt-app></zt-app>`);
        await el.updateComplete;
        await new Promise(r => setTimeout(r, 100));

        const navbar = el.shadowRoot!.querySelector('zt-navbar');
        expect(navbar).toBeTruthy();
    });

    it('does NOT render <zt-navbar> on /login (D-06)', async () => {
        mockPathname('/login');

        const el = await fixture<ZtApp>(html`<zt-app></zt-app>`);
        await el.updateComplete;
        await new Promise(r => setTimeout(r, 100));

        const navbar = el.shadowRoot!.querySelector('zt-navbar');
        expect(navbar).toBeFalsy();
    });

    it('does NOT render <zt-navbar> on /setup (D-06)', async () => {
        mockPathname('/setup');

        const el = await fixture<ZtApp>(html`<zt-app></zt-app>`);
        await el.updateComplete;
        await new Promise(r => setTimeout(r, 100));

        const navbar = el.shadowRoot!.querySelector('zt-navbar');
        expect(navbar).toBeFalsy();
    });

    it('navbar title/subtitle reflect event.detail.location.route after vaadin-router-location-changed (BLOCKER-1 regression guard / D-05)', async () => {
        mockPathname('/dashboard');
        vi.mocked(checkSetupStatus).mockResolvedValue(false);
        vi.mocked(checkAuth).mockResolvedValue(true);

        const el = await fixture<ZtApp>(html`<zt-app></zt-app>`);
        await el.updateComplete;
        await new Promise(r => setTimeout(r, 100));

        // Dispatch a synthetic vaadin-router-location-changed event with a stub detail
        // matching Vaadin Router 2.x shape: detail.location.route.{title,subtitle}
        const evt = new CustomEvent('vaadin-router-location-changed', {
            detail: {
                location: {
                    route: { title: 'Dashboard', subtitle: 'Overview' },
                },
            },
        });
        window.dispatchEvent(evt);

        // Allow Lit to flush the @state -> render cycle
        await el.updateComplete;
        await new Promise(r => setTimeout(r, 20));
        await el.updateComplete;

        const navbar = el.shadowRoot!.querySelector('zt-navbar');
        expect(navbar).toBeTruthy();

        // Lit property bindings set the property directly (not the attribute).
        // Read both forms for robustness; the property form is authoritative.
        const titleProp = (navbar as any)?.title;
        const subtitleProp = (navbar as any)?.subtitle;
        expect(titleProp).toBe('Dashboard');
        expect(subtitleProp).toBe('Overview');

        // The BLOCKER pattern (Router.location?.route, which returns undefined
        // because Router.location is an instance property in Vaadin Router 2.x)
        // would leave titleProp === '' here — this assertion is the regression guard.
    });
});
