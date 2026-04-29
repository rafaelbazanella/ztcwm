import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { Sun, Moon, LogOut } from 'lucide-static';
import { theme } from '../styles/theme.js';
import { sharedStyles } from '../styles/shared.js';

@customElement('zt-navbar')
export class ZtNavbar extends LitElement {
    @property({ type: String }) title = '';
    @property({ type: String }) subtitle = '';
    @property({ type: Boolean, attribute: 'show-logout' }) showLogout = true;
    @state() private connected = false;
    @state() private checking = true;
    @state() private currentTheme = 'dark';

    private healthCheckInterval: ReturnType<typeof setInterval> | null = null;

    static styles = [
        theme,
        sharedStyles,
        css`
            :host {
                display: block;
                height: var(--navbar-height);
                background: var(--color-bg-secondary);
                border-bottom: 1px solid var(--color-border);
                padding: 0 1.5rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .nav-left {
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .nav-title {
                font-size: var(--font-size-lg);
                font-weight: 600;
                color: var(--color-text-primary);
            }

            .nav-subtitle {
                font-size: var(--font-size-xs);
                color: var(--color-text-muted);
            }

            .nav-right {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }

            .icon {
                width: 18px;
                height: 18px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }

            .icon svg {
                width: 100%;
                height: 100%;
            }

            .status-indicator {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
            }

            .status-dot.connected {
                background: var(--color-success);
            }

            .status-dot.disconnected {
                background: var(--color-error);
            }

            .status-dot.pulse {
                animation: pulse 1s ease-in-out infinite;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.4; }
            }

            .status-label {
                font-size: var(--font-size-xs);
                color: var(--color-text-secondary);
            }
        `,
    ];

    connectedCallback(): void {
        super.connectedCallback();
        this.currentTheme = localStorage.getItem('zt-theme') || 'dark';
        // Delay initial health check to avoid interfering with synchronous test assertions
        setTimeout(() => this.checkConnection(), 100);
        this.healthCheckInterval = setInterval(() => this.checkConnection(), 30000);
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }

    private async checkConnection(): Promise<void> {
        this.checking = true;
        try {
            const resp = await fetch('/api/zt/status', {
                credentials: 'include',
                signal: AbortSignal.timeout(5000),
            });
            this.connected = resp.ok;
        } catch {
            this.connected = false;
        } finally {
            this.checking = false;
        }
    }

    private handleThemeToggle(): void {
        const app = document.querySelector('zt-app') as any;
        if (app?.toggleTheme) {
            app.toggleTheme();
            this.currentTheme = app.currentTheme;
        }
    }

    private async _handleLogout(): Promise<void> {
        try {
            await fetch('/api/auth/logout', {
                method: 'DELETE',
                credentials: 'include',
            });
        } catch {
            // Redirect to login even on network error
        }
        // Clear cached user data so stale role info doesn't persist
        const { userService } = await import('../services/index.js');
        userService.clear();
        window.location.href = '/login';
    }

    render() {
        return html`
            <div class="nav-left">
                <div>
                    <div class="nav-title">${this.title}</div>
                    ${this.subtitle ? html`<div class="nav-subtitle">${this.subtitle}</div>` : ''}
                </div>
            </div>
            <div class="nav-right">
                <slot name="actions"></slot>
                ${this.showLogout ? html`
                    <button
                        class="btn-icon"
                        @click=${this._handleLogout}
                        aria-label="Log out"
                        title="Log out"
                    >
                        <span class="icon">${unsafeSVG(LogOut)}</span>
                    </button>
                ` : ''}
                <button
                    class="btn-icon"
                    @click=${this.handleThemeToggle}
                    aria-label=${this.currentTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                    title=${this.currentTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                >
                    <span class="icon">${unsafeSVG(this.currentTheme === 'dark' ? Sun : Moon)}</span>
                </button>
                <div class="status-indicator">
                    <div class="status-dot ${this.connected ? 'connected' : 'disconnected'} ${this.checking ? 'pulse' : ''}"></div>
                    <span class="status-label">${this.connected ? 'Connected' : 'Disconnected'}</span>
                </div>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'zt-navbar': ZtNavbar;
    }
}
