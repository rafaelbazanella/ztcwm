import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Phase 16 audit guardrails (LOCKED).
 * Closes roadmap success criteria:
 *   - #2: zero <button> action elements without a .btn-* class or permitted structural exception.
 *   - #5: zero literal color values outside src/styles/theme.ts and src/styles/shared.ts.
 *
 * Allow-lists are LOCKED in 16-UI-SPEC.md. Adding a new structural-exception class requires
 * editing UI-SPEC + this test in the same commit and explaining the rationale in the
 * structural-exception allow-list comment in UI-SPEC.
 *
 * NAMED-COLOR REGEX uses value-position lookahead `:\s*\b(...)\b(?![-:])` so it does NOT
 * false-positive on the `white-space:` CSS property name. A sanity-check assertion below
 * proves both directions (real `color: white;` IS flagged; `white-space: nowrap;` is NOT).
 */

// Resolve src/ root from this test file (src/styles/theme-audit.test.ts -> src/)
const __filename = fileURLToPath(import.meta.url);
const SRC_ROOT = join(__filename, '..', '..');

// LOCKED — UI-SPEC structural-exception allow-list. Each class is defined locally in its
// owning component and styled with token-only CSS (no literal colors).
const STRUCTURAL_EXCEPTION_CLASSES = [
    'btn-icon',
    'copy-btn',
    'edit-btn',
    'cell-actions',
    'quick-action-btn',
    'theme-option',
    'filter-tab',
    'back-link',
    'copy-inline',
    'nav-link',
    'toast-action',
    'toast-close',
    'chip-x',
    'login-submit', // .btn .btn-primary modifier in login.ts
    'btn-full',     // canonical full-width modifier in shared.ts
];

// LOCKED — paths where literal colors ARE legal (token homes + tests + boot-time mirror).
// styles/shared.ts was previously allow-listed for `color: white` in .btn-primary/.btn-danger.
// WR-04 replaced those literals with var(--color-on-accent), so shared.ts no longer needs
// the allow-listing — it's now subject to the same audit as every other component file.
const COLOR_LITERAL_ALLOWED_PATHS = [
    'styles/theme.ts',
];
function isAllowedColorPath(relPath: string): boolean {
    const norm = relPath.split(sep).join('/');
    if (COLOR_LITERAL_ALLOWED_PATHS.some((p) => norm.endsWith(p))) return true;
    if (norm.endsWith('.test.ts')) return true; // test fixtures may use literals
    if (norm.endsWith('index.html')) return true; // MIRROR-fenced exception checked separately
    return false;
}

function walkSrc(dir: string, files: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        if (entry === 'node_modules' || entry.startsWith('.')) continue;
        const full = join(dir, entry);
        const s = statSync(full);
        if (s.isDirectory()) walkSrc(full, files);
        else if (/\.(ts|html)$/.test(entry)) files.push(full);
    }
    return files;
}

/** Strip block comments and line comments so grep does not flag commented hex. */
function stripComments(text: string): string {
    // Remove /* ... */ blocks first, then // line comments.
    return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/** Strip the MIRROR-fenced block from index.html (the only legal literal home outside theme.ts/shared.ts). */
function stripMirrorFence(text: string): string {
    return text.replace(/\/\*\s*MIRROR-START[\s\S]*?MIRROR-END\s*\*\//g, '');
}

// VALUE-POSITION-AWARE color-literal regex.
// Matches:
//   - #hex (3..8 digits, word-boundary on right)
//   - rgb(...) / rgba(...) function calls
//   - Named colors ONLY in CSS-value position (preceded by `:`, `,`, or whitespace and not followed by `-`, `:`, or `"`).
// Does NOT match `white-space:` — the `white` there is followed by `-`, excluded by `(?![-:"])`.
// Does NOT match `.white-button` (CSS class) — same trailing lookahead handles it.
// Does NOT match `aria-label="Color: red"` — closing `"` is excluded by the trailing lookahead (WR-03 fix).
// Lookbehind `(?<=[:,\s])` requires the name to sit in CSS-value position (after `:` or `,` or whitespace),
// which together with the trailing `(?![-:"])` covers `color: white;`, `1px solid black;`, AND blocks
// HTML-attribute-text like `aria-label="Color: red"` where the trailing `"` would otherwise pass.
const LITERAL_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)|(?<=[:,\s])\b(white|black|red|green|blue|yellow|orange|purple|grey|gray)\b(?![-:"])/g;

// Pass 1: match every <button ...> opening tag (HTML or Lit-template) regardless of attributes.
// Pass 2 (separate regex): extract the class attribute value from the captured attribute string.
// This two-pass form is necessary because a single regex that REQUIRES `class=` cannot match a
// bare `<button>noClass</button>` — making the `if (!classAttr)` branch unreachable and
// silently defeating success criterion #2 ("zero <button> action elements without a .btn-* class").
const BUTTON_OPEN_RE = /<button\b([^>]*)>/g;
// classAttrRe handles "...", '...', `${...}` interpolation, and Lit `.className=…` property bindings.
const BUTTON_CLASS_RE = /\bclass=(?:"([^"]*)"|'([^']*)'|\$\{[^}]*\}|\{`([^`}]*)`\})|\.className=(?:"([^"]*)"|'([^']*)')/;

function extractButtonClassAttr(attrs: string): string {
    const cm = BUTTON_CLASS_RE.exec(attrs);
    if (!cm) return '';
    return (cm[1] ?? cm[2] ?? cm[3] ?? cm[4] ?? cm[5] ?? '').trim();
}

describe('button class audit (UI-02 success criterion #2)', () => {
    const files = walkSrc(SRC_ROOT).filter((f) => /\.(ts|html)$/.test(f) && !f.endsWith('.test.ts'));

    // SANITY CHECK — proves the two-pass button audit flags a bare <button> (no class attribute).
    // This locks the previously-unreachable `if (!classAttr)` branch as enforced behavior.
    it('regex sanity: flags bare <button>noClass</button> AND captures class on common forms', () => {
        const fixture = `
            <button>noClass</button>
            <button class="btn btn-primary">primary</button>
            <button class='btn btn-secondary'>secondary</button>
            <button .className="btn">propertyBinding</button>
        `;
        const offenders: string[] = [];
        let m: RegExpExecArray | null;
        BUTTON_OPEN_RE.lastIndex = 0;
        while ((m = BUTTON_OPEN_RE.exec(fixture)) !== null) {
            const attrs = m[1];
            const classAttr = extractButtonClassAttr(attrs);
            if (!classAttr) {
                offenders.push('bare-button');
                continue;
            }
            offenders.push(`class:${classAttr}`);
        }
        BUTTON_OPEN_RE.lastIndex = 0;
        // Expected results in fixture order:
        // 1. <button>noClass</button>           -> bare-button (the previously-missed case)
        // 2. <button class="btn btn-primary">   -> class:btn btn-primary
        // 3. <button class='btn btn-secondary'> -> class:btn btn-secondary
        // 4. <button .className="btn">          -> class:btn (Lit property binding)
        expect(offenders).toEqual([
            'bare-button',
            'class:btn btn-primary',
            'class:btn btn-secondary',
            'class:btn',
        ]);
    });

    for (const file of files) {
        const rel = relative(SRC_ROOT, file);
        const text = readFileSync(file, 'utf-8');
        const stripped = stripComments(text);
        let m: RegExpExecArray | null;
        const offenders: string[] = [];
        BUTTON_OPEN_RE.lastIndex = 0;
        while ((m = BUTTON_OPEN_RE.exec(stripped)) !== null) {
            const attrs = m[1];
            const classAttr = extractButtonClassAttr(attrs);
            if (!classAttr) {
                offenders.push(`${rel}: <button> with no class attribute`);
                continue;
            }
            // Tokens within the class attribute (split on whitespace; ignore Lit ${...} interpolation noise).
            const tokens = classAttr.split(/\s+/).filter((t) => t.length > 0 && !/^[$\\{}'"`]/.test(t));
            const hasBtn = tokens.some((t) => t === 'btn' || t.startsWith('btn-'));
            const hasException = tokens.some((t) => STRUCTURAL_EXCEPTION_CLASSES.includes(t));
            if (!hasBtn && !hasException) {
                offenders.push(`${rel}: <button class="${classAttr}"> — no .btn-* and not in allow-list`);
            }
        }
        BUTTON_OPEN_RE.lastIndex = 0;
        if (offenders.length > 0) {
            it(`${rel}: every <button> uses .btn-* or allow-listed structural exception`, () => {
                throw new Error('Button audit offenders:\n' + offenders.join('\n'));
            });
        } else {
            it(`${rel}: button audit clean`, () => {
                expect(true).toBe(true);
            });
        }
    }
});

describe('color-literal audit (UI-05 success criterion #5)', () => {
    // SANITY CHECK — proves the value-position-aware regex behaves correctly.
    // This MUST run before per-file walks so a regex regression surfaces immediately.
    it('regex sanity: flags `color: white;` but NOT `white-space: nowrap;`', () => {
        const fixture = `
            .test-rule {
                color: white;          /* MUST be flagged */
                white-space: nowrap;   /* MUST NOT be flagged */
                overflow: hidden;
            }
            .other {
                background: rgba(0, 0, 0, 0.5);  /* MUST be flagged (rgba) */
                border-bottom: 1px solid black;  /* MUST be flagged (black in value position) */
            }
        `;
        // Strip comments first (matches per-file pipeline).
        const stripped = stripComments(fixture);
        const matches = stripped.match(LITERAL_RE) ?? [];

        // The fixture has 3 expected hits: ': white', 'rgba(0, 0, 0, 0.5)', ': black'.
        // It has 1 expected MISS: 'white-space:' (property-name position).
        const matchedTexts = matches.join(' ');
        expect(matchedTexts).toContain('white');           // `color: white` was flagged
        expect(matchedTexts).toContain('rgba');            // rgba(...) was flagged
        expect(matchedTexts).toContain('black');           // `solid black` was flagged
        expect(matches.length, `expected exactly 3 matches, got ${matches.length}: ${matchedTexts}`).toBe(3);
        // Critically, ensure the property-name-position `white-space` did NOT contribute a 4th match.
        // Because our regex requires `:` BEFORE the name and not `-` AFTER, `white-space:` cannot match.
    });

    // SANITY CHECK (WR-03) — proves the regex does NOT false-positive on HTML-attribute text.
    // Without the trailing `"` exclusion, `aria-label="Color: red"` would match (preceding space
    // satisfies the lookbehind, and `"` was not in the original trailing lookahead set).
    it('regex sanity: does NOT flag color names inside HTML attribute values', () => {
        const fixture = `
            <button aria-label="Color: red">Pick</button>
            <span title="white room">Note</span>
            <div data-status="green">OK</div>
        `;
        const stripped = stripComments(fixture);
        const matches = stripped.match(LITERAL_RE) ?? [];
        // None of the names inside HTML attribute quotes should be flagged.
        // The trailing closing-quote `"` is now in the negative lookahead `(?![-:"])`,
        // and the leading `"` is not in `[:,\s]`, so attribute openings also fail the lookbehind.
        expect(matches.length, `expected 0 matches, got ${matches.length}: ${matches.join(' ')}`).toBe(0);
    });

    const files = walkSrc(SRC_ROOT).filter((f) => /\.(ts|html)$/.test(f));

    for (const file of files) {
        const rel = relative(SRC_ROOT, file);
        if (isAllowedColorPath(rel)) continue;

        let text = readFileSync(file, 'utf-8');
        // Strip comments (so /* ... #hex ... */ doesn't trigger).
        text = stripComments(text);
        const offenders: string[] = [];
        const matches = text.match(LITERAL_RE) ?? [];
        for (const hit of matches) {
            offenders.push(`${rel}: ${hit}`);
        }
        if (offenders.length > 0) {
            it(`${rel}: zero color literals outside theme.ts/shared.ts`, () => {
                throw new Error('Color-literal offenders:\n' + offenders.join('\n'));
            });
        } else {
            it(`${rel}: color-literal audit clean`, () => {
                expect(true).toBe(true);
            });
        }
    }

    // Special case: src/index.html is allowed to contain literals ONLY inside the MIRROR-fenced block.
    // Strip order matters: the MIRROR fence MUST be removed BEFORE stripComments, because the
    // fence comprises two block comments (`/* MIRROR-START ... */` and `/* MIRROR-END */`) that
    // bracket raw CSS rules. stripComments would strip the comments AND the MIRROR-* keywords,
    // leaving the bracketed CSS rules in place — which would defeat the fence.
    it('src/index.html: literals exist ONLY inside MIRROR-START/MIRROR-END block', () => {
        const file = join(SRC_ROOT, 'index.html');
        const text = readFileSync(file, 'utf-8');
        const fenced = stripComments(stripMirrorFence(text));
        // For the MIRROR-fence assertion, hex+rgba is sufficient (no named-color literals
        // outside the fence are expected from the boot script).
        const matches = fenced.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)/g) ?? [];
        if (matches.length > 0) {
            throw new Error(
                `src/index.html has color literals OUTSIDE the MIRROR-fenced block: ${matches.join(', ')}`
            );
        }
    });
});
