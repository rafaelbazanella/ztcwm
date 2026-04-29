// @vitest-environment node
import { validateIpAssignments, isValidIp, ipInCidr } from './member-ip-validator.js';

const v4Net = { routes: [{ target: '10.0.0.0/8' }] };
const v6Net = { routes: [{ target: '2001:db8::/32' }] };
const dualNet = { routes: [{ target: '10.0.0.0/8' }, { target: '2001:db8::/32' }] };

describe('isValidIp', () => {
    it('accepts well-formed IPv4', () => {
        expect(isValidIp('10.0.0.1')).toBe(true);
        expect(isValidIp('255.255.255.255')).toBe(true);
        expect(isValidIp('0.0.0.0')).toBe(true);
    });
    it('accepts well-formed IPv6', () => {
        expect(isValidIp('2001:db8::1')).toBe(true);
        expect(isValidIp('::1')).toBe(true);
        expect(isValidIp('fe80::1')).toBe(true);
    });
    it('rejects malformed', () => {
        expect(isValidIp('999.0.0.1')).toBe(false);
        expect(isValidIp('not-an-ip')).toBe(false);
        expect(isValidIp('')).toBe(false);
        expect(isValidIp('10.0.0.1/24')).toBe(false);
    });
});

describe('ipInCidr', () => {
    it('matches IPv4 inside CIDR', () => {
        expect(ipInCidr('10.99.0.5', '10.0.0.0/8')).toBe(true);
        expect(ipInCidr('10.0.0.0', '10.0.0.0/8')).toBe(true);
        expect(ipInCidr('10.255.255.255', '10.0.0.0/8')).toBe(true);
    });
    it('rejects IPv4 outside CIDR', () => {
        expect(ipInCidr('11.0.0.1', '10.0.0.0/8')).toBe(false);
        expect(ipInCidr('172.16.0.5', '10.0.0.0/8')).toBe(false);
    });
    it('matches IPv6 inside CIDR', () => {
        expect(ipInCidr('2001:db8::1', '2001:db8::/32')).toBe(true);
        expect(ipInCidr('2001:db8:abcd::', '2001:db8::/32')).toBe(true);
    });
    it('rejects IPv6 outside CIDR', () => {
        expect(ipInCidr('2001:dead::1', '2001:db8::/32')).toBe(false);
        expect(ipInCidr('::1', '2001:db8::/32')).toBe(false);
    });
    it('returns false on family mismatch', () => {
        expect(ipInCidr('10.0.0.1', '2001:db8::/32')).toBe(false);
        expect(ipInCidr('2001:db8::1', '10.0.0.0/8')).toBe(false);
    });
    it('returns false on malformed CIDR (does not throw)', () => {
        expect(ipInCidr('10.0.0.1', 'not-a-cidr')).toBe(false);
        expect(ipInCidr('10.0.0.1', '10.0.0.0/99')).toBe(false);
        expect(ipInCidr('10.0.0.1', '10.0.0.0/-1')).toBe(false);
        expect(ipInCidr('10.0.0.1', '10.0.0.0/abc')).toBe(false);
    });
    it('handles /0 (matches everything in family)', () => {
        expect(ipInCidr('1.2.3.4', '0.0.0.0/0')).toBe(true);
        expect(ipInCidr('::1', '::/0')).toBe(true);
    });
    it('handles /32 IPv4 host route', () => {
        expect(ipInCidr('10.0.0.5', '10.0.0.5/32')).toBe(true);
        expect(ipInCidr('10.0.0.6', '10.0.0.5/32')).toBe(false);
    });
});

describe('validateIpAssignments', () => {
    it('returns ok for empty list', () => {
        expect(validateIpAssignments([], v4Net, [], 'aaaaaaaaaa')).toEqual({ ok: true });
    });
    it('returns ok for valid IPv4 in route', () => {
        expect(validateIpAssignments(['10.0.0.5'], v4Net, [], 'aaaaaaaaaa')).toEqual({ ok: true });
    });
    it('returns ok for valid IPv6 in route', () => {
        expect(validateIpAssignments(['2001:db8::5'], v6Net, [], 'aaaaaaaaaa')).toEqual({ ok: true });
    });
    it('returns ok for mixed v4+v6 list when both fall in their routes', () => {
        expect(validateIpAssignments(['10.0.0.5', '2001:db8::5'], dualNet, [], 'aaaaaaaaaa'))
            .toEqual({ ok: true });
    });
    it('rejects malformed IP with reason=malformed', () => {
        const res = validateIpAssignments(['999.0.0.1'], v4Net, [], 'aaaaaaaaaa');
        expect(res).toEqual({
            ok: false,
            error: 'IP address is not a valid IPv4 or IPv6 literal',
            invalidIp: '999.0.0.1',
            reason: 'malformed',
        });
    });
    it('rejects out-of-route IP with reason=out-of-route', () => {
        const res = validateIpAssignments(['172.16.0.5'], v4Net, [], 'aaaaaaaaaa');
        expect(res).toMatchObject({ ok: false, invalidIp: '172.16.0.5', reason: 'out-of-route' });
    });
    it('rejects collision with reason=collision', () => {
        const others = [{ id: 'bbbbbbbbbb', ipAssignments: ['10.0.0.5'] }];
        const res = validateIpAssignments(['10.0.0.5'], v4Net, others, 'aaaaaaaaaa');
        expect(res).toMatchObject({ ok: false, invalidIp: '10.0.0.5', reason: 'collision' });
    });
    it('does NOT report collision against self', () => {
        const others = [{ id: 'aaaaaaaaaa', ipAssignments: ['10.0.0.5'] }];
        expect(validateIpAssignments(['10.0.0.5'], v4Net, others, 'aaaaaaaaaa'))
            .toEqual({ ok: true });
    });
    it('self-id comparison is case-insensitive', () => {
        const others = [{ id: 'AAAAAAAAAA', ipAssignments: ['10.0.0.5'] }];
        expect(validateIpAssignments(['10.0.0.5'], v4Net, others, 'aaaaaaaaaa'))
            .toEqual({ ok: true });
    });
    it('short-circuits on first invalid IP', () => {
        const res = validateIpAssignments(['10.0.0.5', '999.0.0.1', '10.0.0.6'], v4Net, [], 'aaaaaaaaaa');
        expect(res).toMatchObject({ invalidIp: '999.0.0.1', reason: 'malformed' });
    });
    it('rejects v4 IP when only v6 routes exist (out-of-route, not malformed)', () => {
        const res = validateIpAssignments(['10.0.0.5'], v6Net, [], 'aaaaaaaaaa');
        expect(res).toMatchObject({ reason: 'out-of-route' });
    });
    it('rejects v6 IP when only v4 routes exist (out-of-route)', () => {
        const res = validateIpAssignments(['2001:db8::1'], v4Net, [], 'aaaaaaaaaa');
        expect(res).toMatchObject({ reason: 'out-of-route' });
    });
    it('collision check uses exact string match (no normalization)', () => {
        const others = [{ id: 'bbbbbbbbbb', ipAssignments: ['10.0.0.5'] }];
        // Different but equivalent IPv6 representations would NOT trigger a collision
        // by design — the validator does string-compare. ZT controller stores them as-is.
        expect(validateIpAssignments(['10.0.0.5'], v4Net, others, 'aaaaaaaaaa'))
            .toMatchObject({ reason: 'collision' });
    });
});
