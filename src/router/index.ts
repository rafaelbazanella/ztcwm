import { Router } from '@vaadin/router';
import { userService } from '../services/index.js';

/**
 * Phase 20 / Plan 20-02 (D-05, D-07):
 * Extend Vaadin Router's Route type with optional `title` and `subtitle` fields
 * so the persistent navbar (mounted in src/app.ts by Plan 20-03) can read them
 * via Router.location.route on `vaadin-router-location-changed`.
 *
 * Static-property access — not a module augmentation — because `Route` is a
 * `type` alias (Route<R, C>), not an `interface`. Vaadin Router's generic
 * R-extension is the supported way to add custom fields.
 */
export interface RouteMetadata {
    title?: string;
    subtitle?: string;
}

let setupChecked = false;
let needsSetup = false;

export async function checkSetupStatus(): Promise<boolean> {
    if (setupChecked) return needsSetup;
    try {
        const res = await fetch('/api/setup/status');
        if (res.ok) {
            const data = await res.json() as { needsSetup: boolean };
            needsSetup = data.needsSetup;
        }
    } catch (_) {}
    setupChecked = true;
    return needsSetup;
}

export function resetSetupCache(): void {
    setupChecked = false;
    needsSetup = false;
}

export async function checkAuth(): Promise<boolean> {
    try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        return res.ok;
    } catch {
        return false;
    }
}

export function initRouter(outlet: HTMLElement): Router<RouteMetadata> {
    const router = new Router<RouteMetadata>(outlet);

    router.setRoutes([
        {
            path: '/setup',
            component: 'zt-setup-page',
            action: async () => {
                await import('../pages/setup.js');
            },
        },
        {
            path: '/login',
            component: 'zt-login-page',
            action: async () => {
                await import('../pages/login.js');
            },
        },
        {
            path: '/',
            action: async (_context, commands) => {
                if (await checkSetupStatus()) {
                    return commands.redirect('/setup');
                }
                if (!(await checkAuth())) {
                    const intended = window.location.pathname;
                    if (intended !== '/login' && intended !== '/setup') {
                        sessionStorage.setItem('ztcwm-return-url', intended);
                    }
                    return commands.redirect('/login');
                }
                return undefined;
            },
            children: [
                {
                    path: '',
                    redirect: '/dashboard',
                },
                {
                    path: 'dashboard',
                    component: 'page-dashboard',
                    title: 'Dashboard',
                    subtitle: 'Overview',
                    action: async () => {
                        await import('../pages/dashboard.js');
                    },
                },
                {
                    path: 'networks',
                    component: 'page-networks',
                    title: 'Networks',
                    subtitle: 'Manage your ZeroTier networks',
                    action: async () => {
                        await import('../pages/networks.js');
                    },
                },
                {
                    path: 'networks/:id',
                    component: 'page-network-detail',
                    title: 'Network Detail',
                    subtitle: 'Members and settings',
                    action: async () => {
                        await import('../pages/network-detail.js');
                    },
                },
                {
                    path: 'members',
                    component: 'page-members',
                    title: 'Members',
                    subtitle: 'All network members',
                    action: async () => {
                        await import('../pages/members.js');
                    },
                },
                {
                    path: 'controllers',
                    component: 'page-controllers',
                    title: 'Controllers',
                    subtitle: 'Controller and peer status',
                    action: async () => {
                        await import('../pages/controllers.js');
                    },
                },
                {
                    path: 'settings',
                    component: 'page-settings',
                    title: 'Preferences',
                    subtitle: 'User preferences',
                    action: async () => {
                        await import('../pages/settings.js');
                    },
                },
                {
                    path: 'logs',
                    component: 'page-logs',
                    title: 'Logs',
                    subtitle: 'Application event log',
                    action: async () => {
                        await import('../pages/logs.js');
                    },
                },
                {
                    path: 'api',
                    component: 'page-api-explorer',
                    title: 'API Explorer',
                    subtitle: 'Test ZeroTier API endpoints',
                    action: async (_context, commands) => {
                        await import('../pages/api-explorer.js');
                        await userService.getCurrentUser();
                        if (!userService.canAccessApiExplorer()) {
                            return commands.redirect('/dashboard');
                        }
                        return undefined;
                    },
                },
                {
                    path: 'pending',
                    component: 'page-pending',
                    title: 'Pending Authorization',
                    subtitle: 'Unauthorized members across all networks',
                    action: async () => {
                        await import('../pages/pending.js');
                    },
                },
                {
                    path: 'users',
                    component: 'page-users',
                    title: 'User Management',
                    subtitle: 'Manage accounts and roles',
                    action: async (_context, commands) => {
                        await import('../pages/users.js');
                        await userService.getCurrentUser();
                        if (!userService.hasRole('admin')) {
                            return commands.redirect('/dashboard');
                        }
                        return undefined;
                    },
                },
                {
                    path: '(.*)',
                    redirect: '/dashboard',
                },
            ],
        },
    ]);

    return router;
}
