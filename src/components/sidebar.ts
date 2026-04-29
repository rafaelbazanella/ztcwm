import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { LayoutDashboard, Network, Users, UserCheck, Terminal, ScrollText, Server, Settings as SettingsIcon, UserCog } from 'lucide-static';
import { theme } from '../styles/theme.js';
import { userService } from '../services/index.js';
import './logo.js';

@customElement('zt-sidebar')
export class ZtSidebar extends LitElement {
    @property({ type: String }) currentPath = '';
    @state() private canAccessApiExplorer = true;
    @state() private canManageUsers = false;

    static styles = [
        theme,
        css`
            :host {
                display: block;
                width: var(--sidebar-width);
                height: 100vh;
                background: var(--color-bg-secondary);
                border-right: 1px solid var(--color-border);
                position: fixed;
                top: 0;
                left: 0;
                z-index: 100;
                overflow-y: auto;
                transition: width var(--transition-base);
            }

            .brand {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 1rem 1.25rem;
                border-bottom: 1px solid var(--color-border);
                text-decoration: none;
                cursor: pointer;
            }

            nav {
                padding: 0.75rem;
            }

            .nav-section {
                margin-bottom: 1.5rem;
            }

            .nav-section-label {
                font-size: var(--font-size-xs);
                text-transform: uppercase;
                letter-spacing: 0.06em;
                color: var(--color-text-muted);
                padding: 0 0.75rem;
                margin-bottom: 0.5rem;
                font-weight: 600;
            }

            .nav-link {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.55rem 0.75rem;
                border-radius: var(--radius-md);
                color: var(--color-text-secondary);
                text-decoration: none;
                font-size: var(--font-size-sm);
                font-weight: 500;
                transition: all var(--transition-fast);
                cursor: pointer;
                border: none;
                background: none;
                width: 100%;
                text-align: left;
                font-family: var(--font-family);
            }

            .nav-link:hover {
                background: var(--color-bg-hover);
                color: var(--color-text-primary);
            }

            .nav-link.active {
                background: var(--color-accent-muted);
                color: var(--color-accent);
                border-left: 3px solid var(--color-accent);
            }

            .nav-icon {
                width: 18px;
                height: 18px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .nav-icon svg {
                width: 100%;
                height: 100%;
            }

            .nav-label {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            @media (max-width: 1024px) {
                :host {
                    width: var(--sidebar-width-collapsed);
                }

                .nav-label,
                .nav-section-label,
                .brand-detail {
                    display: none;
                }

                .nav-link {
                    justify-content: center;
                    padding: 0.55rem;
                }

                .brand {
                    justify-content: center;
                    padding: 1rem 0;
                }
            }
        `,
    ];

    private navItems = [
        { section: 'Overview', items: [
            { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        ]},
        { section: 'Management', items: [
            { path: '/networks', label: 'Networks', icon: Network },
            { path: '/members', label: 'Members', icon: Users },
            { path: '/pending', label: 'Pending', icon: UserCheck },
            { path: '/users', label: 'User Management', icon: UserCog, requireAdmin: true },
        ]},
        { section: 'Tools', items: [
            { path: '/api', label: 'API Explorer', icon: Terminal, requireApiExplorer: true },
            { path: '/logs', label: 'Logs', icon: ScrollText },
        ]},
        { section: 'System', items: [
            { path: '/controllers', label: 'Controllers', icon: Server },
            { path: '/settings', label: 'Preferences', icon: SettingsIcon },
        ]},
    ];

    connectedCallback(): void {
        super.connectedCallback();
        userService.getCurrentUser().then(() => {
            this.canAccessApiExplorer = userService.canAccessApiExplorer();
            this.canManageUsers = userService.hasRole('admin');
        });
    }

    private getFilteredNavItems() {
        return this.navItems.map(section => ({
            ...section,
            items: section.items.filter(item => {
                if ('requireApiExplorer' in item) return this.canAccessApiExplorer;
                if ('requireAdmin' in item) return this.canManageUsers;
                return true;
            }),
        })).filter(section => section.items.length > 0);
    }

    private navigate(path: string): void {
        window.history.pushState({}, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
        this.currentPath = path;
    }

    private isActive(path: string): boolean {
        return this.currentPath === path || this.currentPath.startsWith(path + '/');
    }

    render() {
        return html`
            <a class="brand" href="/dashboard" @click=${(e: Event) => { e.preventDefault(); this.navigate('/dashboard'); }}>
                <zt-logo></zt-logo>
            </a>
            <nav>
                ${this.getFilteredNavItems().map(section => html`
                    <div class="nav-section">
                        <div class="nav-section-label">${section.section}</div>
                        ${section.items.map(item => html`
                            <button
                                class="nav-link ${this.isActive(item.path) ? 'active' : ''}"
                                aria-current=${this.isActive(item.path) ? 'page' : nothing}
                                title=${item.label}
                                @click=${() => this.navigate(item.path)}
                            >
                                <span class="nav-icon">${unsafeSVG(item.icon)}</span>
                                <span class="nav-label">${item.label}</span>
                            </button>
                        `)}
                    </div>
                `)}
            </nav>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'zt-sidebar': ZtSidebar;
    }
}
