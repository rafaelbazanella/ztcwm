import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Users } from 'lucide-static';
import { theme } from '../styles/theme.js';
import { sharedStyles } from '../styles/shared.js';
import { networkService, memberService, logService, toastService } from '../services/index.js';
import type { Member, MemberUpdate } from '../types/index.js';
import type { DataTableColumn } from '../components/data-table.js';
import '../components/navbar.js';
import '../components/badge.js';
import '../components/loading.js';
import '../components/empty-state.js';
import '../components/data-table.js';

interface MemberRow extends Member {
    networkName: string;
}

@customElement('page-members')
export class PageMembers extends LitElement {
    @state() private members: MemberRow[] = [];
    @state() private loading = true;

    private memberColumns: DataTableColumn[] = [
        { key: 'name', label: 'Name', sortable: true, editable: 'text', width: '140px' },
        { key: 'nodeId', label: 'Member ID', sortable: true, copyable: true, mono: true, width: '120px' },
        { key: 'networkName', label: 'Network', sortable: true, width: '120px' },
        {
            key: 'authorized', label: 'Authorized', sortable: true, width: '90px',
            render: (val: unknown) => val
                ? html`<zt-badge variant="success" .dot=${true}>Yes</zt-badge>`
                : html`<zt-badge variant="warning" .dot=${true}>No</zt-badge>`,
        },
        {
            key: 'ipAssignments', label: 'IP Assignments', copyable: true, width: '160px',
            render: (val: unknown) => {
                const ips = val as string[] | undefined;
                return ips?.length ? ips.join(', ') : '—';
            },
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
        `,
    ];

    connectedCallback(): void {
        super.connectedCallback();
        this.loadAllMembers();
    }

    private async loadAllMembers(): Promise<void> {
        this.loading = true;
        try {
            const networksResult = await networkService.listNetworks();
            const allMembers: MemberRow[] = [];

            for (const net of networksResult.data) {
                try {
                    const membersResult = await memberService.listMembers(net.id);
                    for (const m of membersResult.data) {
                        allMembers.push({ ...m, networkName: net.name || net.id });
                    }
                } catch {
                    logService.warn(`Failed to load members for network ${net.id}`);
                }
            }

            this.members = allMembers;
            logService.info(`Loaded ${allMembers.length} members across ${networksResult.data.length} networks`);
        } catch (err) {
            toastService.error('Failed to load members');
            logService.error('Failed to load members', String(err));
        } finally {
            this.loading = false;
        }
    }

    private async handleCellEdit(e: CustomEvent): Promise<void> {
        const { row, key, value } = e.detail;
        const member = row as MemberRow;
        const memberId = member.id || member.nodeId;
        try {
            const update: MemberUpdate = { [key]: value };
            await memberService.updateMember(member.nwid, memberId, update);
            toastService.success(`Updated member ${memberId.substring(0, 10)}`);
            await this.loadAllMembers();
        } catch (err) {
            toastService.error('Failed to update member');
            logService.error('Failed to update member', String(err));
        }
    }

    render() {
        return html`
            <zt-navbar title="Members" subtitle="All network members"></zt-navbar>

            <div style="margin-top: var(--space-lg, 1.5rem);">
                <div class="page-header">
                    <div>
                        <div class="page-title">Members</div>
                        <div class="page-subtitle">${this.members.length} member${this.members.length !== 1 ? 's' : ''} across all networks</div>
                    </div>
                </div>

                ${this.loading ? html`<zt-loading variant="skeleton-rows" count="8"></zt-loading>` : ''}

                ${!this.loading && this.members.length === 0 ? html`
                    <zt-empty-state
                        .svgIcon=${Users}
                        heading="No members found"
                        message="Members will appear here when devices join your networks."
                    ></zt-empty-state>
                ` : ''}

                ${!this.loading && this.members.length > 0 ? html`
                    <div class="card">
                        <zt-data-table
                            .columns=${this.memberColumns}
                            .rows=${this.members as unknown as Record<string, unknown>[]}
                            emptyMessage="No members found"
                            @cell-edit=${this.handleCellEdit}
                        ></zt-data-table>
                    </div>
                ` : ''}
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'page-members': PageMembers;
    }
}
