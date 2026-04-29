import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { ShieldCheck, ChevronDown, ChevronRight } from 'lucide-static';
import { theme } from '../styles/theme.js';
import { sharedStyles } from '../styles/shared.js';
import { networkService, memberService, logService, toastService } from '../services/index.js';
import type { NetworkListItem, Member } from '../types/index.js';
import '../components/navbar.js';
import '../components/badge.js';
import '../components/empty-state.js';
import '../components/loading.js';

interface PendingGroup {
    network: NetworkListItem;
    members: Member[];
}

@customElement('page-pending')
export class PagePending extends LitElement {
    @state() private groups: PendingGroup[] = [];
    @state() private loading = true;
    @state() private collapsedNetworks: Set<string> = new Set();

    static styles = [
        theme,
        sharedStyles,
        css`
            :host {
                display: block;
                padding: var(--space-lg, 24px);
            }

            .network-group {
                margin-bottom: var(--space-md, 16px);
            }

            .network-header {
                display: flex;
                align-items: center;
                gap: var(--space-sm, 8px);
                padding: var(--space-sm, 8px) var(--space-md, 16px);
                background: var(--color-bg-secondary);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-lg) var(--radius-lg) 0 0;
                cursor: pointer;
                user-select: none;
                transition: background var(--transition-fast);
            }

            .network-header:hover {
                background: var(--color-bg-hover);
            }

            .network-header.collapsed {
                border-radius: var(--radius-lg);
            }

            .network-header .icon {
                width: 16px;
                height: 16px;
                display: inline-flex;
                color: var(--color-text-muted);
            }

            .network-header .icon svg {
                width: 100%;
                height: 100%;
            }

            .network-name {
                font-size: var(--font-size-base);
                font-weight: 600;
                color: var(--color-text-primary);
                flex: 1;
            }

            .member-row {
                display: flex;
                align-items: center;
                gap: var(--space-md, 16px);
                padding: var(--space-sm, 8px) var(--space-md, 16px);
                border: 1px solid var(--color-border);
                border-top: none;
                background: var(--color-bg-primary);
            }

            .member-row:last-child {
                border-radius: 0 0 var(--radius-lg) var(--radius-lg);
            }

            .member-name {
                font-size: var(--font-size-sm);
                color: var(--color-text-primary);
                width: 140px;
            }

            .member-id {
                font-family: var(--font-mono);
                font-size: var(--font-size-sm);
                color: var(--color-text-secondary);
                width: 120px;
            }

            .member-ips {
                font-family: var(--font-mono);
                font-size: var(--font-size-sm);
                color: var(--color-text-secondary);
                flex: 1;
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
            const networks = (await networkService.listNetworks()).data;
            const groups: PendingGroup[] = [];
            for (const net of networks) {
                const nwid = net.id ?? '';
                if (!nwid) continue;
                try {
                    const result = await memberService.listMembers(nwid);
                    const pending = result.data.filter(m => !m.authorized);
                    if (pending.length > 0) {
                        groups.push({ network: net, members: pending });
                    }
                } catch {
                    // Skip networks we can't fetch members for
                }
            }
            this.groups = groups;
            logService.info(`Loaded ${groups.reduce((sum, g) => sum + g.members.length, 0)} pending members across ${groups.length} networks`);
        } catch (err) {
            toastService.error('Failed to load pending members');
            logService.error('Failed to load pending members', String(err));
            this.groups = [];
        } finally {
            this.loading = false;
        }
    }

    private async handleAuthorize(networkId: string, memberId: string): Promise<void> {
        try {
            await memberService.updateMember(networkId, memberId, { authorized: true });
            toastService.success(`Member ${memberId.substring(0, 10)} authorized`);
            await this.loadData();
        } catch (err) {
            toastService.error('Failed to authorize member');
            logService.error('Failed to authorize member', String(err));
        }
    }

    private toggleNetwork(nwid: string): void {
        const next = new Set(this.collapsedNetworks);
        if (next.has(nwid)) {
            next.delete(nwid);
        } else {
            next.add(nwid);
        }
        this.collapsedNetworks = next;
    }

    private renderGroup(g: PendingGroup): TemplateResult {
        const nwid = g.network.id ?? '';
        const collapsed = this.collapsedNetworks.has(nwid);
        return html`
            <div class="network-group">
                <div class="network-header ${collapsed ? 'collapsed' : ''}" @click=${() => this.toggleNetwork(nwid)}>
                    <span class="icon">${unsafeSVG(collapsed ? ChevronRight : ChevronDown)}</span>
                    <span class="network-name">${g.network.name || nwid}</span>
                    <zt-badge>${g.members.length}</zt-badge>
                </div>
                ${collapsed ? nothing : g.members.map(m => html`
                    <div class="member-row">
                        <span class="member-name">${m.name || '—'}</span>
                        <span class="member-id">${m.nodeId || m.id || '—'}</span>
                        <span class="member-ips">${m.ipAssignments?.join(', ') || '—'}</span>
                        <button class="btn btn-primary btn-sm" @click=${() => this.handleAuthorize(nwid, m.nodeId || m.id || '')}>
                            Authorize
                        </button>
                    </div>
                `)}
            </div>
        `;
    }

    private get totalPending(): number {
        return this.groups.reduce((sum, g) => sum + g.members.length, 0);
    }

    render() {
        return html`
            <zt-navbar title="Pending Authorization" subtitle="Unauthorized members across all networks"></zt-navbar>

            <div style="margin-top: var(--space-lg, 1.5rem);">
                <div class="page-header">
                    <div>
                        <div class="page-title">Pending Authorization</div>
                        <div class="page-subtitle">${this.totalPending} pending member${this.totalPending !== 1 ? 's' : ''}</div>
                    </div>
                </div>

                ${this.loading ? html`<zt-loading variant="skeleton-rows" count="5"></zt-loading>` : ''}

                ${!this.loading && this.groups.length === 0 ? html`
                    <zt-empty-state
                        .svgIcon=${ShieldCheck}
                        heading="All clear"
                        message="No pending authorization requests across your networks."
                    ></zt-empty-state>
                ` : ''}

                ${!this.loading && this.groups.length > 0 ? this.groups.map(g => this.renderGroup(g)) : ''}
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'page-pending': PagePending;
    }
}
