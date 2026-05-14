import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { theme } from '../styles/theme.js';
import { sharedStyles } from '../styles/shared.js';
import { logService, toastService } from '../services/index.js';
import '../components/badge.js';
import '../components/modal.js';

@customElement('page-api-explorer')
export class PageApiExplorer extends LitElement {
    @state() private method = 'GET';
    @state() private path = '/controller';
    @state() private body = '';
    @state() private response = '';
    @state() private responseStatus = 0;
    @state() private loading = false;
    @state() private confirmOpen = false;

    static styles = [
        theme,
        sharedStyles,
        css`
            :host {
                display: block;
                padding: var(--space-lg, 24px);
            }

            .request-bar {
                display: flex;
                gap: var(--space-sm, 0.5rem);
                margin-bottom: var(--space-md, 1rem);
            }

            .request-bar select {
                padding: 0.5rem;
                border-radius: var(--radius-md);
                border: 1px solid var(--color-border);
                background: var(--color-bg-primary);
                color: var(--color-accent);
                font-family: var(--font-mono);
                font-size: var(--font-size-sm);
                font-weight: 600;
                outline: none;
            }

            .request-bar select:focus {
                border-color: var(--color-accent);
            }

            .request-bar .path-input {
                flex: 1;
            }

            .body-area {
                width: 100%;
                min-height: 100px;
                padding: 0.75rem;
                border-radius: var(--radius-md);
                border: 1px solid var(--color-border);
                background: var(--color-bg-primary);
                color: var(--color-text-primary);
                font-family: var(--font-mono);
                font-size: var(--font-size-sm);
                outline: none;
                resize: vertical;
            }

            .body-area:focus {
                border-color: var(--color-accent);
            }

            .response-area {
                background: var(--color-bg-primary);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-md);
                padding: 1rem;
                font-family: var(--font-mono);
                font-size: var(--font-size-xs);
                color: var(--color-text-primary);
                white-space: pre-wrap;
                word-break: break-word;
                max-height: 50vh;
                overflow-y: auto;
                line-height: 1.5;
            }

            .response-header {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                margin-bottom: 0.75rem;
            }

            .endpoints-list {
                display: grid;
                gap: 0.3rem;
            }

            .endpoint-item {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.4rem 0.6rem;
                border-radius: var(--radius-sm);
                cursor: pointer;
                font-size: var(--font-size-sm);
                transition: background var(--transition-fast);
            }

            .endpoint-item:hover {
                background: var(--color-bg-hover);
            }

            .endpoint-method {
                font-family: var(--font-mono);
                font-size: var(--font-size-xs);
                font-weight: 700;
                min-width: 50px;
            }

            .endpoint-method.get { color: var(--color-success); }
            .endpoint-method.post { color: var(--color-warning); }
            .endpoint-method.delete { color: var(--color-error); }

            .endpoint-path {
                font-family: var(--font-mono);
                color: var(--color-text-secondary);
            }
        `,
    ];

    private endpoints = [
        { method: 'GET', path: '/controller', desc: 'Controller status' },
        { method: 'GET', path: '/controller/network', desc: 'List networks' },
        { method: 'POST', path: '/controller/network', desc: 'Create network' },
        { method: 'GET', path: '/controller/network/{networkId}', desc: 'Get network' },
        { method: 'POST', path: '/controller/network/{networkId}', desc: 'Update network' },
        { method: 'DELETE', path: '/controller/network/{networkId}', desc: 'Delete network' },
        { method: 'GET', path: '/controller/network/{networkId}/member', desc: 'List members' },
        { method: 'GET', path: '/controller/network/{networkId}/member/{memberId}', desc: 'Get member' },
        { method: 'POST', path: '/controller/network/{networkId}/member/{memberId}', desc: 'Update member' },
        { method: 'GET', path: '/status', desc: 'Node status' },
        { method: 'GET', path: '/peer', desc: 'List peers' },
    ];

    private selectEndpoint(ep: { method: string; path: string }): void {
        this.method = ep.method;
        this.path = ep.path;
        this.body = '';
    }

    private handleSend(): void {
        if (this.method !== 'GET') {
            this.confirmOpen = true;
            return;
        }
        this.executeRequest();
    }

    private confirmAndSend(): void {
        this.confirmOpen = false;
        this.executeRequest();
    }

    private cancelConfirm(): void {
        this.confirmOpen = false;
    }

    private async executeRequest(): Promise<void> {
        this.loading = true;
        this.response = '';
        this.responseStatus = 0;

        const url = `/api/zt${this.path}`;
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        try {
            if (this.method !== 'GET') {
                try {
                    const csrfRes = await fetch('/api/csrf-token', { credentials: 'include' });
                    if (csrfRes.ok) {
                        const data = await csrfRes.json() as { token: string };
                        headers['X-CSRF-Token'] = data.token;
                    }
                } catch {
                    // Continue without CSRF — server will reject if needed
                }
            }

            const init: RequestInit = {
                method: this.method,
                headers,
                credentials: 'include',
            };
            if (this.method !== 'GET' && this.body.trim()) {
                init.body = this.body;
            }

            const res = await fetch(url, init);
            this.responseStatus = res.status;
            const text = await res.text();
            try {
                this.response = JSON.stringify(JSON.parse(text), null, 2);
            } catch {
                this.response = text;
            }
            logService.info(`API ${this.method} ${this.path} → ${res.status}`);
        } catch (err) {
            this.response = String(err);
            this.responseStatus = 0;
            toastService.error('Request failed');
            logService.error(`API request failed: ${this.method} ${this.path}`, String(err));
        } finally {
            this.loading = false;
        }
    }

    private statusVariant(): string {
        if (this.responseStatus >= 200 && this.responseStatus < 300) return 'success';
        if (this.responseStatus >= 400) return 'error';
        if (this.responseStatus >= 300) return 'warning';
        return 'neutral';
    }

    render() {
        return html`
            <div style="margin-top: var(--space-lg, 1.5rem);">
                <div class="grid grid-2">
                    <div>
                        <div class="card" style="margin-bottom: var(--space-md, 1rem);">
                            <div class="card-header">
                                <span class="card-title">Request</span>
                            </div>
                            <div class="request-bar">
                                <select .value=${this.method} @change=${(e: Event) => { this.method = (e.target as HTMLSelectElement).value; }}>
                                    <option value="GET">GET</option>
                                    <option value="POST">POST</option>
                                    <option value="DELETE">DELETE</option>
                                </select>
                                <input
                                    class="input path-input"
                                    type="text"
                                    .value=${this.path}
                                    @input=${(e: InputEvent) => { this.path = (e.target as HTMLInputElement).value; }}
                                    @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter') this.handleSend(); }}
                                />
                                <button class="btn btn-primary" ?disabled=${this.loading} @click=${this.handleSend}>
                                    ${this.loading ? 'Sending…' : 'Send'}
                                </button>
                            </div>
                            ${this.method !== 'GET' ? html`
                                <div class="form-group">
                                    <label class="label">Request Body (JSON)</label>
                                    <textarea
                                        class="body-area"
                                        placeholder='{"name": "my-network"}'
                                        .value=${this.body}
                                        @input=${(e: InputEvent) => { this.body = (e.target as HTMLTextAreaElement).value; }}
                                    ></textarea>
                                </div>
                            ` : ''}
                        </div>

                        ${this.response || this.responseStatus ? html`
                            <div class="card">
                                <div class="response-header">
                                    <span class="card-title">Response</span>
                                    ${this.responseStatus ? html`
                                        <zt-badge variant=${this.statusVariant()}>${this.responseStatus}</zt-badge>
                                    ` : ''}
                                </div>
                                <div class="response-area">${this.response || 'No response body'}</div>
                            </div>
                        ` : ''}
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <span class="card-title">Endpoints</span>
                        </div>
                        <div class="endpoints-list">
                            ${this.endpoints.map(ep => html`
                                <div class="endpoint-item" @click=${() => this.selectEndpoint(ep)}>
                                    <span class="endpoint-method ${ep.method.toLowerCase()}">${ep.method}</span>
                                    <span class="endpoint-path">${ep.path}</span>
                                </div>
                            `)}
                        </div>
                    </div>
                </div>
            </div>

            <zt-modal
                .open=${this.confirmOpen}
                heading="Confirm ${this.method} Request"
                @close=${this.cancelConfirm}
            >
                <p>You are about to send a <strong>${this.method}</strong> request to:</p>
                <p><code>${this.path}</code></p>
                ${this.body.trim() ? html`<p>With request body.</p>` : ''}
                <p>This operation may modify or delete data. Continue?</p>
                <div slot="footer">
                    <button class="btn btn-secondary" @click=${this.cancelConfirm}>Cancel</button>
                    <button class="btn btn-primary" @click=${this.confirmAndSend}>
                        Confirm ${this.method}
                    </button>
                </div>
            </zt-modal>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'page-api-explorer': PageApiExplorer;
    }
}
