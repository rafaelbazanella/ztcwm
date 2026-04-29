export async function concurrentMap<T, R>(
    items: T[],
    fn: (item: T) => Promise<R>,
    limit: number,
): Promise<R[]> {
    if (items.length === 0) return [];

    const results = new Array<R>(items.length);
    let cursor = 0;
    let rejected = false;

    async function worker(): Promise<void> {
        while (!rejected) {
            const index = cursor++;
            if (index >= items.length) break;
            results[index] = await fn(items[index]);
        }
    }

    const workers = Array.from(
        { length: Math.min(limit, items.length) },
        () =>
            worker().catch((err) => {
                rejected = true;
                throw err;
            }),
    );

    await Promise.all(workers);
    return results;
}
