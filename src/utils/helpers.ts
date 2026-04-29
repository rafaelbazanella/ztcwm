export function formatTimestamp(epochMs: number): string {
    if (!epochMs) return '—';
    return new Date(epochMs).toLocaleString();
}

import type { Member } from '../types/zerotier.js';

export type MemberFilterTab = 'all' | 'authorized' | 'pending';

/**
 * Pure client-side filter for the network detail Members table.
 * Composes the tab status filter (D-11) with a case-insensitive substring
 * search across name, nodeId, and ipAssignments (D-10). physicalAddress
 * is intentionally NOT searched.
 */
export function filterMembers(
    members: Member[],
    tab: MemberFilterTab,
    query: string,
): Member[] {
    const tabFiltered =
        tab === 'authorized'
            ? members.filter((m) => m.authorized)
            : tab === 'pending'
                ? members.filter((m) => !m.authorized)
                : members;
    const q = query.trim().toLowerCase();
    if (q === '') return tabFiltered;
    return tabFiltered.filter((m) =>
        (m.name ?? '').toLowerCase().includes(q) ||
        (m.nodeId ?? '').toLowerCase().includes(q) ||
        (m.ipAssignments ?? []).some((ip) => ip.toLowerCase().includes(q)),
    );
}

export function shortenId(id: string, len = 10): string {
    return id.length > len ? id.substring(0, len) : id;
}

export function copyToClipboard(text: string): Promise<void> {
    return navigator.clipboard.writeText(text);
}

export function generateId(): string {
    return Math.random().toString(36).substring(2, 15);
}

export function cidrToRange(cidr: string): { start: string; end: string } | null {
    const parts = cidr.split('/');
    if (parts.length !== 2) return null;

    const ip = parts[0];
    const prefix = parseInt(parts[1], 10);
    if (isNaN(prefix) || prefix < 0 || prefix > 32) return null;

    const ipNum = ipToNumber(ip);
    if (ipNum === null) return null;

    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    const start = (ipNum & mask) >>> 0;
    const end = (start | (~mask >>> 0)) >>> 0;

    return {
        start: numberToIp(start),
        end: numberToIp(end),
    };
}

function ipToNumber(ip: string): number | null {
    const parts = ip.split('.');
    if (parts.length !== 4) return null;

    let num = 0;
    for (const part of parts) {
        const octet = parseInt(part, 10);
        if (isNaN(octet) || octet < 0 || octet > 255) return null;
        num = (num << 8) | octet;
    }
    return num >>> 0;
}

function numberToIp(num: number): string {
    return [
        (num >>> 24) & 0xff,
        (num >>> 16) & 0xff,
        (num >>> 8) & 0xff,
        num & 0xff,
    ].join('.');
}

/**
 * Returns true iff `addr` is an IPv4 address (D-17).
 *
 * Tolerant of a trailing `:PORT` suffix on bare IPv4 (e.g. '10.0.0.1:9993').
 * IPv6 addresses (with or without brackets/port) return false. Empty string
 * returns false. ZeroTier path addresses are always either dotted-quad IPv4
 * or colon-bearing IPv6, never a hostname, so a presence-of-colons check
 * (after stripping any trailing :PORT) is sufficient.
 */
export function isIPv4(addr: string): boolean {
    if (!addr) return false;
    if (addr.startsWith('[')) return false; // bracketed IPv6, e.g. '[fc00::1]:9993'
    const stripped = addr.replace(/:\d+$/, ''); // strip a single trailing :PORT
    return !stripped.includes(':');
}
