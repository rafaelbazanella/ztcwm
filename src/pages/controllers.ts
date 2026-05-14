import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Database, Cpu, Globe } from 'lucide-static';
import { theme } from '../styles/theme.js';
import { sharedStyles } from '../styles/shared.js';
import { networkService, nodeService, logService, toastService } from '../services/index.js';
import type { ControllerStatus, NodeStatus, Peer } from '../types/index.js';
import '../components/badge.js';
import '../components/stat-card.js';
import '../components/loading.js';

@customElement('page-controllers')
export class PageControllers extends LitElement {
    @state() private controllerStatus: ControllerStatus | null = null;
    @state() private nodeStatus: NodeStatus | null = null;
    @state() private peers: Peer[] = [];
    @state() private loading = true;

    static styles = [
        theme,
        sharedStyles,
        css`
            :host {
                display: block;
                padding: var(--space-lg, 24px);
            }

            .info-grid {
                display: grid;
                grid-template-columns: 180px 1fr;
                gap: var(--space-xs, 0.5rem) var(--space-lg, 1.5rem);
                font-size: var(--font-size-sm);
            }

            .info-label {
                color: var(--color-text-muted);
                font-weight: 500;
            }

            .info-value {
                color: var(--color-text-primary);
            }
        `,
    ];

    connectedCallback(): void {
        super.connectedCallback();
        this.loadData();
    }

    private async loadData(): Promise<void> {
        this.loading = true;
        try {
            const [controller, node, peers] = await Promise.allSettled([
                networkService.getControllerStatus(),
                nodeService.getStatus(),
                nodeService.getPeers(),
            ]);
            this.controllerStatus = controller.status === 'fulfilled' ? controller.value : null;
            this.nodeStatus = node.status === 'fulfilled' ? node.value : null;
            this.peers = peers.status === 'fulfilled' ? peers.value : [];
            logService.info('Controllers page loaded');
        } catch (err) {
            toastService.error('Failed to load controller data');
            logService.error('Failed to load controller data', String(err));
        } finally {
            this.loading = false;
        }
    }

    render() {
        if (this.loading) {
            return html`
                <div style="margin-top: var(--space-lg, 1.5rem);">
                    <zt-loading variant="skeleton-cards" count="3"></zt-loading>
                </div>
            `;
        }

        return html`
            <div style="margin-top: var(--space-lg, 1.5rem);">
                <div class="page-header">
                    <div class="page-title">Controller Status</div>
                </div>

                <div class="grid grid-3" style="margin-bottom: var(--space-lg, 1.5rem);">
                    <zt-stat-card
                        label="Database"
                        value=${this.controllerStatus?.databaseReady ? 'Ready' : 'Offline'}
                        .svgIcon=${Database}
                    ></zt-stat-card>
                    <zt-stat-card
                        label="API Version"
                        value=${String(this.controllerStatus?.apiVersion ?? '—')}
                        .svgIcon=${Cpu}
                    ></zt-stat-card>
                    <zt-stat-card
                        label="Peers"
                        value=${String(this.peers.length)}
                        .svgIcon=${Globe}
                    ></zt-stat-card>
                </div>

                <div class="grid grid-2">
                    <div class="card">
                        <div class="card-header">
                            <span class="card-title">Node Information</span>
                        </div>
                        ${this.nodeStatus ? html`
                            <div class="info-grid">
                                <span class="info-label">Address</span>
                                <span class="info-value mono">${this.nodeStatus.address}</span>
                                <span class="info-label">Version</span>
                                <span class="info-value">${this.nodeStatus.version}</span>
                                <span class="info-label">Online</span>
                                <span class="info-value">
                                    <zt-badge variant=${this.nodeStatus.online ? 'success' : 'error'} .dot=${true}>
                                        ${this.nodeStatus.online ? 'Online' : 'Offline'}
                                    </zt-badge>
                                </span>
                                <span class="info-label">Primary Port</span>
                                <span class="info-value">${this.nodeStatus.config?.settings?.primaryPort ?? '—'}</span>
                                <span class="info-label">TCP Fallback</span>
                                <span class="info-value">${this.nodeStatus.tcpFallbackActive ? 'Active' : 'Inactive'}</span>
                                <span class="info-label">Port Mapping</span>
                                <span class="info-value">${this.nodeStatus.config?.settings?.portMappingEnabled ? 'Enabled' : 'Disabled'}</span>
                            </div>
                        ` : html`<div class="text-muted">Unable to reach node</div>`}
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <span class="card-title">Peers (${this.peers.length})</span>
                        </div>
                        ${this.peers.length === 0 ? html`
                            <div class="text-muted">No peers connected</div>
                        ` : html`
                            <div class="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Address</th>
                                            <th>Role</th>
                                            <th>Version</th>
                                            <th>Latency</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${this.peers.slice(0, 20).map(p => html`
                                            <tr>
                                                <td class="mono">${p.address}</td>
                                                <td>
                                                    <zt-badge variant=${p.role === 'ROOT' ? 'info' : p.role === 'UPSTREAM' ? 'warning' : 'neutral'}>
                                                        ${p.role}
                                                    </zt-badge>
                                                </td>
                                                <td>${p.version || '—'}</td>
                                                <td>${p.latency >= 0 ? p.latency + 'ms' : '—'}</td>
                                            </tr>
                                        `)}
                                    </tbody>
                                </table>
                            </div>
                            ${this.peers.length > 20 ? html`
                                <div class="text-muted" style="padding: var(--space-xs, 0.5rem) var(--space-sm, 0.75rem); font-size: var(--font-size-xs);">
                                    Showing 20 of ${this.peers.length} peers
                                </div>
                            ` : ''}
                        `}
                    </div>
                </div>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'page-controllers': PageControllers;
    }
}
