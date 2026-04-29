import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { theme } from '../styles/theme.js';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

@customElement('zt-badge')
export class ZtBadge extends LitElement {
    @property({ type: String }) variant: BadgeVariant = 'neutral';
    @property({ type: Boolean }) dot = false;

    static styles = [
        theme,
        css`
            :host {
                display: inline-flex;
            }

            .badge {
                display: inline-flex;
                align-items: center;
                gap: var(--space-xs, 0.25rem);
                padding: 2px var(--space-sm, 0.5rem);
                border-radius: 9999px;
                font-size: var(--font-size-xs);
                font-weight: 600;
                font-family: var(--font-family);
                line-height: 1.4;
                letter-spacing: 0.025em;
                transition: all var(--transition-fast);
            }

            .badge.success {
                background: var(--color-success-muted);
                color: var(--color-success);
            }

            .badge.warning {
                background: var(--color-warning-muted);
                color: var(--color-warning);
            }

            .badge.error {
                background: var(--color-error-muted);
                color: var(--color-error);
            }

            .badge.info {
                background: var(--color-info-muted);
                color: var(--color-info);
            }

            .badge.neutral {
                background: var(--color-bg-hover);
                color: var(--color-text-secondary);
            }

            .dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: currentColor;
            }
        `,
    ];

    render() {
        return html`
            <span class="badge ${this.variant}">
                ${this.dot ? html`<span class="dot"></span>` : ''}
                <slot></slot>
            </span>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'zt-badge': ZtBadge;
    }
}
