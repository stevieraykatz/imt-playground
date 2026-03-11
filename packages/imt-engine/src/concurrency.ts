/**
 * Async semaphore for bounding request concurrency.
 *
 * Callers that exceed the permit count are queued FIFO.
 * An optional timeout rejects the promise so callers don't wait forever.
 */
export class AsyncSemaphore {
  private permits: number;
  private readonly queue: Array<{
    resolve: () => void;
    reject: (err: Error) => void;
    timer?: ReturnType<typeof setTimeout>;
  }> = [];

  constructor(permits: number) {
    if (permits < 1) throw new Error('Semaphore permits must be at least 1');
    this.permits = permits;
  }

  get available(): number {
    return this.permits;
  }

  get pending(): number {
    return this.queue.length;
  }

  /**
   * Acquire a permit. Resolves immediately when one is available,
   * otherwise the caller is queued until a permit is released.
   *
   * @param timeoutMs  If positive, rejects after this many ms if a
   *                   permit has not been acquired.
   */
  acquire(timeoutMs?: number): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const entry = { resolve, reject } as (typeof this.queue)[number];

      if (timeoutMs != null && timeoutMs > 0) {
        entry.timer = setTimeout(() => {
          const idx = this.queue.indexOf(entry);
          if (idx !== -1) this.queue.splice(idx, 1);
          reject(new Error('Request timed out waiting in queue'));
        }, timeoutMs);
      }

      this.queue.push(entry);
    });
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      if (next.timer) clearTimeout(next.timer);
      next.resolve();
    } else {
      this.permits++;
    }
  }
}
