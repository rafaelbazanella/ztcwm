import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { theme } from '../styles/theme.js';
import { sharedStyles } from '../styles/shared.js';

@customElement('zt-ip-chip-editor')
export class IpChipEditor extends LitElement {
    @property({ type: Array }) ips: string[] = [];
    @property({ type: Boolean }) disabled = false;

    @state() private addValue = '';
    @state() private confirmingRemoveLast = false;
    @state() private rejectedIp: string | null = null;
    @state() private rejectedReason: string | null = null;

    private rejectedTimer: ReturnType<typeof setTimeout> | null = null;

    static styles = [
        theme,
        sharedStyles,
        css`
            :host {
                display: block;
            }

            .container {
                display: flex;
                flex-wrap: wrap;
                gap: var(--space-xs, 4px);
                align-items: center;
            }

            .chip {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 2px var(--space-sm, 8px);
                background: var(--color-bg-tertiary);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-sm);
                font-family: var(--font-mono);
                font-size: var(--font-size-sm);
                color: var(--color-text-primary);
                line-height: 1.4;
            }

            .chip.rejected {
                border-color: var(--color-error);
                background: var(--color-error-muted);
            }

            .chip-x {
                background: none;
                border: none;
                color: var(--color-text-muted);
                cursor: pointer;
                padding: 0;
                font-size: var(--font-size-base);
                line-height: 1;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }

            .chip-x:hover {
                color: var(--color-text-primary);
            }

            .add {
                padding: 2px var(--space-sm, 8px);
                border: 1px dashed var(--color-border);
                border-radius: var(--radius-sm);
                background: transparent;
                color: var(--color-text-primary);
                font-family: var(--font-mono);
                font-size: var(--font-size-sm);
                outline: none;
                min-width: 110px;
            }

            .add:focus {
                border-color: var(--color-accent);
                border-style: solid;
            }

            .confirm-row {
                width: 100%;
                margin-top: var(--space-xs, 4px);
                padding: var(--space-sm, 8px);
                background: var(--color-bg-elevated);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-sm);
                display: flex;
                flex-direction: column;
                gap: var(--space-xs, 4px);
            }

            .confirm-heading {
                font-size: var(--font-size-sm);
                font-weight: 600;
                color: var(--color-text-primary);
            }

            .confirm-body {
                font-size: var(--font-size-xs);
                color: var(--color-text-secondary);
            }

            .confirm-actions {
                display: flex;
                gap: var(--space-xs, 4px);
            }

            .btn {
                padding: 2px var(--space-sm, 8px);
                border-radius: var(--radius-sm);
                border: 1px solid var(--color-border);
                background: var(--color-bg-tertiary);
                color: var(--color-text-primary);
                font-family: var(--font-family);
                font-size: var(--font-size-xs);
                cursor: pointer;
            }

            .btn-danger {
                background: var(--color-error);
                border-color: var(--color-error);
                color: var(--color-on-accent);
            }

            .btn-danger:hover:not(:disabled) {
                background: var(--color-error-hover);
            }
        `,
    ];

    disconnectedCallback(): void {
        super.disconnectedCallback();
        if (this.rejectedTimer) {
            clearTimeout(this.rejectedTimer);
            this.rejectedTimer = null;
        }
    }

    /**
     * Mark an IP chip as rejected by backend validation. The chip renders with
     * the rejected styling and tooltip for ~3000ms then auto-clears.
     */
    markRejected(ip: string, reason: string): void {
        this.rejectedIp = ip;
        this.rejectedReason = reason;
        if (this.rejectedTimer) {
            clearTimeout(this.rejectedTimer);
        }
        this.rejectedTimer = setTimeout(() => {
            this.rejectedIp = null;
            this.rejectedReason = null;
            this.rejectedTimer = null;
        }, 3000);
    }

    private emit(next: string[]): void {
        this.dispatchEvent(
            new CustomEvent('ip-change', {
                detail: { ips: next },
                bubbles: true,
                composed: true,
            }),
        );
    }

    private requestRemove(ip: string): void {
        if (this.disabled) return;
        if (this.ips.length === 1) {
            this.confirmingRemoveLast = true;
            return;
        }
        this.emit(this.ips.filter((x) => x !== ip));
    }

    private confirmRemoveLast(): void {
        this.confirmingRemoveLast = false;
        this.emit([]);
    }

    private cancelRemoveLast(): void {
        this.confirmingRemoveLast = false;
    }

    private onAddInput(e: InputEvent): void {
        this.addValue = (e.target as HTMLInputElement).value;
    }

    private onAddKey(e: KeyboardEvent): void {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.commitAdd();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            this.addValue = '';
            (e.target as HTMLInputElement).value = '';
        }
    }

    private commitIfPending(): void {
        if (this.addValue.trim() !== '') {
            this.commitAdd();
        }
    }

    private commitAdd(): void {
        const trimmed = this.addValue.trim();
        if (!trimmed) return;
        const next = [...this.ips, trimmed];
        this.addValue = '';
        const input = this.renderRoot.querySelector<HTMLInputElement>('.add');
        if (input) input.value = '';
        this.emit(next);
    }

    private onConfirmKey(e: KeyboardEvent): void {
        if (e.key === 'Escape') {
            e.preventDefault();
            this.cancelRemoveLast();
        }
    }

    render() {
        return html`
            <div class="container">
                ${this.ips.map((ip) => {
                    const isRejected = this.rejectedIp === ip;
                    return html`
                        <span
                            class="chip ${isRejected ? 'rejected' : ''}"
                            data-ip=${ip}
                            title=${isRejected && this.rejectedReason ? this.rejectedReason : ''}
                        >
                            <span>${ip}</span>
                            <button
                                class="chip-x"
                                aria-label="Remove IP ${ip}"
                                ?disabled=${this.disabled}
                                @click=${() => this.requestRemove(ip)}
                            >×</button>
                        </span>
                    `;
                })}
                <input
                    class="add"
                    type="text"
                    placeholder="Add IP…"
                    aria-label="Add IP address"
                    ?disabled=${this.disabled}
                    .value=${this.addValue}
                    @input=${this.onAddInput}
                    @keydown=${this.onAddKey}
                    @blur=${this.commitIfPending}
                />
                ${this.confirmingRemoveLast
                    ? html`
                        <div
                            class="confirm-row"
                            role="dialog"
                            aria-label="Remove last IP?"
                            tabindex="-1"
                            @keydown=${this.onConfirmKey}
                        >
                            <div class="confirm-heading">Remove last IP?</div>
                            <div class="confirm-body">This member will have no assigned addresses.</div>
                            <div class="confirm-actions">
                                <button class="btn btn-danger" @click=${this.confirmRemoveLast}>Remove</button>
                                <button class="btn btn-secondary" @click=${this.cancelRemoveLast}>Cancel</button>
                            </div>
                        </div>
                    `
                    : nothing}
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'zt-ip-chip-editor': IpChipEditor;
    }
}
