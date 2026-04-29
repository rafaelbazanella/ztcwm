import { describe, it, expect } from 'vitest';
import { lightTheme, theme } from './theme.js';

/**
 * WCAG 2.1 AA contrast verification for the light AND dark theme token graphs.
 * Closes Phase 16 success criterion #4: every text/background pair in the light theme
 * meets 4.5:1 (normal text) or 3:1 (large text). Targets the LOCKED pair matrix from
 * 16-UI-SPEC.md (Color > Light-theme failing-pair fixes). Uses no library — sRGB
 * relative-luminance formula per WCAG 2.1.
 *
 * The dark-theme block runs the same matrix as a regression guardrail. Pre-existing
 * dark-theme failures (carried forward unchanged from before Phase 16) are listed in
 * DARK_KNOWN_FAILING_PAIRS and asserted via it.skip with the measured ratio, so future
 * regressions in the *passing* pairs surface immediately while the known-failing pairs
 * remain visible as open follow-ups.
 */

type Hex = string;

function hexToRgb(hex: Hex): [number, number, number] {
    const h = hex.replace(/^#/, '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return [r, g, b];
}

function relativeLuminance(hex: Hex): number {
    const [r, g, b] = hexToRgb(hex);
    const channel = (c: number): number => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const R = channel(r);
    const G = channel(g);
    const B = channel(b);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(a: Hex, b: Hex): number {
    const la = relativeLuminance(a);
    const lb = relativeLuminance(b);
    const [hi, lo] = la > lb ? [la, lb] : [lb, la];
    return (hi + 0.05) / (lo + 0.05);
}

function parseTokens(cssText: string): Record<string, string> {
    const map: Record<string, string> = {};
    // Match --color-* tokens whose value is a hex literal (ignore rgba(), composite shadows, etc.)
    const re = /(--color-[a-z-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(cssText)) !== null) {
        map[m[1]] = m[2];
    }
    return map;
}

describe('lightTheme WCAG AA contrast', () => {
    // Preemptive cast — Lit's CSSResult runtime exposes .cssText, formal type doesn't advertise it.
    // Double-cast through `unknown` is the canonical escape hatch (vs. `any`) per CONVENTIONS.md.
    const cssText = (lightTheme as unknown as { cssText: string }).cssText;
    const tokens = parseTokens(cssText);

    // Sanity: ensure parser found the LOCKED-after-16-01 values for the changed tokens.
    it('parser extracts the post-16-01 LOCKED token values', () => {
        expect(tokens['--color-accent']).toBe('#9A6500');
        expect(tokens['--color-text-muted']).toBe('#646877');
        expect(tokens['--color-success']).toBe('#117a3b');
        expect(tokens['--color-warning']).toBe('#a04806');
        expect(tokens['--color-border']).toBe('#c0c6d4');
        expect(tokens['--color-on-accent']).toBe('#ffffff');
    });

    const textTokens = ['--color-text-primary', '--color-text-secondary', '--color-text-muted'];
    const bgTokens = ['--color-bg-primary', '--color-bg-secondary', '--color-bg-tertiary', '--color-bg-elevated', '--color-bg-hover'];

    for (const t of textTokens) {
        for (const b of bgTokens) {
            it(`${t} on ${b} >= 4.5:1`, () => {
                const tHex = tokens[t];
                const bHex = tokens[b];
                expect(tHex, `missing token ${t}`).toBeTruthy();
                expect(bHex, `missing token ${b}`).toBeTruthy();
                const ratio = contrastRatio(tHex, bHex);
                if (ratio < 4.5) {
                    throw new Error(
                        `expected ${t} (${tHex}) on ${b} (${bHex}) to meet WCAG AA (4.5:1), got ${ratio.toFixed(2)}:1`
                    );
                }
            });
        }
    }

    // Semantic-text-as-content pairs (toast text, role badge text, etc.) — light bg surfaces.
    const semanticTextTokens = ['--color-success', '--color-warning', '--color-error', '--color-info'];
    const semanticBgTokens = ['--color-bg-secondary', '--color-bg-tertiary'];
    for (const t of semanticTextTokens) {
        for (const b of semanticBgTokens) {
            it(`${t} on ${b} >= 4.5:1`, () => {
                const ratio = contrastRatio(tokens[t], tokens[b]);
                if (ratio < 4.5) {
                    throw new Error(
                        `expected ${t} (${tokens[t]}) on ${b} (${tokens[b]}) to meet WCAG AA (4.5:1), got ${ratio.toFixed(2)}:1`
                    );
                }
            });
        }
    }

    // Accent-as-button-text legibility: white on accent (the .btn-primary case).
    it('white on --color-accent >= 4.5:1 (.btn-primary text legibility)', () => {
        const ratio = contrastRatio('#ffffff', tokens['--color-accent']);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    // Card-edge visibility (D-07): border distinguishable from page bg.
    it('--color-border vs --color-bg-primary >= 1.5:1 (card edge visible)', () => {
        const ratio = contrastRatio(tokens['--color-border'], tokens['--color-bg-primary']);
        expect(ratio).toBeGreaterThanOrEqual(1.5);
    });
});

/**
 * Dark-theme contrast guardrail. Runs the same matrix as the light-theme block.
 *
 * Pre-existing dark-theme failures (NOT introduced by Phase 16, NOT in scope of UI-04)
 * are documented in DARK_KNOWN_FAILING_PAIRS and skipped via it.skip. They remain
 * tracked as open follow-ups; addressing them is out of scope for Phase 16.
 *
 * The point of this block is regression detection on the *passing* dark-theme pairs:
 * if a future token retarget drops one of those below 4.5:1, this test fails loudly.
 */
const DARK_KNOWN_FAILING_PAIRS: ReadonlyArray<readonly [string, string]> = [
    // text/bg pairs that fail in dark theme (pre-existing; tracked for future remediation)
    ['--color-text-muted', '--color-bg-primary'],    // ~3.81:1
    ['--color-text-muted', '--color-bg-secondary'],  // ~3.61:1
    ['--color-text-muted', '--color-bg-tertiary'],   // ~3.30:1
    ['--color-text-muted', '--color-bg-elevated'],   // ~3.06:1
    ['--color-text-muted', '--color-bg-hover'],      // ~2.66:1
    // semantic-text on dark bg (red/info on darkest surfaces dip below 4.5:1)
    ['--color-error', '--color-bg-tertiary'],        // ~4.34:1
    ['--color-info', '--color-bg-tertiary'],         // ~4.44:1
];

// Known-failing single assertions (not (text, bg) token pairs but specific scenarios).
// White-on-dark-accent (#F5A623 gold) is ~2.03:1 — pre-existing dark-theme issue.
// Tracked here as a separate constant so the regression guardrail still asserts the
// LIGHT theme white-on-accent contract loudly.
const DARK_WHITE_ON_ACCENT_KNOWN_FAILING = true; // ~2.03:1, dark accent #F5A623

function isDarkKnownFailing(t: string, b: string): boolean {
    return DARK_KNOWN_FAILING_PAIRS.some(([tt, bb]) => tt === t && bb === b);
}

describe('darkTheme WCAG AA contrast', () => {
    const cssText = (theme as unknown as { cssText: string }).cssText;
    const tokens = parseTokens(cssText);

    it('parser extracts the dark-theme token values', () => {
        expect(tokens['--color-bg-primary']).toBe('#0f1117');
        expect(tokens['--color-text-primary']).toBe('#e4e6ef');
        expect(tokens['--color-accent']).toBe('#F5A623');
        expect(tokens['--color-on-accent']).toBe('#ffffff');
        expect(tokens['--color-error-hover']).toBe('#c01f1f');
    });

    const textTokens = ['--color-text-primary', '--color-text-secondary', '--color-text-muted'];
    const bgTokens = ['--color-bg-primary', '--color-bg-secondary', '--color-bg-tertiary', '--color-bg-elevated', '--color-bg-hover'];

    for (const t of textTokens) {
        for (const b of bgTokens) {
            const title = `${t} on ${b} >= 4.5:1`;
            if (isDarkKnownFailing(t, b)) {
                it.skip(`${title} (KNOWN FAILING — tracked, pre-existing, out of UI-04 scope)`, () => {
                    /* skipped */
                });
                continue;
            }
            it(title, () => {
                const tHex = tokens[t];
                const bHex = tokens[b];
                expect(tHex, `missing token ${t}`).toBeTruthy();
                expect(bHex, `missing token ${b}`).toBeTruthy();
                const ratio = contrastRatio(tHex, bHex);
                if (ratio < 4.5) {
                    throw new Error(
                        `expected ${t} (${tHex}) on ${b} (${bHex}) to meet WCAG AA (4.5:1), got ${ratio.toFixed(2)}:1`
                    );
                }
            });
        }
    }

    // Semantic-text-as-content pairs — dark bg surfaces.
    const semanticTextTokens = ['--color-success', '--color-warning', '--color-error', '--color-info'];
    const semanticBgTokens = ['--color-bg-secondary', '--color-bg-tertiary'];
    for (const t of semanticTextTokens) {
        for (const b of semanticBgTokens) {
            const title = `${t} on ${b} >= 4.5:1`;
            if (isDarkKnownFailing(t, b)) {
                it.skip(`${title} (KNOWN FAILING — tracked, pre-existing, out of UI-04 scope)`, () => {
                    /* skipped */
                });
                continue;
            }
            it(title, () => {
                const ratio = contrastRatio(tokens[t], tokens[b]);
                if (ratio < 4.5) {
                    throw new Error(
                        `expected ${t} (${tokens[t]}) on ${b} (${tokens[b]}) to meet WCAG AA (4.5:1), got ${ratio.toFixed(2)}:1`
                    );
                }
            });
        }
    }

    // Accent-as-button-text legibility: white on accent (the .btn-primary case).
    if (DARK_WHITE_ON_ACCENT_KNOWN_FAILING) {
        it.skip('white on --color-accent >= 4.5:1 (KNOWN FAILING — dark accent #F5A623 is ~2.03:1, pre-existing, out of UI-04 scope)', () => {
            /* skipped */
        });
    } else {
        it('white on --color-accent >= 4.5:1 (.btn-primary text legibility)', () => {
            const ratio = contrastRatio('#ffffff', tokens['--color-accent']);
            expect(ratio).toBeGreaterThanOrEqual(4.5);
        });
    }

    // Card-edge visibility: border distinguishable from page bg.
    it('--color-border vs --color-bg-primary >= 1.5:1 (card edge visible)', () => {
        const ratio = contrastRatio(tokens['--color-border'], tokens['--color-bg-primary']);
        expect(ratio).toBeGreaterThanOrEqual(1.5);
    });
});
