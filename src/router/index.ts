import { Router } from '@vaadin/router';
import { userService } from '../services/index.js';

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

export function initRouter(outlet: HTMLElement): Router {
    const router = new Router(outlet);

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
                    action: async () => {
                        await import('../pages/dashboard.js');
                    },
                },
                {
                    path: 'networks',
                    component: 'page-networks',
                    action: async () => {
                        await import('../pages/networks.js');
                    },
                },
                {
                    path: 'networks/:id',
                    component: 'page-network-detail',
                    action: async () => {
                        await import('../pages/network-detail.js');
                    },
                },
                {
                    path: 'members',
                    component: 'page-members',
                    action: async () => {
                        await import('../pages/members.js');
                    },
                },
                {
                    path: 'controllers',
                    component: 'page-controllers',
                    action: async () => {
                        await import('../pages/controllers.js');
                    },
                },
                {
                    path: 'settings',
                    component: 'page-settings',
                    action: async () => {
                        await import('../pages/settings.js');
                    },
                },
                {
                    path: 'logs',
                    component: 'page-logs',
                    action: async () => {
                        await import('../pages/logs.js');
                    },
                },
                {
                    path: 'api',
                    component: 'page-api-explorer',
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
                    action: async () => {
                        await import('../pages/pending.js');
                    },
                },
                {
                    path: 'users',
                    component: 'page-users',
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
