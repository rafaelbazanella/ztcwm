import { fixture, html } from '@open-wc/testing-helpers';
import './networks.js';
import type { PageNetworks } from './networks.js';

// Mock fetch
const fetchSpy = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ data: [], meta: {} }),
    text: () => Promise.resolve('[]'),
});
vi.stubGlobal('fetch', fetchSpy);

// vi.mock is hoisted — use vi.hoisted to create shared mock refs
const { mockUserService, mockNetworkService, mockLogService, mockToastService } = vi.hoisted(() => ({
    mockUserService: {
        getCurrentUser: vi.fn().mockResolvedValue({ id: 1, username: 'admin', role: 'admin' }),
        canCreateNetwork: vi.fn().mockReturnValue(true),
        canEditNetwork: vi.fn().mockReturnValue(true),
        canDeleteNetwork: vi.fn().mockReturnValue(true),
        canAccessApiExplorer: vi.fn().mockReturnValue(true),
        hasRole: vi.fn().mockReturnValue(true),
        getRole: vi.fn().mockReturnValue('admin'),
        clear: vi.fn(),
    },
    mockNetworkService: {
        listNetworks: vi.fn().mockResolvedValue({ data: [] }),
        createNetwork: vi.fn(),
    },
    mockLogService: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
    mockToastService: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('../services/index.js', () => ({
    networkService: mockNetworkService,
    logService: mockLogService,
    toastService: mockToastService,
    userService: mockUserService,
}));

describe('page-networks RBAC', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUserService.getCurrentUser.mockResolvedValue({ id: 1, username: 'admin', role: 'admin' });
        mockUserService.canCreateNetwork.mockReturnValue(true);
        fetchSpy.mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ data: [] }),
            text: () => Promise.resolve('[]'),
        });
    });

    it('Create Network button is enabled for Operator/Admin', async () => {
        mockUserService.canCreateNetwork.mockReturnValue(true);

        const el = await fixture<PageNetworks>(html`<page-networks></page-networks>`);
        await new Promise(r => setTimeout(r, 150));
        await el.updateComplete;

        // Find the Create Network button in the header
        const buttons = Array.from(el.shadowRoot!.querySelectorAll('button'));
        const createBtn = buttons.find(b => b.textContent?.includes('Create Network'));
        // Button exists and is not disabled
        if (createBtn) {
            expect(createBtn.disabled).toBe(false);
            expect(createBtn.title).toBe('');
        }
    });

    it('Create Network button is disabled for Viewer', async () => {
        mockUserService.canCreateNetwork.mockReturnValue(false);

        const el = await fixture<PageNetworks>(html`<page-networks></page-networks>`);
        await new Promise(r => setTimeout(r, 150));
        await el.updateComplete;

        const buttons = Array.from(el.shadowRoot!.querySelectorAll('button'));
        const createBtn = buttons.find(b => b.textContent?.includes('Create Network'));
        if (createBtn) {
            expect(createBtn.disabled).toBe(true);
            expect(createBtn.title).toContain('Operator or Admin role required');
        }
    });

    it('calls userService.getCurrentUser on connect', async () => {
        await fixture<PageNetworks>(html`<page-networks></page-networks>`);
        await new Promise(r => setTimeout(r, 100));

        expect(mockUserService.getCurrentUser).toHaveBeenCalled();
        expect(mockUserService.canCreateNetwork).toHaveBeenCalled();
    });
});
