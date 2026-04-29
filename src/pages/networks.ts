import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Network as NetworkIcon } from 'lucide-static';
import { theme } from '../styles/theme.js';
import { sharedStyles } from '../styles/shared.js';
import { networkService, logService, toastService, userService } from '../services/index.js';
import type { NetworkListItem, NetworkCreate } from '../types/index.js';
import type { DataTableColumn } from '../components/data-table.js';
import '../components/navbar.js';
import '../components/badge.js';
import '../components/modal.js';
import '../components/empty-state.js';
import '../components/loading.js';
import '../components/data-table.js';

@customElement('page-networks')
export class PageNetworks extends LitElement {
    @state() private networks: NetworkListItem[] = [];
    @state() private loading = true;
    @state() private showCreate = false;
    @state() private newName = '';
    @state() private newPrivate = true;
    @state() private newCidr = '';
    @state() private newPoolStart = '';
    @state() private newPoolEnd = '';
    @state() private creating = false;
    @state() private canCreate = true;

    private networkColumns: DataTableColumn[] = [
        { key: 'id', label: 'Network ID', sortable: true, copyable: true, mono: true, width: '160px' },
        { key: 'name', label: 'Name', sortable: true },
        {
            key: 'totalMemberCount', label: 'Members', sortable: true, width: '80px',
            render: (_val: unknown, row: Record<string, unknown>) => String((row as unknown as NetworkListItem).meta.totalMemberCount),
        },
        {
            key: 'authorizedMemberCount', label: 'Authorized', sortable: true, width: '100px',
            render: (_val: unknown, row: Record<string, unknown>) =>
                html`<zt-badge variant="success">${(row as unknown as NetworkListItem).meta.authorizedMemberCount}</zt-badge>`,
        },
        {
            key: '_action', label: '', width: '110px',
            render: (_val: unknown, row: Record<string, unknown>) =>
                html`<button class="btn btn-secondary btn-sm" @click=${() => this.navigateToNetwork((row as unknown as NetworkListItem).id)}>Details</button>`,
        },
    ];

    static styles = [
        theme,
        sharedStyles,
        css`
            :host {
                display: block;
                padding: var(--space-lg, 24px);
            }

            .checkbox-row {
                display: flex;
                align-items: center;
                gap: var(--space-sm, 8px);
            }

            .checkbox-row input[type="checkbox"] {
                accent-color: var(--color-accent);
            }
        `,
    ];

    connectedCallback(): void {
        super.connectedCallback();
        this.loadNetworks();
        userService.getCurrentUser().then(() => {
            this.canCreate = userService.canCreateNetwork();
        });
    }

    private async loadNetworks(): Promise<void> {
        this.loading = true;
        try {
            const result = await networkService.listNetworks();
            this.networks = result.data;
            logService.info(`Loaded ${this.networks.length} networks`);
        } catch (err) {
            toastService.error('Failed to load networks');
            logService.error('Failed to load networks', String(err));
        } finally {
            this.loading = false;
        }
    }

    private async createNetwork(): Promise<void> {
        this.creating = true;
        try {
            const config: NetworkCreate = {
                name: this.newName || 'New Network',
                private: this.newPrivate,
            };

            // Add route from CIDR
            if (this.newCidr.trim()) {
                config.routes = [{ target: this.newCidr.trim(), via: null, flags: 0, metric: 0 }];
                config.v4AssignMode = { zt: true };
            }

            // Add IP assignment pool
            if (this.newPoolStart.trim() && this.newPoolEnd.trim()) {
                config.ipAssignmentPools = [{
                    ipRangeStart: this.newPoolStart.trim(),
                    ipRangeEnd: this.newPoolEnd.trim(),
                }];
            }

            await networkService.createNetwork(config);
            toastService.success(`Created network: ${config.name}`);
            logService.info(`Created network: ${config.name}`);
            this.showCreate = false;
            this.newName = '';
            this.newCidr = '';
            this.newPoolStart = '';
            this.newPoolEnd = '';
            await this.loadNetworks();
        } catch (err) {
            toastService.error('Failed to create network');
            logService.error('Failed to create network', String(err));
        } finally {
            this.creating = false;
        }
    }

    private navigateToNetwork(id: string): void {
        window.history.pushState({}, '', `/networks/${id}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
    }

    render() {
        return html`
            <zt-navbar title="Networks" subtitle="Manage your ZeroTier networks"></zt-navbar>

            <div style="margin-top: var(--space-lg, 1.5rem);">
                <div class="page-header">
                    <div>
                        <div class="page-title">Networks</div>
                        <div class="page-subtitle">${this.networks.length} network${this.networks.length !== 1 ? 's' : ''}</div>
                    </div>
                    <button class="btn btn-primary"
                        ?disabled=${!this.canCreate}
                        title=${this.canCreate ? '' : 'Operator or Admin role required to create networks'}
                        @click=${() => { if (this.canCreate) this.showCreate = true; }}
                    >
                        + Create Network
                    </button>
                </div>

                ${this.loading ? html`<zt-loading variant="skeleton-rows" count="5"></zt-loading>` : ''}

                ${!this.loading && this.networks.length === 0 ? html`
                    <zt-empty-state
                        .svgIcon=${NetworkIcon}
                        heading="No networks yet"
                        message="Create your first ZeroTier network to get started."
                    >
                        <button class="btn btn-primary"
                            ?disabled=${!this.canCreate}
                            title=${this.canCreate ? '' : 'Operator or Admin role required to create networks'}
                            @click=${() => { if (this.canCreate) this.showCreate = true; }}
                        >
                            + Create Network
                        </button>
                    </zt-empty-state>
                ` : ''}

                ${!this.loading && this.networks.length > 0 ? html`
                    <div class="card">
                        <zt-data-table
                            .columns=${this.networkColumns}
                            .rows=${this.networks as unknown as Record<string, unknown>[]}
                            emptyMessage="No networks found"
                        ></zt-data-table>
                    </div>
                ` : ''}
            </div>

            <zt-modal
                .open=${this.showCreate}
                heading="Create Network"
                @close=${() => { this.showCreate = false; }}
            >
                <div class="form-group">
                    <label class="label">Network Name</label>
                    <input
                        class="input"
                        type="text"
                        placeholder="My Network"
                        .value=${this.newName}
                        @input=${(e: InputEvent) => { this.newName = (e.target as HTMLInputElement).value; }}
                    />
                </div>
                <div class="form-group">
                    <label class="checkbox-row">
                        <input
                            type="checkbox"
                            .checked=${this.newPrivate}
                            @change=${(e: Event) => { this.newPrivate = (e.target as HTMLInputElement).checked; }}
                        />
                        <span class="label" style="margin-bottom:0">Private Network</span>
                    </label>
                </div>
                <div class="form-group">
                    <label class="label">Network Address (CIDR)</label>
                    <input
                        class="input"
                        type="text"
                        placeholder="10.147.20.0/24"
                        .value=${this.newCidr}
                        @input=${(e: InputEvent) => { this.newCidr = (e.target as HTMLInputElement).value; }}
                    />
                    <small style="color: var(--color-text-muted); font-size: var(--font-size-xs);">Route target for this network</small>
                </div>
                <div class="form-group">
                    <label class="label">IP Assignment Pool Start</label>
                    <input
                        class="input"
                        type="text"
                        placeholder="10.147.20.1"
                        .value=${this.newPoolStart}
                        @input=${(e: InputEvent) => { this.newPoolStart = (e.target as HTMLInputElement).value; }}
                    />
                </div>
                <div class="form-group">
                    <label class="label">IP Assignment Pool End</label>
                    <input
                        class="input"
                        type="text"
                        placeholder="10.147.20.254"
                        .value=${this.newPoolEnd}
                        @input=${(e: InputEvent) => { this.newPoolEnd = (e.target as HTMLInputElement).value; }}
                    />
                </div>
                <div slot="footer">
                    <button class="btn btn-secondary" @click=${() => { this.showCreate = false; }}>Cancel</button>
                    <button class="btn btn-primary" ?disabled=${this.creating} @click=${this.createNetwork}>
                        ${this.creating ? 'Creating…' : 'Create'}
                    </button>
                </div>
            </zt-modal>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'page-networks': PageNetworks;
    }
}
