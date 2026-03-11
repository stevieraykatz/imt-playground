/**
 * Async semaphore for bounding request concurrency.
 *
 * Callers that exceed the permit count are queued FIFO.
 * An optional timeout rejects the promise so callers don't wait forever.
 */
export class AsyncSemaphore {
    constructor(permits) {
        this.queue = [];
        if (permits < 1)
            throw new Error('Semaphore permits must be at least 1');
        this.permits = permits;
    }
    get available() {
        return this.permits;
    }
    get pending() {
        return this.queue.length;
    }
    /**
     * Acquire a permit. Resolves immediately when one is available,
     * otherwise the caller is queued until a permit is released.
     *
     * @param timeoutMs  If positive, rejects after this many ms if a
     *                   permit has not been acquired.
     */
    acquire(timeoutMs) {
        if (this.permits > 0) {
            this.permits--;
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            const entry = { resolve, reject };
            if (timeoutMs != null && timeoutMs > 0) {
                entry.timer = setTimeout(() => {
                    const idx = this.queue.indexOf(entry);
                    if (idx !== -1)
                        this.queue.splice(idx, 1);
                    reject(new Error('Request timed out waiting in queue'));
                }, timeoutMs);
            }
            this.queue.push(entry);
        });
    }
    release() {
        const next = this.queue.shift();
        if (next) {
            if (next.timer)
                clearTimeout(next.timer);
            next.resolve();
        }
        else {
            this.permits++;
        }
    }
}
