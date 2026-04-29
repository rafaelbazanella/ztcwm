import type Database from 'better-sqlite3';
import { getZtConfig } from '../db/zt-config.js';

export interface ZtProxyResult {
    status: number;
    body: unknown;
    ok: boolean;
}

export async function ztFetch(
    db: Database.Database,
    sessionSecret: string,
    ztPath: string,
    options?: { method?: string; body?: unknown; timeout?: number },
): Promise<ZtProxyResult> {
    const config = getZtConfig(db, sessionSecret);
    if (!config) {
        return { status: 503, body: { error: 'ZeroTier controller not configured' }, ok: false };
    }

    const url = `${config.controllerUrl}${ztPath}`;
    const headers: Record<string, string> = {
        'X-ZT1-Auth': config.authToken,
    };
    if (options?.body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }

    try {
        const response = await fetch(url, {
            method: options?.method ?? 'GET',
            headers,
            body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
            signal: AbortSignal.timeout(options?.timeout ?? 10000),
        });
        const body = await response.json().catch(() => null);
        return { status: response.status, body, ok: response.ok };
    } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'TimeoutError') {
            return { status: 504, body: { error: 'ZeroTier controller request timed out' }, ok: false };
        }
        return { status: 502, body: { error: 'ZeroTier controller unreachable' }, ok: false };
    }
}

function getResourceContext(path: string): string {
    if (path.includes('/member/')) return 'Member';
    if (path.includes('/member')) return 'Member list';
    if (path.includes('/network/')) return 'Network';
    if (path.includes('/network')) return 'Network list';
    if (path.includes('/peer/')) return 'Peer';
    if (path.includes('/peer')) return 'Peer list';
    if (path.includes('/controller')) return 'Controller';
    if (path.includes('/status')) return 'Node status';
    return 'Resource';
}

export function translateZtError(status: number, ztPath: string, _body?: unknown): { error: string; status: number } {
    const resource = getResourceContext(ztPath);
    if (status === 404) return { error: `${resource} not found`, status: 404 };
    if (status === 401 || status === 403) return { error: 'ZeroTier controller authentication failed', status: 502 };
    if (status >= 500) return { error: `ZeroTier controller error (${status})`, status: 502 };
    return { error: `ZeroTier API error: ${status}`, status };
}

export function genericErrorResponse(status: number): { error: string; status: number } {
    if (status === 404) return { error: 'ZeroTier resource not found', status: 404 };
    if (status === 401 || status === 403) return { error: 'ZeroTier controller authentication failed', status: 502 };
    if (status >= 500) return { error: 'ZeroTier controller internal error', status: 502 };
    return { error: `ZeroTier API error (${status})`, status };
}
