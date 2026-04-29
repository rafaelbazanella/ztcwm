import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-static';
import { theme } from '../styles/theme.js';
import { toastService } from '../services/toast-service.js';

interface ToastItem {
    id: number;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    description?: string;
    action?: { label: string; callback: () => void };
}

const iconMap: Record<string, string> = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
};

const colorMap: Record<string, string> = {
    success: 'var(--color-success)',
    error: 'var(--color-error)',
    warning: 'var(--color-warning)',
    info: 'var(--color-info)',
};

@customElement('zt-toast-container')
export class ZtToastContainer extends LitElement {
    @state() private toasts: ToastItem[] = [];

    private unsubscribe: (() => void) | null = null;

    static styles = [
        theme,
        css`
            :host {
                position: fixed;
                bottom: 16px;
                right: 16px;
                z-index: 9999;
                display: flex;
                flex-direction: column-reverse;
                gap: 8px;
                pointer-events: none;
            }

            .toast {
                pointer-events: auto;
                width: 360px;
                background: var(--color-bg-elevated);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-lg);
                padding: var(--space-md, 16px);
                box-shadow: var(--shadow-lg);
                display: flex;
                gap: var(--space-sm, 8px);
                animation: slideIn 200ms ease-out;
            }

            .toast-icon {
                width: 20px;
                height: 20px;
                flex-shrink: 0;
            }

            .toast-icon svg {
                width: 100%;
                height: 100%;
            }

            .toast-content {
                flex: 1;
            }

            .toast-title {
                font-size: var(--font-size-sm);
                font-weight: 500;
                color: var(--color-text-primary);
            }

            .toast-desc {
                font-size: var(--font-size-xs);
                color: var(--color-text-secondary);
                margin-top: 4px;
            }

            .toast-close {
                background: none;
                border: none;
                color: var(--color-text-muted);
                cursor: pointer;
                padding: 2px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 16px;
                height: 16px;
                flex-shrink: 0;
            }

            .toast-close svg {
                width: 100%;
                height: 100%;
            }

            .toast-close:hover {
                color: var(--color-text-primary);
            }

            .toast-action {
                background: none;
                border: none;
                color: var(--color-accent);
                font-size: var(--font-size-xs);
                cursor: pointer;
                padding: 0;
                margin-top: 8px;
                font-weight: 500;
                font-family: var(--font-family);
            }

            .toast-action:hover {
                text-decoration: underline;
            }

            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }

            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `,
    ];

    connectedCallback(): void {
        super.connectedCallback();
        this.unsubscribe = toastService.subscribe((toasts) => {
            this.toasts = toasts.map(t => ({
                id: t.id,
                type: t.type,
                title: t.title,
                description: t.description,
                action: t.action,
            }));
        });
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }

    render() {
        return html`
            ${this.toasts.map(toast => html`
                <div class="toast" style="border-left: 3px solid ${colorMap[toast.type]}">
                    <span class="toast-icon" style="color: ${colorMap[toast.type]}">${unsafeSVG(iconMap[toast.type])}</span>
                    <div class="toast-content">
                        <div class="toast-title">${toast.title}</div>
                        ${toast.description ? html`<div class="toast-desc">${toast.description}</div>` : ''}
                        ${toast.action ? html`
                            <button class="toast-action" @click=${() => { toast.action!.callback(); toastService.dismiss(toast.id); }}>
                                ${toast.action.label}
                            </button>
                        ` : ''}
                    </div>
                    <button class="toast-close" aria-label="Dismiss notification" @click=${() => toastService.dismiss(toast.id)}>
                        ${unsafeSVG(X)}
                    </button>
                </div>
            `)}
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'zt-toast-container': ZtToastContainer;
    }
}
