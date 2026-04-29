// @vitest-environment node
import { hashPassword, comparePassword, validatePasswordStrength } from './password.js';

describe('hashPassword', () => {
    it('returns a bcrypt hash string', async () => {
        const hash = await hashPassword('TestPass1!');
        expect(hash).toMatch(/^\$2[aby]?\$\d{2}\$.{53}$/);
    });

    it('uses cost factor 12', async () => {
        const hash = await hashPassword('TestPass1!');
        expect(hash).toMatch(/^\$2[aby]?\$12\$/);
    });

    it('produces different hashes for the same input (salt)', async () => {
        const h1 = await hashPassword('TestPass1!');
        const h2 = await hashPassword('TestPass1!');
        expect(h1).not.toEqual(h2);
    });
});

describe('comparePassword', () => {
    it('returns true for matching password', async () => {
        const hash = await hashPassword('CorrectHorse!1');
        const result = await comparePassword('CorrectHorse!1', hash);
        expect(result).toBe(true);
    });

    it('returns false for wrong password', async () => {
        const hash = await hashPassword('CorrectHorse!1');
        const result = await comparePassword('WrongPassword!1', hash);
        expect(result).toBe(false);
    });

    it('returns false for empty password against a hash', async () => {
        const hash = await hashPassword('SomePass!1');
        const result = await comparePassword('', hash);
        expect(result).toBe(false);
    });
});

describe('validatePasswordStrength', () => {
    it('accepts a strong password', () => {
        const result = validatePasswordStrength('MyStr0ng!Pass');
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('rejects password shorter than 8 characters', () => {
        const result = validatePasswordStrength('Ab1!');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must be at least 8 characters');
    });

    it('rejects password without lowercase letter', () => {
        const result = validatePasswordStrength('ABCDEFG1!');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must contain a lowercase letter');
    });

    it('rejects password without uppercase letter', () => {
        const result = validatePasswordStrength('abcdefg1!');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must contain an uppercase letter');
    });

    it('rejects password without a number', () => {
        const result = validatePasswordStrength('Abcdefgh!');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must contain a number');
    });

    it('rejects password without a special character', () => {
        const result = validatePasswordStrength('Abcdefg1');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must contain a special character');
    });

    it('returns multiple errors for very weak password', () => {
        const result = validatePasswordStrength('abc');
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
});
