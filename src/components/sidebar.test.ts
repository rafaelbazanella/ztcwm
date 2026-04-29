import { fixture, html } from '@open-wc/testing-helpers';
import './sidebar.js';
import type { ZtSidebar } from './sidebar.js';

// Mock fetch to prevent real network requests
const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ user: { id: 1, username: 'admin', role: 'admin' } }) });
vi.stubGlobal('fetch', fetchSpy);

// vi.mock is hoisted — use vi.hoisted to create shared mock refs
const { mockUserService } = vi.hoisted(() => ({
    mockUserService: {
        getCurrentUser: vi.fn().mockResolvedValue({ id: 1, username: 'admin', role: 'admin' }),
        canAccessApiExplorer: vi.fn().mockReturnValue(true),
        hasRole: vi.fn().mockReturnValue(true),
        getRole: vi.fn().mockReturnValue('admin'),
        clear: vi.fn(),
    },
}));

vi.mock('../services/index.js', () => ({
    userService: mockUserService,
}));

describe('zt-sidebar RBAC filtering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUserService.getCurrentUser.mockResolvedValue({ id: 1, username: 'admin', role: 'admin' });
        mockUserService.canAccessApiExplorer.mockReturnValue(true);
        mockUserService.hasRole.mockReturnValue(true);
    });

    it('renders API Explorer link when user is Admin', async () => {
        const el = await fixture<ZtSidebar>(html`<zt-sidebar currentPath="/dashboard"></zt-sidebar>`);
        await new Promise(r => setTimeout(r, 100));
        await el.updateComplete;

        const links = Array.from(el.shadowRoot!.querySelectorAll('.nav-link'));
        const apiLink = links.find(l => l.textContent?.includes('API Explorer'));
        expect(apiLink).toBeTruthy();
    });

    it('renders User Management link when user is Admin', async () => {
        const el = await fixture<ZtSidebar>(html`<zt-sidebar currentPath="/dashboard"></zt-sidebar>`);
        await new Promise(r => setTimeout(r, 100));
        await el.updateComplete;

        const links = Array.from(el.shadowRoot!.querySelectorAll('.nav-link'));
        const usersLink = links.find(l => l.textContent?.includes('User Management'));
        expect(usersLink).toBeTruthy();
    });

    it('hides API Explorer link when user is Viewer', async () => {
        mockUserService.canAccessApiExplorer.mockReturnValue(false);

        const el = await fixture<ZtSidebar>(html`<zt-sidebar currentPath="/dashboard"></zt-sidebar>`);
        await new Promise(r => setTimeout(r, 100));
        await el.updateComplete;

        const links = Array.from(el.shadowRoot!.querySelectorAll('.nav-link'));
        const apiLink = links.find(l => l.textContent?.includes('API Explorer'));
        expect(apiLink).toBeFalsy();
    });

    it('hides User Management link when user is not Admin', async () => {
        mockUserService.hasRole.mockReturnValue(false);

        const el = await fixture<ZtSidebar>(html`<zt-sidebar currentPath="/dashboard"></zt-sidebar>`);
        await new Promise(r => setTimeout(r, 100));
        await el.updateComplete;

        const links = Array.from(el.shadowRoot!.querySelectorAll('.nav-link'));
        const usersLink = links.find(l => l.textContent?.includes('User Management'));
        expect(usersLink).toBeFalsy();
    });

    it('always renders Dashboard, Networks, Members, Logs, Preferences links', async () => {
        const el = await fixture<ZtSidebar>(html`<zt-sidebar currentPath="/dashboard"></zt-sidebar>`);
        await new Promise(r => setTimeout(r, 100));
        await el.updateComplete;

        const links = Array.from(el.shadowRoot!.querySelectorAll('.nav-link'));
        const labels = links.map(l => l.querySelector('.nav-label')?.textContent?.trim());
        expect(labels).toContain('Dashboard');
        expect(labels).toContain('Networks');
        expect(labels).toContain('Members');
        expect(labels).toContain('Logs');
        expect(labels).toContain('Preferences');
    });
});
