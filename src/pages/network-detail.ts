import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { RouterLocation } from '@vaadin/router';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { Copy, Pencil, ShieldCheck, ShieldOff } from 'lucide-static';
import { theme } from '../styles/theme.js';
import { sharedStyles } from '../styles/shared.js';
import { networkService, memberService, logService, toastService, nodeService, userService } from '../services/index.js';
import { filterMembers, isIPv4 } from '../utils/helpers.js';
import type { Network, Member, MemberWithPeer, NetworkUpdate, MemberUpdate } from '../types/index.js';
import type { DataTableColumn } from '../components/data-table.js';
import '../components/badge.js';
import '../components/modal.js';
import '../components/loading.js';
import '../components/data-table.js';
import '../components/ip-chip-editor.js';

/**
 * Map a backend member-update error to user-facing toast copy (D-07).
 * Pure module-level function so it can be unit-tested without instantiating the page.
 */
export function mapReasonToCopy(err: unknown): string {
    const e = err as { body?: { error?: string; reason?: string } } | undefined;
    const reason = e?.body?.reason;
    if (reason === 'malformed') return 'Not a valid IP address';
    if (reason === 'out-of-route') return 'IP is outside this network\'s managed routes';
    if (reason === 'collision') return 'IP already assigned to another member';
    return e?.body?.error ?? 'Update failed';
}

/**
 * Diff two IP arrays and return the single element that was added or removed.
 * Returns null when no single-element delta is found (e.g., bulk replacement).
 */
export function diffSingleIp(prev: string[], next: string[]): string | null {
    if (next.length === prev.length + 1) {
        const prevSet = new Set(prev);
        for (const ip of next) if (!prevSet.has(ip)) return ip;
    }
    if (next.length === prev.length - 1) {
        const nextSet = new Set(next);
        for (const ip of prev) if (!nextSet.has(ip)) return ip;
    }
    return null;
}

@customElement('page-network-detail')
export class PageNetworkDetail extends LitElement {
    @state() networkId = '';
    @state() private network: Network | null = null;
    @state() private members: MemberWithPeer[] = [];
    @state() private loading = true;
    @state() private showDelete = false;
    @state() private editName = '';
    @state() private editingName = false;
    @state() private showEditNetwork = false;
    @state() private editPrivate = true;
    @state() private editBroadcast = true;
    @state() private editV4Auto = false;
    @state() private editCidr = '';
    @state() private editPoolStart = '';
    @state() private editPoolEnd = '';
    @state() private savingNetwork = false;
    @state() private selectedMembers: Member[] = [];
    @state() private showBatchConfirm = false;
    @state() private batchAction: 'authorize' | 'deauthorize' = 'authorize';
    @state() private memberFilter: 'all' | 'authorized' | 'pending' = 'all';
    @state() private searchQuery = '';
    @state() private canEdit = true;
    @state() private canDelete = true;
    @state() private editingIpsMember: Member | null = null;

    private get filteredMembers(): Member[] {
        return filterMembers(this.members, this.memberFilter, this.searchQuery);
    }

    onBeforeEnter(location: RouterLocation): void {
        this.networkId = location.params['id'] as string ?? '';
    }

    static styles = [
        theme,
        sharedStyles,
        css`
            :host {
                display: block;
                padding: var(--space-lg, 24px);
            }

            .detail-cards {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: var(--space-md, 16px);
                margin-bottom: var(--space-xl, 32px);
            }

            @media (max-width: 1024px) {
                .detail-cards { grid-template-columns: 1fr; }
            }

            .detail-card {
                background: var(--color-bg-secondary);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-lg);
                padding: var(--space-lg, 24px);
                box-shadow: var(--shadow-md);
            }

            .detail-card-title {
                font-size: var(--font-size-sm);
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                color: var(--color-text-muted);
                margin-bottom: var(--space-md, 16px);
            }

            .detail-field {
                margin-bottom: var(--space-sm, 8px);
            }

            .detail-label {
                font-size: var(--font-size-xs);
                color: var(--color-text-muted);
                margin-bottom: 2px;
            }

            .detail-value {
                font-size: var(--font-size-base);
                color: var(--color-text-primary);
            }

            .detail-value.mono {
                font-family: var(--font-mono);
                font-size: var(--font-size-sm);
            }

            .copy-inline {
                background: none;
                border: none;
                color: var(--color-text-muted);
                cursor: pointer;
                padding: 2px;
                display: inline-flex;
                margin-left: 4px;
            }

            .copy-inline:hover { color: var(--color-text-primary); }
            .copy-inline svg { width: 14px; height: 14px; }

            .ip-tag {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 2px 8px;
                background: var(--color-bg-tertiary);
                border-radius: var(--radius-sm);
                font-family: var(--font-mono);
                font-size: var(--font-size-sm);
                margin: 2px;
            }

            .toggle-field {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: var(--space-xs, 4px) 0;
                font-size: var(--font-size-sm);
            }

            .toggle-field span:first-child {
                color: var(--color-text-muted);
            }

            .toggle-field span:last-child {
                color: var(--color-text-primary);
            }

            .inline-edit {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .inline-edit input {
                padding: 0.3rem 0.5rem;
                border-radius: var(--radius-sm);
                border: 1px solid var(--color-border);
                background: var(--color-bg-primary);
                color: var(--color-text-primary);
                font-family: var(--font-family);
                font-size: var(--font-size-sm);
                outline: none;
            }

            .inline-edit input:focus {
                border-color: var(--color-accent);
            }

            .back-link {
                display: inline-flex;
                align-items: center;
                gap: 0.4rem;
                color: var(--color-text-secondary);
                text-decoration: none;
                font-size: var(--font-size-sm);
                cursor: pointer;
                margin-bottom: 1rem;
                background: none;
                border: none;
                font-family: var(--font-family);
                padding: 0;
            }

            .back-link:hover {
                color: var(--color-accent);
            }

            .batch-bar {
                display: flex;
                align-items: center;
                gap: var(--space-sm, 8px);
                padding: var(--space-sm, 8px) var(--space-md, 16px);
                background: var(--color-bg-elevated, var(--color-bg-tertiary));
                border: 1px solid var(--color-border);
                border-radius: var(--radius-lg);
                margin-bottom: var(--space-sm, 8px);
                box-shadow: var(--shadow-md);
            }

            .batch-count {
                font-size: var(--font-size-sm);
                color: var(--color-text-secondary);
                margin-right: auto;
            }

            .batch-bar .btn svg {
                width: 14px;
                height: 14px;
            }

            .filter-tabs {
                display: flex;
                gap: 0;
                border-bottom: 1px solid var(--color-border);
                margin-bottom: var(--space-md, 16px);
            }

            .filter-tab {
                padding: var(--space-sm, 8px) var(--space-md, 16px);
                background: none;
                border: none;
                border-bottom: 2px solid transparent;
                color: var(--color-text-muted);
                font-family: var(--font-family);
                font-size: var(--font-size-sm);
                cursor: pointer;
                transition: all var(--transition-fast);
            }

            .filter-tab:hover {
                color: var(--color-text-secondary);
            }

            .filter-tab.active {
                color: var(--color-text-primary);
                border-bottom-color: var(--color-accent);
            }

            .filter-count {
                font-size: var(--font-size-xs);
                color: var(--color-text-muted);
                margin-left: 4px;
            }

            .checkbox-row {
                display: flex;
                align-items: center;
                gap: var(--space-sm, 8px);
            }

            .checkbox-row input[type="checkbox"] {
                accent-color: var(--color-accent);
            }

            .search-bar {
                padding: var(--space-sm, 8px) 0;
                margin-bottom: var(--space-md, 16px);
            }

            .search-input {
                width: 100%;
                padding: var(--space-sm, 8px) var(--space-md, 16px);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-md);
                background: var(--color-bg-secondary);
                color: var(--color-text-primary);
                font-family: var(--font-family);
                font-size: var(--font-size-base);
                outline: none;
                box-sizing: border-box;
            }

            .search-input:focus {
                border-color: var(--color-accent);
            }

            .search-input::placeholder {
                color: var(--color-text-muted);
            }

            .search-indicator {
                display: flex;
                justify-content: flex-end;
                align-items: center;
                gap: var(--space-md, 16px);
                padding-top: var(--space-md, 16px);
                color: var(--color-text-secondary);
                font-size: var(--font-size-sm);
            }

            .status-cell {
                display: inline-flex;
                align-items: center;
                gap: var(--space-xs);
            }

            .status-cell .version {
                color: var(--color-text-muted);
                font-family: var(--font-mono);
                font-size: var(--font-size-xs);
                white-space: nowrap;
            }
        `,
    ];

    connectedCallback(): void {
        super.connectedCallback();
        this.loadData();
        userService.getCurrentUser().then(() => {
            this.canEdit = userService.canEditNetwork();
            this.canDelete = userService.canDeleteNetwork();
        });
    }

    private async loadData(): Promise<void> {
        if (!this.networkId) return;
        this.loading = true;
        try {
            const [network, membersResult, peers] = await Promise.all([
                networkService.getNetwork(this.networkId),
                memberService.listMembersWithPeers(this.networkId),
                nodeService.getPeers().catch(() => []),
            ]);
            this.network = network;

            // Build peer info map: prefer active IPv4 path; fall back to first active path of any family (Plan 14-03, D-15)
            const peerInfoMap = new Map<string, { physicalAddress?: string; isPhysicalAddressIPv6?: boolean; online: boolean }>();
            for (const peer of peers) {
                const activePaths = (peer.paths ?? []).filter(p => p.active && p.address);
                const ipv4Path = activePaths.find(p => isIPv4(p.address.split('/')[0]));
                const chosenPath = ipv4Path ?? activePaths[0];
                const physicalAddress = chosenPath ? chosenPath.address.split('/')[0] : undefined;
                const isPhysicalAddressIPv6 = chosenPath !== undefined && !ipv4Path;
                const hasRecentActivity = peer.paths?.some(p => {
                    const lr = p.lastReceive ?? 0;
                    const ls = p.lastSend ?? 0;
                    const latest = Math.max(lr, ls);
                    return latest > 0 && (Date.now() - latest) < 300000;
                }) ?? false;
                peerInfoMap.set(peer.address, { physicalAddress, isPhysicalAddressIPv6, online: hasRecentActivity });
            }

            // Enrich version-carrying members with physicalAddress, IPv6-only flag, and online status from peers.
            // Version field arrives pre-merged from memberService.listMembersWithPeers (D-10 / Phase 18 / D-07 detection).
            this.members = membersResult.data.map(m => {
                const nodeId = m.nodeId || m.id;
                const peerInfo = peerInfoMap.get(nodeId);
                return {
                    ...m,
                    ...(peerInfo?.physicalAddress ? { physicalAddress: peerInfo.physicalAddress } : {}),
                    ...(peerInfo?.isPhysicalAddressIPv6 ? { isPhysicalAddressIPv6: true } : {}),
                    online: peerInfo?.online ?? false,
                };
            });

            this.editName = network.name || '';
            logService.info(`Loaded network ${this.networkId}`);
        } catch (err) {
            logService.error(`Failed to load network ${this.networkId}`, String(err));
        } finally {
            this.loading = false;
        }
    }

    private async saveName(): Promise<void> {
        if (!this.network) return;
        try {
            const update: NetworkUpdate = { name: this.editName };
            await networkService.updateNetwork(this.networkId, update);
            this.network = { ...this.network, name: this.editName };
            this.editingName = false;
            toastService.success('Network name updated');
            logService.info(`Renamed network to "${this.editName}"`);
        } catch (err) {
            toastService.error('Failed to update network name');
            logService.error('Failed to update network name', String(err));
        }
    }

    private openEditNetwork(): void {
        if (!this.network) return;
        const n = this.network;
        this.editPrivate = n.private;
        this.editBroadcast = n.enableBroadcast;
        this.editV4Auto = n.v4AssignMode?.zt ?? false;
        this.editCidr = (n.routes ?? []).length > 0 ? n.routes[0].target : '';
        const pool = (n.ipAssignmentPools ?? [])[0];
        this.editPoolStart = pool?.ipRangeStart ?? '';
        this.editPoolEnd = pool?.ipRangeEnd ?? '';
        this.showEditNetwork = true;
    }

    private async saveNetworkConfig(): Promise<void> {
        if (!this.network) return;
        this.savingNetwork = true;
        try {
            const update: NetworkUpdate = {
                private: this.editPrivate,
                enableBroadcast: this.editBroadcast,
                v4AssignMode: { zt: this.editV4Auto },
            };

            if (this.editCidr.trim()) {
                update.routes = [{ target: this.editCidr.trim(), via: null, flags: 0, metric: 0 }];
            } else {
                update.routes = [];
            }

            if (this.editPoolStart.trim() && this.editPoolEnd.trim()) {
                update.ipAssignmentPools = [{
                    ipRangeStart: this.editPoolStart.trim(),
                    ipRangeEnd: this.editPoolEnd.trim(),
                }];
            } else {
                update.ipAssignmentPools = [];
            }

            await networkService.updateNetwork(this.networkId, update);
            toastService.success('Network configuration updated');
            logService.info(`Updated network ${this.networkId} configuration`);
            this.showEditNetwork = false;
            await this.loadData();
        } catch (err) {
            toastService.error('Failed to update network configuration');
            logService.error('Failed to update network config', String(err));
        } finally {
            this.savingNetwork = false;
        }
    }

    private async deleteNetwork(): Promise<void> {
        try {
            await networkService.deleteNetwork(this.networkId);
            toastService.success('Network deleted');
            logService.info(`Deleted network ${this.networkId}`);
            this.navigateBack();
        } catch (err) {
            toastService.error('Failed to delete network');
            logService.error('Failed to delete network', String(err));
        }
    }

    private async copyValue(val: string): Promise<void> {
        try {
            await navigator.clipboard.writeText(val);
            toastService.success('Copied to clipboard');
        } catch {
            toastService.error('Failed to copy');
        }
    }

    private navigateBack(): void {
        window.history.pushState({}, '', '/networks');
        window.dispatchEvent(new PopStateEvent('popstate'));
    }

    private getMemberColumns(): DataTableColumn[] {
        return [
            { key: 'name', label: 'Name', width: '140px', editable: 'text', sortable: true },
            { key: 'nodeId', label: 'Member ID', width: '120px', mono: true, copyable: true, sortable: true },
            { key: 'authorized', label: 'Authorized', width: '80px', editable: 'checkbox', sortable: true },
            { key: 'activeBridge', label: 'Bridge', width: '70px', editable: 'checkbox' },
            {
                key: 'ipAssignments', label: 'IP Assignment', width: '160px',
                render: (val: unknown, row: Record<string, unknown>) => {
                    const ips = Array.isArray(val) ? (val as string[]) : [];
                    return html`
                        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-xs);">
                            ${ips.length === 0
                                ? html`<span style="
                                    display: inline-block;
                                    padding: 2px 6px;
                                    border: 1px solid var(--color-border);
                                    border-radius: var(--radius-sm);
                                    background: var(--color-bg-tertiary);
                                    color: var(--color-text-muted);
                                    font-family: var(--font-mono);
                                    font-size: var(--font-size-sm);
                                ">—</span>`
                                : ips.map(ip => html`<span style="
                                    display: inline-block;
                                    padding: 2px 6px;
                                    border: 1px solid var(--color-border);
                                    border-radius: var(--radius-sm);
                                    background: var(--color-bg-tertiary);
                                    color: var(--color-text-primary);
                                    font-family: var(--font-mono);
                                    font-size: var(--font-size-sm);
                                ">${ip}</span>`)}
                            <button
                                class="edit-btn cell-actions"
                                title="Edit IPs"
                                aria-label="Edit IPs"
                                @click=${() => { this.editingIpsMember = row as unknown as Member; }}
                            >${unsafeSVG(Pencil)}</button>
                        </div>
                    `;
                },
            },
            {
                key: 'online', label: 'Status', width: '180px', sortable: true,
                render: (val: unknown, row: Record<string, unknown>) => {
                    const online = Boolean(val);
                    const badge = html`<zt-badge variant="${online ? 'success' : 'error'}">${online ? 'Online' : 'Offline'}</zt-badge>`;
                    if (!online) return badge; // D-05: hide version sub-line entirely on offline rows
                    const rawVersion = (row as { version?: string }).version;
                    const display = rawVersion && !/^0\.0\.0(\.|$)/.test(rawVersion) ? `v${rawVersion}` : '—';
                    return html`<span class="status-cell"><zt-badge variant="success">Online</zt-badge><span class="version">· ${display}</span></span>`;
                },
            },
            {
                key: 'physicalAddress', label: 'Physical Address', width: '160px', mono: true, copyable: true,
                render: (value, row) => {
                    const addr = (value as string | undefined) ?? '';
                    if (!addr) return html`<span>—</span>`;
                    const isIPv6Only = (row as { isPhysicalAddressIPv6?: boolean }).isPhysicalAddressIPv6 === true;
                    return html`<span>${addr}</span>${isIPv6Only ? html` <zt-badge variant="warning">IPv6 only</zt-badge>` : nothing}`;
                },
            },
        ];
    }

    private handleRowSelect(e: CustomEvent): void {
        this.selectedMembers = e.detail.selectedRows as Member[];
    }

    private async handleCellEdit(e: CustomEvent): Promise<void> {
        const { key, value, row } = e.detail;
        const memberId = (row as Member).nodeId || (row as Member).id || '';
        try {
            const update: MemberUpdate = { [key]: value };
            await memberService.updateMember(this.networkId, memberId, update);
            toastService.success('Member updated');
            await this.loadData();
        } catch (err) {
            toastService.error('Failed to update member');
            logService.error('Failed to update member', String(err));
        }
    }

    private async handleChipChange(e: CustomEvent, row: Record<string, unknown>): Promise<void> {
        const memberId = (row['nodeId'] as string) || (row['id'] as string) || '';
        const idx = this.members.findIndex(
            m => (m.nodeId || m.id) === memberId,
        );
        if (idx < 0) return;
        const member = this.members[idx];
        const prev = [...(member.ipAssignments ?? [])];
        const next = (e.detail as { ips: string[] }).ips;
        const touchedIp = diffSingleIp(prev, next);

        // Optimistic update — immutable replace so Lit reacts.
        this.members = this.members.map((m, i) =>
            i === idx ? ({ ...m, ipAssignments: next } as Member) : m,
        );

        try {
            const updated = await memberService.updateMember(this.networkId, memberId, { ipAssignments: next });
            toastService.success('Member updated');
            this.members = this.members.map((m, i) =>
                i === idx ? ({ ...m, ...updated } as Member) : m,
            );
            // If the edit modal is open for this same member, refresh its bound state
            // so re-opening (or further edits) reflects the persisted IPs (D-04 revised, plan 14-04).
            if (this.editingIpsMember && (this.editingIpsMember.nodeId || this.editingIpsMember.id) === memberId) {
                this.editingIpsMember = this.members[idx];
            }
            logService.info(`Updated ipAssignments for member ${memberId}`);
        } catch (err) {
            // Roll back optimistic update.
            this.members = this.members.map((m, i) =>
                i === idx ? ({ ...m, ipAssignments: prev } as Member) : m,
            );
            const copy = mapReasonToCopy(err);
            toastService.error(copy);
            logService.error(`Failed to update ipAssignments for member ${memberId}`, String(err));
            // Mark the offending chip as rejected on the editor instance, if mounted.
            const errBody = (err as { body?: { invalidIp?: string } } | undefined)?.body;
            const invalidIp = errBody?.invalidIp ?? touchedIp ?? '';
            if (invalidIp) {
                await this.updateComplete;
                const editor = this.renderRoot.querySelector<HTMLElement>(`zt-data-table`);
                // The chip editor is rendered inside the data-table's shadow DOM via the
                // column render callback. We re-query the live DOM and call markRejected
                // on the matching instance if findable.
                const all = this.renderRoot.querySelectorAll('zt-ip-chip-editor');
                let target: HTMLElement | null = null;
                all.forEach(el => {
                    if ((el as HTMLElement).id === `chip-${memberId}`) target = el as HTMLElement;
                });
                // data-table renders the cell render() result inside its own shadow DOM,
                // so also probe via composedPath traversal.
                if (!target && editor) {
                    const inner = (editor.shadowRoot ?? editor).querySelector(`#chip-${memberId}`);
                    if (inner) target = inner as HTMLElement;
                }
                if (target && typeof (target as unknown as { markRejected?: (ip: string, reason: string) => void }).markRejected === 'function') {
                    (target as unknown as { markRejected: (ip: string, reason: string) => void }).markRejected(invalidIp, copy);
                }
            }
        }
    }

    private startBatch(action: 'authorize' | 'deauthorize'): void {
        this.batchAction = action;
        this.showBatchConfirm = true;
    }

    private async executeBatch(): Promise<void> {
        this.showBatchConfirm = false;
        const authorized = this.batchAction === 'authorize';
        const label = authorized ? 'authorized' : 'deauthorized';
        try {
            await Promise.all(
                this.selectedMembers.map(m =>
                    authorized
                        ? memberService.authorizeMember(this.networkId, m.nodeId || m.id || '')
                        : memberService.deauthorizeMember(this.networkId, m.nodeId || m.id || '')
                ),
            );
            toastService.success(`${this.selectedMembers.length} members ${label}`);
            this.selectedMembers = [];
            await this.loadData();
        } catch (err) {
            toastService.error(`Failed to ${label.slice(0, -1)} members`);
            logService.error(`Batch ${label} failed`, String(err));
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

        if (!this.network) {
            return html`<div class="text-muted" style="padding: 2rem;">Network not found.</div>`;
        }

        const n = this.network;
        const nwid = n.nwid || n.id || '';

        return html`
            <div style="margin-top: var(--space-lg, 1.5rem);">
                <button class="back-link" @click=${this.navigateBack}>← Back to Networks</button>

                <div class="page-header">
                    <div>
                        ${this.editingName ? html`
                            <div class="inline-edit">
                                <input
                                    type="text"
                                    .value=${this.editName}
                                    @input=${(e: InputEvent) => { this.editName = (e.target as HTMLInputElement).value; }}
                                    @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter') this.saveName(); if (e.key === 'Escape') { this.editingName = false; } }}
                                />
                                <button class="btn btn-sm btn-primary" @click=${this.saveName}>Save</button>
                                <button class="btn btn-sm btn-secondary" @click=${() => { this.editingName = false; }}>Cancel</button>
                            </div>
                        ` : html`
                            <div class="page-title" style="cursor: pointer;" @click=${() => { this.editingName = true; }}>
                                ${n.name || '(unnamed)'}
                                <span style="font-size: var(--font-size-sm); color: var(--color-text-muted); margin-left: 0.5rem;">✎</span>
                            </div>
                        `}
                        <div class="page-subtitle mono">${nwid}</div>
                    </div>
                    <div style="display: flex; gap: var(--space-sm, 8px);">
                        <button class="btn btn-primary"
                            ?disabled=${!this.canEdit}
                            title=${this.canEdit ? 'Edit network settings' : 'Operator or Admin role required to edit networks'}
                            @click=${() => { if (this.canEdit) this.openEditNetwork(); }}
                        >Edit Network</button>
                        <button class="btn btn-danger"
                            ?disabled=${!this.canDelete}
                            title=${this.canDelete ? 'Delete this network' : 'Admin role required to delete networks'}
                            @click=${() => { if (this.canDelete) this.showDelete = true; }}
                        >Delete Network</button>
                    </div>
                </div>

                <!-- Property Cards -->
                <div class="detail-cards">
                    <!-- Identity Card -->
                    <div class="detail-card">
                        <div class="detail-card-title">Identity</div>
                        <div class="detail-field">
                            <div class="detail-label">Network ID</div>
                            <div class="detail-value mono">
                                ${nwid}
                                <button class="copy-inline" @click=${() => this.copyValue(nwid)} title="Copy" aria-label="Copy network ID">
                                    ${unsafeSVG(Copy)}
                                </button>
                            </div>
                        </div>
                        <div class="detail-field">
                            <div class="detail-label">Name</div>
                            <div class="detail-value">${n.name || '—'}</div>
                        </div>
                        <div class="detail-field">
                            <div class="detail-label">Created</div>
                            <div class="detail-value">${n.creationTime ? new Date(n.creationTime).toLocaleDateString() : '—'}</div>
                        </div>
                    </div>

                    <!-- Configuration Card -->
                    <div class="detail-card">
                        <div class="detail-card-title">Configuration</div>
                        <div class="toggle-field">
                            <span>Private</span>
                            <span>${n.private ? 'Yes' : 'No'}</span>
                        </div>
                        <div class="toggle-field">
                            <span>IPv4 Auto-Assign</span>
                            <span>${n.v4AssignMode?.zt ? 'Yes' : 'No'}</span>
                        </div>
                        <div class="toggle-field">
                            <span>IPv6 Auto-Assign</span>
                            <span>${n.v6AssignMode?.zt ? 'Yes' : 'No'}</span>
                        </div>
                        <div class="toggle-field">
                            <span>Broadcast</span>
                            <span>${n.enableBroadcast ? 'Yes' : 'No'}</span>
                        </div>
                        <div class="toggle-field">
                            <span>Multicast Limit</span>
                            <span>${n.multicastLimit ?? '—'}</span>
                        </div>
                    </div>

                    <!-- IP Ranges Card -->
                    <div class="detail-card">
                        <div class="detail-card-title">IP Ranges</div>
                        <div class="detail-field">
                            <div class="detail-label">Assignment Pools</div>
                            <div>
                                ${(n.ipAssignmentPools ?? []).length > 0
                                    ? (n.ipAssignmentPools ?? []).map(pool =>
                                        html`<span class="ip-tag">${pool.ipRangeStart} – ${pool.ipRangeEnd}</span>`)
                                    : html`<span class="text-muted">None</span>`
                                }
                            </div>
                        </div>
                        <div class="detail-field">
                            <div class="detail-label">Routes</div>
                            <div>
                                ${(n.routes ?? []).length > 0
                                    ? (n.routes ?? []).map(route =>
                                        html`<span class="ip-tag">${route.target}${route.via ? ` via ${route.via}` : ''}</span>`)
                                    : html`<span class="text-muted">None</span>`
                                }
                            </div>
                        </div>
                        <div class="detail-field">
                            <div class="detail-label">DNS</div>
                            <div class="detail-value">${n.dns?.domain || 'Not configured'}</div>
                        </div>
                    </div>
                </div>

                <!-- Members Section -->
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Members (${this.members.length})</span>
                    </div>
                    <div class="search-bar">
                        <input
                            type="text"
                            class="search-input"
                            placeholder="Search by name, ID, or IP…"
                            aria-label="Search members"
                            .value=${this.searchQuery}
                            @input=${(e: Event) => { this.searchQuery = (e.target as HTMLInputElement).value; }}
                        />
                    </div>
                    <div class="filter-tabs">
                        <button class="filter-tab ${this.memberFilter === 'all' ? 'active' : ''}" @click=${() => { this.memberFilter = 'all'; }}>
                            All <span class="filter-count">(${this.members.length})</span>
                        </button>
                        <button class="filter-tab ${this.memberFilter === 'authorized' ? 'active' : ''}" @click=${() => { this.memberFilter = 'authorized'; }}>
                            Authorized <span class="filter-count">(${this.members.filter(m => m.authorized).length})</span>
                        </button>
                        <button class="filter-tab ${this.memberFilter === 'pending' ? 'active' : ''}" @click=${() => { this.memberFilter = 'pending'; }}>
                            Pending <span class="filter-count">(${this.members.filter(m => !m.authorized).length})</span>
                        </button>
                    </div>
                    ${this.selectedMembers.length > 0 ? html`
                        <div class="batch-bar">
                            <span class="batch-count">${this.selectedMembers.length} selected</span>
                            <button class="btn btn-primary btn-sm" @click=${() => this.startBatch('authorize')}>
                                ${unsafeSVG(ShieldCheck)} Authorize All
                            </button>
                            <button class="btn btn-danger btn-sm" @click=${() => this.startBatch('deauthorize')}>
                                ${unsafeSVG(ShieldOff)} Deauthorize All
                            </button>
                        </div>
                    ` : nothing}
                    <zt-data-table
                        .columns=${this.getMemberColumns()}
                        .rows=${this.filteredMembers as unknown as Record<string, unknown>[]}
                        ?selectable=${true}
                        emptyMessage="No members have joined this network yet"
                        @cell-edit=${this.handleCellEdit}
                        @row-select=${this.handleRowSelect}
                    ></zt-data-table>
                    ${this.searchQuery.trim() !== '' ? html`
                        <div class="search-indicator">
                            <span>Showing ${this.filteredMembers.length} of ${this.members.length} members</span>
                            <button class="btn btn-secondary btn-sm" @click=${() => { this.searchQuery = ''; }}>Clear filter</button>
                        </div>
                    ` : nothing}
                </div>
            </div>

            <!-- Delete Network Modal -->
            <zt-modal
                .open=${this.showDelete}
                heading="Delete Network"
                @close=${() => { this.showDelete = false; }}
            >
                <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
                    Are you sure you want to delete network <strong class="mono">${this.networkId}</strong>?
                    This action cannot be undone.
                </p>
                <div slot="footer">
                    <button class="btn btn-secondary" @click=${() => { this.showDelete = false; }}>Cancel</button>
                    <button class="btn btn-danger" @click=${this.deleteNetwork}>Delete</button>
                </div>
            </zt-modal>

            <!-- Batch Confirmation Modal -->
            <zt-modal
                .open=${this.showBatchConfirm}
                heading="${this.batchAction === 'authorize' ? 'Authorize' : 'Deauthorize'} Members"
                @close=${() => { this.showBatchConfirm = false; }}
            >
                <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
                    ${this.batchAction === 'deauthorize'
                        ? `Remove network access for ${this.selectedMembers.length} members? This takes effect immediately.`
                        : `Authorize ${this.selectedMembers.length} members for network access?`
                    }
                </p>
                <div slot="footer">
                    <button class="btn btn-secondary" @click=${() => { this.showBatchConfirm = false; }}>Cancel</button>
                    <button class="btn ${this.batchAction === 'deauthorize' ? 'btn-danger' : 'btn-primary'}" @click=${this.executeBatch}>
                        ${this.batchAction === 'authorize' ? 'Authorize All' : 'Deauthorize All'}
                    </button>
                </div>
            </zt-modal>

            <!-- Edit Network Modal -->
            <zt-modal
                .open=${this.showEditNetwork}
                heading="Edit Network Configuration"
                @close=${() => { this.showEditNetwork = false; }}
            >
                <div class="form-group">
                    <label class="checkbox-row">
                        <input
                            type="checkbox"
                            .checked=${this.editPrivate}
                            @change=${(e: Event) => { this.editPrivate = (e.target as HTMLInputElement).checked; }}
                        />
                        <span class="label" style="margin-bottom:0">Private Network</span>
                    </label>
                </div>
                <div class="form-group">
                    <label class="checkbox-row">
                        <input
                            type="checkbox"
                            .checked=${this.editBroadcast}
                            @change=${(e: Event) => { this.editBroadcast = (e.target as HTMLInputElement).checked; }}
                        />
                        <span class="label" style="margin-bottom:0">Enable Broadcast</span>
                    </label>
                </div>
                <div class="form-group">
                    <label class="checkbox-row">
                        <input
                            type="checkbox"
                            .checked=${this.editV4Auto}
                            @change=${(e: Event) => { this.editV4Auto = (e.target as HTMLInputElement).checked; }}
                        />
                        <span class="label" style="margin-bottom:0">IPv4 Auto-Assign</span>
                    </label>
                </div>
                <div class="form-group">
                    <label class="label">Network Address (CIDR)</label>
                    <input
                        class="input"
                        type="text"
                        placeholder="10.147.20.0/24"
                        .value=${this.editCidr}
                        @input=${(e: InputEvent) => { this.editCidr = (e.target as HTMLInputElement).value; }}
                    />
                    <small style="color: var(--color-text-muted); font-size: var(--font-size-xs);">Route target for this network</small>
                </div>
                <div class="form-group">
                    <label class="label">IP Assignment Pool Start</label>
                    <input
                        class="input"
                        type="text"
                        placeholder="10.147.20.1"
                        .value=${this.editPoolStart}
                        @input=${(e: InputEvent) => { this.editPoolStart = (e.target as HTMLInputElement).value; }}
                    />
                </div>
                <div class="form-group">
                    <label class="label">IP Assignment Pool End</label>
                    <input
                        class="input"
                        type="text"
                        placeholder="10.147.20.254"
                        .value=${this.editPoolEnd}
                        @input=${(e: InputEvent) => { this.editPoolEnd = (e.target as HTMLInputElement).value; }}
                    />
                </div>
                <div slot="footer">
                    <button class="btn btn-secondary" @click=${() => { this.showEditNetwork = false; }}>Cancel</button>
                    <button class="btn btn-primary" ?disabled=${this.savingNetwork} @click=${this.saveNetworkConfig}>
                        ${this.savingNetwork ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </zt-modal>

            <!-- Edit IP Assignments Modal (Plan 14-04 — replaces inline editor) -->
            ${this.editingIpsMember ? html`
                <zt-modal
                    .open=${true}
                    heading="Edit Managed IPs"
                    @close=${() => { this.editingIpsMember = null; }}
                >
                    <p style="margin: 0 0 var(--space-sm) 0; color: var(--color-text-muted); font-size: var(--font-size-sm);">
                        Member: <strong>${this.editingIpsMember.name || this.editingIpsMember.nodeId || this.editingIpsMember.id}</strong>
                    </p>
                    <zt-ip-chip-editor
                        id=${`chip-${this.editingIpsMember.nodeId || this.editingIpsMember.id}`}
                        .ips=${this.editingIpsMember.ipAssignments ?? []}
                        @ip-change=${(e: CustomEvent) => this.handleChipChange(
                            e,
                            this.editingIpsMember as unknown as Record<string, unknown>,
                        )}
                    ></zt-ip-chip-editor>
                    <div slot="footer">
                        <button class="btn btn-secondary" @click=${() => { this.editingIpsMember = null; }}>Close</button>
                    </div>
                </zt-modal>
            ` : nothing}
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'page-network-detail': PageNetworkDetail;
    }
}
