import bcrypt from 'bcryptjs';

const BCRYPT_COST = 12;

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_COST);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export interface PasswordValidationResult {
    valid: boolean;
    errors: string[];
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
    const errors: string[] = [];
    if (password.length < 8) errors.push('Password must be at least 8 characters');
    if (!/[a-z]/.test(password)) errors.push('Password must contain a lowercase letter');
    if (!/[A-Z]/.test(password)) errors.push('Password must contain an uppercase letter');
    if (!/\d/.test(password)) errors.push('Password must contain a number');
    if (!/[!@#$%^&*()_+\-=\[\]{}|;':",.\/<>?]/.test(password)) errors.push('Password must contain a special character');
    return { valid: errors.length === 0, errors };
}
