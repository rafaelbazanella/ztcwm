import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { Pencil, KeyRound, Trash2, AlertTriangle, Copy, Check, UserPlus } from 'lucide-static';
import { theme } from '../styles/theme.js';
import { sharedStyles } from '../styles/shared.js';
import { toastService } from '../services/index.js';
import { userService } from '../services/index.js';
import type { DataTableColumn } from '../components/data-table.js';
import '../components/data-table.js';
import '../components/modal.js';
import '../components/badge.js';
import '../components/loading.js';

interface UserRow {
    id: number;
    username: string;
    role: string;
    created_at: string;
    last_login_at: string | null;
}

let csrfToken = '';
async function ensureCsrf(): Promise<string> {
    if (!csrfToken) {
        const res = await fetch('/api/csrf-token', { credentials: 'include' });
        if (res.ok) {
            const data = await res.json() as { token: string };
            csrfToken = data.token;
        }
    }
    return csrfToken;
}

function relativeTime(dateStr: string | null): string {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr + 'Z');
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay}d ago`;
}

function absoluteTime(dateStr: string | null): string {
    if (!dateStr) return '';
    return new Date(dateStr + 'Z').toLocaleString();
}

function roleBadgeVariant(role: string): string {
    if (role === 'admin') return 'success';
    if (role === 'operator') return 'info';
    return 'neutral';
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

@customElement('page-users')
export class PageUsers extends LitElement {
    @state() private users: UserRow[] = [];
    @state() private loading = true;
    @state() private currentUserId = 0;
    @state() private isLastAdminFlag = false;

    // Modal states
    @state() private showCreateModal = false;
    @state() private showCredentialModal = false;
    @state() private showEditModal = false;
    @state() private showResetModal = false;
    @state() private showDeleteModal = false;

    @state() private selectedUser: UserRow | null = null;

    // Create form
    @state() private newUsername = '';
    @state() private newRole = 'viewer';
    @state() private usernameError = '';

    // Edit modal
    @state() private editRole = '';
    @state() private editUsername = '';

    // Credential display
    @state() private credentialHeading = 'User Created';
    @state() private credentialUsername = '';
    @state() private credentialPassword = '';
    @state() private copied = false;

    @state() private submitting = false;

    private get columns(): DataTableColumn[] {
        return [
            { key: 'username', label: 'Username', sortable: true },
            {
                key: 'role', label: 'Role', width: '100px', sortable: true,
                render: (val: unknown) => html`<zt-badge variant="${roleBadgeVariant(val as string)}" .dot=${true}>${capitalize(val as string)}</zt-badge>`,
            },
            {
                key: 'created_at', label: 'Created', width: '140px', sortable: true,
                render: (val: unknown) => html`<span title="${absoluteTime(val as string)}">${relativeTime(val as string)}</span>`,
            },
            {
                key: 'last_login_at', label: 'Last Login', width: '140px', sortable: true,
                render: (val: unknown) => {
                    const text = relativeTime(val as string | null);
                    const cls = text === 'Never' ? 'muted' : '';
                    return html`<span class="${cls}" title="${absoluteTime(val as string | null)}">${text}</span>`;
                },
            },
            {
                key: 'actions', label: 'Actions', width: '120px',
                render: (_val: unknown, row: Record<string, unknown>) => {
                    const user = row as unknown as UserRow;
                    const isSelf = user.id === this.currentUserId;
                    const isProtectedAdmin = user.role === 'admin' && this.isLastAdminFlag;

                    // Edit user: disabled if self AND last admin
                    const editDisabled = isSelf && isProtectedAdmin;
                    const editTitle = editDisabled ? 'Cannot edit user — this is the last admin account' : 'Edit user';

                    // Reset password: disabled if self
                    const resetDisabled = isSelf;
                    const resetTitle = isSelf ? 'Cannot reset your own password — use Change Password in Settings' : 'Reset password';

                    // Delete: disabled if self or last admin
                    const deleteDisabled = isSelf || isProtectedAdmin;
                    let deleteTitle = 'Delete user';
                    if (isSelf) deleteTitle = 'Cannot delete your own account';
                    else if (isProtectedAdmin) deleteTitle = 'Cannot delete the last admin account';

                    return html`
                        <span style="display: inline-flex; gap: var(--space-xs); align-items: center;">
                            <button
                                class="btn-icon"
                                ?disabled=${editDisabled}
                                aria-label=${editDisabled ? 'Cannot edit user — last admin account' : 'Edit user'}
                                title=${editTitle}
                                @click=${() => { if (!editDisabled) this.openEditModal(user); }}
                            >
                                ${unsafeSVG(Pencil)}
                            </button>
                            <button
                                class="btn-icon"
                                ?disabled=${resetDisabled}
                                aria-label=${resetDisabled ? 'Cannot reset your own password — use Settings' : `Reset password for ${user.username}`}
                                title=${resetTitle}
                                @click=${() => { if (!resetDisabled) this.openResetModal(user); }}
                            >
                                ${unsafeSVG(KeyRound)}
                            </button>
                            <button
                                class="btn-icon"
                                ?disabled=${deleteDisabled}
                                aria-label=${
                                    isSelf ? 'Cannot delete your own account' :
                                    isProtectedAdmin ? 'Cannot delete the last admin account' :
                                    `Delete user ${user.username}`
                                }
                                title=${deleteTitle}
                                @click=${() => { if (!deleteDisabled) this.openDeleteModal(user); }}
                            >
                                ${unsafeSVG(Trash2)}
                            </button>
                        </span>
                    `;
                },
            },
        ];
    }

    static styles = [
        theme,
        sharedStyles,
        css`
            :host { display: block; padding: var(--space-lg, 24px); }



            /* Action button styles are inlined because the render() runs inside zt-data-table's shadow DOM */

            .muted { color: var(--color-text-muted); }

            .form-group { margin-bottom: var(--space-md, 16px); }
            .label { display: block; font-size: var(--font-size-sm); font-weight: 500; color: var(--color-text-secondary); margin-bottom: var(--space-xs, 4px); }
            .input, .select {
                width: 100%; padding: var(--space-sm, 8px);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-md);
                background: var(--color-bg-tertiary);
                color: var(--color-text-primary);
                font-family: var(--font-family);
                font-size: var(--font-size-sm);
                box-sizing: border-box;
            }
            .input:focus, .select:focus { outline: none; border-color: var(--color-accent); }

            .credential-field {
                display: flex; align-items: center; gap: var(--space-sm, 8px);
                background: var(--color-bg-tertiary);
                padding: var(--space-sm, 8px) var(--space-md, 16px);
                border-radius: var(--radius-md); margin: var(--space-sm, 8px) 0;
            }
            .credential-value {
                flex: 1; font-family: var(--font-mono);
                font-size: var(--font-size-sm); user-select: all;
                color: var(--color-text-primary);
            }
            .copy-btn {
                background: none; border: none;
                color: var(--color-text-muted); cursor: pointer;
                padding: 4px; display: inline-flex; align-items: center;
                border-radius: var(--radius-sm);
            }
            .copy-btn:hover { color: var(--color-text-primary); }
            .copy-btn svg { width: 16px; height: 16px; }
            .copy-btn.copied { color: var(--color-success); }

            .warning-icon { display: flex; justify-content: center; margin-bottom: var(--space-md, 16px); color: var(--color-error); }
            .warning-icon svg { width: 32px; height: 32px; }

            .detail-block { color: var(--color-text-muted); font-size: var(--font-size-sm); margin: var(--space-sm, 8px) 0; }
            .danger-text { color: var(--color-error); font-size: var(--font-size-sm); }
            .info-text { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--space-md, 16px); }
            .hint { font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: var(--space-xs, 4px); }
            .hint.error { color: var(--color-error); }

            .modal-footer { display: flex; justify-content: flex-end; gap: var(--space-sm, 8px); }
        `,
    ];

    connectedCallback(): void {
        super.connectedCallback();
        this.loadUsers();
        userService.getCurrentUser().then(u => {
            if (u) this.currentUserId = u.id;
        });
    }

    private async loadUsers(): Promise<void> {
        this.loading = true;
        try {
            const res = await fetch('/api/users', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json() as { users: UserRow[] };
                this.users = data.users;
                const adminCount = this.users.filter(u => u.role === 'admin').length;
                this.isLastAdminFlag = adminCount <= 1;
            }
        } catch {
            toastService.error('Failed to load users');
        } finally {
            this.loading = false;
        }
    }

    // ─── Create Modal ──────────────────────────────────────────────

    private openCreateModal(): void {
        this.newUsername = '';
        this.newRole = 'viewer';
        this.usernameError = '';
        this.showCreateModal = true;
    }

    private closeCreateModal(): void {
        this.showCreateModal = false;
    }

    private async handleCreateUser(): Promise<void> {
        this.usernameError = '';
        if (!this.newUsername || this.newUsername.length < 3) {
            this.usernameError = 'Username must be at least 3 characters';
            return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(this.newUsername)) {
            this.usernameError = 'Only letters, numbers, and underscores allowed';
            return;
        }

        this.submitting = true;
        try {
            const token = await ensureCsrf();
            const res = await fetch('/api/users', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
                body: JSON.stringify({ username: this.newUsername, role: this.newRole }),
            });
            if (res.ok) {
                const data = await res.json() as { user: { id: number; username: string; role: string }; temporaryPassword: string };
                this.closeCreateModal();
                this.credentialHeading = 'User Created';
                this.credentialUsername = data.user.username;
                this.credentialPassword = data.temporaryPassword;
                this.showCredentialModal = true;
                await this.loadUsers();
                toastService.success(`User '${data.user.username}' created`);
            } else {
                const err = await res.json() as { error: string };
                if (res.status === 409) {
                    this.usernameError = err.error;
                } else {
                    toastService.error(err.error || 'Failed to create user');
                }
            }
        } catch {
            toastService.error('Failed to create user');
        } finally {
            this.submitting = false;
        }
    }

    // ─── Credential Modal ──────────────────────────────────────────

    private closeCredentialModal(): void {
        this.showCredentialModal = false;
        this.credentialPassword = '';
    }

    private async copyToClipboard(text: string): Promise<void> {
        try {
            await navigator.clipboard.writeText(text);
            this.copied = true;
            setTimeout(() => { this.copied = false; }, 1500);
        } catch {
            toastService.error('Failed to copy to clipboard');
        }
    }

    // ─── Edit User Modal ───────────────────────────────────────────

    private openEditModal(user: UserRow): void {
        this.selectedUser = user;
        this.editUsername = user.username;
        this.editRole = user.role;
        this.usernameError = '';
        this.showEditModal = true;
    }

    private closeEditModal(): void {
        this.showEditModal = false;
        this.selectedUser = null;
        this.editUsername = '';
        this.usernameError = '';
    }

    private async handleEditUser(): Promise<void> {
        if (!this.selectedUser) return;
        this.usernameError = '';

        const trimmed = this.editUsername.trim();
        const usernameChanged = trimmed !== this.selectedUser.username;
        const roleChanged = this.editRole !== this.selectedUser.role;

        if (!usernameChanged && !roleChanged) return;

        // Client-side username validation — only when username is changing.
        if (usernameChanged) {
            if (trimmed.length < 3) {
                this.usernameError = 'Username must be at least 3 characters';
                return;
            }
            if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
                this.usernameError = 'Only letters, numbers, and underscores allowed';
                return;
            }
        }

        this.submitting = true;
        const oldUsername = this.selectedUser.username;
        const targetId = this.selectedUser.id;
        const isSelfRename = targetId === this.currentUserId;

        try {
            // D-11: username PATCH first so a 409 aborts before role write.
            if (usernameChanged) {
                const token = await ensureCsrf();
                const res = await fetch(`/api/users/${targetId}/username`, {
                    method: 'PATCH',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
                    body: JSON.stringify({ username: trimmed }),
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({ error: 'Failed to update username' })) as { error: string };
                    if (res.status === 409 || res.status === 400) {
                        this.usernameError = err.error;
                    } else {
                        toastService.error(err.error || 'Failed to update username');
                    }
                    return;  // STOP — do not attempt role write
                }
                // D-09: refresh cached current user on self-rename.
                if (isSelfRename) {
                    userService.clear();
                    await userService.getCurrentUser();
                }
            }

            if (roleChanged) {
                const token = await ensureCsrf();
                const res = await fetch(`/api/users/${targetId}/role`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
                    body: JSON.stringify({ role: this.editRole }),
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({ error: 'Failed to update role' })) as { error: string };
                    toastService.error(err.error || 'Failed to update role');
                    return;
                }
            }

            // Success — single toast, single reload, close modal.
            if (usernameChanged && roleChanged) {
                toastService.success(`User '${oldUsername}' updated`);
            } else if (usernameChanged) {
                toastService.success(`User '${oldUsername}' renamed to '${trimmed}'`);
            } else {
                toastService.success(`User '${oldUsername}' role changed to ${capitalize(this.editRole)}`);
            }
            this.closeEditModal();
            await this.loadUsers();
        } catch {
            toastService.error('Failed to update user');
        } finally {
            this.submitting = false;
        }
    }

    // ─── Reset Password Modal ──────────────────────────────────────

    private openResetModal(user: UserRow): void {
        this.selectedUser = user;
        this.showResetModal = true;
    }

    private closeResetModal(): void {
        this.showResetModal = false;
        this.selectedUser = null;
    }

    private async handleResetPassword(): Promise<void> {
        if (!this.selectedUser) return;
        this.submitting = true;
        try {
            const token = await ensureCsrf();
            const res = await fetch(`/api/users/${this.selectedUser.id}/reset-password`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'X-CSRF-Token': token },
            });
            if (res.ok) {
                const data = await res.json() as { temporaryPassword: string };
                const username = this.selectedUser.username;
                this.closeResetModal();
                this.credentialHeading = 'Password Reset';
                this.credentialUsername = username;
                this.credentialPassword = data.temporaryPassword;
                this.showCredentialModal = true;
                toastService.success(`Password reset for '${username}'`);
            } else {
                const err = await res.json() as { error: string };
                toastService.error(err.error || 'Failed to reset password');
            }
        } catch {
            toastService.error('Failed to reset password');
        } finally {
            this.submitting = false;
        }
    }

    // ─── Delete Modal ──────────────────────────────────────────────

    private openDeleteModal(user: UserRow): void {
        this.selectedUser = user;
        this.showDeleteModal = true;
    }

    private closeDeleteModal(): void {
        this.showDeleteModal = false;
        this.selectedUser = null;
    }

    private async handleDeleteUser(): Promise<void> {
        if (!this.selectedUser) return;
        this.submitting = true;
        try {
            const token = await ensureCsrf();
            const res = await fetch(`/api/users/${this.selectedUser.id}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'X-CSRF-Token': token },
            });
            if (res.ok) {
                toastService.success(`User '${this.selectedUser.username}' deleted`);
                this.closeDeleteModal();
                await this.loadUsers();
            } else {
                const err = await res.json() as { error: string };
                toastService.error(err.error || 'Failed to delete user');
            }
        } catch {
            toastService.error('Failed to delete user');
        } finally {
            this.submitting = false;
        }
    }

    // ─── Render ────────────────────────────────────────────────────

    render() {
        return html`
            <div style="margin-top: var(--space-lg, 1.5rem);">
                <div class="page-header">
                    <div>
                        <div class="page-title">Users</div>
                        <div class="page-subtitle">${this.users.length} user${this.users.length !== 1 ? 's' : ''}</div>
                    </div>
                    <button class="btn btn-primary" @click=${this.openCreateModal}>
                        <span class="btn-icon-svg">${unsafeSVG(UserPlus)}</span>
                        Add User
                    </button>
                </div>

            ${this.loading
                ? html`<zt-loading variant="skeleton-rows" count="5"></zt-loading>`
                : html`<zt-data-table
                    .columns=${this.columns}
                    .rows=${this.users as unknown as Record<string, unknown>[]}
                    emptyIcon="users"
                    emptyMessage="No users found"
                ></zt-data-table>`
            }
            </div>

            <!-- Create User Modal -->
            <zt-modal .open=${this.showCreateModal} heading="Add User" @close=${this.closeCreateModal}>
                <div class="form-group">
                    <label class="label">Username</label>
                    <input class="input" type="text" placeholder="e.g. john_doe"
                        .value=${this.newUsername}
                        @input=${(e: Event) => { this.newUsername = (e.target as HTMLInputElement).value; this.usernameError = ''; }}
                        ?disabled=${this.submitting}>
                    ${this.usernameError ? html`<div class="hint error">${this.usernameError}</div>` : html`<div class="hint">Letters, numbers, and underscores only. Minimum 3 characters.</div>`}
                </div>
                <div class="form-group">
                    <label class="label">Role</label>
                    <select class="select"
                        .value=${this.newRole}
                        @change=${(e: Event) => this.newRole = (e.target as HTMLSelectElement).value}
                        ?disabled=${this.submitting}>
                        <option value="viewer">Viewer</option>
                        <option value="operator">Operator</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div slot="footer" class="modal-footer">
                    <button class="btn btn-secondary" @click=${this.closeCreateModal} ?disabled=${this.submitting}>Cancel</button>
                    <button class="btn btn-primary" @click=${this.handleCreateUser}
                        ?disabled=${this.submitting || !this.newUsername}>
                        ${this.submitting ? 'Creating...' : 'Create User'}
                    </button>
                </div>
            </zt-modal>

            <!-- Credential Display Modal -->
            <zt-modal .open=${this.showCredentialModal} heading="${this.credentialHeading}" @close=${this.closeCredentialModal}>
                <div class="info-text">Save these credentials. The password will not be shown again.</div>
                <div class="form-group">
                    <label class="label">Username</label>
                    <div class="credential-field">
                        <span class="credential-value">${this.credentialUsername}</span>
                    </div>
                </div>
                <div class="form-group">
                    <label class="label">Temporary Password</label>
                    <div class="credential-field">
                        <span class="credential-value">${this.credentialPassword}</span>
                        <button class="copy-btn ${this.copied ? 'copied' : ''}" aria-label="Copy temporary password" @click=${() => this.copyToClipboard(this.credentialPassword)}>
                            ${this.copied ? unsafeSVG(Check) : unsafeSVG(Copy)}
                        </button>
                    </div>
                </div>
                <div slot="footer" class="modal-footer">
                    <button class="btn btn-primary" @click=${this.closeCredentialModal}>Done</button>
                </div>
            </zt-modal>

            <!-- Edit User Modal -->
            ${this.selectedUser ? html`
                <zt-modal .open=${this.showEditModal} heading="Edit User" @close=${this.closeEditModal}>
                    <div class="info-text">Edit <strong>${this.selectedUser.username}</strong></div>
                    <div class="form-group">
                        <label class="label">Username</label>
                        <input class="input" type="text"
                            .value=${this.editUsername}
                            @input=${(e: Event) => { this.editUsername = (e.target as HTMLInputElement).value; this.usernameError = ''; }}
                            ?disabled=${this.submitting}>
                        ${this.usernameError
                            ? html`<div class="hint error">${this.usernameError}</div>`
                            : html`<div class="hint">Letters, numbers, and underscores only. Minimum 3 characters.</div>`}
                    </div>
                    <div class="form-group">
                        <label class="label">Role</label>
                        <select class="select"
                            .value=${this.editRole}
                            @change=${(e: Event) => this.editRole = (e.target as HTMLSelectElement).value}
                            ?disabled=${this.submitting || (this.selectedUser.id === this.currentUserId && this.isLastAdminFlag)}
                            title=${this.selectedUser.id === this.currentUserId && this.isLastAdminFlag ? 'Cannot change role — this is the last admin account' : ''}>
                            <option value="viewer">Viewer</option>
                            <option value="operator">Operator</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div slot="footer" class="modal-footer">
                        <button class="btn btn-secondary" @click=${this.closeEditModal} ?disabled=${this.submitting}>Cancel</button>
                        <button class="btn btn-primary" @click=${this.handleEditUser}
                            ?disabled=${this.submitting || !this.editUsername.trim() || (this.editUsername.trim() === this.selectedUser.username && this.editRole === this.selectedUser.role)}>
                            ${this.submitting ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </zt-modal>

                <!-- Reset Password Modal -->
                <zt-modal .open=${this.showResetModal} heading="Reset Password" @close=${this.closeResetModal}>
                    <div class="info-text">Generate a new temporary password for <strong>${this.selectedUser.username}</strong>?</div>
                    <div class="detail-block">Their current password will stop working immediately.</div>
                    <div slot="footer" class="modal-footer">
                        <button class="btn btn-secondary" @click=${this.closeResetModal} ?disabled=${this.submitting}>Cancel</button>
                        <button class="btn btn-primary" @click=${this.handleResetPassword}
                            ?disabled=${this.submitting}>
                            ${this.submitting ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </div>
                </zt-modal>

                <!-- Delete Confirmation Modal -->
                <zt-modal .open=${this.showDeleteModal} heading="Delete User" @close=${this.closeDeleteModal}>
                    <div class="warning-icon">${unsafeSVG(AlertTriangle)}</div>
                    <div class="info-text" style="text-align: center;">
                        Delete user <strong>${this.selectedUser.username}</strong>?
                    </div>
                    <div class="detail-block" style="text-align: center;">
                        Role: ${capitalize(this.selectedUser.role)} · Created: ${relativeTime(this.selectedUser.created_at)}
                        · Last login: ${relativeTime(this.selectedUser.last_login_at)}
                    </div>
                    <div class="danger-text" style="text-align: center; margin-top: var(--space-sm, 8px);">
                        This action cannot be undone.
                    </div>
                    <div slot="footer" class="modal-footer">
                        <button class="btn btn-secondary" @click=${this.closeDeleteModal} ?disabled=${this.submitting}>Cancel</button>
                        <button class="btn btn-danger" @click=${this.handleDeleteUser}
                            ?disabled=${this.submitting}>
                            ${this.submitting ? 'Deleting...' : 'Delete User'}
                        </button>
                    </div>
                </zt-modal>
            ` : nothing}
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'page-users': PageUsers;
    }
}
