import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { Network as NetworkIcon, Users, ShieldCheck, UserCheck, Plus, Terminal } from 'lucide-static';
import { theme } from '../styles/theme.js';
import { sharedStyles } from '../styles/shared.js';
import { networkService, nodeService, logService } from '../services/index.js';
import type { ControllerStatus, NodeStatus, NetworkListResponse } from '../types/index.js';
import '../components/stat-card.js';
import '../components/navbar.js';
import '../components/badge.js';
import '../components/loading.js';

@customElement('page-dashboard')
export class PageDashboard extends LitElement {
    @state() private controllerStatus: ControllerStatus | null = null;
    @state() private nodeStatus: NodeStatus | null = null;
    @state() private networks: NetworkListResponse | null = null;
    @state() private loading = true;
    @state() private error = '';
    @state() private totalMembers = 0;
    @state() private authorizedMembers = 0;
    @state() private pendingMembers = 0;

    static styles = [
        theme,
        sharedStyles,
        css`
            :host {
                display: block;
                padding: var(--space-lg, 24px);
            }

            .stats-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: var(--space-md, 16px);
                margin-bottom: var(--space-xl, 32px);
            }

            @media (max-width: 1024px) {
                .stats-grid { grid-template-columns: repeat(2, 1fr); }
            }

            .panels-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: var(--space-md, 16px);
                margin-bottom: var(--space-xl, 32px);
            }

            @media (max-width: 1024px) {
                .panels-grid { grid-template-columns: 1fr; }
            }

            .activity-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }

            .activity-item {
                display: flex;
                align-items: flex-start;
                gap: 0.75rem;
                padding: 0.75rem 0;
                border-bottom: 1px solid var(--color-border);
            }

            .activity-item:last-child {
                border-bottom: none;
            }

            .activity-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                margin-top: 0.35rem;
                flex-shrink: 0;
            }

            .activity-dot.info { background: var(--color-info); }
            .activity-dot.success { background: var(--color-success); }

            .activity-text {
                font-size: var(--font-size-sm);
                color: var(--color-text-primary);
            }

            .activity-time {
                font-size: var(--font-size-xs);
                color: var(--color-text-muted);
                margin-top: 0.15rem;
            }

            .info-grid {
                display: grid;
                grid-template-columns: auto 1fr;
                gap: 0.5rem 1.5rem;
                font-size: var(--font-size-sm);
            }

            .info-label {
                color: var(--color-text-muted);
                font-weight: 500;
            }

            .info-value {
                color: var(--color-text-primary);
                font-family: var(--font-mono);
            }

            .quick-actions {
                display: flex;
                flex-wrap: wrap;
                gap: var(--space-sm, 8px);
            }

            .quick-action-btn {
                display: inline-flex;
                align-items: center;
                gap: var(--space-sm, 8px);
                padding: var(--space-sm, 8px) var(--space-md, 16px);
                border-radius: var(--radius-md);
                border: 1px solid var(--color-border);
                background: var(--color-bg-tertiary);
                color: var(--color-text-secondary);
                font-family: var(--font-family);
                font-size: var(--font-size-sm);
                cursor: pointer;
                transition: all var(--transition-fast);
            }

            .quick-action-btn:hover {
                background: var(--color-bg-hover);
                color: var(--color-text-primary);
                border-color: var(--color-border-light);
            }

            .quick-action-btn .icon {
                width: 16px;
                height: 16px;
                display: inline-flex;
            }

            .quick-action-btn .icon svg {
                width: 100%;
                height: 100%;
            }
        `,
    ];

    connectedCallback(): void {
        super.connectedCallback();
        this.loadData();
    }

    private async loadData(): Promise<void> {
        this.loading = true;
        this.error = '';
        try {
            const [controller, node, networks] = await Promise.allSettled([
                networkService.getControllerStatus(),
                nodeService.getStatus(),
                networkService.listNetworks(),
            ]);

            this.controllerStatus = controller.status === 'fulfilled' ? controller.value : null;
            this.nodeStatus = node.status === 'fulfilled' ? node.value : null;
            this.networks = networks.status === 'fulfilled' ? networks.value : null;

            // Compute member counts from network metadata
            if (this.networks && this.networks.data.length > 0) {
                this.totalMembers = this.networks.data.reduce((sum, n) => sum + n.meta.totalMemberCount, 0);
                this.authorizedMembers = this.networks.data.reduce((sum, n) => sum + n.meta.authorizedMemberCount, 0);
                this.pendingMembers = this.totalMembers - this.authorizedMembers;
            }

            logService.info('Dashboard loaded successfully');
        } catch (err) {
            this.error = err instanceof Error ? err.message : 'Failed to load dashboard';
            logService.error('Dashboard load failed', this.error);
        } finally {
            this.loading = false;
        }
    }

    private navigate(path: string): void {
        window.history.pushState({}, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
    }

    private renderControllerInfo() {
        if (!this.nodeStatus) {
            return html`<div class="text-muted">Unable to fetch node status</div>`;
        }
        return html`
            <div class="info-grid">
                <span class="info-label">Address</span>
                <span class="info-value">${this.nodeStatus.address}</span>
                <span class="info-label">Version</span>
                <span class="info-value">${this.nodeStatus.version}</span>
                <span class="info-label">Online</span>
                <span class="info-value">${this.nodeStatus.online ? 'Yes' : 'No'}</span>
                <span class="info-label">TCP Fallback</span>
                <span class="info-value">${this.nodeStatus.tcpFallbackActive ? 'Active' : 'Inactive'}</span>
                <span class="info-label">Primary Port</span>
                <span class="info-value">${this.nodeStatus.config?.settings?.primaryPort ?? '—'}</span>
                ${this.controllerStatus ? html`
                    <span class="info-label">API Version</span>
                    <span class="info-value">${this.controllerStatus.apiVersion}</span>
                    <span class="info-label">Database</span>
                    <span class="info-value">${this.controllerStatus.databaseReady ? 'Ready' : 'Not Ready'}</span>
                ` : ''}
            </div>
        `;
    }

    private renderActivityList() {
        if (!this.networks || this.networks.data.length === 0) {
            return html`<div class="text-muted">No networks found</div>`;
        }
        return html`
            <ul class="activity-list">
                ${this.networks.data.slice(0, 5).map(n => html`
                    <li class="activity-item">
                        <div class="activity-dot info"></div>
                        <div>
                            <div class="activity-text">${n.name || n.id}</div>
                            <div class="activity-time mono">${n.id} · ${n.meta.totalMemberCount} members</div>
                        </div>
                    </li>
                `)}
            </ul>
        `;
    }

    render() {
        if (this.loading) {
            return html`
                <zt-navbar title="Dashboard" subtitle="Overview"></zt-navbar>
                <div style="margin-top: var(--space-lg, 1.5rem);">
                    <zt-loading variant="skeleton-cards" count="4"></zt-loading>
                </div>
            `;
        }

        return html`
            <zt-navbar title="Dashboard" subtitle="Overview"></zt-navbar>

            <div style="margin-top: var(--space-lg, 1.5rem);">
                <!-- Stats Row -->
                <div class="stats-grid">
                    <zt-stat-card
                        label="Networks"
                        value="${this.networks?.data.length ?? 0}"
                        .svgIcon=${NetworkIcon}
                    ></zt-stat-card>
                    <zt-stat-card
                        label="Total Members"
                        value="${this.totalMembers}"
                        .svgIcon=${Users}
                    ></zt-stat-card>
                    <zt-stat-card
                        label="Authorized"
                        value="${this.authorizedMembers}"
                        .svgIcon=${ShieldCheck}
                    ></zt-stat-card>
                    <zt-stat-card
                        label="Pending"
                        value="${this.pendingMembers}"
                        .svgIcon=${UserCheck}
                    ></zt-stat-card>
                </div>

                <!-- Info Panels -->
                <div class="panels-grid">
                    <div class="card">
                        <div class="card-header">
                            <span class="card-title">Recent Networks</span>
                        </div>
                        ${this.renderActivityList()}
                    </div>
                    <div class="card">
                        <div class="card-header">
                            <span class="card-title">Controller Info</span>
                        </div>
                        ${this.renderControllerInfo()}
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Quick Actions</span>
                    </div>
                    <div class="quick-actions">
                        <button class="quick-action-btn" @click=${() => this.navigate('/networks')}>
                            <span class="icon">${unsafeSVG(Plus)}</span> Create Network
                        </button>
                        <button class="quick-action-btn" @click=${() => this.navigate('/members')}>
                            <span class="icon">${unsafeSVG(Users)}</span> View All Members
                        </button>
                        <button class="quick-action-btn" @click=${() => this.navigate('/pending')}>
                            <span class="icon">${unsafeSVG(UserCheck)}</span> Pending Authorization
                        </button>
                        <button class="quick-action-btn" @click=${() => this.navigate('/api')}>
                            <span class="icon">${unsafeSVG(Terminal)}</span> API Explorer
                        </button>
                    </div>
                </div>

                ${this.error ? html`
                    <div class="card" style="margin-top: 1rem; border-color: var(--color-error);">
                        <div class="text-muted">${this.error}</div>
                    </div>
                ` : ''}
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'page-dashboard': PageDashboard;
    }
}
