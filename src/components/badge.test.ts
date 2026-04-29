import { fixture, html } from '@open-wc/testing-helpers';
import './badge.js';
import type { ZtBadge } from './badge.js';

describe('zt-badge', () => {
    it('renders with default variant', async () => {
        const el = await fixture<ZtBadge>(html`<zt-badge>Status</zt-badge>`);
        expect(el).toBeDefined();
        const span = el.shadowRoot!.querySelector('.badge');
        expect(span).not.toBeNull();
        expect(span!.classList.contains('neutral')).toBe(true);
    });

    it('renders with success variant', async () => {
        const el = await fixture<ZtBadge>(html`<zt-badge variant="success">OK</zt-badge>`);
        const span = el.shadowRoot!.querySelector('.badge');
        expect(span!.classList.contains('success')).toBe(true);
    });
});
