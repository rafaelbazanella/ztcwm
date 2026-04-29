import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { theme } from '../styles/theme.js';

@customElement('zt-loading')
export class ZtLoading extends LitElement {
    @property({ type: String }) variant: 'spinner' | 'skeleton-rows' | 'skeleton-cards' = 'spinner';
    @property({ type: Number }) count = 3;

    static styles = [
        theme,
        css`
            :host {
                display: block;
            }

            /* Spinner variant */
            .spinner-container {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 2rem;
            }

            .spinner {
                width: 36px;
                height: 36px;
                border: 3px solid var(--color-border);
                border-top-color: var(--color-accent);
                border-radius: 50%;
                animation: spin 0.6s linear infinite;
            }

            .spinner-label {
                margin-left: 0.75rem;
                font-size: var(--font-size-sm);
                color: var(--color-text-muted);
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            /* Skeleton row variant */
            .skeleton-row {
                display: flex;
                gap: var(--space-md, 16px);
                padding: var(--space-sm, 8px) 0;
                border-bottom: 1px solid var(--color-border);
            }

            .skeleton-cell {
                height: 16px;
                border-radius: var(--radius-sm);
                background: linear-gradient(90deg, var(--color-bg-tertiary) 25%, var(--color-bg-hover) 50%, var(--color-bg-tertiary) 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s linear infinite;
            }

            .skeleton-cell:nth-child(1) { flex: 2; }
            .skeleton-cell:nth-child(2) { flex: 1; }
            .skeleton-cell:nth-child(3) { flex: 1; }

            @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            }

            /* Skeleton card variant */
            .skeleton-card {
                background: var(--color-bg-secondary);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-lg);
                padding: var(--space-lg, 24px);
                margin-bottom: var(--space-md, 16px);
            }

            .skeleton-card-title {
                height: 20px;
                width: 40%;
                border-radius: var(--radius-sm);
                background: linear-gradient(90deg, var(--color-bg-tertiary) 25%, var(--color-bg-hover) 50%, var(--color-bg-tertiary) 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s linear infinite;
                margin-bottom: var(--space-md, 16px);
            }

            .skeleton-card-body {
                height: 14px;
                width: 70%;
                border-radius: var(--radius-sm);
                background: linear-gradient(90deg, var(--color-bg-tertiary) 25%, var(--color-bg-hover) 50%, var(--color-bg-tertiary) 75%);
                background-size: 200% 100%;
                animation: shimmer 1.5s linear infinite;
            }
        `,
    ];

    render() {
        if (this.variant === 'skeleton-rows') {
            return html`${Array.from({ length: this.count }, () => html`
                <div class="skeleton-row">
                    <div class="skeleton-cell"></div>
                    <div class="skeleton-cell"></div>
                    <div class="skeleton-cell"></div>
                </div>
            `)}`;
        }

        if (this.variant === 'skeleton-cards') {
            return html`${Array.from({ length: this.count }, () => html`
                <div class="skeleton-card">
                    <div class="skeleton-card-title"></div>
                    <div class="skeleton-card-body"></div>
                </div>
            `)}`;
        }

        return html`
            <div class="spinner-container">
                <div class="spinner"></div>
                <span class="spinner-label"><slot>Loading…</slot></span>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'zt-loading': ZtLoading;
    }
}
