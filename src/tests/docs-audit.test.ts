// @vitest-environment node

/**
 * Phase 17 — documentation audit guardrails.
 *
 * Phase 17 ships Markdown documentation rather than application code; this test
 * asserts that every ROADMAP Phase 17 success criterion (#1–#6, mapping to
 * DOCS-01..DOCS-06) is satisfied by the rendered docs. Each `describe()` block
 * is named after the closing requirement(s); each `it()` is one machine-checkable
 * assertion.
 *
 * The negative assertions are first-class:
 *   - README MUST NOT contain `MemoryDenyWriteExecute=yes` (Node V8 JIT crash; T-17-02).
 *   - docs/architecture.md MUST NOT claim `auth token ... localStorage` (v1.0 stale).
 *   - docs/architecture.md MUST NOT claim `no user authentication` (v1.0 stale).
 *   - docs/development.md MUST NOT mention the legacy `/zt-api/` proxy prefix.
 *   - docs/setup.md MUST NOT exist (its content moved into README per D-20).
 *
 * The cross-file diagram check asserts the same canonical ASCII diagram
 * (recognized by the marker `Lit SPA (zt-app)`) appears in both README.md
 * and docs/architecture.md per CONTEXT.md D-02 / RESEARCH.md Open Question 2.
 *
 * The npm-run-X consistency check asserts every documented script exists in
 * src/package.json `scripts` (per CONTEXT.md D-22). The regex behaviour is
 * locked by an explicit sanity-check `it()` per the analog
 * `src/styles/theme-audit.test.ts` pattern.
 *
 * Closes nyquist_validation for Phase 17.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pkg from '../package.json' with { type: 'json' };

// Resolve repo root from this test file (src/tests/docs-audit.test.ts -> repo root).
const __filename = fileURLToPath(import.meta.url);
const SRC_ROOT = resolve(dirname(__filename), '..');
const REPO_ROOT = resolve(SRC_ROOT, '..');
const read = (p: string): string => readFileSync(resolve(REPO_ROOT, p), 'utf8');

let readme: string;
let arch: string;
let dev: string;
let api: string;

beforeAll(() => {
    readme = read('README.md');
    arch = read('docs/architecture.md');
    dev = read('docs/development.md');
    api = read('docs/api-reference.md');
});

describe('Phase 17 docs-audit — DOCS-01: purpose, value, architecture above install', () => {
    it.each([
        ['What This Is', /^##\s+What This Is\b/m],
        ['Core Value', /^##\s+Core Value\b/m],
        ['Architecture', /^##\s+Architecture\b/m],
    ])('README has top-level %s heading', (_label, re) => {
        expect(readme).toMatch(re);
    });

    it('Architecture appears before Local Installation', () => {
        const archIdx = readme.search(/^##\s+Architecture\b/m);
        const installIdx = readme.search(/^##\s+Local Install/im);
        expect(archIdx, 'Architecture heading present').toBeGreaterThan(-1);
        expect(installIdx, 'Local Install heading present').toBeGreaterThan(-1);
        if (archIdx >= installIdx) {
            throw new Error(
                `expected '## Architecture' (offset ${archIdx}) to appear before '## Local Install' (offset ${installIdx})`,
            );
        }
    });
});

describe('Phase 17 docs-audit — DOCS-02: minimum requirements (Node, ZT, RAM, disk)', () => {
    it.each([
        ['Node.js 20', /Node\.js\s+20/i],
        ['ZeroTier One', /ZeroTier\s+One/i],
        ['RAM', /\bRAM\b/i],
        ['disk', /\bdisk\b/i],
    ])('README mentions %s', (_label, re) => {
        expect(readme).toMatch(re);
    });
});

describe('Phase 17 docs-audit — DOCS-03: local install reproducible', () => {
    it('README contains git clone, npm install, npm run dev in install order', () => {
        const idxClone = readme.search(/git clone/);
        const idxInstall = readme.search(/npm install/);
        const idxDev = readme.search(/npm run dev/);
        expect(idxClone, 'git clone present').toBeGreaterThan(-1);
        expect(idxInstall, 'npm install present').toBeGreaterThan(-1);
        expect(idxDev, 'npm run dev present').toBeGreaterThan(-1);
        if (!(idxClone < idxInstall && idxInstall < idxDev)) {
            throw new Error(
                `expected order git clone (${idxClone}) < npm install (${idxInstall}) < npm run dev (${idxDev})`,
            );
        }
    });
});

describe('Phase 17 docs-audit — DOCS-04: AWS EC2 deploy guide is complete', () => {
    it('covers both Ubuntu 24.04 and Amazon Linux 2023', () => {
        expect(readme).toMatch(/Ubuntu 24\.04/i);
        expect(readme).toMatch(/Amazon Linux 2023/i);
    });

    it('Node install for both OSs (NodeSource setup_20.x)', () => {
        expect(readme).toMatch(/deb\.nodesource\.com\/setup_20/);
        expect(readme).toMatch(/rpm\.nodesource\.com\/setup_20/);
    });

    it('build step (npm run build) appears in deploy section', () => {
        expect(readme).toMatch(/npm run build/);
    });

    it.each([
        ['[Service] section header', /^\[Service\]/m],
        ['User=ztcwm', /User=ztcwm/],
        ['NoNewPrivileges=yes', /NoNewPrivileges=yes/],
        ['ProtectSystem=strict', /ProtectSystem=strict/],
        ['ReadWritePaths=', /ReadWritePaths=/],
        ['EnvironmentFile=/etc/ztcwm/ztcwm.env', /EnvironmentFile=\/etc\/ztcwm\/ztcwm\.env/],
    ])('hardened systemd unit contains %s', (_label, re) => {
        expect(readme).toMatch(re);
    });

    it('does NOT recommend MemoryDenyWriteExecute=yes (Node V8 JIT crash, T-17-02)', () => {
        expect(readme).not.toMatch(/MemoryDenyWriteExecute\s*=\s*yes/i);
    });

    it.each([
        ['X-Forwarded-Proto', /X-Forwarded-Proto/],
        ['X-Forwarded-For', /X-Forwarded-For/],
        ['X-Real-IP', /X-Real-IP/],
        ['proxy_pass http://127.0.0.1:', /proxy_pass\s+http:\/\/127\.0\.0\.1:/],
    ])('nginx config contains %s', (_label, re) => {
        expect(readme).toMatch(re);
    });

    it('TLS issuance via certbot --nginx with non-interactive args', () => {
        expect(readme).toMatch(/certbot\s+--nginx/);
        expect(readme).toMatch(/--email\b/);
        expect(readme).toMatch(/--agree-tos\b/);
    });

    it('security group rules: TCP 443, UDP 9993, TCP 9993 localhost-only, TCP 80 (ACME)', () => {
        expect(readme, 'TCP 443 (web UI)').toMatch(/TCP\s+443/);
        expect(readme, 'UDP 9993 (ZT peer traffic)').toMatch(/UDP\s+9993/);
        // TCP 9993 is the ZT mgmt API — must be documented as localhost-only / NEVER in SG.
        expect(readme, '9993 mentioned at all').toMatch(/9993/);
        expect(readme, 'localhost-only context for TCP 9993').toMatch(
            /localhost|127\.0\.0\.1:9993|NEVER appear in the security group/i,
        );
        expect(readme, 'TCP 80 (ACME)').toMatch(/TCP\s+80/);
        // Use a char class for the apostrophe so the regex literal stays single-quote-friendly
        // (eslint quotes rule is `single`; prettier escapes via double-quote when apostrophe present).
        expect(readme, 'ACME / Lets Encrypt rationale').toMatch(/ACME|Let[’']s Encrypt|certbot/);
    });

    it('EnvironmentFile created with chmod 0600 and chown ztcwm:ztcwm in same paste block', () => {
        expect(readme).toMatch(/EnvironmentFile=\/etc\/ztcwm\/ztcwm\.env/);
        // The tee, chmod, and chown commands must appear within ~1500 chars of each other so
        // operators paste them as one contiguous unit (T-17-05 / Pitfall 9 mitigation).
        const teeIdx = readme.search(/tee\s+\/etc\/ztcwm\/ztcwm\.env/);
        const chmodIdx = readme.search(/chmod\s+0600/);
        const chownIdx = readme.search(/chown\s+ztcwm:ztcwm\s+\/etc\/ztcwm\/ztcwm\.env/);
        expect(teeIdx, 'tee /etc/ztcwm/ztcwm.env present').toBeGreaterThan(-1);
        expect(chmodIdx, 'chmod 0600 present').toBeGreaterThan(-1);
        expect(chownIdx, 'chown ztcwm:ztcwm /etc/ztcwm/ztcwm.env present').toBeGreaterThan(-1);
        // chmod and chown should be downstream of tee (paste order); within ~1500 chars (~30 lines @ 50 cpl).
        const chmodDelta = chmodIdx - teeIdx;
        const chownDelta = chownIdx - teeIdx;
        if (!(chmodDelta > 0 && chmodDelta < 1500)) {
            throw new Error(
                `chmod 0600 must follow tee within 1500 chars; got delta ${chmodDelta} (tee@${teeIdx}, chmod@${chmodIdx})`,
            );
        }
        if (!(chownDelta > 0 && chownDelta < 1500)) {
            throw new Error(
                `chown ztcwm:ztcwm /etc/ztcwm/ztcwm.env must follow tee within 1500 chars; got delta ${chownDelta} (tee@${teeIdx}, chown@${chownIdx})`,
            );
        }
    });

    it('SQLite hot-backup with daily timer and 7-day retention', () => {
        expect(readme).toMatch(/sqlite3/);
        expect(readme).toMatch(/\.backup/);
        expect(readme).toMatch(/OnCalendar=daily/);
        expect(readme).toMatch(/mtime\s+\+7\s+-delete/);
    });

    it('service enabled on boot AND reboot-verify step present', () => {
        expect(readme).toMatch(/systemctl\s+enable\s+--now\s+ztcwm/);
        expect(readme).toMatch(/sudo\s+reboot/);
    });

    it('SESSION_SECRET single-secret model documented with openssl rand -hex 32 (T-17-01, T-17-03)', () => {
        expect(readme).toMatch(/openssl\s+rand\s+-hex\s+32/);
        expect(readme).toMatch(/SESSION_SECRET/);
        // D-15 corrected: ONE secret, not two.
        expect(readme).toMatch(/single secret|one secret/i);
    });
});

describe('Phase 17 docs-audit — DOCS-05: testing guide', () => {
    it('README has Running Tests section with npm test and watch', () => {
        expect(readme).toMatch(/^##\s+Running Tests/m);
        expect(readme).toMatch(/\bnpm test\b/);
        expect(readme).toMatch(/npm run test:watch/);
    });

    it('docs/development.md has a Testing section', () => {
        expect(dev).toMatch(/^##\s+Testing/m);
    });
});

describe('Phase 17 docs-audit — DOCS-06: existing docs refreshed against v2.0+', () => {
    it('docs/architecture.md does NOT claim localStorage auth (v1.0 stale)', () => {
        expect(arch).not.toMatch(/auth token\b[^\n]*localStorage/i);
        expect(arch).not.toMatch(/no user authentication/i);
    });

    it('docs/architecture.md mentions Fastify, bcrypt, AES-GCM', () => {
        expect(arch).toMatch(/Fastify/);
        expect(arch).toMatch(/bcrypt/);
        expect(arch).toMatch(/AES.{0,5}GCM/);
    });

    it('docs/development.md mentions src/server/, Vitest, bcrypt, .test.ts colocation', () => {
        expect(dev).toMatch(/src\/server\//);
        expect(dev).toMatch(/Vitest/i);
        expect(dev).toMatch(/bcrypt/i);
        expect(dev).toMatch(/\*\.test\.ts/);
    });

    it('docs/development.md API Proxy no longer references /zt-api/ (legacy v1.0 prefix)', () => {
        expect(dev).not.toMatch(/\/zt-api\//);
    });
});

describe('Phase 17 docs-audit — D-04 / D-19: api-reference caveat', () => {
    it('docs/api-reference.md first 1500 chars contain upstream / proxy / frontend never calls', () => {
        const head = api.slice(0, 1500);
        expect(head).toMatch(/upstream/i);
        expect(head).toMatch(/proxy/i);
        expect(head).toMatch(/frontend never calls/i);
    });
});

describe('Phase 17 docs-audit — D-20: docs/setup.md deleted', () => {
    it('docs/setup.md does not exist on disk', () => {
        expect(existsSync(resolve(REPO_ROOT, 'docs/setup.md'))).toBe(false);
    });

    it('README does not link to the deleted docs/setup.md', () => {
        expect(readme).not.toMatch(/docs\/setup\.md/);
    });
});

describe('Phase 17 docs-audit — cross-file canonical diagram (D-02 / Open Q2)', () => {
    it('canonical-diagram marker "Lit SPA (zt-app)" appears in BOTH README and docs/architecture.md', () => {
        const marker = 'Lit SPA (zt-app)';
        expect(readme, `marker '${marker}' missing from README`).toContain(marker);
        expect(arch, `marker '${marker}' missing from docs/architecture.md`).toContain(marker);
    });

    it('closing marker "127.0.0.1:9993 only" appears in BOTH README and docs/architecture.md', () => {
        const closer = '127.0.0.1:9993 only';
        expect(readme, `closer '${closer}' missing from README`).toContain(closer);
        expect(arch, `closer '${closer}' missing from docs/architecture.md`).toContain(closer);
    });
});

describe('Phase 17 docs-audit — script consistency (D-22)', () => {
    const scripts = Object.keys((pkg as { scripts: Record<string, string> }).scripts);
    // Use a function-scoped factory — the regex carries `lastIndex` state across `matchAll`
    // calls when reused, so each test gets a fresh instance. (`g` flag is required for matchAll.)
    const scriptsRe = (): RegExp => /npm run ([a-z][a-z0-9:-]*)/gi;

    // SANITY CHECK — proves the regex captures the script name (not just `npm run`).
    // Mirrors the regex-sanity pattern from src/styles/theme-audit.test.ts (lines 184–211)
    // so a future "improvement" to the regex cannot silently let invalid scripts pass.
    it('regex sanity: extracts script name from `npm run dev`, `npm run test:watch`, `npm run build`', () => {
        const fixture = 'try `npm run dev`, then `npm run test:watch`, then `npm run build`.';
        const captures: string[] = [];
        for (const m of fixture.matchAll(scriptsRe())) {
            captures.push(m[1]);
        }
        expect(captures).toEqual(['dev', 'test:watch', 'build']);
    });

    it('every npm run X in README.md is a real script in src/package.json', () => {
        const offenders: string[] = [];
        for (const m of readme.matchAll(scriptsRe())) {
            if (!scripts.includes(m[1])) offenders.push(m[1]);
        }
        if (offenders.length > 0) {
            throw new Error(
                `README.md documents npm scripts that don't exist in src/package.json: ${offenders.join(', ')}`,
            );
        }
    });

    it('every npm run X in docs/development.md is a real script in src/package.json', () => {
        const offenders: string[] = [];
        for (const m of dev.matchAll(scriptsRe())) {
            if (!scripts.includes(m[1])) offenders.push(m[1]);
        }
        if (offenders.length > 0) {
            throw new Error(
                `docs/development.md documents npm scripts that don't exist in src/package.json: ${offenders.join(', ')}`,
            );
        }
    });
});
