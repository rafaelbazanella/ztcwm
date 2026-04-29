import { fixture, html } from '@open-wc/testing-helpers';
import './navbar.js';
import type { ZtNavbar } from './navbar.js';

const fetchSpy = vi.fn();
vi.stubGlobal('fetch', fetchSpy);

// Stub localStorage for theme
vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('dark');

describe('zt-navbar', () => {
    beforeEach(() => {
        fetchSpy.mockReset();
        // Default: status endpoint returns connected
        fetchSpy.mockResolvedValue({ ok: true, status: 200 });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.stubGlobal('fetch', fetchSpy);
        vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('dark');
    });

    it('renders title and subtitle', async () => {
        const el = await fixture<ZtNavbar>(html`
            <zt-navbar title="Dashboard" subtitle="Overview"></zt-navbar>
        `);
        await el.updateComplete;

        const title = el.shadowRoot!.querySelector('.nav-title');
        const subtitle = el.shadowRoot!.querySelector('.nav-subtitle');
        expect(title?.textContent).toBe('Dashboard');
        expect(subtitle?.textContent).toBe('Overview');
    });

    it('renders status indicator element', async () => {
        const el = await fixture<ZtNavbar>(html`<zt-navbar title="Test"></zt-navbar>`);
        await el.updateComplete;

        const indicator = el.shadowRoot!.querySelector('.status-indicator');
        expect(indicator).toBeTruthy();
        const dot = el.shadowRoot!.querySelector('.status-dot');
        expect(dot).toBeTruthy();
        const label = el.shadowRoot!.querySelector('.status-label');
        expect(label).toBeTruthy();
    });

    it('shows connected state after successful health check', async () => {
        fetchSpy.mockResolvedValue({ ok: true, status: 200 });

        const el = await fixture<ZtNavbar>(html`<zt-navbar title="Test"></zt-navbar>`);
        // Wait for setTimeout(100) + fetch + render
        await new Promise(r => setTimeout(r, 200));
        await el.updateComplete;

        const dot = el.shadowRoot!.querySelector('.status-dot');
        expect(dot?.classList.contains('connected')).toBe(true);
        const label = el.shadowRoot!.querySelector('.status-label');
        expect(label?.textContent).toBe('Connected');
    });

    it('shows disconnected state after failed health check', async () => {
        fetchSpy.mockResolvedValue({ ok: false, status: 502 });

        const el = await fixture<ZtNavbar>(html`<zt-navbar title="Test"></zt-navbar>`);
        await new Promise(r => setTimeout(r, 200));
        await el.updateComplete;

        const dot = el.shadowRoot!.querySelector('.status-dot');
        expect(dot?.classList.contains('disconnected')).toBe(true);
        const label = el.shadowRoot!.querySelector('.status-label');
        expect(label?.textContent).toBe('Disconnected');
    });

    it('shows disconnected state on network error', async () => {
        fetchSpy.mockRejectedValue(new Error('Network error'));

        const el = await fixture<ZtNavbar>(html`<zt-navbar title="Test"></zt-navbar>`);
        await new Promise(r => setTimeout(r, 200));
        await el.updateComplete;

        const dot = el.shadowRoot!.querySelector('.status-dot');
        expect(dot?.classList.contains('disconnected')).toBe(true);
    });

    it('health check calls /api/zt/status with credentials', async () => {
        await fixture<ZtNavbar>(html`<zt-navbar title="Test"></zt-navbar>`);
        await new Promise(r => setTimeout(r, 200));

        expect(fetchSpy).toHaveBeenCalledWith('/api/zt/status', expect.objectContaining({
            credentials: 'include',
        }));
    });

    it('renders logout button when show-logout is true', async () => {
        const el = await fixture<ZtNavbar>(html`<zt-navbar title="Test" show-logout></zt-navbar>`);
        await el.updateComplete;

        const logoutBtn = el.shadowRoot!.querySelector('button[title="Log out"]');
        expect(logoutBtn).toBeTruthy();
    });

    it('hides logout button when show-logout is false', async () => {
        const el = await fixture<ZtNavbar>(html`<zt-navbar title="Test" .showLogout=${false}></zt-navbar>`);
        await el.updateComplete;

        const logoutBtn = el.shadowRoot!.querySelector('button[title="Log out"]');
        expect(logoutBtn).toBeFalsy();
    });
});
