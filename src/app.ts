import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { theme, lightTheme, resetStyles } from './styles/theme.js';
import { initRouter, checkSetupStatus, checkAuth } from './router/index.js';
import './components/sidebar.js';
import './components/navbar.js';
import './components/toast.js';

@customElement('zt-app')
export class ZtApp extends LitElement {
    @state() private currentPath = window.location.pathname;
    @state() private theme: 'dark' | 'light' = 'dark';
    @state() private routeTitle = '';
    @state() private routeSubtitle = '';

    static styles = [
        theme,
        lightTheme,
        resetStyles,
        css`
            :host {
                display: block;
                font-family: var(--font-family);
                background: var(--color-bg-primary);
                color: var(--color-text-primary);
                min-height: 100vh;
            }

            .app-layout {
                display: flex;
                min-height: 100vh;
            }

            .main-content {
                flex: 1;
                margin-left: var(--sidebar-width);
                min-height: 100vh;
            }

            .router-outlet {
                min-height: 100%;
            }
        `,
    ];

    get isLoginPage(): boolean {
        return this.currentPath === '/login' || this.currentPath === '/setup';
    }

    private installAuthInterceptor(): void {
        const originalFetch = window.fetch.bind(window);
        window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
            const response = await originalFetch(input, init);
            if (response.status === 401) {
                const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
                if (url.startsWith('/api/') && !url.startsWith('/api/auth/login') && !url.startsWith('/api/setup/')) {
                    const currentPath = window.location.pathname;
                    if (currentPath !== '/login' && currentPath !== '/setup') {
                        sessionStorage.setItem('ztcwm-return-url', currentPath);
                        window.location.href = '/login';
                    }
                }
            }
            return response;
        };
    }

    async firstUpdated(): Promise<void> {
        this.installAuthInterceptor();

        const saved = localStorage.getItem('zt-theme');
        if (saved === 'light' || saved === 'dark') {
            this.theme = saved;
        } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
            this.theme = 'light';
        }
        this.setAttribute('theme', this.theme);

        const outlet = this.shadowRoot?.getElementById('outlet');

        // Pre-router auth gate: check auth BEFORE initializing the router
        // so no protected content can render to unauthenticated users
        if (!this.isLoginPage) {
            // Check setup status first — redirect to /setup if needed
            if (await checkSetupStatus()) {
                window.location.href = '/setup';
                return;
            }

            // Check authentication — redirect to /login if not authenticated
            if (!(await checkAuth())) {
                const currentPath = window.location.pathname;
                sessionStorage.setItem('ztcwm-return-url', currentPath);
                window.location.href = '/login';
                return;
            }
        }

        if (outlet) {
            initRouter(outlet);
        }

        this.currentPath = window.location.pathname;
        window.addEventListener('popstate', () => {
            this.currentPath = window.location.pathname;
        });
        window.addEventListener('vaadin-router-location-changed', (e: Event) => {
            this.currentPath = window.location.pathname;
            const detail = (e as CustomEvent).detail;
            const route = detail?.location?.route as { title?: string; subtitle?: string } | undefined;
            this.routeTitle = route?.title ?? '';
            this.routeSubtitle = route?.subtitle ?? '';
        });
    }

    public setTheme(target: 'dark' | 'light', options: { persist?: boolean } = { persist: true }): void {
        this.theme = target;
        this.setAttribute('theme', this.theme);
        if (options.persist !== false) {
            localStorage.setItem('zt-theme', this.theme);
        }
    }

    public toggleTheme(): void {
        this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
    }

    public get currentTheme(): string {
        return this.theme;
    }

    render() {
        if (this.isLoginPage) {
            return html`
                <div id="outlet" class="router-outlet"></div>
                <zt-toast-container></zt-toast-container>
            `;
        }
        return html`
            <div class="app-layout">
                <zt-sidebar .currentPath=${this.currentPath}></zt-sidebar>
                <main class="main-content">
                    <zt-navbar .title=${this.routeTitle} .subtitle=${this.routeSubtitle} .currentTheme=${this.theme} show-logout></zt-navbar>
                    <div id="outlet" class="router-outlet"></div>
                </main>
                <zt-toast-container></zt-toast-container>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'zt-app': ZtApp;
    }
}
