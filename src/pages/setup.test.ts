import { fixture, html } from '@open-wc/testing-helpers';
import './setup.js';
import type { ZtSetupPage } from './setup.js';

// Mock fetch globally
const fetchSpy = vi.fn();
vi.stubGlobal('fetch', fetchSpy);

// Mock window.location
const locationSpy = { href: '' };
vi.stubGlobal('location', locationSpy);

function mockFetchDefaults() {
    fetchSpy.mockImplementation((url: string) => {
        if (url === '/api/csrf-token') {
            return Promise.resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ token: 'test-csrf-token' }),
            });
        }
        if (url === '/api/setup/status') {
            return Promise.resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ needsSetup: true, ztConfigured: false }),
            });
        }
        return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({}),
        });
    });
}

describe('zt-setup-page', () => {
    beforeEach(() => {
        fetchSpy.mockReset();
        locationSpy.href = '';
        mockFetchDefaults();
    });

    // SETUP-06: Wizard displays 3 steps via horizontal stepper
    describe('stepper UI (SETUP-06)', () => {
        it('renders stepper with Welcome, Admin, and Connect steps', async () => {
            const el = await fixture<ZtSetupPage>(html`<zt-setup-page></zt-setup-page>`);
            await el.updateComplete;

            const shadow = el.shadowRoot!;
            const labels = shadow.querySelectorAll('.stepper-label');
            const labelTexts = Array.from(labels).map(l => l.textContent?.trim());

            expect(labelTexts).toEqual(['Welcome', 'Admin', 'Connect']);
        });

        it('renders 3 stepper dots', async () => {
            const el = await fixture<ZtSetupPage>(html`<zt-setup-page></zt-setup-page>`);
            await el.updateComplete;

            const dots = el.shadowRoot!.querySelectorAll('.stepper-dot');
            expect(dots.length).toBe(3);
        });

        it('marks first step as active initially', async () => {
            const el = await fixture<ZtSetupPage>(html`<zt-setup-page></zt-setup-page>`);
            await el.updateComplete;

            const dots = el.shadowRoot!.querySelectorAll('.stepper-dot');
            expect(dots[0].classList.contains('active')).toBe(true);
            expect(dots[1].classList.contains('upcoming')).toBe(true);
            expect(dots[2].classList.contains('upcoming')).toBe(true);
        });
    });

    // SETUP-01 (frontend): Root redirect to /setup on first run
    describe('first-run redirect behavior (SETUP-01 frontend)', () => {
        it('does NOT redirect when needsSetup is true', async () => {
            const el = await fixture<ZtSetupPage>(html`<zt-setup-page></zt-setup-page>`);
            await el.updateComplete;
            // Let async connectedCallback fetches settle
            await new Promise(r => setTimeout(r, 50));

            // Should stay on setup, not redirect to /login
            expect(locationSpy.href).not.toBe('/login');
        });

        it('redirects to /login when setup is already complete', async () => {
            fetchSpy.mockImplementation((url: string) => {
                if (url === '/api/csrf-token') {
                    return Promise.resolve({
                        ok: true,
                        status: 200,
                        json: () => Promise.resolve({ token: 'test-csrf-token' }),
                    });
                }
                if (url === '/api/setup/status') {
                    return Promise.resolve({
                        ok: true,
                        status: 200,
                        json: () => Promise.resolve({ needsSetup: false, ztConfigured: true }),
                    });
                }
                return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
            });

            await fixture<ZtSetupPage>(html`<zt-setup-page></zt-setup-page>`);
            // Let async connectedCallback fetches settle
            await new Promise(r => setTimeout(r, 50));

            expect(locationSpy.href).toBe('/login');
        });
    });

    // SETUP-07 (frontend): Finish button disabled until test passes
    describe('Finish button state (SETUP-07 frontend)', () => {
        async function advanceToStep3(el: ZtSetupPage) {
            // Simulate advancing to step 3 by setting internal state
            (el as any).currentStep = 3;
            (el as any).testPassed = false;
            await el.updateComplete;
        }

        it('Finish Setup button is disabled when testPassed is false', async () => {
            const el = await fixture<ZtSetupPage>(html`<zt-setup-page></zt-setup-page>`);
            await el.updateComplete;
            await advanceToStep3(el);

            // The button with "Finish Setup" text should be disabled
            const allButtons = el.shadowRoot!.querySelectorAll('button');
            const finishButton = Array.from(allButtons).find(b => b.textContent?.trim().includes('Finish Setup'));

            expect(finishButton).toBeTruthy();
            expect(finishButton!.disabled).toBe(true);
        });

        it('Finish Setup button is enabled when testPassed is true', async () => {
            const el = await fixture<ZtSetupPage>(html`<zt-setup-page></zt-setup-page>`);
            await el.updateComplete;
            await advanceToStep3(el);

            // Set testPassed to true
            (el as any).testPassed = true;
            await el.updateComplete;

            const allButtons = el.shadowRoot!.querySelectorAll('button');
            const finishButton = Array.from(allButtons).find(b => b.textContent?.trim().includes('Finish Setup'));

            expect(finishButton).toBeTruthy();
            expect(finishButton!.disabled).toBe(false);
        });
    });

    // General rendering
    describe('rendering', () => {
        it('renders logo component', async () => {
            const el = await fixture<ZtSetupPage>(html`<zt-setup-page></zt-setup-page>`);
            await el.updateComplete;

            expect(el.shadowRoot!.querySelector('zt-logo')).toBeTruthy();
        });

        it('renders setup card', async () => {
            const el = await fixture<ZtSetupPage>(html`<zt-setup-page></zt-setup-page>`);
            await el.updateComplete;

            expect(el.shadowRoot!.querySelector('.setup-card')).toBeTruthy();
        });

        it('renders Welcome step content on step 1', async () => {
            const el = await fixture<ZtSetupPage>(html`<zt-setup-page></zt-setup-page>`);
            await el.updateComplete;

            const title = el.shadowRoot!.querySelector('.step-title');
            expect(title?.textContent?.trim()).toContain('Welcome');
        });
    });
});
