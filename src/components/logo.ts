import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { theme } from '../styles/theme.js';

@customElement('zt-logo')
export class ZtLogo extends LitElement {
    @property({ type: Boolean }) compact = false;

    static styles = [
        theme,
        css`
            :host {
                display: inline-flex;
                align-items: center;
            }

            svg {
                display: block;
            }
        `,
    ];

    render() {
        if (this.compact) {
            return html`
                <svg viewBox="0 0 40 28" width="40" height="28" xmlns="http://www.w3.org/2000/svg">
                    <text x="0" y="22" font-family="Inter, sans-serif" font-weight="700" font-size="22" fill="var(--color-accent)">ZT</text>
                </svg>
            `;
        }

        return html`
            <svg viewBox="0 0 100 28" width="100" height="28" xmlns="http://www.w3.org/2000/svg">
                <text x="0" y="22" font-family="Inter, sans-serif" font-weight="700" font-size="22" fill="var(--color-accent)">ZT</text>
                <text x="42" y="22" font-family="Inter, sans-serif" font-weight="700" font-size="22" fill="var(--color-text-primary)">CWM</text>
            </svg>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'zt-logo': ZtLogo;
    }
}
