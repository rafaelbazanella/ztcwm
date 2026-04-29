import { fixture, html } from '@open-wc/testing-helpers';
import './ip-chip-editor.js';
import type { IpChipEditor } from './ip-chip-editor.js';

function getChip(el: IpChipEditor, ip: string): HTMLElement | null {
    return el.shadowRoot!.querySelector<HTMLElement>(`.chip[data-ip="${ip}"]`);
}

function getChipX(el: IpChipEditor, ip: string): HTMLButtonElement | null {
    const chip = getChip(el, ip);
    return chip ? chip.querySelector<HTMLButtonElement>('.chip-x') : null;
}

function getAddInput(el: IpChipEditor): HTMLInputElement {
    return el.shadowRoot!.querySelector<HTMLInputElement>('.add')!;
}

async function captureNextEvent(el: IpChipEditor): Promise<CustomEvent | null> {
    return new Promise((resolve) => {
        const handler = (e: Event) => {
            el.removeEventListener('ip-change', handler);
            resolve(e as CustomEvent);
        };
        el.addEventListener('ip-change', handler);
        // Resolve null after microtask if no event arrives
        setTimeout(() => {
            el.removeEventListener('ip-change', handler);
            resolve(null);
        }, 50);
    });
}

describe('zt-ip-chip-editor', () => {
    it('Test 1: adds an IP via Enter and emits ip-change with the appended array', async () => {
        const el = await fixture<IpChipEditor>(
            html`<zt-ip-chip-editor .ips=${['10.0.0.1']}></zt-ip-chip-editor>`,
        );
        const input = getAddInput(el);
        input.value = '10.0.0.2';
        input.dispatchEvent(new InputEvent('input'));

        const eventPromise = captureNextEvent(el);
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        const evt = await eventPromise;

        expect(evt).not.toBeNull();
        expect(evt!.detail.ips).toEqual(['10.0.0.1', '10.0.0.2']);
        await el.updateComplete;
        expect(getAddInput(el).value).toBe('');
    });

    it('Test 2: adds an IP via blur and emits ip-change with the appended array', async () => {
        const el = await fixture<IpChipEditor>(
            html`<zt-ip-chip-editor .ips=${['10.0.0.1']}></zt-ip-chip-editor>`,
        );
        const input = getAddInput(el);
        input.value = '10.0.0.2';
        input.dispatchEvent(new InputEvent('input'));

        const eventPromise = captureNextEvent(el);
        input.dispatchEvent(new Event('blur'));
        const evt = await eventPromise;

        expect(evt).not.toBeNull();
        expect(evt!.detail.ips).toEqual(['10.0.0.1', '10.0.0.2']);
    });

    it('Test 3: Escape clears the add-input and does NOT emit', async () => {
        const el = await fixture<IpChipEditor>(
            html`<zt-ip-chip-editor .ips=${['10.0.0.1']}></zt-ip-chip-editor>`,
        );
        const input = getAddInput(el);
        input.value = '10.0.0.2';
        input.dispatchEvent(new InputEvent('input'));

        const eventPromise = captureNextEvent(el);
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        const evt = await eventPromise;

        expect(evt).toBeNull();
        await el.updateComplete;
        expect(getAddInput(el).value).toBe('');
    });

    it('Test 4: removing a non-last chip emits ip-change with the shortened array (no confirm)', async () => {
        const el = await fixture<IpChipEditor>(
            html`<zt-ip-chip-editor .ips=${['10.0.0.1', '10.0.0.2', 'fc00::1']}></zt-ip-chip-editor>`,
        );

        const eventPromise = captureNextEvent(el);
        getChipX(el, '10.0.0.2')!.click();
        const evt = await eventPromise;

        expect(evt).not.toBeNull();
        expect(evt!.detail.ips).toEqual(['10.0.0.1', 'fc00::1']);
        // No confirm prompt visible
        expect(el.shadowRoot!.querySelector('.confirm-row')).toBeNull();
    });

    it('Test 5: removing the last chip shows confirm; Remove emits []; Cancel emits nothing', async () => {
        const el = await fixture<IpChipEditor>(
            html`<zt-ip-chip-editor .ips=${['10.0.0.1']}></zt-ip-chip-editor>`,
        );

        // Click × on last chip — should show confirm, not emit
        const beforeEvt = captureNextEvent(el);
        getChipX(el, '10.0.0.1')!.click();
        await el.updateComplete;
        const beforeResult = await beforeEvt;
        expect(beforeResult).toBeNull();

        const confirmRow = el.shadowRoot!.querySelector('.confirm-row');
        expect(confirmRow).not.toBeNull();
        expect(confirmRow!.querySelector('.confirm-heading')!.textContent).toBe('Remove last IP?');
        expect(confirmRow!.querySelector('.confirm-body')!.textContent).toBe(
            'This member will have no assigned addresses.',
        );

        // Click Cancel — should not emit and dismiss
        const cancelEvt = captureNextEvent(el);
        const buttons = confirmRow!.querySelectorAll<HTMLButtonElement>('.btn');
        const cancelBtn = Array.from(buttons).find((b) => b.textContent === 'Cancel')!;
        cancelBtn.click();
        await el.updateComplete;
        const cancelResult = await cancelEvt;
        expect(cancelResult).toBeNull();
        expect(el.shadowRoot!.querySelector('.confirm-row')).toBeNull();

        // Click × again, then Remove — should emit []
        getChipX(el, '10.0.0.1')!.click();
        await el.updateComplete;
        const removeEvt = captureNextEvent(el);
        const removeBtn = Array.from(
            el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.confirm-row .btn'),
        ).find((b) => b.textContent === 'Remove')!;
        removeBtn.click();
        const removeResult = await removeEvt;
        expect(removeResult).not.toBeNull();
        expect(removeResult!.detail.ips).toEqual([]);
    });

    it('Test 6: IPv4↔IPv6 preservation — removing one family keeps the other', async () => {
        // Remove IPv4, keep IPv6
        const el1 = await fixture<IpChipEditor>(
            html`<zt-ip-chip-editor .ips=${['10.0.0.1', 'fc00::1']}></zt-ip-chip-editor>`,
        );
        const evt1Promise = captureNextEvent(el1);
        getChipX(el1, '10.0.0.1')!.click();
        const evt1 = await evt1Promise;
        expect(evt1!.detail.ips).toEqual(['fc00::1']);

        // Remove IPv6, keep IPv4
        const el2 = await fixture<IpChipEditor>(
            html`<zt-ip-chip-editor .ips=${['10.0.0.1', 'fc00::1']}></zt-ip-chip-editor>`,
        );
        const evt2Promise = captureNextEvent(el2);
        getChipX(el2, 'fc00::1')!.click();
        const evt2 = await evt2Promise;
        expect(evt2!.detail.ips).toEqual(['10.0.0.1']);
    });

    it('Test 7: markRejected styles the matching chip and auto-clears after ~3000ms', async () => {
        vi.useFakeTimers();
        try {
            const el = await fixture<IpChipEditor>(
                html`<zt-ip-chip-editor .ips=${['10.0.0.1', '10.0.0.99']}></zt-ip-chip-editor>`,
            );
            el.markRejected('10.0.0.99', 'Not a valid IP address');
            await el.updateComplete;

            const chip = getChip(el, '10.0.0.99');
            expect(chip).not.toBeNull();
            expect(chip!.classList.contains('rejected')).toBe(true);
            expect(chip!.getAttribute('title')).toBe('Not a valid IP address');

            vi.advanceTimersByTime(3001);
            await el.updateComplete;

            const chipAfter = getChip(el, '10.0.0.99');
            expect(chipAfter!.classList.contains('rejected')).toBe(false);
        } finally {
            vi.useRealTimers();
        }
    });

    it('Test 8: add-input has placeholder/aria, × button has aria-label per chip', async () => {
        const el = await fixture<IpChipEditor>(
            html`<zt-ip-chip-editor .ips=${['10.0.0.1']}></zt-ip-chip-editor>`,
        );
        const input = getAddInput(el);
        expect(input.getAttribute('placeholder')).toBe('Add IP…');
        expect(input.getAttribute('aria-label')).toBe('Add IP address');

        const x = getChipX(el, '10.0.0.1');
        expect(x!.getAttribute('aria-label')).toBe('Remove IP 10.0.0.1');
    });

    it('Test 9: component CSS contains no hex/rgb/named color literals (only var(--*))', async () => {
        // Read the constructed cssText from static styles — strip comments first.
        const styleSheets = (
            (await fixture<IpChipEditor>(
                html`<zt-ip-chip-editor></zt-ip-chip-editor>`,
            )).constructor as typeof IpChipEditor
        ).styles;
        const cssTexts: string[] = [];
        const styles = Array.isArray(styleSheets) ? styleSheets : [styleSheets];
        for (const s of styles) {
            const cssText = (s as unknown as { cssText: string }).cssText ?? '';
            cssTexts.push(cssText);
        }
        // Inspect only the chip-editor's own block (the second entry — first is the theme).
        const ownCss = cssTexts[cssTexts.length - 1];
        // Strip /* ... */ comments
        const cleaned = ownCss.replace(/\/\*[\s\S]*?\*\//g, '');
        // Look for hex / rgb / rgba / named colors used as values.
        const forbidden = /(?:^|[^a-z-])(#[0-9a-fA-F]{3,8}\b|rgb\(|rgba\(|\bblack\b|\bwhite\b|\bred\b|\bblue\b|\bgreen\b)/i;
        expect(cleaned).not.toMatch(forbidden);
    });
});
