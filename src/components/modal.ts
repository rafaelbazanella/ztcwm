import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { theme } from '../styles/theme.js';
import { sharedStyles } from '../styles/shared.js';

@customElement('zt-modal')
export class ZtModal extends LitElement {
    @property({ type: Boolean, reflect: true }) open = false;
    @property({ type: String }) heading = '';

    static styles = [
        theme,
        sharedStyles,
        css`
            :host {
                display: none;
            }

            :host([open]) {
                display: block;
            }

            .overlay {
                position: fixed;
                inset: 0;
                background: var(--color-overlay);
                backdrop-filter: blur(4px);
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                animation: fadeIn var(--transition-fast);
            }

            .modal {
                background: var(--color-bg-secondary);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-xl);
                padding: var(--space-lg, 1.5rem);
                width: min(640px, 90vw);
                box-sizing: border-box;
                max-height: 90vh;
                overflow-x: hidden;
                overflow-y: auto;
                box-shadow: var(--shadow-xl, var(--shadow-lg));
                animation: slideUp var(--transition-base);
                transition: opacity var(--transition-base), transform var(--transition-base);
            }

            .modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: var(--space-md, 1.25rem);
            }

            .modal-title {
                font-size: var(--font-size-xl);
                font-weight: 600;
                color: var(--color-text-primary);
            }

            .modal-body {
                margin-bottom: var(--space-md, 1.25rem);
            }

            .modal-footer {
                display: flex;
                justify-content: flex-end;
                gap: var(--space-sm, 0.75rem);
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes slideUp {
                from { transform: translateY(10px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `,
    ];

    private close(): void {
        this.open = false;
        this.dispatchEvent(new CustomEvent('close'));
    }

    private onOverlayClick(e: Event): void {
        if (e.target === e.currentTarget) {
            this.close();
        }
    }

    render() {
        return html`
            <div class="overlay" @click=${this.onOverlayClick}>
                <div class="modal">
                    <div class="modal-header">
                        <span class="modal-title">${this.heading}</span>
                        <button class="btn-icon" aria-label="Close dialog" @click=${this.close}>✕</button>
                    </div>
                    <div class="modal-body">
                        <slot></slot>
                    </div>
                    <div class="modal-footer">
                        <slot name="footer"></slot>
                    </div>
                </div>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'zt-modal': ZtModal;
    }
}
