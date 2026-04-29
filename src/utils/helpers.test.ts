import { cidrToRange } from './helpers.js';

describe('cidrToRange', () => {
    it('returns correct range for /24 subnet', () => {
        const result = cidrToRange('192.168.1.0/24');
        expect(result).toEqual({ start: '192.168.1.0', end: '192.168.1.255' });
    });

    it('returns correct range for /32 single host', () => {
        const result = cidrToRange('10.0.0.1/32');
        expect(result).toEqual({ start: '10.0.0.1', end: '10.0.0.1' });
    });

    it('returns null for invalid CIDR (no slash)', () => {
        expect(cidrToRange('192.168.1.0')).toBeNull();
    });

    it('returns null for invalid prefix length', () => {
        expect(cidrToRange('192.168.1.0/33')).toBeNull();
    });

    // Edge case: /0 entire IPv4 range
    it('returns entire IPv4 range for /0', () => {
        const result = cidrToRange('0.0.0.0/0');
        expect(result).toEqual({ start: '0.0.0.0', end: '255.255.255.255' });
    });

    // Edge case: /8 class A
    it('returns correct range for /8 class A', () => {
        const result = cidrToRange('10.0.0.0/8');
        expect(result).toEqual({ start: '10.0.0.0', end: '10.255.255.255' });
    });

    // Edge case: /12 class B private
    it('returns correct range for /12 private', () => {
        const result = cidrToRange('172.16.0.0/12');
        expect(result).toEqual({ start: '172.16.0.0', end: '172.31.255.255' });
    });

    // Boundary: max IP with /32
    it('returns single host for 255.255.255.255/32', () => {
        const result = cidrToRange('255.255.255.255/32');
        expect(result).toEqual({ start: '255.255.255.255', end: '255.255.255.255' });
    });

    // Boundary: min IP with /32
    it('returns single host for 0.0.0.0/32', () => {
        const result = cidrToRange('0.0.0.0/32');
        expect(result).toEqual({ start: '0.0.0.0', end: '0.0.0.0' });
    });

    // Invalid: malformed IP with letters
    it('returns null for malformed IP with letters', () => {
        expect(cidrToRange('abc.def.0.1/24')).toBeNull();
    });

    // Invalid: octet > 255
    it('returns null for octet out of range', () => {
        expect(cidrToRange('256.0.0.0/24')).toBeNull();
    });

    // Invalid: negative prefix
    it('returns null for negative prefix length', () => {
        expect(cidrToRange('192.168.1.0/-1')).toBeNull();
    });

    // Invalid: empty string
    it('returns null for empty string', () => {
        expect(cidrToRange('')).toBeNull();
    });

    // Invalid: extra slashes
    it('returns null for extra slashes in CIDR', () => {
        expect(cidrToRange('10.0.0.0/16/extra')).toBeNull();
    });
});

import { filterMembers } from './helpers.js';
import type { Member } from '../types/zerotier.js';

function m(overrides: Partial<Member>): Member {
    return {
        id: '',
        nwid: 'net1',
        nodeId: 'aaaaaaaaaa',
        name: '',
        authorized: true,
        activeBridge: false,
        noAutoAssignIps: false,
        ipAssignments: [],
        revision: 1,
        creationTime: 0,
        lastAuthorizedTime: 0,
        lastDeauthorizedTime: 0,
        authenticationExpiryTime: 0,
        remoteTraceTarget: '',
        remoteTraceLevel: 0,
        objtype: 'member',
        ...overrides,
    };
}

describe('filterMembers', () => {
    const alice = m({ nodeId: 'abcdef1234', name: 'alice', authorized: true, ipAssignments: ['10.0.0.5'] });
    const bob = m({ nodeId: 'bbbbbbbbbb', name: 'bob', authorized: false, ipAssignments: ['10.0.0.6', 'fc00::1'] });
    const carol = m({ nodeId: 'cccccccccc', name: 'carol', authorized: true, ipAssignments: ['10.0.0.7'] });
    const aliceUnauth = m({ nodeId: 'dddddddddd', name: 'alice', authorized: false, ipAssignments: ['10.0.0.8'] });
    const all = [alice, bob, carol, aliceUnauth];

    it('Test 1: empty query + all tab returns full list', () => {
        expect(filterMembers(all, 'all', '')).toEqual(all);
    });
    it('Test 2: empty query + authorized tab returns only authorized', () => {
        expect(filterMembers(all, 'authorized', '')).toEqual([alice, carol]);
    });
    it('Test 3: empty query + pending tab returns only !authorized', () => {
        expect(filterMembers(all, 'pending', '')).toEqual([bob, aliceUnauth]);
    });
    it('Test 4: name match is case-insensitive', () => {
        expect(filterMembers(all, 'all', 'ALICE')).toEqual([alice, aliceUnauth]);
    });
    it('Test 5: nodeId match is case-insensitive', () => {
        expect(filterMembers(all, 'all', 'BCDE')).toEqual([alice]);
    });
    it('Test 6: ipAssignments IPv4 match', () => {
        expect(filterMembers(all, 'all', '10.0.0.6')).toEqual([bob]);
    });
    it('Test 7: ipAssignments IPv6 match (case insensitive)', () => {
        expect(filterMembers(all, 'all', 'FC00')).toEqual([bob]);
    });
    it('Test 8: no match returns empty array', () => {
        expect(filterMembers(all, 'all', 'xyz-no-such-thing')).toEqual([]);
    });
    it('Test 9: AND composition — authorized tab + alice query excludes pending alice', () => {
        expect(filterMembers(all, 'authorized', 'alice')).toEqual([alice]);
    });
    it('Test 10: physicalAddress is NOT searched (only name/nodeId/ipAssignments)', () => {
        // Member shape has no physicalAddress, but we assert that searching for
        // a value not present in name/nodeId/ipAssignments returns no match,
        // documenting that physicalAddress (Plan 14-03) must not be searched.
        const dave = m({
            nodeId: 'dave000000',
            name: 'dave',
            authorized: true,
            ipAssignments: ['10.0.0.9'],
        });
        expect(filterMembers([dave], 'all', '192.168.1.1')).toEqual([]);
    });
    it('Test 11: whitespace-only query is treated as empty', () => {
        expect(filterMembers(all, 'all', '   ')).toEqual(all);
    });
    it('Test 12: undefined ipAssignments is handled safely', () => {
        const noIp = m({ nodeId: 'nnnnnnnnnn', name: 'noip', authorized: true, ipAssignments: undefined as unknown as string[] });
        expect(() => filterMembers([noIp], 'all', 'foo')).not.toThrow();
        expect(filterMembers([noIp], 'all', 'noip')).toEqual([noIp]);
    });
});

import { isIPv4 } from './helpers.js';

describe('isIPv4', () => {
    it('Test 1: plain IPv4 returns true', () => {
        expect(isIPv4('10.0.0.1')).toBe(true);
    });
    it('Test 2: zero IPv4 returns true', () => {
        expect(isIPv4('0.0.0.0')).toBe(true);
    });
    it('Test 3: another plain IPv4 returns true', () => {
        expect(isIPv4('192.168.1.100')).toBe(true);
    });
    it('Test 4: IPv6 short returns false', () => {
        expect(isIPv4('::1')).toBe(false);
    });
    it('Test 5: IPv6 full returns false', () => {
        expect(isIPv4('fc00:0000:0000:0000:0000:0000:0000:0001')).toBe(false);
    });
    it('Test 6: IPv6 abbreviated returns false', () => {
        expect(isIPv4('fc00::1')).toBe(false);
    });
    it('Test 7: empty string returns false', () => {
        expect(isIPv4('')).toBe(false);
    });
    it('Test 8: IPv4 with :PORT suffix returns true (tolerant per D-17)', () => {
        expect(isIPv4('10.0.0.1:9993')).toBe(true);
    });
    it('Test 9: bracketed IPv6 with :PORT returns false', () => {
        expect(isIPv4('[fc00::1]:9993')).toBe(false);
    });
});
