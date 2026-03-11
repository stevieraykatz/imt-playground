/**
 * Async semaphore for bounding request concurrency.
 *
 * Callers that exceed the permit count are queued FIFO.
 * An optional timeout rejects the promise so callers don't wait forever.
 */
export declare class AsyncSemaphore {
    private permits;
    private readonly queue;
    constructor(permits: number);
    get available(): number;
    get pending(): number;
    /**
     * Acquire a permit. Resolves immediately when one is available,
     * otherwise the caller is queued until a permit is released.
     *
     * @param timeoutMs  If positive, rejects after this many ms if a
     *                   permit has not been acquired.
     */
    acquire(timeoutMs?: number): Promise<void>;
    release(): void;
}
//# sourceMappingURL=concurrency.d.ts.map