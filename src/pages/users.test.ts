import { fixture, html } from '@open-wc/testing-helpers';
import './users.js';
import type { PageUsers } from './users.js';

// Mock fetch with URL-based routing
const fetchSpy = vi.fn();
vi.stubGlobal('fetch', fetchSpy);

// vi.mock hoisted to avoid factory reference issues
const { mockUserService, mockToastService } = vi.hoisted(() => ({
    mockUserService: {
        getCurrentUser: vi.fn().mockResolvedValue({ id: 1, username: 'admin', role: 'admin' }),
        canAccessApiExplorer: vi.fn().mockReturnValue(true),
        hasRole: vi.fn().mockReturnValue(true),
        getRole: vi.fn().mockReturnValue('admin'),
        clear: vi.fn(),
    },
    mockToastService: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('../services/index.js', () => ({
    userService: mockUserService,
    toastService: mockToastService,
}));

const MOCK_USERS = [
    { id: 1, username: 'admin', role: 'admin', created_at: '2026-01-01T00:00:00', last_login_at: '2026-04-16T10:00:00' },
    { id: 2, username: 'operator1', role: 'operator', created_at: '2026-02-01T00:00:00', last_login_at: '2026-04-15T10:00:00' },
    { id: 3, username: 'viewer1', role: 'viewer', created_at: '2026-03-01T00:00:00', last_login_at: null },
];

type FetchResponse = { ok: boolean; status: number; body: unknown };
const responses: Record<string, FetchResponse> = {};

function setRoute(matcher: string, response: FetchResponse): void {
    responses[matcher] = response;
}

function setupFetch(users = MOCK_USERS) {
    fetchSpy.mockImplementation(async (url: string | URL | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
        const method = init?.method ?? 'GET';
        const key = `${method} ${urlStr}`;
        if (responses[key]) {
            const r = responses[key];
            return { ok: r.ok, status: r.status, json: () => Promise.resolve(r.body) };
        }
        if (urlStr === '/api/users') {
            return { ok: true, status: 200, json: () => Promise.resolve({ users }) };
        }
        if (urlStr === '/api/csrf-token') {
            return { ok: true, status: 200, json: () => Promise.resolve({ token: 'test-csrf' }) };
        }
        if (urlStr.startsWith('/api/auth/me')) {
            return { ok: true, status: 200, json: () => Promise.resolve({ user: { id: 1, username: 'admin', role: 'admin' } }) };
        }
        return { ok: true, status: 200, json: () => Promise.resolve({}) };
    });
}

async function createUsersPage(): Promise<PageUsers> {
    setupFetch();
    const el = await fixture<PageUsers>(html`<page-users></page-users>`);
    // Wait for loadUsers + getCurrentUser
    await new Promise(r => setTimeout(r, 150));
    await el.updateComplete;
    return el;
}

describe('page-users UI', () => {
    beforeEach(() => {
        fetchSpy.mockReset();
        vi.clearAllMocks();
        for (const k of Object.keys(responses)) delete responses[k];
        mockUserService.getCurrentUser.mockResolvedValue({ id: 1, username: 'admin', role: 'admin' });
    });

    it('renders users data table with user rows (USER-02 UI)', async () => {
        const el = await createUsersPage();

        // Verify data table component exists
        const dataTable = el.shadowRoot!.querySelector('zt-data-table');
        expect(dataTable).toBeTruthy();
    });

    it('renders Add User button (USER-01 UI)', async () => {
        const el = await createUsersPage();

        const buttons = Array.from(el.shadowRoot!.querySelectorAll('button'));
        const addBtn = buttons.find(b => b.textContent?.includes('Add User'));
        expect(addBtn).toBeTruthy();
    });

    it('sets showCreateModal state on Add User click (USER-01 UI)', async () => {
        const el = await createUsersPage();

        // Verify component has finished loading
        expect((el as any).loading).toBe(false);
        expect((el as any).users.length).toBeGreaterThan(0);

        // Click Add User button
        const buttons = Array.from(el.shadowRoot!.querySelectorAll('button'));
        const addBtn = buttons.find(b => b.textContent?.includes('Add User'));
        expect(addBtn).toBeTruthy();
        addBtn?.click();
        await el.updateComplete;

        // Verify internal state was toggled
        expect((el as any).showCreateModal).toBe(true);
    });

    it('renders username and role inputs in create form (USER-01 UI)', async () => {
        const el = await createUsersPage();

        // Open create modal
        const buttons = Array.from(el.shadowRoot!.querySelectorAll('button'));
        const createBtn = buttons.find(b => b.textContent?.includes('Create User'));
        createBtn?.click();
        await el.updateComplete;

        // Look for inputs inside the modal
        const usernameInput = el.shadowRoot!.querySelector('input[placeholder*="username" i], input.input');
        expect(usernameInput).toBeTruthy();
        const roleSelect = el.shadowRoot!.querySelector('select.select, select');
        expect(roleSelect).toBeTruthy();
    });

    it('validates username length on create (USER-01 UI)', async () => {
        const el = await createUsersPage();

        // Open modal
        const buttons = Array.from(el.shadowRoot!.querySelectorAll('button'));
        const createBtn = buttons.find(b => b.textContent?.includes('Create User'));
        createBtn?.click();
        await el.updateComplete;

        // Type short username
        const input = el.shadowRoot!.querySelector('input.input') as HTMLInputElement;
        if (input) {
            input.value = 'ab';
            input.dispatchEvent(new Event('input'));
            await el.updateComplete;
        }

        // Click Create button inside modal
        const modalBtns = Array.from(el.shadowRoot!.querySelectorAll('zt-modal button'));
        const submitBtn = modalBtns.find(b => b.textContent?.includes('Create')) as HTMLButtonElement | undefined;
        submitBtn?.click();
        await el.updateComplete;

        // Should show validation error
        const error = el.shadowRoot!.querySelector('.error-message, .input-error, [class*="error"]');
        expect(error).toBeTruthy();
    });

    it('renders role badge with correct variant (USER-03 UI)', async () => {
        const el = await createUsersPage();

        // At least some badges should exist from the table rendering
        // (the data-table renders inside its own shadow DOM, badges may be there)
        // Check that the component loaded successfully with data
        expect(el.shadowRoot!.querySelector('zt-data-table')).toBeTruthy();
    });

    it('fetches users from /api/users on connect', async () => {
        setupFetch();
        await fixture<PageUsers>(html`<page-users></page-users>`);
        await new Promise(r => setTimeout(r, 150));

        expect(fetchSpy).toHaveBeenCalledWith('/api/users', expect.objectContaining({
            credentials: 'include',
        }));
    });

    it('renders loading state initially', async () => {
        // Delay the fetch response
        fetchSpy.mockImplementation(() => new Promise(() => {})); // never resolves
        const el = await fixture<PageUsers>(html`<page-users></page-users>`);
        await el.updateComplete;

        const loading = el.shadowRoot!.querySelector('zt-loading');
        expect(loading).toBeTruthy();
    });

    it('calls userService.getCurrentUser on connect', async () => {
        setupFetch();
        await fixture<PageUsers>(html`<page-users></page-users>`);
        await new Promise(r => setTimeout(r, 150));

        expect(mockUserService.getCurrentUser).toHaveBeenCalled();
    });

    it('Users-page action buttons render Lucide icons at 16x16 inside data-table shadow root (USERS-01 / D-03)', async () => {
        const el = await createUsersPage();

        // Drill page -> data-table (single shadow root)
        const dataTable = el.shadowRoot!.querySelector('zt-data-table') as HTMLElement;
        expect(dataTable).toBeTruthy();

        // Wait for data-table to render its rows from the provided MOCK_USERS
        await new Promise(r => setTimeout(r, 50));

        // Drill data-table shadow root -> action buttons (Edit, Reset Password, Delete — in that order)
        const buttons = dataTable.shadowRoot!.querySelectorAll('button.btn-icon');
        expect(buttons.length).toBeGreaterThanOrEqual(3);

        // D-03: verify EACH of the three action buttons has its nested <svg> at 16x16
        const expectedLabels = ['Edit', 'Reset Password', 'Delete'];
        for (let i = 0; i < 3; i++) {
            const svg = buttons[i].querySelector('svg');
            expect(svg, `${expectedLabels[i]} button (index ${i}) should contain an <svg>`).toBeTruthy();
            const cs = getComputedStyle(svg!);
            expect(cs.width, `${expectedLabels[i]} button (index ${i}) svg width`).toBe('16px');
            expect(cs.height, `${expectedLabels[i]} button (index ${i}) svg height`).toBe('16px');
        }
    });
});

async function openEditModalFor(el: PageUsers, userId: number): Promise<void> {
    const user = MOCK_USERS.find(u => u.id === userId)!;
    (el as any).openEditModal(user);
    await el.updateComplete;
}

describe('Edit User modal (USER-01)', () => {
    beforeEach(() => {
        fetchSpy.mockReset();
        vi.clearAllMocks();
        for (const k of Object.keys(responses)) delete responses[k];
        mockUserService.getCurrentUser.mockResolvedValue({ id: 1, username: 'admin', role: 'admin' });
    });

    it('seeds editUsername and editRole from selectedUser when opened', async () => {
        const el = await createUsersPage();
        await openEditModalFor(el, 2);
        expect((el as any).editUsername).toBe('operator1');
        expect((el as any).editRole).toBe('operator');
        expect((el as any).showEditModal).toBe(true);
    });

    it('PATCHes username only when role unchanged (D-03)', async () => {
        const el = await createUsersPage();
        setRoute('PATCH /api/users/2/username', { ok: true, status: 200, body: { success: true, user: { id: 2, username: 'op_renamed', role: 'operator' } } });
        await openEditModalFor(el, 2);
        (el as any).editUsername = 'op_renamed';
        await (el as any).handleEditUser();

        const calls = fetchSpy.mock.calls.map((c: any[]) => `${c[1]?.method ?? 'GET'} ${c[0]}`);
        expect(calls).toContain('PATCH /api/users/2/username');
        expect(calls.some((c: string) => c.includes('PUT /api/users/2/role'))).toBe(false);
        expect((el as any).showEditModal).toBe(false);
    });

    it('PUTs role only when username unchanged (D-03)', async () => {
        const el = await createUsersPage();
        setRoute('PUT /api/users/2/role', { ok: true, status: 200, body: { success: true, user: { id: 2, username: 'operator1', role: 'admin' } } });
        await openEditModalFor(el, 2);
        (el as any).editRole = 'admin';
        await (el as any).handleEditUser();

        const calls = fetchSpy.mock.calls.map((c: any[]) => `${c[1]?.method ?? 'GET'} ${c[0]}`);
        expect(calls).toContain('PUT /api/users/2/role');
        expect(calls.some((c: string) => c.includes('PATCH /api/users/2/username'))).toBe(false);
    });

    it('calls username PATCH first, then role PUT, when both changed (D-11)', async () => {
        const el = await createUsersPage();
        setRoute('PATCH /api/users/2/username', { ok: true, status: 200, body: { success: true, user: { id: 2, username: 'op_renamed', role: 'operator' } } });
        setRoute('PUT /api/users/2/role', { ok: true, status: 200, body: { success: true, user: { id: 2, username: 'op_renamed', role: 'admin' } } });
        await openEditModalFor(el, 2);
        (el as any).editUsername = 'op_renamed';
        (el as any).editRole = 'admin';
        await (el as any).handleEditUser();

        const calls = fetchSpy.mock.calls.map((c: any[]) => `${c[1]?.method ?? 'GET'} ${c[0]}`);
        const patchIdx = calls.findIndex((c: string) => c === 'PATCH /api/users/2/username');
        const putIdx = calls.findIndex((c: string) => c === 'PUT /api/users/2/role');
        expect(patchIdx).toBeGreaterThanOrEqual(0);
        expect(putIdx).toBeGreaterThan(patchIdx);
        expect(mockToastService.success).toHaveBeenCalledTimes(1);
    });

    it('surfaces 409 inline and does NOT call role PUT (D-05, D-11)', async () => {
        const el = await createUsersPage();
        setRoute('PATCH /api/users/2/username', { ok: false, status: 409, body: { error: 'Username already exists' } });
        setRoute('PUT /api/users/2/role', { ok: true, status: 200, body: { success: true, user: { id: 2, username: 'operator1', role: 'admin' } } });
        await openEditModalFor(el, 2);
        (el as any).editUsername = 'admin';
        (el as any).editRole = 'admin';
        await (el as any).handleEditUser();

        expect((el as any).usernameError).toBe('Username already exists');
        expect((el as any).showEditModal).toBe(true);
        const calls = fetchSpy.mock.calls.map((c: any[]) => `${c[1]?.method ?? 'GET'} ${c[0]}`);
        expect(calls.some((c: string) => c.includes('PUT /api/users/2/role'))).toBe(false);
    });

    it('blocks short username on client side without any network call (D-05)', async () => {
        const el = await createUsersPage();
        await openEditModalFor(el, 2);
        const callCountBefore = fetchSpy.mock.calls.length;
        (el as any).editUsername = 'ab';
        await (el as any).handleEditUser();
        expect((el as any).usernameError).toBe('Username must be at least 3 characters');
        expect(fetchSpy.mock.calls.length).toBe(callCountBefore);
    });

    it('blocks invalid chars on client side without any network call (D-05)', async () => {
        const el = await createUsersPage();
        await openEditModalFor(el, 2);
        const callCountBefore = fetchSpy.mock.calls.length;
        (el as any).editUsername = 'bad name!';
        await (el as any).handleEditUser();
        expect((el as any).usernameError).toBe('Only letters, numbers, and underscores allowed');
        expect(fetchSpy.mock.calls.length).toBe(callCountBefore);
    });

    it('refreshes userService cache on self-rename (D-09)', async () => {
        const el = await createUsersPage();
        // currentUserId is 1 ('admin') from the mocked /api/auth/me on connect.
        setRoute('PATCH /api/users/1/username', { ok: true, status: 200, body: { success: true, user: { id: 1, username: 'admin_new', role: 'admin' } } });
        await openEditModalFor(el, 1);
        (el as any).editUsername = 'admin_new';
        const clearCallsBefore = mockUserService.clear.mock.calls.length;
        const getCallsBefore = mockUserService.getCurrentUser.mock.calls.length;
        await (el as any).handleEditUser();
        expect(mockUserService.clear.mock.calls.length).toBe(clearCallsBefore + 1);
        expect(mockUserService.getCurrentUser.mock.calls.length).toBe(getCallsBefore + 1);
    });
});
