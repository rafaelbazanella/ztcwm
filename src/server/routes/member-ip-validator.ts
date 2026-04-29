import { isIP } from 'node:net';

export type ValidationFailReason = 'malformed' | 'out-of-route' | 'collision';

export type ValidationResult =
    | { ok: true }
    | { ok: false; error: string; invalidIp: string; reason: ValidationFailReason };

export interface NetworkLike {
    routes: Array<{ target: string }>;
}

export interface MemberLike {
    id: string;
    ipAssignments: string[];
}

export function isValidIp(ip: string): boolean {
    return isIP(ip) !== 0;
}

function ipv4ToInt(ip: string): number | null {
    const parts = ip.split('.');
    if (parts.length !== 4) return null;
    let n = 0;
    for (const p of parts) {
        const o = parseInt(p, 10);
        if (Number.isNaN(o) || o < 0 || o > 255 || String(o) !== p) return null;
        n = (n << 8) | o;
    }
    return n >>> 0;
}

function ipv6ToBigInt(ip: string): bigint | null {
    let normalized = ip;

    // Handle embedded IPv4 (e.g. ::ffff:10.0.0.1) — convert tail to two hex groups
    const lastColon = normalized.lastIndexOf(':');
    const tail = normalized.substring(lastColon + 1);
    if (tail.includes('.')) {
        const v4int = ipv4ToInt(tail);
        if (v4int === null) return null;
        const hi = ((v4int >>> 16) & 0xffff).toString(16);
        const lo = (v4int & 0xffff).toString(16);
        normalized = normalized.substring(0, lastColon + 1) + hi + ':' + lo;
    }

    const dblIdx = normalized.indexOf('::');
    let groups: string[];
    if (dblIdx >= 0) {
        // Disallow more than one '::'
        if (normalized.indexOf('::', dblIdx + 1) >= 0) return null;
        const left = normalized.substring(0, dblIdx).split(':').filter((s) => s.length > 0);
        const right = normalized.substring(dblIdx + 2).split(':').filter((s) => s.length > 0);
        const fillCount = 8 - left.length - right.length;
        if (fillCount < 0) return null;
        groups = [...left, ...new Array(fillCount).fill('0'), ...right];
    } else {
        groups = normalized.split(':');
    }
    if (groups.length !== 8) return null;
    let n = 0n;
    for (const g of groups) {
        if (g.length === 0 || g.length > 4) return null;
        if (!/^[0-9a-fA-F]+$/.test(g)) return null;
        const v = parseInt(g, 16);
        if (Number.isNaN(v) || v < 0 || v > 0xffff) return null;
        n = (n << 16n) | BigInt(v);
    }
    return n;
}

/**
 * True iff `ip` is contained within the CIDR `cidr`.
 * Returns false (does NOT throw) on malformed input or IPv4/IPv6 family mismatch,
 * so the caller can surface a clear user error instead of a 500.
 */
export function ipInCidr(ip: string, cidr: string): boolean {
    const ipFamily = isIP(ip);
    if (ipFamily === 0) return false;

    const slash = cidr.indexOf('/');
    if (slash < 0) return false;
    const cidrAddr = cidr.substring(0, slash);
    const prefixStr = cidr.substring(slash + 1);
    if (!/^\d+$/.test(prefixStr)) return false;
    const prefix = parseInt(prefixStr, 10);
    const cidrFamily = isIP(cidrAddr);
    if (cidrFamily === 0) return false;
    if (cidrFamily !== ipFamily) return false;

    if (ipFamily === 4) {
        if (prefix > 32) return false;
        const ipNum = ipv4ToInt(ip);
        const cidrNum = ipv4ToInt(cidrAddr);
        if (ipNum === null || cidrNum === null) return false;
        if (prefix === 0) return true;
        const mask = (~0 << (32 - prefix)) >>> 0;
        return ((ipNum & mask) >>> 0) === ((cidrNum & mask) >>> 0);
    } else {
        if (prefix > 128) return false;
        const ipBig = ipv6ToBigInt(ip);
        const cidrBig = ipv6ToBigInt(cidrAddr);
        if (ipBig === null || cidrBig === null) return false;
        if (prefix === 0) return true;
        const shift = BigInt(128 - prefix);
        const mask = ((1n << 128n) - 1n) ^ ((1n << shift) - 1n);
        return (ipBig & mask) === (cidrBig & mask);
    }
}

/**
 * Validate a proposed `ipAssignments` list against the network's managed routes
 * and current member assignments. Short-circuits on first failure (D-09).
 *
 * - malformed: not a well-formed IPv4 or IPv6 literal
 * - out-of-route: well-formed but not contained in any `network.routes[].target`
 * - collision: held by another member of the same network
 */
export function validateIpAssignments(
    ipAssignments: string[],
    network: NetworkLike,
    currentMembers: MemberLike[],
    selfMemberId: string,
): ValidationResult {
    const selfLower = selfMemberId.toLowerCase();
    for (const ip of ipAssignments) {
        // 1. malformed
        if (!isValidIp(ip)) {
            return {
                ok: false,
                error: 'IP address is not a valid IPv4 or IPv6 literal',
                invalidIp: ip,
                reason: 'malformed',
            };
        }
        // 2. out-of-route
        const inRoute = network.routes.some((r) => ipInCidr(ip, r.target));
        if (!inRoute) {
            return {
                ok: false,
                error: "IP address is outside the network's managed routes",
                invalidIp: ip,
                reason: 'out-of-route',
            };
        }
        // 3. collision (skip self)
        for (const m of currentMembers) {
            if (m.id.toLowerCase() === selfLower) continue;
            if (m.ipAssignments.includes(ip)) {
                return {
                    ok: false,
                    error: 'IP address is already assigned to another member of this network',
                    invalidIp: ip,
                    reason: 'collision',
                };
            }
        }
    }
    return { ok: true };
}
