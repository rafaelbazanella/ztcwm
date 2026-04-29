export type UsernameValidationResult = { ok: true } | { ok: false; error: string };

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
const MIN_LENGTH = 3;

/**
 * Single source of truth for username validation rules (D-10).
 * Error strings copied verbatim from the original inline checks in POST /users
 * to keep UI text consistent across creation and rename flows.
 */
export function validateUsername(name: unknown): UsernameValidationResult {
    if (typeof name !== 'string' || name.length < MIN_LENGTH) {
        return { ok: false, error: 'Username must be at least 3 characters' };
    }
    if (!USERNAME_PATTERN.test(name)) {
        return { ok: false, error: 'Only letters, numbers, and underscores allowed' };
    }
    return { ok: true };
}
