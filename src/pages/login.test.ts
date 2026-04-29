import { fixture, html } from '@open-wc/testing-helpers';
import './login.js';
import type { ZtLoginPage } from './login.js';

// Mock fetch globally
const fetchSpy = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ token: 'test-csrf-token' }),
    text: () => Promise.resolve(''),
});
vi.stubGlobal('fetch', fetchSpy);

describe('zt-login-page', () => {
    beforeEach(() => {
        fetchSpy.mockClear();
        // Default: CSRF token fetch succeeds
        fetchSpy.mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ token: 'test-csrf-token' }),
            text: () => Promise.resolve(''),
        });
    });

    it('renders the login form with required elements', async () => {
        const el = await fixture<ZtLoginPage>(html`<zt-login-page></zt-login-page>`);
        await el.updateComplete;

        const shadow = el.shadowRoot!;
        expect(shadow.querySelector('#username')).toBeTruthy();
        expect(shadow.querySelector('#password')).toBeTruthy();
        expect(shadow.querySelector('#rememberMe')).toBeTruthy();
        expect(shadow.querySelector('button[type="submit"]')).toBeTruthy();
    });

    it('renders Sign In title', async () => {
        const el = await fixture<ZtLoginPage>(html`<zt-login-page></zt-login-page>`);
        await el.updateComplete;

        const title = el.shadowRoot!.querySelector('.login-title');
        expect(title?.textContent).toBe('Sign In');
    });

    it('renders logo component', async () => {
        const el = await fixture<ZtLoginPage>(html`<zt-login-page></zt-login-page>`);
        await el.updateComplete;

        const logo = el.shadowRoot!.querySelector('zt-logo');
        expect(logo).toBeTruthy();
    });

    it('renders form with novalidate attribute', async () => {
        const el = await fixture<ZtLoginPage>(html`<zt-login-page></zt-login-page>`);
        await el.updateComplete;

        const form = el.shadowRoot!.querySelector('form');
        expect(form?.hasAttribute('novalidate')).toBe(true);
    });

    it('inputs do not have required attribute (custom validation only)', async () => {
        const el = await fixture<ZtLoginPage>(html`<zt-login-page></zt-login-page>`);
        await el.updateComplete;

        const username = el.shadowRoot!.querySelector('#username') as HTMLInputElement;
        const password = el.shadowRoot!.querySelector('#password') as HTMLInputElement;
        expect(username.hasAttribute('required')).toBe(false);
        expect(password.hasAttribute('required')).toBe(false);
    });

    it('shows error when submitting with empty username', async () => {
        const el = await fixture<ZtLoginPage>(html`<zt-login-page></zt-login-page>`);
        await el.updateComplete;

        const form = el.shadowRoot!.querySelector('form')!;
        form.dispatchEvent(new Event('submit', { cancelable: true }));
        await el.updateComplete;

        const errorDiv = el.shadowRoot!.querySelector('.error-message');
        expect(errorDiv?.textContent?.trim()).toBe('Username is required');
    });

    it('shows error when submitting with username but empty password', async () => {
        const el = await fixture<ZtLoginPage>(html`<zt-login-page></zt-login-page>`);
        await el.updateComplete;

        // Type username
        const usernameInput = el.shadowRoot!.querySelector('#username') as HTMLInputElement;
        usernameInput.value = 'admin';
        usernameInput.dispatchEvent(new Event('input'));
        await el.updateComplete;

        const form = el.shadowRoot!.querySelector('form')!;
        form.dispatchEvent(new Event('submit', { cancelable: true }));
        await el.updateComplete;

        const errorDiv = el.shadowRoot!.querySelector('.error-message');
        expect(errorDiv?.textContent?.trim()).toBe('Password is required');
    });

    it('fetches CSRF token on connect', async () => {
        await fixture<ZtLoginPage>(html`<zt-login-page></zt-login-page>`);
        await new Promise(r => setTimeout(r, 50));

        expect(fetchSpy).toHaveBeenCalledWith('/api/csrf-token', { credentials: 'include' });
    });

    it('renders remember me checkbox with label', async () => {
        const el = await fixture<ZtLoginPage>(html`<zt-login-page></zt-login-page>`);
        await el.updateComplete;

        const checkbox = el.shadowRoot!.querySelector('#rememberMe') as HTMLInputElement;
        const label = el.shadowRoot!.querySelector('label[for="rememberMe"]');
        expect(checkbox?.type).toBe('checkbox');
        expect(label?.textContent).toContain('7 days');
    });

    it('displays version text', async () => {
        const el = await fixture<ZtLoginPage>(html`<zt-login-page></zt-login-page>`);
        await el.updateComplete;

        const version = el.shadowRoot!.querySelector('.version-text');
        expect(version?.textContent).toContain('v2.0');
    });

    describe('post-login redirect', () => {
        let originalHref: string;
        let hrefSetter: (v: any) => void;

        beforeEach(() => {
            originalHref = window.location.href;
            hrefSetter = vi.fn() as unknown as (v: any) => void;
            Object.defineProperty(window, 'location', {
                value: { ...window.location, href: originalHref },
                writable: true,
                configurable: true,
            });
            Object.defineProperty(window.location, 'href', {
                set: hrefSetter,
                get: () => originalHref,
                configurable: true,
            });
        });

        afterEach(() => {
            sessionStorage.clear();
        });

        it('redirects to stored return URL after successful login', async () => {
            sessionStorage.setItem('ztcwm-return-url', '/networks');

            // CSRF fetch, then successful login
            fetchSpy
                .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ token: 'csrf' }), text: () => Promise.resolve('') })
                .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ success: true }), text: () => Promise.resolve('') });

            const el = await fixture<ZtLoginPage>(html`<zt-login-page></zt-login-page>`);
            await el.updateComplete;

            const usernameInput = el.shadowRoot!.querySelector('#username') as HTMLInputElement;
            usernameInput.value = 'admin';
            usernameInput.dispatchEvent(new Event('input'));
            const passwordInput = el.shadowRoot!.querySelector('#password') as HTMLInputElement;
            passwordInput.value = 'password';
            passwordInput.dispatchEvent(new Event('input'));
            await el.updateComplete;

            const form = el.shadowRoot!.querySelector('form')!;
            form.dispatchEvent(new Event('submit', { cancelable: true }));
            await new Promise(r => setTimeout(r, 50));

            expect(hrefSetter).toHaveBeenCalledWith('/networks');
            expect(sessionStorage.getItem('ztcwm-return-url')).toBeNull();
        });

        it('redirects to /dashboard when no return URL stored', async () => {
            fetchSpy
                .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ token: 'csrf' }), text: () => Promise.resolve('') })
                .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ success: true }), text: () => Promise.resolve('') });

            const el = await fixture<ZtLoginPage>(html`<zt-login-page></zt-login-page>`);
            await el.updateComplete;

            const usernameInput = el.shadowRoot!.querySelector('#username') as HTMLInputElement;
            usernameInput.value = 'admin';
            usernameInput.dispatchEvent(new Event('input'));
            const passwordInput = el.shadowRoot!.querySelector('#password') as HTMLInputElement;
            passwordInput.value = 'password';
            passwordInput.dispatchEvent(new Event('input'));
            await el.updateComplete;

            const form = el.shadowRoot!.querySelector('form')!;
            form.dispatchEvent(new Event('submit', { cancelable: true }));
            await new Promise(r => setTimeout(r, 50));

            expect(hrefSetter).toHaveBeenCalledWith('/dashboard');
        });
    });
});
