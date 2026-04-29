import { fixture, html } from '@open-wc/testing-helpers';
import './api-explorer.js';
import type { PageApiExplorer } from './api-explorer.js';

// Mock fetch globally
const fetchSpy = vi.fn().mockImplementation(async (url: string | URL | Request) => {
    const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
    if (urlStr === '/api/csrf-token') {
        return { ok: true, status: 200, json: () => Promise.resolve({ token: 'test-csrf' }), text: () => Promise.resolve('') };
    }
    return { ok: true, status: 200, text: () => Promise.resolve('{"status":"ok"}') };
});
vi.stubGlobal('fetch', fetchSpy);

// Mock logService
vi.mock('../services/index.js', () => ({
    logService: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

describe('page-api-explorer confirmation', () => {
    beforeEach(() => {
        fetchSpy.mockClear();
    });

    it('sends GET request immediately without confirmation', async () => {
        const el = await fixture<PageApiExplorer>(html`<page-api-explorer></page-api-explorer>`);
        // Default method is GET
        const sendBtn = el.shadowRoot!.querySelector('button.btn-primary') as HTMLButtonElement;
        sendBtn.click();
        await el.updateComplete;
        // Wait for async fetch
        await new Promise(r => setTimeout(r, 50));
        // No modal should be open
        const modal = el.shadowRoot!.querySelector('zt-modal');
        expect(modal?.open).not.toBe(true);
        // fetch should have been called
        expect(fetchSpy).toHaveBeenCalled();
    });

    it('shows confirmation modal for DELETE request', async () => {
        const el = await fixture<PageApiExplorer>(html`<page-api-explorer></page-api-explorer>`);
        // Change method to DELETE via the select
        const select = el.shadowRoot!.querySelector('select') as HTMLSelectElement;
        select.value = 'DELETE';
        select.dispatchEvent(new Event('change'));
        await el.updateComplete;
        // Click Send
        const sendBtn = el.shadowRoot!.querySelector('button.btn-primary') as HTMLButtonElement;
        sendBtn.click();
        await el.updateComplete;
        // Modal should be open
        const modal = el.shadowRoot!.querySelector('zt-modal');
        expect(modal?.open).toBe(true);
        // fetch should NOT have been called yet
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('shows confirmation modal for POST request', async () => {
        const el = await fixture<PageApiExplorer>(html`<page-api-explorer></page-api-explorer>`);
        const select = el.shadowRoot!.querySelector('select') as HTMLSelectElement;
        select.value = 'POST';
        select.dispatchEvent(new Event('change'));
        await el.updateComplete;
        const sendBtn = el.shadowRoot!.querySelector('button.btn-primary') as HTMLButtonElement;
        sendBtn.click();
        await el.updateComplete;
        const modal = el.shadowRoot!.querySelector('zt-modal');
        expect(modal?.open).toBe(true);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('canceling confirmation does not send request', async () => {
        const el = await fixture<PageApiExplorer>(html`<page-api-explorer></page-api-explorer>`);
        const select = el.shadowRoot!.querySelector('select') as HTMLSelectElement;
        select.value = 'DELETE';
        select.dispatchEvent(new Event('change'));
        await el.updateComplete;
        // Open confirmation
        const sendBtn = el.shadowRoot!.querySelector('button.btn-primary') as HTMLButtonElement;
        sendBtn.click();
        await el.updateComplete;
        // Click Cancel button in modal
        const modal = el.shadowRoot!.querySelector('zt-modal');
        const cancelBtn = modal?.querySelector('button.btn:not(.btn-primary)') as HTMLButtonElement;
        cancelBtn?.click();
        await el.updateComplete;
        expect(modal?.open).toBe(false);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('confirming sends the request', async () => {
        const el = await fixture<PageApiExplorer>(html`<page-api-explorer></page-api-explorer>`);
        const select = el.shadowRoot!.querySelector('select') as HTMLSelectElement;
        select.value = 'POST';
        select.dispatchEvent(new Event('change'));
        await el.updateComplete;
        // Open confirmation
        const sendBtn = el.shadowRoot!.querySelector('button.btn-primary') as HTMLButtonElement;
        sendBtn.click();
        await el.updateComplete;
        // Click Confirm button in modal footer
        const modal = el.shadowRoot!.querySelector('zt-modal');
        const confirmBtn = modal?.querySelector('button.btn-primary') as HTMLButtonElement;
        confirmBtn?.click();
        await el.updateComplete;
        // Wait for async fetch
        await new Promise(r => setTimeout(r, 50));
        expect(fetchSpy).toHaveBeenCalled();
        expect(modal?.open).toBe(false);
    });
});
