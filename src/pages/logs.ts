import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { FileText } from 'lucide-static';
import { theme } from '../styles/theme.js';
import { sharedStyles } from '../styles/shared.js';
import { logService } from '../services/index.js';
import type { LogEntry } from '../types/index.js';
import '../components/navbar.js';
import '../components/badge.js';
import '../components/empty-state.js';
import { formatTimestamp } from '../utils/helpers.js';

@customElement('page-logs')
export class PageLogs extends LitElement {
    @state() private entries: LogEntry[] = [];
    private unsubscribe?: () => void;

    static styles = [
        theme,
        sharedStyles,
        css`
            :host {
                display: block;
                padding: var(--space-lg, 24px);
            }

            .log-entry {
                display: grid;
                grid-template-columns: 150px 70px 1fr;
                gap: var(--space-sm, 0.75rem);
                padding: var(--space-xs, 0.5rem) var(--space-sm, 0.75rem);
                font-size: var(--font-size-sm);
                border-bottom: 1px solid var(--color-border);
                align-items: start;
            }

            .log-entry:hover {
                background: var(--color-bg-hover);
            }

            .log-time {
                color: var(--color-text-muted);
                font-family: var(--font-mono);
                font-size: var(--font-size-xs);
            }

            .log-message {
                color: var(--color-text-primary);
            }

            .log-details {
                color: var(--color-text-muted);
                font-size: var(--font-size-xs);
                margin-top: 0.2rem;
                font-family: var(--font-mono);
            }

            .log-list {
                max-height: 70vh;
                overflow-y: auto;
            }
        `,
    ];

    connectedCallback(): void {
        super.connectedCallback();
        this.entries = logService.getEntries();
        this.unsubscribe = logService.subscribe((entries) => {
            this.entries = entries;
        });
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        this.unsubscribe?.();
    }

    private levelVariant(level: LogEntry['level']): string {
        switch (level) {
            case 'error': return 'error';
            case 'warn': return 'warning';
            case 'info': return 'info';
            case 'debug': return 'neutral';
        }
    }

    render() {
        return html`
            <zt-navbar title="Logs" subtitle="Application event log"></zt-navbar>

            <div style="margin-top: var(--space-lg, 1.5rem);">
                <div class="page-header">
                    <div>
                        <div class="page-title">Logs</div>
                        <div class="page-subtitle">${this.entries.length} entries</div>
                    </div>
                    <button class="btn btn-secondary" @click=${() => logService.clear()}>Clear Logs</button>
                </div>

                ${this.entries.length === 0 ? html`
                    <zt-empty-state
                        .svgIcon=${FileText}
                        heading="No log entries"
                        message="Activity logs will appear here as actions are performed."
                    ></zt-empty-state>
                ` : html`
                    <div class="card">
                        <div class="log-list">
                            ${this.entries.map(e => html`
                                <div class="log-entry">
                                    <span class="log-time">${formatTimestamp(e.timestamp)}</span>
                                    <zt-badge variant=${this.levelVariant(e.level)}>${e.level}</zt-badge>
                                    <div>
                                        <div class="log-message">${e.message}</div>
                                        ${e.details ? html`<div class="log-details">${e.details}</div>` : ''}
                                    </div>
                                </div>
                            `)}
                        </div>
                    </div>
                `}
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'page-logs': PageLogs;
    }
}
