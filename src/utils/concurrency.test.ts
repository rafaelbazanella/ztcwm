import { describe, it, expect } from 'vitest';
import { concurrentMap } from './concurrency.js';

describe('concurrentMap', () => {
    it('returns empty array for empty input', async () => {
        const result = await concurrentMap([], async (x: number) => x * 2, 5);
        expect(result).toEqual([]);
    });

    it('processes single item and returns [result]', async () => {
        const result = await concurrentMap([42], async (x) => x * 2, 5);
        expect(result).toEqual([84]);
    });

    it('processes all items and preserves order', async () => {
        const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const result = await concurrentMap(items, async (x) => x * 3, 3);
        expect(result).toEqual([3, 6, 9, 12, 15, 18, 21, 24, 27, 30]);
    });

    it('never exceeds concurrency limit', async () => {
        let active = 0;
        let maxActive = 0;
        const limit = 3;

        const items = Array.from({ length: 20 }, (_, i) => i);
        await concurrentMap(
            items,
            async (x) => {
                active++;
                maxActive = Math.max(maxActive, active);
                // Simulate async work with variable delay
                await new Promise((r) => setTimeout(r, Math.random() * 10));
                active--;
                return x;
            },
            limit,
        );

        expect(maxActive).toBeLessThanOrEqual(limit);
        expect(maxActive).toBeGreaterThan(0);
    });

    it('rejects with first error when fn throws (fail-fast)', async () => {
        const items = [1, 2, 3, 4, 5];
        await expect(
            concurrentMap(
                items,
                async (x) => {
                    if (x === 3) throw new Error('boom');
                    return x;
                },
                2,
            ),
        ).rejects.toThrow('boom');
    });

    it('preserves input order even when items complete out of order', async () => {
        // Items with decreasing delays so later items finish first
        const items = [1, 2, 3, 4, 5];
        const result = await concurrentMap(
            items,
            async (x) => {
                await new Promise((r) => setTimeout(r, (6 - x) * 5));
                return x * 10;
            },
            5,
        );
        expect(result).toEqual([10, 20, 30, 40, 50]);
    });
});
