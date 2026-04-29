// @vitest-environment node
import { validateUsername } from './username.js';

describe('validateUsername', () => {
    it('accepts minimum length username', () => {
        expect(validateUsername('abc')).toEqual({ ok: true });
    });

    it('accepts mixed case username', () => {
        expect(validateUsername('Admin')).toEqual({ ok: true });
    });

    it('accepts username with underscore', () => {
        expect(validateUsername('user_1')).toEqual({ ok: true });
    });

    it('accepts long mixed alphanumeric+underscore username', () => {
        expect(validateUsername('ABCdef_123')).toEqual({ ok: true });
    });

    it('rejects empty string with length error', () => {
        expect(validateUsername('')).toEqual({
            ok: false,
            error: 'Username must be at least 3 characters',
        });
    });

    it('rejects 2-char string with length error', () => {
        expect(validateUsername('ab')).toEqual({
            ok: false,
            error: 'Username must be at least 3 characters',
        });
    });

    it('rejects null with length error', () => {
        expect(validateUsername(null)).toEqual({
            ok: false,
            error: 'Username must be at least 3 characters',
        });
    });

    it('rejects undefined with length error', () => {
        expect(validateUsername(undefined)).toEqual({
            ok: false,
            error: 'Username must be at least 3 characters',
        });
    });

    it('rejects number with length error', () => {
        expect(validateUsername(42)).toEqual({
            ok: false,
            error: 'Username must be at least 3 characters',
        });
    });

    it('rejects username with exclamation mark', () => {
        expect(validateUsername('abc!')).toEqual({
            ok: false,
            error: 'Only letters, numbers, and underscores allowed',
        });
    });

    it('rejects username with space', () => {
        expect(validateUsername('a b')).toEqual({
            ok: false,
            error: 'Only letters, numbers, and underscores allowed',
        });
    });

    it('rejects username with hyphen', () => {
        expect(validateUsername('user-name')).toEqual({
            ok: false,
            error: 'Only letters, numbers, and underscores allowed',
        });
    });

    it('rejects non-ASCII characters', () => {
        expect(validateUsername('café')).toEqual({
            ok: false,
            error: 'Only letters, numbers, and underscores allowed',
        });
    });
});
