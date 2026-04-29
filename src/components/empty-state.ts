import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { theme } from '../styles/theme.js';

@customElement('zt-empty-state')
export class ZtEmptyState extends LitElement {
    @property({ type: String }) icon = '';
    @property({ type: String }) svgIcon = '';
    @property({ type: String }) heading = 'No data';
    @property({ type: String }) message = '';

    static styles = [
        theme,
        css`
            :host {
                display: block;
            }

            .empty {
                text-align: center;
                padding: var(--space-2xl, 48px) var(--space-lg, 24px);
                max-width: 400px;
                margin: 0 auto;
            }

            .empty-icon {
                width: 48px;
                height: 48px;
                margin: 0 auto var(--space-md, 16px);
                color: var(--color-text-muted);
                opacity: 0.6;
            }

            .empty-icon svg {
                width: 100%;
                height: 100%;
            }

            .empty-icon-legacy {
                font-size: 2.5rem;
                margin-bottom: var(--space-md, 16px);
                opacity: 0.4;
                color: var(--color-text-muted);
            }

            .empty-heading {
                font-size: var(--font-size-lg);
                font-weight: 600;
                color: var(--color-text-secondary);
                margin-bottom: var(--space-sm, 8px);
            }

            .empty-message {
                font-size: var(--font-size-sm);
                color: var(--color-text-muted);
                line-height: 1.5;
                margin-bottom: var(--space-lg, 24px);
            }
        `,
    ];

    render() {
        return html`
            <div class="empty">
                ${this.svgIcon
                    ? html`<div class="empty-icon">${unsafeSVG(this.svgIcon)}</div>`
                    : this.icon
                        ? html`<div class="empty-icon-legacy">${this.icon}</div>`
                        : nothing
                }
                <div class="empty-heading">${this.heading}</div>
                ${this.message ? html`<div class="empty-message">${this.message}</div>` : nothing}
                <slot></slot>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'zt-empty-state': ZtEmptyState;
    }
}
