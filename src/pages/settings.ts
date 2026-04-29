import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { theme } from '../styles/theme.js';
import { sharedStyles } from '../styles/shared.js';
import { toastService } from '../services/index.js';
import '../components/navbar.js';

@customElement('page-settings')
export class PageSettings extends LitElement {
    @state() private currentTheme: 'dark' | 'light' = 'dark';
    @state() private currentPassword = '';
    @state() private newPassword = '';
    @state() private confirmPassword = '';
    @state() private passwordError = '';
    @state() private passwordSubmitting = false;

    static styles = [
        theme,
        sharedStyles,
        css`
            :host {
                display: block;
                padding: 1.5rem;
            }

            .theme-options {
                display: flex;
                gap: var(--space-sm, 0.5rem);
            }

            .theme-option {
                padding: 0.5rem 1rem;
                border-radius: var(--radius-md);
                border: 1px solid var(--color-border);
                background: var(--color-bg-tertiary);
                color: var(--color-text-secondary);
                font-family: var(--font-family);
                font-size: var(--font-size-sm);
                cursor: pointer;
                transition: all var(--transition-fast);
            }

            .theme-option:hover {
                background: var(--color-bg-hover);
                color: var(--color-text-primary);
            }

            .theme-option.active {
                background: var(--color-accent-muted);
                color: var(--color-accent);
                border-color: var(--color-accent);
            }

            .form-group { margin-bottom: var(--space-md, 16px); }
            .label { display: block; font-size: var(--font-size-sm); font-weight: 500; color: var(--color-text-secondary); margin-bottom: var(--space-xs, 4px); }
            .input {
                width: 100%; padding: var(--space-sm, 8px);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-md);
                background: var(--color-bg-tertiary);
                color: var(--color-text-primary);
                font-family: var(--font-family);
                font-size: var(--font-size-sm);
                box-sizing: border-box;
            }
            .input:focus { outline: none; border-color: var(--color-accent); }
            .password-form { max-width: 400px; }
            .error-text { color: var(--color-error); font-size: var(--font-size-xs); margin-top: var(--space-xs, 4px); }
            .btn-row { display: flex; justify-content: flex-end; margin-top: var(--space-md, 16px); }
        `,
    ];

    connectedCallback(): void {
        super.connectedCallback();
        this.currentTheme = (localStorage.getItem('zt-theme') as 'dark' | 'light') || 'dark';
    }

    private setTheme(theme: 'dark' | 'light' | 'system'): void {
        if (theme === 'system') {
            localStorage.removeItem('zt-theme');
            const prefersDark = !window.matchMedia('(prefers-color-scheme: light)').matches;
            this.currentTheme = prefersDark ? 'dark' : 'light';
        } else {
            this.currentTheme = theme;
            localStorage.setItem('zt-theme', theme);
        }
        const app = document.querySelector('zt-app');
        if (app) {
            app.setAttribute('theme', this.currentTheme);
        }
    }

    render() {
        return html`
            <zt-navbar title="Preferences" subtitle="User preferences"></zt-navbar>

            <div style="margin-top: 1.5rem;">
                <div class="page-header">
                    <div class="page-title">Preferences</div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Theme</span>
                    </div>
                    <div class="theme-options">
                        <button
                            class="theme-option ${this.currentTheme === 'dark' ? 'active' : ''}"
                            @click=${() => this.setTheme('dark')}
                        >Dark</button>
                        <button
                            class="theme-option ${this.currentTheme === 'light' ? 'active' : ''}"
                            @click=${() => this.setTheme('light')}
                        >Light</button>
                        <button
                            class="theme-option"
                            @click=${() => this.setTheme('system')}
                        >System</button>
                    </div>
                </div>

                <div class="card" style="margin-top: 1.5rem;">
                    <div class="card-header">
                        <span class="card-title">Change Password</span>
                    </div>
                    <div class="password-form">
                        <div class="form-group">
                            <label class="label">Current Password</label>
                            <input class="input" type="password" .value=${this.currentPassword}
                                @input=${(e: Event) => this.currentPassword = (e.target as HTMLInputElement).value}
                                ?disabled=${this.passwordSubmitting}>
                        </div>
                        <div class="form-group">
                            <label class="label">New Password</label>
                            <input class="input" type="password" .value=${this.newPassword}
                                @input=${(e: Event) => this.newPassword = (e.target as HTMLInputElement).value}
                                ?disabled=${this.passwordSubmitting}>
                        </div>
                        <div class="form-group">
                            <label class="label">Confirm New Password</label>
                            <input class="input" type="password" .value=${this.confirmPassword}
                                @input=${(e: Event) => this.confirmPassword = (e.target as HTMLInputElement).value}
                                ?disabled=${this.passwordSubmitting}>
                            ${this.passwordError ? html`<div class="error-text">${this.passwordError}</div>` : nothing}
                        </div>
                        <div class="btn-row">
                            <button class="btn btn-primary"
                                @click=${this.handleChangePassword}
                                ?disabled=${this.passwordSubmitting || !this.currentPassword || !this.newPassword || !this.confirmPassword}>
                                ${this.passwordSubmitting ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    private async handleChangePassword(): Promise<void> {
        this.passwordError = '';
        if (this.newPassword !== this.confirmPassword) {
            this.passwordError = 'Passwords do not match';
            return;
        }
        this.passwordSubmitting = true;
        try {
            const csrfRes = await fetch('/api/csrf-token', { credentials: 'include' });
            const { token } = await csrfRes.json() as { token: string };

            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
                body: JSON.stringify({ currentPassword: this.currentPassword, newPassword: this.newPassword }),
            });
            if (res.ok) {
                toastService.success('Password updated successfully');
                this.currentPassword = '';
                this.newPassword = '';
                this.confirmPassword = '';
            } else if (res.status === 401) {
                this.passwordError = 'Current password is incorrect';
            } else if (res.status === 400) {
                const data = await res.json() as { error: string; details?: string[] };
                this.passwordError = data.details?.join(', ') || data.error;
            } else {
                toastService.error('Failed to change password');
            }
        } catch {
            toastService.error('Failed to change password');
        } finally {
            this.passwordSubmitting = false;
        }
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'page-settings': PageSettings;
    }
}
