import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { theme } from '../styles/theme.js';

@customElement('zt-stat-card')
export class ZtStatCard extends LitElement {
    @property({ type: String }) label = '';
    @property({ type: String }) value = '';
    @property({ type: String }) icon = '';
    @property({ type: String }) svgIcon = '';
    @property({ type: String }) trend = '';

    static styles = [
        theme,
        css`
            :host {
                display: block;
            }

            .stat-card {
                background: var(--color-bg-secondary);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-lg);
                padding: var(--space-lg, 24px);
                transition: border-color var(--transition-fast);
                position: relative;
                overflow: hidden;
                box-shadow: var(--shadow-md);
            }

            .stat-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(to right, var(--color-accent), var(--color-accent-hover));
            }

            .stat-card:hover {
                border-color: var(--color-border-light);
            }

            .stat-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: var(--space-sm, 8px);
            }

            .stat-icon {
                width: 20px;
                height: 20px;
                color: var(--color-text-muted);
            }

            .stat-icon svg {
                width: 100%;
                height: 100%;
            }

            .stat-icon-legacy {
                font-size: 1.25rem;
                opacity: 0.7;
            }

            .stat-label {
                font-size: var(--font-size-xs);
                text-transform: uppercase;
                letter-spacing: 0.04em;
                color: var(--color-text-muted);
                font-weight: 600;
            }

            .stat-value {
                font-size: var(--font-size-3xl);
                font-weight: 700;
                color: var(--color-text-primary);
                line-height: 1.1;
                margin-bottom: var(--space-xs, 4px);
            }

            .stat-trend {
                font-size: var(--font-size-xs);
                color: var(--color-text-muted);
            }
        `,
    ];

    render() {
        return html`
            <div class="stat-card">
                <div class="stat-header">
                    <span class="stat-label">${this.label}</span>
                    ${this.svgIcon
                        ? html`<span class="stat-icon">${unsafeSVG(this.svgIcon)}</span>`
                        : this.icon
                            ? html`<span class="stat-icon-legacy">${this.icon}</span>`
                            : nothing
                    }
                </div>
                <div class="stat-value">${this.value}</div>
                ${this.trend ? html`<div class="stat-trend">${this.trend}</div>` : nothing}
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'zt-stat-card': ZtStatCard;
    }
}
